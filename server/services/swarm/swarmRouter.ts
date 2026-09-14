import { SwarmTask, SwarmSubTask, AgentRole } from './types.js';
import { executeAgentTask } from './agents.js';
import { executeOpenRouterChat } from '../openrouter.js';
import { randomUUID } from 'crypto';

export async function orchestrateSwarm(prompt: string): Promise<string> {
  console.log(`[SwarmRouter] Orchestrating massive task: "${prompt.substring(0, 50)}..."`);
  
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
        status: 'PENDING',
      }));
    } else {
       throw new Error("Invalid plan format");
    }
  } catch (e) {
    console.warn("[SwarmRouter] Failed to parse Head Agent JSON. Falling back to single Coder agent.");
    subTasks = [{
      id: randomUUID(),
      assignedAgent: 'CODER',
      instructions: prompt,
      status: 'PENDING',
    }];
  }

  console.log(`[SwarmRouter] Spawning ${subTasks.length} parallel agents...`);

  // 2. Execute all sub-agents in parallel
  const agentPromises = subTasks.map(async (task) => {
    task.status = 'RUNNING';
    const result = await executeAgentTask(task, `Original Context: ${prompt}`);
    task.status = result.success ? 'COMPLETED' : 'FAILED';
    task.result = result.output;
    return task;
  });

  const completedTasks = await Promise.all(agentPromises);

  // 3. Head Agent synthesizes the results
  console.log(`[SwarmRouter] All agents finished. Synthesizing final response...`);
  
  const synthesisPrompt = `
You are the Head Swarm Orchestrator. 
The user requested: "${prompt}"

Your specialist agents have completed their tasks. Here are their reports:
${completedTasks.map(t => `--- ${t.assignedAgent} REPORT ---\n${t.result}\n--------------------------`).join('\n\n')}

Synthesize these reports into a final, coherent response for the user.
`;

  const finalResponse = await executeOpenRouterChat({
    messages: [{ role: 'system', content: synthesisPrompt }],
    model: 'google/gemini-pro',
  });

  return finalResponse.text || "Swarm execution completed, but final synthesis failed.";
}

async function generateSwarmPlan(prompt: string): Promise<string> {
  const planPrompt = `
You are the Head Swarm Orchestrator. Break down the following complex user task into 1 to 3 sub-tasks.
Assign each sub-task to a specific agent: CODER, SCRAPER, or TESTER.

Task: "${prompt}"

Respond ONLY with a raw JSON array of objects. Example:
[
  { "agent": "SCRAPER", "instructions": "Find the latest API docs for X" },
  { "agent": "CODER", "instructions": "Write the integration script" }
]
`;
  
  const result = await executeOpenRouterChat({
    messages: [{ role: 'user', content: planPrompt }],
    model: 'google/gemini-pro',
  });
  
  return result.text || '[]';
}
