import { SkillId } from '../skills/types.js';
import { ToolRiskLevel } from '../tools/types.js';
import { JudgeMode, AutonomousTaskState } from '../../storage.js';
import { CognitiveTraceEvent } from '../cognitive/types.js';

export type { AutonomousTaskState };

export type FailureCategory =
  | 'NETWORK_ERROR'
  | 'API_ERROR'
  | 'RATE_LIMIT'
  | 'AUTHORIZATION_DENIED'
  | 'SKILL_DISABLED'
  | 'TOOL_UNAVAILABLE'
  | 'INVALID_ARGUMENT'
  | 'BROWSER_ERROR'
  | 'WINDOWS_ACTION_ERROR'
  | 'TIMEOUT'
  | 'UNKNOWN_ERROR';

export type RecoveryAction =
  | 'RETRY_ONCE'
  | 'RETRY_NETWORK'
  | 'FAILOVER_MODEL'
  | 'SWITCH_ALTERNATIVE_TOOL'
  | 'PLANNER_CORRECT_ARGUMENTS'
  | 'STOP_INFORM_USER'
  | 'STOP_AUTHORIZATION_DENIED'
  | 'STOP_SAFE';

export interface TaskExecutionRecord {
  taskId: string;
  conversationId?: string;
  currentStep: number;
  totalSteps: number;
  skill: string;
  tool?: string;
  status: 'PENDING' | 'EXECUTING' | 'WAITING_AUTHORIZATION' | 'RECOVERING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  attempt: number;
  latencyMs: number;
  errorCategory?: FailureCategory;
  recoveryAction?: RecoveryAction;
  recoveryCount: number;
  goal: string;
  startedAt: number;
  completedAt?: number;
  finalResult?: string;
}

export interface TaskStep {
  id: number;
  skill: SkillId;
  action: string;
  description: string;
  toolName?: string;
  parameters?: Record<string, any>;
  status?: 'PENDING' | 'EXECUTING' | 'COMPLETED' | 'FAILED' | 'SKIPPED';
  attempts?: number;
  resultSummary?: string;
  error?: string;
  errorCategory?: FailureCategory;
  recoveryAction?: RecoveryAction;
  recovered?: boolean;
}

export interface TaskPlan {
  taskId: string;
  goal: string;
  steps: TaskStep[];
  currentStepIndex: number;
  state: AutonomousTaskState;
  createdAt: number;
  updatedAt: number;
  shortLivedContext: Record<string, any>;
  taskScopedAuthorizations: Record<string, boolean>;
  exceedsLimit?: boolean;
  totalPlannedSteps?: number;
  userPrompt: string;
  conversationId?: string;
  recoveryCount: number;
  recoveryBudget: number;
  simulationFlags?: {
    networkFailureOnce?: boolean;
    repeatedFailure?: boolean;
    invalidArgumentOnce?: boolean;
    judgeRejectionOnce?: boolean;
    skillDisabled?: boolean;
    authorizationDenied?: boolean;
  };
}

export interface TaskAuthorizationRecord {
  taskId: string;
  stepId: number;
  tool: string;
  authorizationResult: 'AUTHORIZE_ONCE' | 'ALLOW_FOR_TASK' | 'DENY';
  timestamp: string;
}

export interface PendingTaskAuthorization {
  isAutonomousTask: true;
  taskId: string;
  stepId: number;
  stepAction: string;
  tool: string;
  toolName: string;
  arguments: any;
  risk: ToolRiskLevel;
  requiredPermission: string;
  actionDescription: string;
}

export interface AutonomousTaskRunResult {
  success: boolean;
  taskId: string;
  state: AutonomousTaskState;
  text: string;
  steps: TaskStep[];
  currentStepIndex: number;
  requiresAuthorization?: boolean;
  pendingAuthorization?: PendingTaskAuthorization;
  traces: CognitiveTraceEvent[];
  latencyMs: number;
  modelUsed: string;
  toolActivities?: any[];
  judgeEvaluation?: any;
  recoveryCount?: number;
  recovered?: boolean;
  errorCategory?: FailureCategory;
}
