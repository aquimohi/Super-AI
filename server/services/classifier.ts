export type TaskCategory = 'GENERAL' | 'REASONING' | 'CODING' | 'VISION';

export interface TaskClassification {
  category: TaskCategory;
  confidence: number;
  reason: string;
  matchedRules: string[];
}

export interface ClassificationContext {
  hasImages?: boolean;
  historyLength?: number;
}

/**
 * Lightweight deterministic task classifier using keyword and structural pattern rules.
 * Intelligently classifies user queries into GENERAL, REASONING, CODING, or VISION.
 * Built as an isolated service so it can be augmented or swapped with an LLM classifier later.
 */
export function classifyTask(
  rawMessage: string,
  context?: ClassificationContext
): TaskClassification {
  const normalized = (rawMessage || '').trim();
  const lower = normalized.toLowerCase();

  const matchedRules: string[] = [];
  let codingScore = 0;
  let reasoningScore = 0;
  let visionScore = 0;

  // 1. VISION DETECTION
  if (context?.hasImages) {
    visionScore += 20;
    matchedRules.push('context:hasImages');
  }

  const visionPhrases = [
    /analyze this image/i,
    /describe (what you see|this (image|photo|picture|screenshot))/i,
    /look at this (image|photo|picture|screenshot|diagram)/i,
    /what is in this (image|photo|picture|screenshot)/i,
    /inspect this (image|photo|picture|screenshot)/i,
    /read (the )?text in this (image|photo|picture|screenshot)/i,
    /ocr/i,
    /visual description/i,
    /identify objects? in this (photo|image|picture)/i,
  ];

  for (const regex of visionPhrases) {
    if (regex.test(lower)) {
      visionScore += 15;
      matchedRules.push(`vision:phrase:${regex.source}`);
      break;
    }
  }

  const visionKeywords = [
    /\bimage\b/i,
    /\bimages\b/i,
    /\bphoto\b/i,
    /\bphotos\b/i,
    /\bpicture\b/i,
    /\bpictures\b/i,
    /\bscreenshot\b/i,
    /\bscreenshots\b/i,
    /\bdiagram\b/i,
    /\bvisual feed\b/i,
  ];

  for (const regex of visionKeywords) {
    if (regex.test(lower)) {
      visionScore += 6;
      matchedRules.push(`vision:keyword:${regex.source}`);
    }
  }

  // 2. CODING DETECTION
  const codingActionPhrases = [
    /write a (.* )?(function|script|program|class|component|regex|query|hook|api|endpoint)/i,
    /create a (.* )?(script|function|program|class|component|regex|query|repo)/i,
    /implement (a |an )?(algorithm|function|class|interface|endpoint|sorting|search)/i,
    /write (some )?(code|python|javascript|typescript|sql|bash|c\+\+|html|css)/i,
    /code to /i,
    /generate (a |the )?(script|code|function|program)/i,
    /fix (this|the) (bug|error|issue|code|script|crash)/i,
    /debug (this|my)?/i,
    /refactor (this|the) (code|function|class)/i,
    /rename files/i,
    /sorts? an array/i,
    /sort an array/i,
    /compile error/i,
    /syntax error/i,
    /ek (.* )?(function|script|program|code) bana/i,
    /(python|javascript|code|function) bana/i,
    /(code|program|function) likh/i,
  ];

  for (const regex of codingActionPhrases) {
    if (regex.test(lower)) {
      codingScore += 12;
      matchedRules.push(`coding:action:${regex.source}`);
    }
  }

  const codingTechnicalKeywords = [
    /\bjavascript\b/i,
    /\btypescript\b/i,
    /\bpython\b/i,
    /\bbash\b/i,
    /\bgolang\b/i,
    /\bc\+\+\b/i,
    /\brust\b/i,
    /\bhtml\b/i,
    /\bcss\b/i,
    /\bsql\b/i,
    /\breact\b/i,
    /\bfunction\b/i,
    /\bscript\b/i,
    /\bregex\b/i,
    /\bapi endpoint\b/i,
    /\bnode\.?js\b/i,
    /\bgithub\b/i,
  ];

  for (const regex of codingTechnicalKeywords) {
    if (regex.test(lower)) {
      codingScore += 4;
      matchedRules.push(`coding:keyword:${regex.source}`);
    }
  }

  // 3. REASONING DETECTION
  const reasoningComplexityPhrases = [
    /analyze (its|the) complexity/i,
    /time complexity/i,
    /space complexity/i,
    /computational complexity/i,
    /algorithmic complexity/i,
    /o\(n(\^2|²)?\)/i,
    /o\(log\s*n\)/i,
    /big[- ]o/i,
    /explain why this algorithm has/i,
    /why this algorithm has/i,
    /explain how recursion works/i,
  ];

  for (const regex of reasoningComplexityPhrases) {
    if (regex.test(lower)) {
      reasoningScore += 14;
      matchedRules.push(`reasoning:complexity:${regex.source}`);
    }
  }

  const reasoningLogicPhrases = [
    /explain why/i,
    /explain how/i,
    /step[- ]by[- ]step (logic|proof|explanation|deduction)/i,
    /mathematical proof/i,
    /prove that/i,
    /logical fallacy/i,
    /analyze (the )?trade[- ]offs/i,
    /pros and cons of/i,
    /solve (this )?(logic puzzle|riddle)/i,
    /\brecursion\b/i,
    /\bdeduce\b/i,
    /\bderivation\b/i,
  ];

  for (const regex of reasoningLogicPhrases) {
    if (regex.test(lower)) {
      reasoningScore += 6;
      matchedRules.push(`reasoning:logic:${regex.source}`);
    }
  }

  // DISAMBIGUATION & TIE BREAKING:
  // e.g. "Explain how recursion works and analyze its complexity." -> REASONING
  // e.g. "Write a JavaScript function that sorts an array." -> CODING
  // e.g. "Analyze this image and describe what you see." -> VISION
  // e.g. "Delhi mein aaj weather kaisa hai?" -> GENERAL
  // e.g. "Hello Super AI" -> GENERAL

  const maxScore = Math.max(codingScore, reasoningScore, visionScore);

  if (maxScore < 5) {
    return {
      category: 'GENERAL',
      confidence: 0.95,
      reason: 'Standard conversational dialogue, general query, or greeting.',
      matchedRules: ['general:fallback_default'],
    };
  }

  // If Vision scored highest or has strong vision phrases
  if (visionScore >= codingScore && visionScore >= reasoningScore && visionScore >= 5) {
    return {
      category: 'VISION',
      confidence: Math.min(1.0, 0.6 + visionScore * 0.03),
      reason: 'Detected image, visual inspection, or multimodal request.',
      matchedRules,
    };
  }

  // If Coding scored highest
  if (codingScore > reasoningScore && codingScore >= 5) {
    return {
      category: 'CODING',
      confidence: Math.min(1.0, 0.6 + codingScore * 0.03),
      reason: 'Detected programming task, code generation, debugging, or script request.',
      matchedRules,
    };
  }

  // If Reasoning scored highest
  if (reasoningScore >= codingScore && reasoningScore >= 5) {
    return {
      category: 'REASONING',
      confidence: Math.min(1.0, 0.6 + reasoningScore * 0.03),
      reason: 'Detected deep reasoning, complexity analysis, logic, or algorithmic proof request.',
      matchedRules,
    };
  }

  return {
    category: 'GENERAL',
    confidence: 0.85,
    reason: 'General inquiry default equilibrium.',
    matchedRules,
  };
}
