import { TaskCategory, classifyTask } from '../classifier.js';
import { CognitivePlan, PlannedToolInvocation } from './types.js';
import { JudgeMode } from '../../storage.js';
import { selectSkill } from '../skills/skillSelector.js';
import { skillsRegistry } from '../skills/registry.js';

export interface PlanOptions {
  message: string;
  hasImages?: boolean;
  forceRole?: TaskCategory;
  judgeMode?: JudgeMode;
  memoryContext?: string;
}

/**
 * PLANNER: Logical Cognitive Agent V1
 * Evaluates the user's intent, decides task routing, identifies necessary tool calls,
 * and determines whether the candidate response requires verification by the Judge.
 *
 * NOTE: Internal planning output is never exposed directly as raw JSON to the user.
 */
export async function planCognitiveTask(options: PlanOptions): Promise<CognitivePlan> {
  const raw = (options.message || '').trim();
  const lower = raw.toLowerCase();
  const judgeMode = options.judgeMode || 'AUTO';

  // 1. Task classification & Specialist selection
  const classification = classifyTask(raw, { hasImages: options.hasImages });
  const taskType: TaskCategory = options.forceRole || classification.category;
  const specialist: TaskCategory = taskType;

  // 2. Goal extraction
  let goal = 'Address user inquiry';
  if (/^hello|^hi\b|^hey\b|^namaste/i.test(lower)) {
    goal = 'Acknowledge user greeting in configured voice style';
  } else if (/(\d+\s*[\+\-\*\/×÷]\s*\d+)/i.test(lower)) {
    goal = 'Perform arithmetic calculation';
  } else if (/search the web|search online|look up/i.test(lower)) {
    goal = 'Search web documentation and synthesize findings';
  } else if (taskType === 'CODING') {
    goal = 'Generate high-quality verified code solution';
  } else if (taskType === 'REASONING') {
    goal = 'Synthesize structured logical analysis';
  } else if (taskType === 'VISION') {
    goal = 'Inspect and describe visual telemetry';
  } else {
    goal = raw.slice(0, 60);
  }

  // 3. Tool Requirement Detection
  let requiresTool = false;
  let toolPlan: PlannedToolInvocation | undefined;

  // Web search / browser documentation request
  if (
    /search (the )?web (for )?|search online for |find (the )?latest (.* )?documentation|look up online/i.test(lower) ||
    /open .* in browser/i.test(lower) ||
    /go to https?:\/\//i.test(lower)
  ) {
    requiresTool = true;

    // Extract target URL or query
    const urlMatch = raw.match(/https?:\/\/[^\s]+/i);
    if (urlMatch) {
      toolPlan = {
        toolName: 'browser_open_page',
        parameters: { url: urlMatch[0] },
        reason: 'User requested visiting a specific web URL',
        actionDescription: `Open URL: ${urlMatch[0]}`,
      };
    } else if (/openrouter/i.test(lower)) {
      toolPlan = {
        toolName: 'browser_open_page',
        parameters: { url: 'https://openrouter.ai/docs' },
        reason: 'Navigate to OpenRouter documentation for official API reference',
        actionDescription: 'Open OpenRouter documentation',
      };
    } else {
      const searchTerms = raw.replace(/search (the )?web (for )?|search online for |look up /i, '').trim();
      toolPlan = {
        toolName: 'web_search',
        parameters: { query: searchTerms || raw },
        reason: 'Retrieve live web information for query',
        actionDescription: `Web Search: ${searchTerms.slice(0, 40)}`,
      };
    }
  } else if (/read (the )?file\s+['"]?([^'"]+)['"]?/i.test(lower)) {
    const fileMatch = raw.match(/read (the )?file\s+['"]?([^'"]+)['"]?/i);
    if (fileMatch && fileMatch[2]) {
      requiresTool = true;
      toolPlan = {
        toolName: 'read_file',
        parameters: { path: fileMatch[2].trim() },
        reason: 'Inspect file content requested by user',
        actionDescription: `Read file: ${fileMatch[2].trim()}`,
      };
    }
  }

  // 4. Judge requirement evaluation
  let requiresJudge = false;
  let judgeReasoning = '';

  const isGreeting =
    /^(hello|hi|hey|good morning|good afternoon|good evening|namaste|super ai)\b/i.test(lower) &&
    raw.split(/\s+/).length <= 4;
  const isSimpleCalculation =
    /^(what is\s*)?\d+\s*[\+\-\*\/×÷]\s*\d+\s*\??$/i.test(lower) ||
    /^\d+\s*[\+\-\*\/×÷]\s*\d+$/i.test(lower);
  const isSimpleCasualQuestion =
    /^(what is the capital of|who is the ceo of|how are you|who are you|what time is it)\b/i.test(lower);
  const isBasicNavigation =
    /^(open (chrome|edge|notepad|calculator|google\.com)|go to (chrome|notepad))\b/i.test(lower);

  const hasExplicitVerifyRequest =
    /(verify|check|ensure correctness|validate|double check|aur check bhi karna|check karna|test (this|it)|ensure accurate)/i.test(
      lower
    );

  if (judgeMode === 'OFF') {
    requiresJudge = false;
    judgeReasoning = 'Judge mode is explicitly configured to OFF.';
  } else if (judgeMode === 'ALWAYS') {
    requiresJudge = !isGreeting;
    judgeReasoning = isGreeting
      ? 'Simple greeting bypasses Judge in ALWAYS mode.'
      : 'Judge mode is explicitly set to ALWAYS.';
  } else {
    // AUTO MODE
    if (isGreeting) {
      requiresJudge = false;
      judgeReasoning = 'Conversational greeting does not require verification.';
    } else if (isSimpleCalculation) {
      requiresJudge = false;
      judgeReasoning = 'Elementary arithmetic computation does not require Judge verification.';
    } else if (isSimpleCasualQuestion) {
      requiresJudge = false;
      judgeReasoning = 'Direct factual query does not require Judge verification.';
    } else if (isBasicNavigation && !hasExplicitVerifyRequest) {
      requiresJudge = false;
      judgeReasoning = 'Standard computer/browser navigation does not require verification.';
    } else if (hasExplicitVerifyRequest) {
      requiresJudge = true;
      judgeReasoning = 'User explicitly demanded verification of candidate answer.';
    } else if (taskType === 'CODING') {
      requiresJudge = true;
      judgeReasoning = 'Coding task detected: automated code correctness verification required.';
    } else if (taskType === 'REASONING' && (lower.includes('complexity') || lower.includes('proof') || lower.includes('algorithm') || lower.includes('recursion'))) {
      requiresJudge = true;
      judgeReasoning = 'Complex analytical reasoning requires verification of logical integrity.';
    } else {
      requiresJudge = false;
      judgeReasoning = 'Standard general query handled directly by specialist.';
    }
  }

  // 5. Skill Selection V1
  const skillSelection = selectSkill(raw, {
    hasImages: options.hasImages,
    taskType,
    toolRequired: toolPlan?.toolName,
  });
  const selectedSkill = skillSelection.skillId;
  const skillEnabled = skillsRegistry.isSkillEnabled(selectedSkill);

  return {
    goal,
    taskType,
    specialist,
    selectedSkill,
    skillEnabled,
    requiresTool,
    toolPlan,
    requiresJudge,
    judgeReasoning,
    confidence: classification.confidence,
    reasoning: classification.reason,
  };
}
