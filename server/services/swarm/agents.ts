import { AgentRole, SwarmAgentResult, SwarmSubTask } from './types.js';
import { executeOpenRouterChat } from '../openrouter.js';

export async function executeAgentTask(task: SwarmSubTask, context: string): Promise<SwarmAgentResult> {
  const rolePrompts: Record<AgentRole, string> = {
    HEAD: 'You are the Head Swarm Orchestrator. Break down complex tasks.',
    CODER: 'You are the Coder Agent. Write highly optimized, secure code based on the instructions.',
    SCRAPER: 'You are the Scraper Agent. Extract and summarize information precisely.',
    TESTER: 'You are the Tester Agent. Review code for bugs, logic errors, and security flaws.',
  };

  const systemPrompt = rolePrompts[task.assignedAgent] || rolePrompts.CODER;

  try {
    const result = await executeOpenRouterChat({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Context:\n${context}\n\nTask:\n${task.instructions}` }
      ],
      model: 'google/gemini-pro', // Fallback default
    });

    return {
      role: task.assignedAgent,
      success: true,
      output: result.text || 'Agent returned empty response.',
    };
  } catch (err: any) {
    return {
      role: task.assignedAgent,
      success: false,
      output: `Agent failed: ${err.message}`,
    };
  }
}
