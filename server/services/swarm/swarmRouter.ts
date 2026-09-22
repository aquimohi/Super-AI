import { SwarmTask, SwarmSubTask, SwarmPlan, AgentRole } from './types.js';
import { executeAgentTask } from './agents.js';
import { executeOpenRouterChat } from '../openrouter.js';
import { humanize } from '../../design_genius/humanizer.js';
import { randomUUID } from 'crypto';
import { storage } from '../../storage.js';

// ── Design Intent Detection ───────────────────────────────────────────────────

const DESIGN_KEYWORDS = [
  'ui', 'component', 'frontend', 'design', 'page', 'dashboard', 'form',
  'modal', 'card', 'button', 'nav', 'navbar', 'sidebar', 'layout',
  'interface', 'screen', 'panel', 'widget', 'react', 'tsx', 'css',
  'style', 'theme', 'color', 'icon', 'animation', 'responsive', 'mobile',
  'landing', 'header', 'footer', 'hero', 'section', 'grid', 'flex',
  'bana do', 'bana de', 'banao', 'design kar', 'bnao',
];

function isDesignTask(prompt: string): boolean {
  const lower = prompt.toLowerCase();
  return DESIGN_KEYWORDS.some((kw) => {
    // Escape keyword for regex and check with word boundaries
    const regex = new RegExp(`\\b${kw.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')}\\b`, 'i');
    return regex.test(lower);
  });
}

// ── Design Task Pipeline (3-stage) ────────────────────────────────────────────

/**
 * Stage 1: DESIGNER agent reads Design Brain context and produces the component.
 * Stage 2: COPY_EDITOR agent enforces voice.md rules on all text inside it.
 * Stage 3: humanize() does a final pass on the synthesis text.
 */
async function runDesignPipeline(prompt: string): Promise<string> {
  console.log('[SwarmRouter] 🎨 Design task detected — activating DESIGNER pipeline...');

  // ── Stage 1: DESIGNER generates the component ────────────────────────────
  console.log('[SwarmRouter] Stage 1/3: DESIGNER agent generating component...');
  const designerTask: SwarmSubTask = {
    id: randomUUID(),
    assignedAgent: 'DESIGNER',
    instructions:
      `Generate a complete, production-ready React TSX component for the following request.\n` +
      `Use ONLY the design tokens from tokens.css as CSS custom properties.\n` +
      `No external libraries. No Tailwind unless using exact token class names.\n\n` +
      `REQUEST: ${prompt}`,
    status: 'RUNNING',
  };

  const designerResult = await executeAgentTask(designerTask, prompt);
  if (!designerResult.success) {
    console.warn('[SwarmRouter] DESIGNER agent failed. Falling back to CODER.');
    return designerResult.output;
  }

  console.log('[SwarmRouter] Stage 1/3 complete ✅');

  // ── Stage 2: COPY_EDITOR enforces voice.md on all text inside the component ─
  console.log('[SwarmRouter] Stage 2/3: COPY_EDITOR agent enforcing voice rules...');
  const copyEditorTask: SwarmSubTask = {
    id: randomUUID(),
    assignedAgent: 'COPY_EDITOR',
    instructions:
      `Review and correct ALL user-facing text inside this React component.\n` +
      `Remove any ChatGPT-style copy, filler words, or generic phrases.\n` +
      `Make it sound like Super AI — direct, confident, on-brand.\n` +
      `Return the FULL updated component code.\n\n` +
      `COMPONENT:\n\`\`\`tsx\n${designerResult.output}\n\`\`\``,
    status: 'RUNNING',
  };

  const copyEditorResult = await executeAgentTask(copyEditorTask, prompt);
  const refinedComponent = copyEditorResult.success
    ? copyEditorResult.output
    : designerResult.output; // fallback to stage 1 output if copy editor fails

  console.log('[SwarmRouter] Stage 2/3 complete ✅');

  // ── Stage 3: humanize() cleans the synthesis wrapper text ────────────────
  console.log('[SwarmRouter] Stage 3/3: Final humanizer pass...');
  const finalOutput = humanize(
    `Here's the component you requested:\n\n${refinedComponent}`
  );

  console.log('[SwarmRouter] 🎨 Design pipeline complete ✅');
  return finalOutput;
}

// ── Standard Swarm Pipeline ───────────────────────────────────────────────────

async function generateSwarmPlan(prompt: string): Promise<string> {
  const planPrompt =
    `You are the Head Swarm Orchestrator. Break down the following task into 1–3 sub-tasks.\n` +
    `Available agents: CODER, SCRAPER, TESTER.\n` +
    `DO NOT use DESIGNER or COPY_EDITOR — those are reserved for UI pipelines.\n\n` +
    `Task: "${prompt}"\n\n` +
    `Respond ONLY with a raw JSON array. Example:\n` +
    `[\n` +
    `  { "agent": "SCRAPER", "instructions": "Find the latest API docs for X" },\n` +
    `  { "agent": "CODER", "instructions": "Write the integration script" }\n` +
    `]`;

  const config = storage.getConfig();
  const targetModel = config.models.general || 'deepseek/deepseek-chat';

  const result = await executeOpenRouterChat({
    messages: [{ role: 'user', content: planPrompt }],
    model: targetModel,
  });

  return result.text || '[]';
}

async function runStandardPipeline(prompt: string): Promise<string> {
  console.log('[SwarmRouter] Running standard multi-agent pipeline...');

  // 1. Head Agent creates the plan
  const headPlanStr = await generateSwarmPlan(prompt);
  let subTasks: SwarmSubTask[] = [];

  try {
    const jsonMatch = headPlanStr.match(/```json\n([\s\S]*?)\n```/);
    const parseTarget = jsonMatch ? jsonMatch[1] : headPlanStr;
    const plan = JSON.parse(parseTarget);
    if (Array.isArray(plan)) {
      subTasks = plan.map((t: any) => ({
        id: randomUUID(),
        assignedAgent: t.agent as AgentRole,
        instructions: t.instructions,
        status: 'PENDING' as const,
      }));
    } else {
      throw new Error('Invalid plan format');
    }
  } catch {
    console.warn('[SwarmRouter] Failed to parse Head Agent plan. Using single CODER fallback.');
    subTasks = [{
      id: randomUUID(),
      assignedAgent: 'CODER',
      instructions: prompt,
      status: 'PENDING',
    }];
  }

  console.log(`[SwarmRouter] Spawning ${subTasks.length} parallel agents...`);

  // 2. Execute all sub-agents in parallel
  const completedTasks = await Promise.all(
    subTasks.map(async (task) => {
      task.status = 'RUNNING';
      const result = await executeAgentTask(task, `Original context: ${prompt}`);
      task.status = result.success ? 'COMPLETED' : 'FAILED';
      task.result = result.output;
      return task;
    })
  );

  // 3. Head Agent synthesizes the results
  console.log('[SwarmRouter] Synthesizing final response...');

  const synthesisPrompt =
    `You are the Head Swarm Orchestrator.\n` +
    `User request: "${prompt}"\n\n` +
    `Your specialist agents have completed their work:\n` +
    `${completedTasks
      .map((t) => `--- ${t.assignedAgent} ---\n${t.result}\n`)
      .join('\n')}\n\n` +
    `Synthesize these into a final, coherent, actionable response for the user.`;

  const config = storage.getConfig();
  const targetModel = config.models.general || 'deepseek/deepseek-chat';

  const finalResponse = await executeOpenRouterChat({
    messages: [{ role: 'system', content: synthesisPrompt }],
    model: targetModel,
  });

  const rawText = finalResponse.text || 'Swarm execution completed, but synthesis failed.';
  return humanize(rawText);
}

// ── Public Entry Point ────────────────────────────────────────────────────────

export async function orchestrateSwarm(prompt: string): Promise<string> {
  console.log(`[SwarmRouter] Task received: "${prompt.substring(0, 60)}..."`);

  // Route: Design task → 3-stage Design Pipeline
  //        Everything else → Standard multi-agent pipeline
  if (isDesignTask(prompt)) {
    return runDesignPipeline(prompt);
  } else {
    return runStandardPipeline(prompt);
  }
}
