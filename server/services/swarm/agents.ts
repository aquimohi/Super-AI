import { AgentRole, SwarmAgentResult, SwarmSubTask } from './types.js';
import { executeOpenRouterChat } from '../openrouter.js';
import { humanize } from '../../design_genius/humanizer.js';
import { designMemory } from '../../memory/design/designMemory.js';

// ── Role-specific system prompts ─────────────────────────────────────────────

function buildRolePrompt(role: AgentRole): string {
  switch (role) {

    case 'DESIGNER': {
      // Load full Design Brain context from memory module (with caching + fallback)
      return designMemory.getDesignerSystemPrompt();
    }

    case 'COPY_EDITOR': {
      return designMemory.getCopyEditorPrompt();
    }

    case 'HEAD':
      return 'You are the Head Swarm Orchestrator. Plan complex tasks by breaking them into specialized sub-tasks.';

    case 'CODER':
      return (
        `You are the CODER Agent. Write highly optimized, secure TypeScript/JavaScript/Python code.\n` +
        `Produce complete, runnable implementations — no placeholders, no TODOs.\n` +
        `Follow the existing project patterns when modifying existing files.`
      );

    case 'SCRAPER':
      return 'You are the SCRAPER Agent. Extract and summarize accurate information precisely. Cite sources when available.';

    case 'TESTER':
      return (
        `You are the TESTER Agent. Review code for:\n` +
        `- Logic errors and edge cases\n` +
        `- Security vulnerabilities (injection, XSS, etc.)\n` +
        `- Performance issues\n` +
        `- TypeScript type safety\n` +
        `Provide specific, actionable fixes.`
      );

    default:
      return 'You are a specialist AI agent. Complete the assigned task precisely.';
  }
}

// ── Main agent executor ───────────────────────────────────────────────────────

export async function executeAgentTask(
  task: SwarmSubTask,
  context: string
): Promise<SwarmAgentResult> {
  const systemPrompt = buildRolePrompt(task.assignedAgent);

  try {
    const result = await executeOpenRouterChat({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Context:\n${context}\n\nTask:\n${task.instructions}` },
      ],
      model: 'google/gemini-2.0-flash-001',
    });

    const rawOutput = result.text || 'Agent returned empty response.';
    
    // Apply humanizer to non-code agent outputs (COPY_EDITOR, SCRAPER, HEAD)
    const needsHumanizing = ['COPY_EDITOR', 'SCRAPER', 'HEAD'].includes(task.assignedAgent);
    const finalOutput = needsHumanizing ? humanize(rawOutput) : rawOutput;

    return {
      role: task.assignedAgent,
      success: true,
      output: finalOutput,
    };
  } catch (err: any) {
    return {
      role: task.assignedAgent,
      success: false,
      output: `Agent failed: ${err.message}`,
    };
  }
}
