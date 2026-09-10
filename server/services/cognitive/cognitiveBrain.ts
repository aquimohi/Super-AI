import { storage } from '../../storage.js';
import { planCognitiveTask } from './planner.js';
import { executeSpecialist } from './specialist.js';
import { evaluateCandidateAnswer } from './judge.js';
import {
  CognitivePlan,
  CognitiveTraceEvent,
  JudgeEvaluation,
  CognitiveBrainExecution,
} from './types.js';
import { checkToolPermission } from '../permissions.js';
import { toolRegistry } from '../tools/registry.js';
import { ToolActivityLog } from '../tools/types.js';

export interface RunCognitiveBrainOptions {
  message: string;
  conversationId?: string;
  hasImages?: boolean;
  forceRole?: any;
  sessionAuthorizations?: string[];
  history?: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>;
  memoryContext?: string;
}

export interface CognitiveBrainResponse {
  success: boolean;
  text: string;
  taskType: string;
  modelUsed: string;
  traces: CognitiveTraceEvent[];
  requiresAuthorization?: boolean;
  pendingAuthorization?: any;
  toolActivities: ToolActivityLog[];
  judgeEvaluation?: {
    verdict: 'APPROVED' | 'REVISED' | 'SKIPPED' | 'STANDBY';
    score?: number;
    critique?: string;
    model?: string;
    revisionsMade?: boolean;
  };
  fallbackOccurred?: boolean;
  latencyMs: number;
}

/**
 * MULTI-AGENT COGNITIVE BRAIN V1
 * Coordinates the lightweight multi-agent reasoning architecture:
 * PLANNER -> SPECIALIST -> JUDGE (with max 1 revision cycle).
 *
 * Strict Architectural Rules:
 * - Sequential execution only when required (no always-running processes).
 * - Max 4 model calls per user request hard cost ceiling.
 * - Internal planning JSON is NEVER exposed to the user.
 * - Hidden chain-of-thought is suppressed; only high-level cognitive traces are emitted.
 */
export async function runCognitiveBrain(
  options: RunCognitiveBrainOptions
): Promise<CognitiveBrainResponse> {
  const startTime = Date.now();
  const config = storage.getConfig();
  const cognitiveConfig = storage.getCognitiveEngineConfig();
  const judgeMode = cognitiveConfig.judgeMode || 'AUTO';

  let modelCallsCount = 0;
  const traces: CognitiveTraceEvent[] = [];
  const toolActivities: ToolActivityLog[] = [];
  let toolResultSummary = '';

  const addTrace = (
    agent: CognitiveTraceEvent['agent'],
    action: string,
    detail: string,
    status?: CognitiveTraceEvent['status']
  ) => {
    traces.push({
      id: `trace-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      agent,
      action,
      detail,
      timestamp: new Date().toLocaleTimeString(),
      status,
    });
  };

  // =========================================================================
  // STEP 1: PLANNER (Decides task type, tool usage, specialist, judge need)
  // =========================================================================
  const plan: CognitivePlan = await planCognitiveTask({
    message: options.message,
    hasImages: options.hasImages,
    forceRole: options.forceRole,
    judgeMode,
    memoryContext: options.memoryContext,
  });

  addTrace('PLANNER', 'TASK', `TASK = ${plan.taskType}`, 'COMPLETED');

  // STEP 1.5: SKILL SELECTION & ENFORCEMENT
  if (!plan.skillEnabled) {
    addTrace('SKILL', 'STATUS', `STATUS = DISABLED (${plan.selectedSkill})`, 'FALLBACK');
    let refusal = `${plan.selectedSkill} skill abhi disabled hai. Control Panel me ${plan.selectedSkill} skill enable karein.`;
    if (plan.selectedSkill === 'BROWSER') {
      refusal = 'Browser skill abhi disabled hai. Browser actions execute karne ke liye Control Panel me Browser skill enable karein.';
    } else if (plan.selectedSkill === 'WINDOWS') {
      refusal = 'Windows skill abhi disabled hai. Applications ya computer actions execute karne ke liye Control Panel me Windows skill enable karein.';
    } else if (plan.selectedSkill === 'CODING') {
      refusal = 'Coding skill abhi disabled hai. Control Panel me Coding skill enable karein.';
    } else if (plan.selectedSkill === 'REASONING') {
      refusal = 'Reasoning skill abhi disabled hai. Control Panel me Reasoning skill enable karein.';
    } else if (plan.selectedSkill === 'MEMORY') {
      refusal = 'Memory skill abhi disabled hai. Control Panel me Memory skill enable karein.';
    } else if (plan.selectedSkill === 'VISION') {
      refusal = 'Vision skill abhi disabled hai. Control Panel me Vision skill enable karein.';
    }

    return {
      success: true,
      text: refusal,
      taskType: plan.taskType,
      modelUsed: 'system-skills-enforcer',
      traces,
      requiresAuthorization: false,
      toolActivities,
      latencyMs: Date.now() - startTime,
    };
  }

  addTrace('SKILL', 'SELECTION', `SELECTED = ${plan.selectedSkill}`, 'COMPLETED');

  // If Planner identified a required tool
  if (plan.requiresTool && plan.toolPlan) {
    const { toolName, parameters, actionDescription } = plan.toolPlan;
    addTrace('PLANNER', 'TOOL', `TOOL = ${toolName}`, 'ACTIVE');

    // Verify tool permission against security policy
    const permCheck = checkToolPermission(
      toolName,
      options.sessionAuthorizations || [],
      actionDescription
    );

    if (permCheck.level === 'DENY') {
      const act: ToolActivityLog = {
        id: `act-${Date.now()}`,
        timestamp: new Date().toLocaleTimeString(),
        tool: toolName,
        permission: 'DENIED',
        execution: `${toolName}(${JSON.stringify(parameters)})`,
        result: `Blocked by Super AI security policy: ${permCheck.reason || 'Permission denied'}`,
        risk: permCheck.risk || 'HIGH',
      };
      toolActivities.push(act);
      addTrace('TOOL', 'BLOCKED', `PERMISSION = DENIED (${toolName})`, 'FALLBACK');

      toolResultSummary = `Tool "${toolName}" was denied execution: ${permCheck.reason}`;
    } else if (permCheck.requiresPrompt) {
      addTrace('TOOL', 'AUTHORIZATION', `STATUS = AWAITING CLEARANCE (${toolName})`, 'STANDBY');
      return {
        success: true,
        text: `Security clearance required to execute tool: ${toolName}.`,
        taskType: plan.taskType,
        modelUsed: config.models.general,
        traces,
        requiresAuthorization: true,
        pendingAuthorization: {
          tool: toolName,
          toolName: permCheck.toolDisplayName || toolName,
          arguments: parameters,
          risk: permCheck.risk || 'MEDIUM',
          requiredPermission: permCheck.requiredPermission || 'ASK',
          actionDescription,
        },
        toolActivities,
        latencyMs: Date.now() - startTime,
      };
    } else {
      // Permission ALLOWED
      try {
        const res = await toolRegistry.execute(toolName, parameters, {
          sessionAuthorizations: options.sessionAuthorizations,
        });

        const executionOutput =
          res.sanitizedResultSummary ||
          res.displaySummary ||
          (typeof res.result === 'object'
            ? JSON.stringify(res.result)
            : String(res.result !== undefined ? res.result : res.error)) ||
          'Executed successfully';

        const act: ToolActivityLog = {
          id: `act-${Date.now()}`,
          timestamp: new Date().toLocaleTimeString(),
          tool: toolName,
          permission: 'ALLOWED',
          execution: `${toolName}(${JSON.stringify(parameters).slice(0, 60)})`,
          result: executionOutput.slice(0, 120),
          risk: permCheck.risk || 'LOW',
        };
        toolActivities.push(act);
        addTrace('TOOL', 'EXECUTION', `RESULT = SUCCESS (${toolName})`, 'COMPLETED');
        toolResultSummary = executionOutput;
      } catch (err: any) {
        addTrace('TOOL', 'ERROR', `ERROR = ${err?.message || 'Execution failed'}`, 'FALLBACK');
        toolResultSummary = `Tool execution encountered an error: ${err?.message || String(err)}`;
      }
    }
  }

  // =========================================================================
  // STEP 2: SPECIALIST (Generates candidate answer using specialized model)
  // =========================================================================
  const roleKey = plan.specialist.toLowerCase() as keyof typeof config.models;
  const configuredSpecialistModel = config.models[roleKey] || config.models.general;

  addTrace('SPECIALIST', 'MODEL', `MODEL = ${configuredSpecialistModel}`, 'ACTIVE');
  modelCallsCount++;

  const candidateResult = await executeSpecialist({
    userMessage: options.message,
    specialistRole: plan.specialist,
    memoryContext: options.memoryContext,
    toolResultSummary,
    history: options.history,
  });

  let currentAnswer = candidateResult.text;
  let finalModelUsed = candidateResult.modelUsed || configuredSpecialistModel;
  let fallbackOccurred = candidateResult.fallbackOccurred;

  addTrace('SPECIALIST', 'CANDIDATE', `STATUS = CANDIDATE_GENERATED`, 'COMPLETED');

  // =========================================================================
  // STEP 3: JUDGE (Only if complex, coding, mathematical, or explicitly needed)
  // =========================================================================
  let judgeEvaluationSummary: CognitiveBrainResponse['judgeEvaluation'] | undefined;
  let revisionsMade = false;

  if (plan.requiresJudge && judgeMode !== 'OFF') {
    addTrace('JUDGE', 'STATUS', 'STATUS = VERIFYING', 'ACTIVE');
    modelCallsCount++;

    const judgeResult: JudgeEvaluation = await evaluateCandidateAnswer({
      userRequest: options.message,
      candidateAnswer: currentAnswer,
      taskType: plan.taskType,
      contextSummary: toolResultSummary || options.memoryContext,
    });

    if (judgeResult.verdict === 'APPROVE') {
      addTrace('JUDGE', 'RESULT', `RESULT = APPROVED (Score: ${judgeResult.score}/100)`, 'APPROVED');
      judgeEvaluationSummary = {
        verdict: 'APPROVED',
        score: judgeResult.score,
        critique: judgeResult.critique,
        model: judgeResult.model,
        revisionsMade: false,
      };
    } else {
      // REVISE requested by Judge
      addTrace('JUDGE', 'RESULT', `RESULT = REVISE (Score: ${judgeResult.score}/100)`, 'REVISED');

      // Check max model calls ceiling (limit 4 total)
      if (modelCallsCount < 4) {
        addTrace('SPECIALIST', 'REVISION', `STATUS = REVISING CANDIDATE WITH JUDGE FEEDBACK`, 'ACTIVE');
        modelCallsCount++;

        const revisionResult = await executeSpecialist({
          userMessage: options.message,
          specialistRole: plan.specialist,
          memoryContext: options.memoryContext,
          toolResultSummary,
          history: options.history,
          isRevision: true,
          previousCandidate: currentAnswer,
          judgeCritique: judgeResult.critique + (judgeResult.suggestedRevision ? ` - ${judgeResult.suggestedRevision}` : ''),
        });

        currentAnswer = revisionResult.text;
        finalModelUsed = revisionResult.modelUsed || finalModelUsed;
        revisionsMade = true;

        addTrace('SPECIALIST', 'REVISION_COMPLETE', 'STATUS = REVISION COMPLETED', 'COMPLETED');
        judgeEvaluationSummary = {
          verdict: 'REVISED',
          score: Math.min(100, judgeResult.score + 15),
          critique: `Revision incorporated: ${judgeResult.critique}`,
          model: judgeResult.model,
          revisionsMade: true,
        };
      } else {
        addTrace('SPECIALIST', 'CAP_REACHED', 'STATUS = MAX MODEL CALLS LIMIT REACHED (4)', 'STANDBY');
      }
    }
  } else {
    addTrace('JUDGE', 'STATUS', 'STATUS = STANDBY', 'STANDBY');
    judgeEvaluationSummary = {
      verdict: 'STANDBY',
      critique: plan.judgeReasoning || 'Direct query verified by specialist.',
    };
  }

  const latencyMs = Date.now() - startTime;

  return {
    success: true,
    text: currentAnswer,
    taskType: plan.taskType,
    modelUsed: finalModelUsed,
    traces,
    toolActivities,
    judgeEvaluation: judgeEvaluationSummary,
    fallbackOccurred,
    latencyMs,
  };
}
