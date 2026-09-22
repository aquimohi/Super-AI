export type AgentRole = 'HEAD' | 'CODER' | 'SCRAPER' | 'TESTER' | 'DESIGNER' | 'COPY_EDITOR';

export interface SwarmTask {
  id: string;
  originalPrompt: string;
  subTasks: SwarmSubTask[];
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED';
  createdAt: number;
}

export interface SwarmSubTask {
  id: string;
  assignedAgent: AgentRole;
  instructions: string;
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED';
  result?: string;
  error?: string;
}

export interface SwarmAgentResult {
  role: AgentRole;
  success: boolean;
  output: string;
}

export interface SwarmPlan {
  isDesignTask: boolean;
  subTasks: Array<{ agent: AgentRole; instructions: string }>;
}
