import { TaskCategory } from '../classifier.js';
import { SkillId } from '../skills/types.js';

export type CognitiveAgentRole = 'PLANNER' | 'SPECIALIST' | 'JUDGE' | 'TOOL' | 'SKILL' | 'TASK' | 'RECOVERY' | 'RESULT';

export interface CognitiveTraceEvent {
  id: string;
  agent: CognitiveAgentRole;
  action: string;
  detail: string;
  timestamp: string;
  status?: 'ACTIVE' | 'COMPLETED' | 'STANDBY' | 'APPROVED' | 'REVISED' | 'SKIPPED' | 'FALLBACK';
}

export interface PlannedToolInvocation {
  toolName: string;
  parameters: Record<string, any>;
  reason: string;
  actionDescription: string;
}

export interface CognitivePlan {
  goal: string;
  taskType: TaskCategory;
  specialist: TaskCategory;
  selectedSkill: SkillId;
  skillEnabled: boolean;
  requiresTool: boolean;
  toolPlan?: PlannedToolInvocation;
  requiresJudge: boolean;
  judgeReasoning?: string;
  confidence: number;
  reasoning: string;
}

export interface JudgeEvaluation {
  verdict: 'APPROVE' | 'REVISE';
  score: number; // 0 to 100
  critique: string;
  suggestedRevision?: string;
  model: string;
  latencyMs: number;
}

export interface CognitiveBrainExecution {
  finalText: string;
  taskType: TaskCategory;
  specialistModel: string;
  judgeEvaluated: boolean;
  judgeEvaluation?: JudgeEvaluation;
  revisionsMade: boolean;
  modelCallsCount: number; // Must never exceed 4
  traces: CognitiveTraceEvent[];
  fallbackOccurred: boolean;
}
