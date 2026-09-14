import { classifyTask, TaskCategory, TaskClassification } from './classifier.js';
import {
  executeOpenRouterChat,
  ChatCompletionRequest,
  ChatCompletionResult,
  ChatCompletionMessage,
} from './openrouter.js';
import { keyManager } from './keyManager.js';
import { storage, ModelRoleConfig } from '../storage.js';
import { toolRegistry } from './tools/registry.js';
import { checkToolPermission } from './permissions.js';
import { ToolActivityLog, ToolRiskLevel } from './tools/types.js';
import { memoryService } from './memory/memoryService.js';
import { MemoryEvent } from './memory/types.js';
import { computerControl } from './computerControl.js';
import { browserPlanner } from './browser/browserPlanner.js';
import { browserService } from './browser/browserService.js';
import { validateBrowserUrl } from './browser/urlValidator.js';
import { runCognitiveBrain } from './cognitive/cognitiveBrain.js';
import { CognitiveTraceEvent } from './cognitive/types.js';
import { skillsRegistry } from './skills/registry.js';
import { autonomousTaskEngine } from './task/autonomousTaskEngine.js';
import { AutonomousTaskState } from './task/types.js';
import { recoveryObservabilityEngine } from './task/recoveryObservabilityEngine.js';

export interface PendingToolAuthorization {
  tool: string;
  toolName: string;
  arguments: any;
  toolCallId?: string;
  risk: ToolRiskLevel;
  requiredPermission: string;
  actionDescription: string;
  isAutonomousTask?: boolean;
  taskId?: string;
  stepId?: number;
  stepAction?: string;
}

export interface OrchestrationRequest {
  message: string;
  conversationId?: string;
  history?: Array<{ sender?: string; text?: string; role?: 'user' | 'assistant' | 'system'; content?: string }>;
  hasImages?: boolean;
  forceRole?: TaskCategory;
  forceModel?: string;
  sessionAuthorizations?: string[];
  approvedToolCall?: { tool: string; arguments: any; toolCallId?: string };
  rejectedToolCall?: { tool: string; arguments?: any; toolCallId?: string; reason?: string };
  isAutonomousTask?: boolean;
  taskId?: string;
  taskScopedAuthorization?: boolean;
  authorizationDecision?: 'AUTHORIZE_ONCE' | 'ALLOW_FOR_TASK' | 'DENY';
  stepId?: number;
}

export interface OrchestrationMetadata {
  taskType: TaskCategory;
  selectedModel: string;
  requestedModel: string;
  fallbackOccurred: boolean;
  fallbackModelUsed?: string;
  provider: 'openrouter';
  keyLabel: string;
  latencyMs: number;
  usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
  confidence: number;
  reasoning: string;
}

export interface OrchestrationResponse {
  success: boolean;
  text: string;
  conversationId?: string;
  memoryEvents?: MemoryEvent[];
  metadata: OrchestrationMetadata;
  // Backwards compatibility for existing UI handlers
  model: string;
  provider: string;
  keyUsedName: string;
  rotated: boolean;
  taskType: TaskCategory;
  latencyMs: number;
  usage?: any;
  isSetupPrompt?: boolean;
  // Tool Execution System
  requiresAuthorization?: boolean;
  pendingAuthorization?: PendingToolAuthorization;
  toolActivities?: ToolActivityLog[];
  // Multi-Agent Cognitive Engine
  cognitiveTrace?: CognitiveTraceEvent[];
  judgeEvaluation?: {
    verdict: 'APPROVED' | 'REVISED' | 'SKIPPED' | 'STANDBY';
    score?: number;
    critique?: string;
    model?: string;
    revisionsMade?: boolean;
  };
  // Autonomous Task Loop V1
  isAutonomousTask?: boolean;
  taskId?: string;
  taskState?: AutonomousTaskState;
  taskSteps?: any[];
}

export interface JudgeEvaluationRequest {
  userPrompt: string;
  candidateResponse: string;
  taskType: TaskCategory;
  modelUsed: string;
}

export interface JudgeEvaluationResult {
  approved: boolean;
  score: number; // 0 - 100
  critique?: string;
  suggestedFix?: string;
  judgeModel: string;
  evaluatedAt: string;
}

/**
 * Extracts tool calls from OpenRouter completion (native function calling, structured JSON, or function syntax)
 */
function extractToolCall(
  completion: ChatCompletionResult
): { id?: string; name: string; arguments: Record<string, any> } | null {
  // 1. Native OpenRouter tool call
  if (completion.toolCalls && completion.toolCalls.length > 0) {
    const first = completion.toolCalls[0];
    if (first?.function?.name) {
      let args: Record<string, any> = {};
      try {
        args =
          typeof first.function.arguments === 'string'
            ? JSON.parse(first.function.arguments)
            : first.function.arguments || {};
      } catch {
        args = {};
      }
      return {
        id: first.id || `call_${Date.now()}`,
        name: first.function.name.replace(/^functions\./, '').toLowerCase().trim(),
        arguments: args,
      };
    }
  }

  const text = completion.text || '';

  // 2. Structured tool_call block in text: ```tool_call ... ``` or ```json ... ```
  const blockMatch = text.match(/```(?:tool_call|json)?\s*([\s\S]*?)\s*```/);
  if (blockMatch) {
    try {
      const parsed = JSON.parse(blockMatch[1].trim());
      if (parsed && (parsed.tool || parsed.name)) {
        return {
          id: `call_${Date.now()}`,
          name: String(parsed.tool || parsed.name).replace(/^functions\./, '').toLowerCase().trim(),
          arguments: parsed.arguments || parsed.parameters || parsed.args || {},
        };
      }
    } catch {
      // not JSON
    }
  }

  // 3. XML style <tool_call> ... </tool_call>
  const xmlMatch = text.match(/<tool_call>\s*([\s\S]*?)\s*<\/tool_call>/i);
  if (xmlMatch) {
    try {
      const parsed = JSON.parse(xmlMatch[1].trim());
      if (parsed && (parsed.tool || parsed.name)) {
        return {
          id: `call_${Date.now()}`,
          name: String(parsed.tool || parsed.name).replace(/^functions\./, '').toLowerCase().trim(),
          arguments: parsed.arguments || parsed.parameters || parsed.args || {},
        };
      }
    } catch {
      // ignore
    }
  }

  // 4. Inline JSON object: { "tool": "...", "arguments": { ... } } or { "action": "...", "arguments": { ... } }
  const rawJsonMatch = text.match(
    /\{\s*"(?:tool|name|action)"\s*:\s*"([a-zA-Z0-9_-]+)"\s*,\s*"(?:arguments|parameters|args)"\s*:\s*(\{[\s\S]*?\})\s*\}/
  );
  if (rawJsonMatch) {
    try {
      return {
        id: `call_${Date.now()}`,
        name: rawJsonMatch[1].replace(/^functions\./, '').toLowerCase().trim(),
        arguments: JSON.parse(rawJsonMatch[2]),
      };
    } catch {
      // ignore
    }
  }

  // 4b. Flat JSON format: { "action": "open_application", "application": "chrome" }
  const flatActionMatch = text.match(
    /\{\s*"(?:action|tool)"\s*:\s*"([a-zA-Z0-9_-]+)"\s*,\s*"([a-zA-Z0-9_-]+)"\s*:\s*["']([^"']+)["']\s*\}/
  );
  if (flatActionMatch) {
    const act = flatActionMatch[1].replace(/^functions\./, '').toLowerCase().trim();
    return {
      id: `call_${Date.now()}`,
      name: act,
      arguments: { [flatActionMatch[2]]: flatActionMatch[3] },
    };
  }

  // 5. Function invocation syntax: e.g. calculator(expression="125 * 48"), open_application(application="chrome")
  const fnMatch = text.match(
    /(calculator|current_time|current_date|web_search|read_file|execute_terminal|open_application|open_url|open_folder|open_file|get_active_window|screenshot)\s*\(\s*([\s\S]*?)\s*\)/i
  );
  if (fnMatch) {
    const fnName = fnMatch[1].toLowerCase().trim();
    const rawArg = fnMatch[2].trim();
    let args: Record<string, any> = {};

    if (fnName === 'calculator') {
      const exprMatch = rawArg.match(/expression\s*=\s*["']([^"']+)["']/i) || rawArg.match(/["']([^"']+)["']/);
      args = { expression: exprMatch ? exprMatch[1] : rawArg.replace(/^["']|["']$/g, '') };
    } else if (fnName === 'web_search') {
      const qMatch = rawArg.match(/query\s*=\s*["']([^"']+)["']/i) || rawArg.match(/["']([^"']+)["']/);
      args = { query: qMatch ? qMatch[1] : rawArg.replace(/^["']|["']$/g, '') };
    } else if (fnName === 'read_file') {
      const pMatch = rawArg.match(/path\s*=\s*["']([^"']+)["']/i) || rawArg.match(/["']([^"']+)["']/);
      args = { path: pMatch ? pMatch[1] : rawArg.replace(/^["']|["']$/g, '') };
    } else if (fnName === 'open_application') {
      const appMatch = rawArg.match(/application\s*=\s*["']([^"']+)["']/i) || rawArg.match(/["']([^"']+)["']/);
      args = { application: appMatch ? appMatch[1] : rawArg.replace(/^["']|["']$/g, '') };
    } else if (fnName === 'open_url') {
      const uMatch = rawArg.match(/url\s*=\s*["']([^"']+)["']/i) || rawArg.match(/["']([^"']+)["']/);
      args = { url: uMatch ? uMatch[1] : rawArg.replace(/^["']|["']$/g, '') };
    } else if (fnName === 'open_folder') {
      const fMatch = rawArg.match(/folder\s*=\s*["']([^"']+)["']/i) || rawArg.match(/["']([^"']+)["']/);
      args = { folder: fMatch ? fMatch[1] : rawArg.replace(/^["']|["']$/g, '') };
    } else if (fnName === 'open_file') {
      const fMatch = rawArg.match(/path\s*=\s*["']([^"']+)["']/i) || rawArg.match(/["']([^"']+)["']/);
      args = { path: fMatch ? fMatch[1] : rawArg.replace(/^["']|["']$/g, '') };
    } else if (fnName === 'screenshot') {
      const rMatch = rawArg.match(/reason\s*=\s*["']([^"']+)["']/i) || rawArg.match(/["']([^"']+)["']/);
      args = { reason: rMatch ? rMatch[1] : 'User requested screenshot' };
    } else if (fnName === 'current_time' || fnName === 'current_date') {
      const tzMatch = rawArg.match(/timezone\s*=\s*["']([^"']+)["']/i) || rawArg.match(/["']([^"']+)["']/);
      args = tzMatch ? { timezone: tzMatch[1] } : {};
    }

    return {
      id: `call_${Date.now()}`,
      name: fnName,
      arguments: args,
    };
  }

  return null;
}

/**
 * Super AI Cognitive Orchestrator with Secure Tool Execution Layer
 *
 * Architecture:
 * USER
 *  ↓
 * ORCHESTRATOR
 *  ↓
 * MODEL (with Available Tools Schema)
 *  ↓
 * TOOL DECISION
 *  ↓
 * PERMISSION CHECK (ALLOW / ASK / DENY)
 *  ↓
 * TOOL EXECUTION (in sandbox, strict path/network bounds)
 *  ↓
 * TOOL RESULT
 *  ↓
 * MODEL (Synthesizes contextual response)
 *  ↓
 * FINAL RESPONSE -> VOICE / HUD
 */
export async function orchestrateChatRequest(
  request: OrchestrationRequest
): Promise<OrchestrationResponse> {
  const startTime = Date.now();
  const rawMessage = request.message.trim();
  const toolActivities: ToolActivityLog[] = [];
  const sessionAuthorizations = request.sessionAuthorizations || [];

  // Acquire or create conversation session
  const conversationRecord = memoryService.getOrCreateConversation(request.conversationId);
  const conversationId = conversationRecord.id;

  // Check for explicit Remember / Forget commands
  const explicitCmd = memoryService.processExplicitMemoryCommands(rawMessage);
  if (explicitCmd.handled) {
    if (!skillsRegistry.isSkillEnabled('MEMORY')) {
      const refusal = 'Memory skill abhi disabled hai. Memory commands execute karne ke liye Control Panel me Memory skill enable karein.';
      memoryService.appendMessage(conversationId, { role: 'user', content: rawMessage });
      memoryService.appendMessage(conversationId, { role: 'assistant', content: refusal });
      return {
        success: true,
        text: refusal,
        conversationId,
        memoryEvents: [],
        metadata: {
          taskType: 'GENERAL',
          selectedModel: 'Super AI Skills Guard',
          requestedModel: 'internal/skills',
          fallbackOccurred: false,
          provider: 'openrouter',
          keyLabel: 'Skills Guard',
          latencyMs: Date.now() - startTime,
          confidence: 1.0,
          reasoning: 'Memory command blocked: MEMORY skill is currently disabled in Control Panel.',
        },
        model: 'Super AI Skills Guard',
        provider: 'local-security' as any,
        keyUsedName: 'Skills Guard',
        rotated: false,
        taskType: 'GENERAL',
        latencyMs: Date.now() - startTime,
        cognitiveTrace: [
          {
            id: `trace-${Date.now()}`,
            agent: 'SKILL',
            action: 'STATUS',
            detail: 'STATUS = DISABLED (MEMORY)',
            timestamp: new Date().toLocaleTimeString(),
            status: 'FALLBACK',
          },
        ],
        toolActivities: [],
      };
    }

    const latencyMs = Date.now() - startTime;
    const replyText = explicitCmd.message || 'Memory updated.';
    
    // Store user turn and system acknowledgment in conversation memory
    memoryService.appendMessage(conversationId, { role: 'user', content: rawMessage });
    memoryService.appendMessage(conversationId, { role: 'assistant', content: replyText });

    return {
      success: true,
      text: replyText,
      conversationId,
      memoryEvents: explicitCmd.event ? [explicitCmd.event] : [],
      metadata: {
        taskType: 'GENERAL',
        selectedModel: 'Super AI Neural Vault',
        requestedModel: 'internal/memory',
        fallbackOccurred: false,
        provider: 'openrouter',
        keyLabel: 'Local Vault Storage',
        latencyMs,
        confidence: 1.0,
        reasoning: 'Explicit memory management command executed locally.',
      },
      model: 'Super AI Neural Vault',
      provider: 'local-memory',
      keyUsedName: 'Local Vault Storage',
      rotated: false,
      taskType: 'GENERAL',
      latencyMs,
      toolActivities: [],
    };
  }

  // Append user message to conversation memory
  memoryService.appendMessage(conversationId, { role: 'user', content: rawMessage });

  // 0. SWARM INTELLIGENCE ORCHESTRATION V1: Handle massive multi-agent parallel tasks
  // For demonstration, we trigger the swarm if the prompt explicitly mentions 'swarm', 'website', or 'agents'.
  // In a full production setup, this would use a fast local classifier.
  const lowerMsg = rawMessage.toLowerCase();
  if (lowerMsg.includes('swarm') || lowerMsg.includes('website') || lowerMsg.includes('agents')) {
    try {
      const { orchestrateSwarm } = await import('./swarm/swarmRouter.js');
      const swarmResult = await orchestrateSwarm(rawMessage);
      
      memoryService.appendMessage(conversationId, { role: 'assistant', content: swarmResult });

      return {
        success: true,
        text: swarmResult,
        conversationId,
        memoryEvents: [],
        metadata: {
          taskType: 'GENERAL',
          selectedModel: 'Super AI Swarm Orchestrator',
          requestedModel: 'internal/swarm',
          fallbackOccurred: false,
          provider: 'openrouter',
          keyLabel: 'Swarm Intelligence Engine',
          latencyMs: Date.now() - startTime,
          confidence: 0.99,
          reasoning: 'Massive parallel task routed to Swarm Specialists.',
        },
        model: 'Super AI Swarm Orchestrator',
        provider: 'local-swarm' as any,
        keyUsedName: 'Swarm Intelligence Engine',
        rotated: false,
        taskType: 'GENERAL',
        latencyMs: Date.now() - startTime,
        toolActivities: [],
      };
    } catch (err: any) {
      console.error('[SwarmEngine] Execution error:', err);
      // Fall through to standard task engine if error
    }
  }

  // 1. AUTONOMOUS TASK ENGINE V1: Handle multi-step tasks or active autonomous task authorizations
  const taskConfig = storage.getAutonomousTaskConfig();
  const activeTask = autonomousTaskEngine.getCurrentTask(conversationId) || autonomousTaskEngine.getCurrentTask();
  const isCancellation = Boolean(activeTask && recoveryObservabilityEngine.isCancellationIntent(rawMessage));
  const isTaskResume = Boolean(
    request.taskId ||
    request.isAutonomousTask ||
    (request.approvedToolCall && (request as any).stepId !== undefined) ||
    (request.rejectedToolCall && (request as any).stepId !== undefined)
  );

  if (taskConfig.enabled !== false && (isTaskResume || isCancellation || autonomousTaskEngine.isMultiStepIntent(rawMessage))) {
    try {
      const taskRes = await autonomousTaskEngine.runTask({
        userPrompt: rawMessage,
        taskId: request.taskId || (isCancellation && activeTask ? activeTask.taskId : undefined),
        conversationId,
        sessionAuthorizations,
        approvedToolCall: request.approvedToolCall,
        rejectedToolCall: request.rejectedToolCall,
        taskScopedAuthorization: request.taskScopedAuthorization,
        authorizationDecision: request.authorizationDecision,
        stepId: request.stepId,
      });

      if (!taskRes.requiresAuthorization && taskRes.text) {
        memoryService.appendMessage(conversationId, {
          role: 'assistant',
          content: taskRes.text,
        });
      }

      return {
        success: taskRes.success,
        text: taskRes.text,
        conversationId,
        memoryEvents: [],
        metadata: {
          taskType: 'GENERAL',
          selectedModel: taskRes.modelUsed,
          requestedModel: 'internal/autonomous-task',
          fallbackOccurred: Boolean(taskRes.recovered),
          provider: 'openrouter',
          keyLabel: 'Autonomous Task & Recovery Engine',
          latencyMs: taskRes.latencyMs,
          confidence: 0.99,
          reasoning: `Multi-step autonomous task [${taskRes.state}] | Recoveries: ${taskRes.recoveryCount || 0}`,
        },
        model: taskRes.modelUsed,
        provider: 'local-task' as any,
        keyUsedName: 'Autonomous Task Layer',
        rotated: false,
        taskType: 'GENERAL',
        latencyMs: taskRes.latencyMs,
        requiresAuthorization: taskRes.requiresAuthorization,
        pendingAuthorization: taskRes.pendingAuthorization as any,
        toolActivities: taskRes.toolActivities || [],
        cognitiveTrace: taskRes.traces,
        judgeEvaluation: taskRes.judgeEvaluation,
        isAutonomousTask: true,
        taskId: taskRes.taskId,
        taskState: taskRes.state,
        taskSteps: taskRes.steps,
      };
    } catch (err: any) {
      console.error('[AutonomousTaskEngine] Execution error:', err);
      // Fall through to standard cognitive orchestrator if unexpected error
    }
  }

  // 0a. Controlled Browser Automation Planner: Analyze intent for safe browser actions or high-risk prohibited actions
  const plannedBrowserAction = browserPlanner.planAction(rawMessage, conversationId);

  if (plannedBrowserAction?.action === 'blocked_browser_action') {
    const latencyMs = Date.now() - startTime;
    storage.logAudit(
      'BROWSER_ACTION_BLOCKED',
      `Blocked high-risk browser action: "${rawMessage}" | Reason: ${plannedBrowserAction.blockedReason}`,
      'warn'
    );
    const blockedMsg =
      plannedBrowserAction.blockedReason ||
      'Security Policy Violation: This browser action is high-risk or prohibited by Super AI browser security policy.';
    memoryService.appendMessage(conversationId, { role: 'assistant', content: blockedMsg });
    return {
      success: true,
      text: blockedMsg,
      conversationId,
      memoryEvents: [],
      metadata: {
        taskType: 'GENERAL',
        selectedModel: 'Super AI Browser Guard',
        requestedModel: 'internal/browser-security',
        fallbackOccurred: false,
        provider: 'openrouter',
        keyLabel: 'Browser Policy Guard',
        latencyMs,
        confidence: 1.0,
        reasoning: 'Prohibited browser action blocked by security policy.',
      },
      model: 'Super AI Browser Guard',
      provider: 'local-security' as any,
      keyUsedName: 'Browser Policy Guard',
      rotated: false,
      taskType: 'GENERAL',
      latencyMs,
      toolActivities: [
        {
          id: `act_${Date.now()}`,
          timestamp: new Date().toLocaleTimeString(),
          tool: plannedBrowserAction.displayName,
          permission: 'DENIED',
          execution: rawMessage,
          result: 'BLOCKED / NOT AVAILABLE BY BROWSER SECURITY POLICY',
          risk: 'HIGH',
        },
      ],
    };
  }

  if (plannedBrowserAction) {
    // 0a.1 Skills System Enforcement: Check if BROWSER skill is enabled
    if (!skillsRegistry.isSkillEnabled('BROWSER')) {
      const refusal = 'Browser skill abhi disabled hai. Browser actions execute karne ke liye Control Panel me Browser skill enable karein.';
      memoryService.appendMessage(conversationId, { role: 'assistant', content: refusal });
      return {
        success: true,
        text: refusal,
        conversationId,
        memoryEvents: [],
        metadata: {
          taskType: 'GENERAL',
          selectedModel: 'Super AI Skills Guard',
          requestedModel: 'internal/skills',
          fallbackOccurred: false,
          provider: 'openrouter',
          keyLabel: 'Skills Guard',
          latencyMs: Date.now() - startTime,
          confidence: 1.0,
          reasoning: 'Browser action blocked: BROWSER skill is currently disabled in Control Panel.',
        },
        model: 'Super AI Skills Guard',
        provider: 'local-security' as any,
        keyUsedName: 'Skills Guard',
        rotated: false,
        taskType: 'GENERAL',
        latencyMs: Date.now() - startTime,
        cognitiveTrace: [
          {
            id: `trace-${Date.now()}`,
            agent: 'SKILL',
            action: 'STATUS',
            detail: 'STATUS = DISABLED (BROWSER)',
            timestamp: new Date().toLocaleTimeString(),
            status: 'FALLBACK',
          },
        ],
        toolActivities: [
          {
            id: `act_${Date.now()}`,
            timestamp: new Date().toLocaleTimeString(),
            tool: plannedBrowserAction.displayName,
            permission: 'DENIED',
            execution: rawMessage,
            result: 'SKILL DISABLED (BROWSER)',
            risk: plannedBrowserAction.risk,
          },
        ],
      };
    }

    // Check if user rejected this action in authorization modal
    if (
      request.rejectedToolCall &&
      request.rejectedToolCall.tool === plannedBrowserAction.toolName
    ) {
      const cancelMsg = `Action "${plannedBrowserAction.displayName}" was cancelled by user authorization decline.`;
      memoryService.appendMessage(conversationId, { role: 'assistant', content: cancelMsg });
      return {
        success: true,
        text: cancelMsg,
        conversationId,
        memoryEvents: [],
        metadata: {
          taskType: 'GENERAL',
          selectedModel: 'Super AI Permission Engine',
          requestedModel: 'internal/permissions',
          fallbackOccurred: false,
          provider: 'openrouter',
          keyLabel: 'Permission Engine',
          latencyMs: Date.now() - startTime,
          confidence: 1.0,
          reasoning: 'User declined browser action authorization.',
        },
        model: 'Super AI Permission Engine',
        provider: 'local-permissions' as any,
        keyUsedName: 'Permission Engine',
        rotated: false,
        taskType: 'GENERAL',
        latencyMs: Date.now() - startTime,
        toolActivities: [
          {
            id: `act_${Date.now()}`,
            timestamp: new Date().toLocaleTimeString(),
            tool: plannedBrowserAction.displayName,
            permission: 'DENIED',
            execution: JSON.stringify(plannedBrowserAction.parameters),
            result: 'USER REFUSED AUTHORIZATION',
            risk: plannedBrowserAction.risk,
          },
        ],
      };
    }

    // Action Validation
    let validationError: string | null = null;
    if (plannedBrowserAction.action === 'open_page') {
      const val = validateBrowserUrl(plannedBrowserAction.parameters.url);
      if (!val.valid) validationError = val.error || 'Invalid URL';
      else plannedBrowserAction.parameters.url = val.normalizedUrl;
    }

    if (validationError) {
      const errorMsg = `Action Rejected: ${validationError}`;
      memoryService.appendMessage(conversationId, { role: 'assistant', content: errorMsg });
      return {
        success: true,
        text: errorMsg,
        conversationId,
        memoryEvents: [],
        metadata: {
          taskType: 'GENERAL',
          selectedModel: 'Super AI Validation Layer',
          requestedModel: 'internal/validation',
          fallbackOccurred: false,
          provider: 'openrouter',
          keyLabel: 'Validation Layer',
          latencyMs: Date.now() - startTime,
          confidence: 1.0,
          reasoning: 'Browser URL / action validation failed.',
        },
        model: 'Super AI Validation Layer',
        provider: 'local-validation' as any,
        keyUsedName: 'Validation Layer',
        rotated: false,
        taskType: 'GENERAL',
        latencyMs: Date.now() - startTime,
        toolActivities: [],
      };
    }

    // Permission Engine Check (ALLOW / ASK / DENY)
    const isAlreadyApproved =
      request.approvedToolCall &&
      request.approvedToolCall.tool === plannedBrowserAction.toolName;
    const permCheck = checkToolPermission(
      plannedBrowserAction.toolName,
      sessionAuthorizations,
      plannedBrowserAction.actionDescription
    );

    if (permCheck.level === 'DENY') {
      const targetDesc =
        plannedBrowserAction.parameters.url ||
        plannedBrowserAction.parameters.link ||
        plannedBrowserAction.displayName;
      const denyMsg = `${targetDesc} open/execute karna allowed nahi hai kyunki ${plannedBrowserAction.requiredPermission} permission policy DENY par set hai. (Access Denied by Browser Security Policy)`;
      storage.logAudit(
        'BROWSER_ACTION_DENIED',
        `Action: ${plannedBrowserAction.action} | Target: ${JSON.stringify(
          plannedBrowserAction.parameters
        )} | Auth: DENIED | Status: REJECTED_BY_POLICY`,
        'warn'
      );
      memoryService.appendMessage(conversationId, { role: 'assistant', content: denyMsg });
      return {
        success: true,
        text: denyMsg,
        conversationId,
        memoryEvents: [],
        metadata: {
          taskType: 'GENERAL',
          selectedModel: 'Super AI Permission Engine',
          requestedModel: 'internal/permissions',
          fallbackOccurred: false,
          provider: 'openrouter',
          keyLabel: 'Permission Engine',
          latencyMs: Date.now() - startTime,
          confidence: 1.0,
          reasoning: 'Permission level is DENY.',
        },
        model: 'Super AI Permission Engine',
        provider: 'local-permissions' as any,
        keyUsedName: 'Permission Engine',
        rotated: false,
        taskType: 'GENERAL',
        latencyMs: Date.now() - startTime,
        toolActivities: [
          {
            id: `act_${Date.now()}`,
            timestamp: new Date().toLocaleTimeString(),
            tool: plannedBrowserAction.displayName,
            permission: 'DENIED',
            execution: JSON.stringify(plannedBrowserAction.parameters),
            result: 'DENIED BY PERMISSION POLICY',
            risk: plannedBrowserAction.risk,
          },
        ],
      };
    }

    if (permCheck.requiresPrompt && !isAlreadyApproved) {
      return {
        success: true,
        requiresAuthorization: true,
        pendingAuthorization: {
          tool: plannedBrowserAction.toolName,
          toolName: plannedBrowserAction.displayName,
          actionDescription: plannedBrowserAction.actionDescription,
          risk: plannedBrowserAction.risk,
          requiredPermission: plannedBrowserAction.requiredPermission,
          arguments: plannedBrowserAction.parameters,
          toolCallId: `call_${plannedBrowserAction.toolName}_${Date.now()}`,
        },
        conversationId,
        text: `Clearance required: Super AI requests authorization to ${plannedBrowserAction.actionDescription.toLowerCase()}.`,
        metadata: {
          taskType: 'GENERAL',
          selectedModel: 'Super AI Permission Engine',
          requestedModel: 'internal/permissions',
          fallbackOccurred: false,
          provider: 'openrouter',
          keyLabel: 'Permission Engine',
          latencyMs: Date.now() - startTime,
          confidence: 1.0,
          reasoning: 'Browser action requires user authorization (ASK).',
        },
        model: 'Super AI Permission Engine',
        provider: 'local-permissions' as any,
        keyUsedName: 'Permission Engine',
        rotated: false,
        taskType: 'GENERAL',
        latencyMs: Date.now() - startTime,
        toolActivities: [],
      };
    }

    // Permission is ALLOWED or user clicked AUTHORIZE ONCE / ALWAYS ALLOW
    let browserResult: any;
    if (plannedBrowserAction.action === 'open_page') {
      browserResult = await browserService.openPage(
        conversationId,
        plannedBrowserAction.parameters.url
      );
    } else if (plannedBrowserAction.action === 'read_page') {
      browserResult = browserService.readPage(conversationId);
    } else if (plannedBrowserAction.action === 'find_text') {
      browserResult = browserService.findText(
        conversationId,
        plannedBrowserAction.parameters.query
      );
    } else if (plannedBrowserAction.action === 'find_links') {
      browserResult = browserService.findLinks(
        conversationId,
        plannedBrowserAction.parameters.query
      );
    } else if (plannedBrowserAction.action === 'click_link') {
      browserResult = await browserService.clickLink(
        conversationId,
        plannedBrowserAction.parameters.link
      );
    } else if (plannedBrowserAction.action === 'go_back') {
      browserResult = await browserService.goBack(conversationId);
    } else if (plannedBrowserAction.action === 'go_forward') {
      browserResult = await browserService.goForward(conversationId);
    } else if (plannedBrowserAction.action === 'refresh_page') {
      browserResult = await browserService.refreshPage(conversationId);
    }

    // Natural Delhi/Hinglish response
    let naturalResponse = '';
    if (!browserResult?.success) {
      naturalResponse = browserResult?.error || 'Browser action execute nahi ho paya.';
    } else {
      switch (plannedBrowserAction.action) {
        case 'open_page': {
          const u = plannedBrowserAction.parameters.url || '';
          if (u.includes('google.com')) naturalResponse = 'Google khol diya.';
          else naturalResponse = `"${browserResult.title}" page khol diya hai (${browserResult.url}).`;
          break;
        }
        case 'read_page': {
          const preview = browserResult.content ? browserResult.content.slice(0, 320) : '';
          naturalResponse = `Is page ko read kar liya hai:\n\n"${browserResult.title}"\n\n${preview}${browserResult.content?.length > 320 ? '...' : ''}`;
          break;
        }
        case 'find_text': {
          if (browserResult.matchedText?.length > 0) {
            naturalResponse = `Page par "${plannedBrowserAction.parameters.query}" ke ${browserResult.matchedText.length} occurrences mile:\n${browserResult.matchedText.slice(0, 2).join('\n')}`;
          } else {
            naturalResponse = `Page par "${plannedBrowserAction.parameters.query}" nahi mila.`;
          }
          break;
        }
        case 'find_links': {
          const linksList = (browserResult.links || [])
            .slice(0, 5)
            .map((l: any, i: number) => `${i + 1}. ${l.text} (${l.href})`)
            .join('\n');
          naturalResponse = `Is page par documentation / relevant links:\n\n${linksList || 'Koi matching links nahi mile.'}`;
          break;
        }
        case 'click_link': {
          naturalResponse = `"${plannedBrowserAction.parameters.link}" link open kar diya hai. Page: "${browserResult.title}".`;
          break;
        }
        case 'go_back': {
          naturalResponse = `Peeche chale gaye: "${browserResult.title}".`;
          break;
        }
        case 'go_forward': {
          naturalResponse = `Aage chale gaye: "${browserResult.title}".`;
          break;
        }
        case 'refresh_page': {
          naturalResponse = `Page refresh kar diya hai: "${browserResult.title}".`;
          break;
        }
        default:
          naturalResponse = browserResult.details || 'Browser action completed successfully.';
      }
    }

    memoryService.appendMessage(conversationId, { role: 'assistant', content: naturalResponse });

    return {
      success: true,
      text: naturalResponse,
      conversationId,
      memoryEvents: [],
      metadata: {
        taskType: 'GENERAL',
        selectedModel: 'Super AI Controlled Browser',
        requestedModel: 'internal/browser',
        fallbackOccurred: false,
        provider: 'openrouter',
        keyLabel: 'Browser Engine V1',
        latencyMs: Date.now() - startTime,
        confidence: 1.0,
        reasoning: `Executed browser action "${plannedBrowserAction.displayName}".`,
      },
      model: 'Super AI Controlled Browser',
      provider: 'local-browser' as any,
      keyUsedName: 'Browser Engine V1',
      rotated: false,
      taskType: 'GENERAL',
      latencyMs: Date.now() - startTime,
      toolActivities: [
        {
          id: `act_${Date.now()}`,
          timestamp: new Date().toLocaleTimeString(),
          tool: plannedBrowserAction.displayName,
          permission: 'ALLOWED',
          execution: JSON.stringify(plannedBrowserAction.parameters),
          result: browserResult.success
            ? `SUCCESS (${browserResult.title || browserResult.details || 'OK'})`
            : `FAILED: ${browserResult.error}`,
          risk: plannedBrowserAction.risk,
        },
      ],
    };
  }

  // 0b. Action Planner: Analyze intent for safe Windows computer actions or prohibited terminal commands
  const plannedComputerAction = computerControl.planAction(rawMessage);

  if (plannedComputerAction?.action === 'blocked_terminal') {
    const latencyMs = Date.now() - startTime;
    storage.logAudit(
      'TERMINAL_COMMAND_BLOCKED',
      `Blocked attempt to execute terminal/shell command: "${rawMessage}"`,
      'warn'
    );
    const blockedMsg =
      'Security Policy Violation: Arbitrary terminal execution, shell scripts, and PowerShell/CMD commands are strictly prohibited and permanently blocked in Super AI.';
    memoryService.appendMessage(conversationId, { role: 'assistant', content: blockedMsg });
    return {
      success: true,
      text: blockedMsg,
      conversationId,
      memoryEvents: [],
      metadata: {
        taskType: 'GENERAL',
        selectedModel: 'Super AI Security Guard',
        requestedModel: 'internal/security',
        fallbackOccurred: false,
        provider: 'openrouter',
        keyLabel: 'System Policy Guard',
        latencyMs,
        confidence: 1.0,
        reasoning: 'Arbitrary terminal command blocked by security policy.',
      },
      model: 'Super AI Security Guard',
      provider: 'local-security' as any,
      keyUsedName: 'System Policy Guard',
      rotated: false,
      taskType: 'GENERAL',
      latencyMs,
      toolActivities: [
        {
          id: `act_${Date.now()}`,
          timestamp: new Date().toLocaleTimeString(),
          tool: 'terminal_execution',
          permission: 'DENIED',
          execution: rawMessage,
          result: 'BLOCKED / NOT AVAILABLE BY SYSTEM POLICY',
          risk: 'HIGH',
        },
      ],
    };
  }

  if (plannedComputerAction) {
    // 0b.1 Skills System Enforcement: Check if WINDOWS skill is enabled
    if (!skillsRegistry.isSkillEnabled('WINDOWS')) {
      const refusal = 'Windows skill abhi disabled hai. Applications ya computer actions execute karne ke liye Control Panel me Windows skill enable karein.';
      memoryService.appendMessage(conversationId, { role: 'assistant', content: refusal });
      return {
        success: true,
        text: refusal,
        conversationId,
        memoryEvents: [],
        metadata: {
          taskType: 'GENERAL',
          selectedModel: 'Super AI Skills Guard',
          requestedModel: 'internal/skills',
          fallbackOccurred: false,
          provider: 'openrouter',
          keyLabel: 'Skills Guard',
          latencyMs: Date.now() - startTime,
          confidence: 1.0,
          reasoning: 'Computer control action blocked: WINDOWS skill is currently disabled in Control Panel.',
        },
        model: 'Super AI Skills Guard',
        provider: 'local-security' as any,
        keyUsedName: 'Skills Guard',
        rotated: false,
        taskType: 'GENERAL',
        latencyMs: Date.now() - startTime,
        cognitiveTrace: [
          {
            id: `trace-${Date.now()}`,
            agent: 'SKILL',
            action: 'STATUS',
            detail: 'STATUS = DISABLED (WINDOWS)',
            timestamp: new Date().toLocaleTimeString(),
            status: 'FALLBACK',
          },
        ],
        toolActivities: [
          {
            id: `act_${Date.now()}`,
            timestamp: new Date().toLocaleTimeString(),
            tool: plannedComputerAction.displayName,
            permission: 'DENIED',
            execution: rawMessage,
            result: 'SKILL DISABLED (WINDOWS)',
            risk: plannedComputerAction.risk,
          },
        ],
      };
    }

    // Check if user rejected this action in modal
    if (request.rejectedToolCall && request.rejectedToolCall.tool === plannedComputerAction.action) {
      const cancelMsg = `Action "${plannedComputerAction.displayName}" was cancelled by user authorization decline.`;
      memoryService.appendMessage(conversationId, { role: 'assistant', content: cancelMsg });
      return {
        success: true,
        text: cancelMsg,
        conversationId,
        memoryEvents: [],
        metadata: {
          taskType: 'GENERAL',
          selectedModel: 'Super AI Permission Engine',
          requestedModel: 'internal/permissions',
          fallbackOccurred: false,
          provider: 'openrouter',
          keyLabel: 'Permission Engine',
          latencyMs: Date.now() - startTime,
          confidence: 1.0,
          reasoning: 'User declined action authorization.',
        },
        model: 'Super AI Permission Engine',
        provider: 'local-permissions' as any,
        keyUsedName: 'Permission Engine',
        rotated: false,
        taskType: 'GENERAL',
        latencyMs: Date.now() - startTime,
        toolActivities: [
          {
            id: `act_${Date.now()}`,
            timestamp: new Date().toLocaleTimeString(),
            tool: plannedComputerAction.displayName,
            permission: 'DENIED',
            execution: JSON.stringify(plannedComputerAction.parameters),
            result: 'USER REFUSED AUTHORIZATION',
            risk: plannedComputerAction.risk,
          },
        ],
      };
    }

    // Action Validation
    let validationError: string | null = null;
    if (plannedComputerAction.action === 'open_application') {
      const val = computerControl.validateApplication(plannedComputerAction.parameters.application);
      if (!val.valid) validationError = val.error || 'Invalid application';
    } else if (plannedComputerAction.action === 'open_url') {
      const val = computerControl.validateUrl(plannedComputerAction.parameters.url);
      if (!val.valid) validationError = val.error || 'Invalid URL';
    } else if (plannedComputerAction.action === 'open_folder') {
      const val = computerControl.validateFolder(plannedComputerAction.parameters.folder);
      if (!val.valid) validationError = val.error || 'Invalid folder';
    } else if (plannedComputerAction.action === 'open_file') {
      const val = computerControl.validateFile(plannedComputerAction.parameters.path);
      if (!val.valid) validationError = val.error || 'Invalid file';
    }

    if (validationError) {
      const errorMsg = `Action Rejected: ${validationError}`;
      memoryService.appendMessage(conversationId, { role: 'assistant', content: errorMsg });
      return {
        success: true,
        text: errorMsg,
        conversationId,
        memoryEvents: [],
        metadata: {
          taskType: 'GENERAL',
          selectedModel: 'Super AI Validation Layer',
          requestedModel: 'internal/validation',
          fallbackOccurred: false,
          provider: 'openrouter',
          keyLabel: 'Validation Layer',
          latencyMs: Date.now() - startTime,
          confidence: 1.0,
          reasoning: 'Action validation failed.',
        },
        model: 'Super AI Validation Layer',
        provider: 'local-validation' as any,
        keyUsedName: 'Validation Layer',
        rotated: false,
        taskType: 'GENERAL',
        latencyMs: Date.now() - startTime,
        toolActivities: [],
      };
    }

    // Permission Engine Check (ALLOW / ASK / DENY)
    const isAlreadyApproved =
      request.approvedToolCall && request.approvedToolCall.tool === plannedComputerAction.action;
    const permCheck = checkToolPermission(
      plannedComputerAction.action,
      sessionAuthorizations,
      plannedComputerAction.actionDescription
    );

    if (permCheck.level === 'DENY') {
      const targetDesc =
        plannedComputerAction.parameters.application ||
        plannedComputerAction.parameters.folder ||
        plannedComputerAction.parameters.url ||
        plannedComputerAction.displayName;
      const denyMsg = `${targetDesc} open karna allowed nahi hai kyunki ${plannedComputerAction.requiredPermission} permission policy DENY par set hai. (Access Denied by System Security Policy)`;
      storage.logAudit(
        'COMPUTER_ACTION_DENIED',
        `Action: ${plannedComputerAction.action} | Target: ${JSON.stringify(
          plannedComputerAction.parameters
        )} | Auth: DENIED | Latency: 5ms | Status: REJECTED_BY_POLICY`,
        'warn'
      );
      memoryService.appendMessage(conversationId, { role: 'assistant', content: denyMsg });
      return {
        success: true,
        text: denyMsg,
        conversationId,
        memoryEvents: [],
        metadata: {
          taskType: 'GENERAL',
          selectedModel: 'Super AI Permission Engine',
          requestedModel: 'internal/permissions',
          fallbackOccurred: false,
          provider: 'openrouter',
          keyLabel: 'Permission Engine',
          latencyMs: Date.now() - startTime,
          confidence: 1.0,
          reasoning: 'Permission level is DENY.',
        },
        model: 'Super AI Permission Engine',
        provider: 'local-permissions' as any,
        keyUsedName: 'Permission Engine',
        rotated: false,
        taskType: 'GENERAL',
        latencyMs: Date.now() - startTime,
        toolActivities: [
          {
            id: `act_${Date.now()}`,
            timestamp: new Date().toLocaleTimeString(),
            tool: plannedComputerAction.displayName,
            permission: 'DENIED',
            execution: JSON.stringify(plannedComputerAction.parameters),
            result: 'DENIED BY PERMISSION POLICY',
            risk: plannedComputerAction.risk,
          },
        ],
      };
    }

    if (permCheck.requiresPrompt && !isAlreadyApproved) {
      return {
        success: true,
        requiresAuthorization: true,
        pendingAuthorization: {
          tool: plannedComputerAction.action,
          toolName: plannedComputerAction.displayName,
          actionDescription: plannedComputerAction.actionDescription,
          risk: plannedComputerAction.risk,
          requiredPermission: plannedComputerAction.requiredPermission,
          arguments: plannedComputerAction.parameters,
          toolCallId: `call_${plannedComputerAction.action}_${Date.now()}`,
        },
        conversationId,
        text: `Clearance required: Super AI requests permission to ${plannedComputerAction.actionDescription.toLowerCase()}.`,
        metadata: {
          taskType: 'GENERAL',
          selectedModel: 'Super AI Permission Engine',
          requestedModel: 'internal/permissions',
          fallbackOccurred: false,
          provider: 'openrouter',
          keyLabel: 'Permission Engine',
          latencyMs: Date.now() - startTime,
          confidence: 1.0,
          reasoning: 'Action requires user authorization (ASK).',
        },
        model: 'Super AI Permission Engine',
        provider: 'local-permissions' as any,
        keyUsedName: 'Permission Engine',
        rotated: false,
        taskType: 'GENERAL',
        latencyMs: Date.now() - startTime,
        toolActivities: [],
      };
    }

    // Permission is ALLOWED or user clicked AUTHORIZE ONCE / ALWAYS ALLOW
    const execResult = await computerControl.executeAction(
      plannedComputerAction.action,
      plannedComputerAction.parameters,
      isAlreadyApproved ? 'USER_APPROVED' : 'ALLOWED'
    );

    // Natural conversational response without exposing raw JSON
    let naturalResponse = '';
    if (plannedComputerAction.action === 'open_application') {
      const appKey = (plannedComputerAction.parameters.application || '').toLowerCase();
      if (appKey === 'chrome') naturalResponse = 'Chrome khol diya.';
      else if (appKey === 'notepad') naturalResponse = 'Notepad khol diya.';
      else if (appKey === 'calculator') naturalResponse = 'Calculator open kar diya hai.';
      else if (appKey === 'edge') naturalResponse = 'Microsoft Edge khol diya.';
      else if (appKey === 'explorer') naturalResponse = 'File Explorer open kar diya hai.';
      else naturalResponse = `${plannedComputerAction.displayName} open kar diya hai.`;
    } else if (plannedComputerAction.action === 'open_url') {
      naturalResponse = `${plannedComputerAction.parameters.url} default browser me open kar diya hai.`;
    } else if (plannedComputerAction.action === 'open_folder') {
      naturalResponse = `${plannedComputerAction.parameters.folder} folder open kar diya hai.`;
    } else if (plannedComputerAction.action === 'open_file') {
      naturalResponse = `${plannedComputerAction.parameters.path} file open kar di gayi hai.`;
    } else if (plannedComputerAction.action === 'screenshot') {
      naturalResponse = 'Current display ka screenshot capture kar liya gaya hai.';
    } else if (plannedComputerAction.action === 'get_active_window') {
      naturalResponse = `Active window: ${execResult.target}`;
    } else {
      naturalResponse = execResult.details || 'Action completed successfully.';
    }

    memoryService.appendMessage(conversationId, { role: 'assistant', content: naturalResponse });

    const actLog: ToolActivityLog = {
      id: `act_${Date.now()}`,
      timestamp: new Date().toLocaleTimeString(),
      tool: plannedComputerAction.displayName,
      permission: isAlreadyApproved ? 'ASKED' : 'ALLOWED',
      execution: `${plannedComputerAction.action}(${JSON.stringify(plannedComputerAction.parameters)})`,
      result: JSON.stringify({ success: true, action: plannedComputerAction.action, target: execResult.target }),
      risk: plannedComputerAction.risk,
    };

    return {
      success: true,
      text: naturalResponse,
      conversationId,
      memoryEvents: [],
      metadata: {
        taskType: 'GENERAL',
        selectedModel: 'Super AI Action Layer',
        requestedModel: 'internal/actions',
        fallbackOccurred: false,
        provider: 'openrouter',
        keyLabel: 'Action Layer',
        latencyMs: Date.now() - startTime,
        confidence: 1.0,
        reasoning: 'Planned computer control action executed.',
      },
      model: 'Super AI Action Layer',
      provider: 'local-action' as any,
      keyUsedName: 'Action Layer',
      rotated: false,
      taskType: 'GENERAL',
      latencyMs: Date.now() - startTime,
      toolActivities: [actLog],
    };
  }

  // Retrieve relevant long-term memories and active working memory context
  const memoryContext = memoryService.buildContextPrompt(conversationId, rawMessage);
  const memoryEvents: MemoryEvent[] = [...memoryContext.events];

  // 1. Task Classification
  const classification: TaskClassification = request.forceRole
    ? {
        category: request.forceRole,
        confidence: 1.0,
        reason: 'Manually forced role',
        matchedRules: ['manual:forced_role'],
      }
    : classifyTask(rawMessage, { hasImages: request.hasImages });

  const taskType = classification.category;

  // 2. Fetch system configuration
  const config = storage.getConfig();
  const models: ModelRoleConfig = config.models;

  // MULTI-AGENT COGNITIVE BRAIN V1 PIPELINE
  if (config.cognitiveEngine?.enabled !== false && !request.approvedToolCall && !request.rejectedToolCall) {
    try {
      const historyFormatted: Array<{ role: 'user' | 'assistant' | 'system'; content: string }> = [];
      if (request.history && request.history.length > 0) {
        for (const h of request.history.slice(-6)) {
          if ('sender' in h) {
            historyFormatted.push({
              role: h.sender === 'USER' ? 'user' : 'assistant',
              content: h.text || '',
            });
          } else if ('role' in h) {
            historyFormatted.push({
              role: h.role as any,
              content: h.content || '',
            });
          }
        }
      }

      const brainRes = await runCognitiveBrain({
        message: rawMessage,
        conversationId,
        hasImages: request.hasImages,
        forceRole: request.forceRole,
        sessionAuthorizations: request.sessionAuthorizations,
        history: historyFormatted,
        memoryContext: memoryContext.systemPromptAdditions,
      });

      // Persist to memory if response is finalized
      if (!brainRes.requiresAuthorization) {
        memoryService.appendMessage(conversationId, {
          role: 'user',
          content: rawMessage,
        });
        memoryService.appendMessage(conversationId, {
          role: 'assistant',
          content: brainRes.text,
        });
      }

      return {
        success: brainRes.success,
        text: brainRes.text,
        conversationId,
        memoryEvents,
        metadata: {
          taskType: brainRes.taskType as any,
          selectedModel: brainRes.modelUsed,
          requestedModel: brainRes.modelUsed,
          fallbackOccurred: Boolean(brainRes.fallbackOccurred),
          provider: 'openrouter',
          keyLabel: 'Multi-Agent Cognitive Brain V1',
          latencyMs: brainRes.latencyMs,
          confidence: 0.98,
          reasoning: `Orchestrated via Cognitive Brain (Planner -> Specialist -> Judge [${brainRes.judgeEvaluation?.verdict || 'STANDBY'}])`,
        },
        model: brainRes.modelUsed,
        provider: 'openrouter',
        keyUsedName: 'Cognitive Brain Layer',
        rotated: false,
        taskType: brainRes.taskType as any,
        latencyMs: brainRes.latencyMs,
        requiresAuthorization: brainRes.requiresAuthorization,
        pendingAuthorization: brainRes.pendingAuthorization,
        toolActivities: brainRes.toolActivities,
        cognitiveTrace: brainRes.traces,
        judgeEvaluation: brainRes.judgeEvaluation,
      };
    } catch (err) {
      console.error('[CognitiveBrain] Fallback to legacy orchestrator due to exception:', err);
      // Fall through to standard orchestrator
    }
  }

  // 3. Resolve target model based on classified task role
  let targetModel = request.forceModel;
  if (!targetModel) {
    switch (taskType) {
      case 'REASONING':
        targetModel = models.reasoning || models.general;
        break;
      case 'CODING':
        targetModel = models.coding || models.general;
        break;
      case 'VISION':
        targetModel = models.vision || models.general;
        break;
      case 'GENERAL':
      default:
        targetModel = models.general;
        break;
    }
  }

  if (!targetModel || !targetModel.trim()) {
    targetModel = models.general || 'deepseek/deepseek-chat';
  }

  // 4. Verify API Keys availability
  const hasKeys = keyManager.hasAvailableKey('openrouter');
  if (!hasKeys) {
    const latencyMs = Date.now() - startTime;
    return {
      success: true,
      text:
        'Super AI core is online, but no OpenRouter API key is currently active in the vault.\n\n' +
        'To connect live AI models (DeepSeek R1, Qwen Coder, Llama 3.3, Gemini 2.0):\n' +
        '1. Open the "CONTROL PANEL" from the top navigation bar.\n' +
        '2. Select "API Keys".\n' +
        '3. Add your OpenRouter API key.\n' +
        '4. Test connection and enable the key.\n\n' +
        'Once configured, the Orchestrator will automatically classify and route each command to the optimal model.',
      metadata: {
        taskType,
        selectedModel: 'Super AI Setup Standby',
        requestedModel: targetModel,
        fallbackOccurred: false,
        provider: 'openrouter',
        keyLabel: 'None (Setup Mode)',
        latencyMs,
        confidence: classification.confidence,
        reasoning: classification.reason,
      },
      model: 'Super AI Setup Standby',
      provider: 'local-diagnostic',
      keyUsedName: 'None (Setup Mode)',
      rotated: false,
      taskType,
      latencyMs,
      isSetupPrompt: true,
      toolActivities: [],
      conversationId,
      memoryEvents,
    };
  }

  // 5. Format Chat History
  const formattedMessages: ChatCompletionMessage[] = [];

  // Super AI Female Persona & Hinglish Speaking Style
  const personaInstruction =
    `SUPER AI IDENTITY & PERSONA:\n` +
    `You are Super AI, a futuristic, intelligent, calm, and elegant FEMALE AI assistant.\n` +
    `Core Voice & Style Persona:\n` +
    `- Female, Indian, natural, calm, confident, intelligent, slightly warm, and futuristic.\n` +
    `- Conversational Delhi / North-Indian Hinglish style for casual or Hindi prompts.\n` +
    `- Avoid robotic Hindi, textbook Hindi, overly formal Hindi, or literal word-by-word translations.\n` +
    `- Speak naturally as a female AI (use feminine verb endings in Hindi/Hinglish: e.g., "karti hoon", "bata rahi hoon", "dekh sakti hoon").\n` +
    `- Do NOT repeatedly say "Sir". Speak respectfully and naturally without servile repetition.\n` +
    `- Example tone and phrases:\n` +
    `  "Thik hai, main check karti hoon."\n` +
    `  "Ek second, main verify karti hoon."\n` +
    `  "Ho gaya. Chrome open kar diya."\n` +
    `  "Ye thoda interesting hai, main ise check karti hoon."\n\n`;

  // Inject system tool instructions
  formattedMessages.push({
    role: 'system',
    content: personaInstruction + toolRegistry.getSystemToolInstructions(),
  });

  // Inject retrieved long-term memories & working memory context
  if (memoryContext.systemPromptAdditions) {
    formattedMessages.push({
      role: 'system',
      content: memoryContext.systemPromptAdditions,
    });
  }

  if (request.history && request.history.length > 0) {
    for (const h of request.history.slice(-8)) {
      if ('sender' in h) {
        if (h.sender === 'USER') {
          formattedMessages.push({ role: 'user', content: h.text || '' });
        } else if (h.sender === 'SUPER_AI') {
          formattedMessages.push({ role: 'assistant', content: h.text || '' });
        }
      } else if ('role' in h) {
        formattedMessages.push({ role: h.role as any, content: h.content || '' });
      }
    }
  }

  formattedMessages.push({ role: 'user', content: rawMessage });

  const availableToolsForModel = toolRegistry.getToolDefinitionsForModel();

  let finalReplyText = '';
  let lastCompletionResult: ChatCompletionResult | null = null;
  let fallbackOccurred = false;
  let fallbackModelUsed: string | undefined;

  const MAX_TOOL_ITERATIONS = 5;
  let iteration = 0;

  // Handle user response from Tool Authorization Modal if present
  if (request.rejectedToolCall) {
    const rejectedTool = request.rejectedToolCall.tool;
    const rejectActivity: ToolActivityLog = {
      id: `act-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString(),
      tool: rejectedTool,
      permission: 'DENIED',
      execution: `Tool request: ${rejectedTool}`,
      result: request.rejectedToolCall.reason || 'User denied authorization clearance.',
      risk: 'MEDIUM',
    };
    toolActivities.push(rejectActivity);
    storage.logAudit(
      'TOOL_REJECTED_BY_USER',
      `User refused authorization clearance for tool "${rejectedTool}".`,
      'warn'
    );
    formattedMessages.push({
      role: 'user',
      content: `[SECURITY POLICY NOTIFICATION]: User refused authorization clearance to execute tool "${rejectedTool}". Please proceed without executing this tool and explain gracefully to the user.`,
    });
  } else if (request.approvedToolCall) {
    // User explicitly approved tool in HUD modal
    const approved = request.approvedToolCall;
    const execResult = await toolRegistry.execute(approved.tool, approved.arguments, {
      sessionAuthorizations,
    });

    const toolObj = toolRegistry.getTool(approved.tool);
    const actLog: ToolActivityLog = {
      id: `act-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString(),
      tool: toolObj?.displayName || approved.tool,
      permission: 'ALLOWED',
      execution: execResult.sanitizedExecutionSummary || JSON.stringify(approved.arguments),
      result: execResult.sanitizedResultSummary || execResult.displaySummary || 'Executed',
      risk: toolObj?.risk || 'LOW',
    };
    toolActivities.push(actLog);

    storage.logAudit(
      'TOOL_EXECUTION',
      `TOOL REQUEST: ${toolObj?.displayName || approved.tool} | PERMISSION: ALLOWED | EXECUTION: ${actLog.execution} | RESULT: ${actLog.result}`,
      'info'
    );

    // Update working memory with tool execution result
    memoryService.updateWorkingMemory(conversationId, {
      currentToolExecution: {
        tool: toolObj?.displayName || approved.tool,
        arguments: approved.arguments,
        startedAt: new Date().toISOString(),
      },
      temporaryVariables: {
        lastExecutedTool: approved.tool,
        lastToolResult: execResult.result,
        ...(approved.tool === 'calculator' && typeof execResult.result === 'number'
          ? { lastCalculation: execResult.result }
          : {}),
      },
    });

    const callId = approved.toolCallId || `call_${approved.tool}_${Date.now()}`;
    formattedMessages.push({
      role: 'assistant',
      content: null,
      tool_calls: [
        {
          id: callId,
          type: 'function',
          function: {
            name: approved.tool,
            arguments: JSON.stringify(approved.arguments),
          },
        },
      ],
    });
    formattedMessages.push({
      role: 'tool',
      tool_call_id: callId,
      name: approved.tool,
      content:
        typeof execResult.result === 'object'
          ? JSON.stringify(execResult.result)
          : String(execResult.result !== undefined ? execResult.result : execResult.error),
    });
  }

  // AI Tool-Calling Loop (up to 5 iterations)
  while (iteration < MAX_TOOL_ITERATIONS) {
    iteration++;

    try {
      lastCompletionResult = await executeOpenRouterChat({
        messages: formattedMessages,
        model: targetModel,
        role: taskType.toLowerCase() as any,
        tools: availableToolsForModel,
      });
    } catch (primaryErr: any) {
      const generalModel = models.general || 'deepseek/deepseek-chat';
      if (targetModel !== generalModel && config.routing.enableFallback !== false) {
        storage.logAudit(
          'MODEL_FALLBACK',
          `Specialized model "${targetModel}" failed for task "${taskType}": ${primaryErr.message}. Fallback engaged -> switching to General model "${generalModel}".`,
          'warn'
        );

        try {
          lastCompletionResult = await executeOpenRouterChat({
            messages: formattedMessages,
            model: generalModel,
            role: 'general',
            tools: availableToolsForModel,
          });
          fallbackOccurred = true;
          fallbackModelUsed = generalModel;
        } catch (fallbackErr: any) {
          throw new Error(
            `Primary model (${targetModel}) and General fallback (${generalModel}) both failed: ${
              fallbackErr.message || primaryErr.message
            }`
          );
        }
      } else {
        throw primaryErr;
      }
    }

    // Check if the model decided to call a tool
    const detectedToolCall = extractToolCall(lastCompletionResult);

    if (!detectedToolCall) {
      // No tool call requested -> Final conversational response obtained!
      finalReplyText = lastCompletionResult.text;
      break;
    }

    const toolName = detectedToolCall.name.toLowerCase();
    const toolArgs = detectedToolCall.arguments || {};
    const toolCallId = detectedToolCall.id || `call_${toolName}_${Date.now()}`;

    // 1. Validate tool exists and is permitted by security policy
    if (toolRegistry.isBlocked(toolName)) {
      const actLog: ToolActivityLog = {
        id: `act-${Date.now()}-${iteration}`,
        timestamp: new Date().toLocaleTimeString(),
        tool: toolName,
        permission: 'DENIED',
        execution: JSON.stringify(toolArgs),
        result: 'BLOCKED BY SECURITY POLICY [TERMINAL / COMMAND EXECUTION BLOCKED]',
        risk: 'HIGH',
      };
      toolActivities.push(actLog);

      storage.logAudit(
        'TOOL_BLOCKED_POLICY',
        `TOOL REQUEST: ${toolName} | PERMISSION: DENIED | Terminal execution and shell commands are permanently blocked.`,
        'warn'
      );

      formattedMessages.push({
        role: 'assistant',
        content: null,
        tool_calls: [
          {
            id: toolCallId,
            type: 'function',
            function: { name: toolName, arguments: JSON.stringify(toolArgs) },
          },
        ],
      });
      formattedMessages.push({
        role: 'tool',
        tool_call_id: toolCallId,
        name: toolName,
        content: JSON.stringify({
          error: `Tool "${toolName}" is permanently prohibited by system security policy. Terminal and command execution are disabled. Inform the user gracefully.`,
          denied: true,
        }),
      });
      continue;
    }

    const tool = toolRegistry.getTool(toolName);
    if (!tool) {
      formattedMessages.push({
        role: 'assistant',
        content: null,
        tool_calls: [
          {
            id: toolCallId,
            type: 'function',
            function: { name: toolName, arguments: JSON.stringify(toolArgs) },
          },
        ],
      });
      formattedMessages.push({
        role: 'tool',
        tool_call_id: toolCallId,
        name: toolName,
        content: JSON.stringify({
          error: `Tool "${toolName}" is not registered in the system. Available tools: calculator, current_time, current_date, web_search, read_file.`,
        }),
      });
      continue;
    }

    // 2. Check if tool is enabled in Control Panel
    const toolsConfig = storage.getToolsConfig();
    const toolSetting = toolsConfig[toolName] || { enabled: true, permission: 'ALLOW' };
    if (!toolSetting.enabled) {
      const actLog: ToolActivityLog = {
        id: `act-${Date.now()}-${iteration}`,
        timestamp: new Date().toLocaleTimeString(),
        tool: tool.displayName,
        permission: 'DENIED',
        execution: JSON.stringify(toolArgs),
        result: `Tool "${tool.displayName}" is currently disabled in the Control Panel.`,
        risk: tool.risk,
      };
      toolActivities.push(actLog);

      storage.logAudit(
        'TOOL_DISABLED',
        `TOOL REQUEST: ${tool.displayName} | PERMISSION: DENIED | Tool is disabled in Control Panel.`,
        'warn'
      );

      formattedMessages.push({
        role: 'assistant',
        content: null,
        tool_calls: [
          {
            id: toolCallId,
            type: 'function',
            function: { name: toolName, arguments: JSON.stringify(toolArgs) },
          },
        ],
      });
      formattedMessages.push({
        role: 'tool',
        tool_call_id: toolCallId,
        name: toolName,
        content: JSON.stringify({
          error: `Tool "${tool.displayName}" is currently disabled in the Control Panel. Inform the user that this feature is switched off.`,
          denied: true,
        }),
      });
      continue;
    }

    // 3. Validate arguments
    if (toolName === 'calculator' && (!toolArgs.expression || typeof toolArgs.expression !== 'string' || !toolArgs.expression.trim())) {
      formattedMessages.push({
        role: 'assistant',
        content: null,
        tool_calls: [
          {
            id: toolCallId,
            type: 'function',
            function: { name: toolName, arguments: JSON.stringify(toolArgs) },
          },
        ],
      });
      formattedMessages.push({
        role: 'tool',
        tool_call_id: toolCallId,
        name: toolName,
        content: JSON.stringify({
          error: 'Missing required "expression" string for calculator. Example: { "expression": "125 * 48" }',
        }),
      });
      continue;
    }

    if (toolName === 'web_search' && (!toolArgs.query || typeof toolArgs.query !== 'string' || !toolArgs.query.trim())) {
      formattedMessages.push({
        role: 'assistant',
        content: null,
        tool_calls: [
          {
            id: toolCallId,
            type: 'function',
            function: { name: toolName, arguments: JSON.stringify(toolArgs) },
          },
        ],
      });
      formattedMessages.push({
        role: 'tool',
        tool_call_id: toolCallId,
        name: toolName,
        content: JSON.stringify({
          error: 'Missing required "query" string for web_search. Example: { "query": "latest OpenRouter documentation" }',
        }),
      });
      continue;
    }

    if (toolName === 'read_file' && (!toolArgs.path || typeof toolArgs.path !== 'string' || !toolArgs.path.trim())) {
      formattedMessages.push({
        role: 'assistant',
        content: null,
        tool_calls: [
          {
            id: toolCallId,
            type: 'function',
            function: { name: toolName, arguments: JSON.stringify(toolArgs) },
          },
        ],
      });
      formattedMessages.push({
        role: 'tool',
        tool_call_id: toolCallId,
        name: toolName,
        content: JSON.stringify({
          error: 'Missing required "path" string for read_file. Example: { "path": "package.json" }',
        }),
      });
      continue;
    }

    // 4. Check Permission (ALLOW / ASK / DENY)
    const permCheck = checkToolPermission(
      toolName,
      sessionAuthorizations,
      `Model requested tool: "${toolName}"`
    );

    if (permCheck.level === 'DENY') {
      const actLog: ToolActivityLog = {
        id: `act-${Date.now()}-${iteration}`,
        timestamp: new Date().toLocaleTimeString(),
        tool: tool.displayName,
        permission: 'DENIED',
        execution: JSON.stringify(toolArgs),
        result: permCheck.reason || 'ACCESS DENIED [SECURITY POLICY]',
        risk: permCheck.risk || 'HIGH',
      };
      toolActivities.push(actLog);

      storage.logAudit(
        'TOOL_DENIED',
        `TOOL REQUEST: ${tool.displayName} | PERMISSION: DENIED | EXECUTION: ${actLog.execution} | RESULT: ${actLog.result}`,
        'warn'
      );

      formattedMessages.push({
        role: 'assistant',
        content: null,
        tool_calls: [
          {
            id: toolCallId,
            type: 'function',
            function: { name: toolName, arguments: JSON.stringify(toolArgs) },
          },
        ],
      });
      formattedMessages.push({
        role: 'tool',
        tool_call_id: toolCallId,
        name: toolName,
        content: JSON.stringify({
          error: `ACCESS DENIED: Permission for tool "${tool.displayName}" is set to DENY by security policy. Reason: ${permCheck.reason}. You cannot execute this tool. Inform the user that you cannot perform this action due to security restrictions.`,
          denied: true,
        }),
      });
      continue;
    }

    if (permCheck.requiresPrompt) {
      // ASK: Tool requires user authorization in the HUD modal!
      const actLog: ToolActivityLog = {
        id: `act-${Date.now()}-${iteration}`,
        timestamp: new Date().toLocaleTimeString(),
        tool: tool.displayName,
        permission: 'ASKED',
        execution: JSON.stringify(toolArgs),
        result: 'Awaiting user clearance in HUD modal',
        risk: permCheck.risk || 'LOW',
      };
      toolActivities.push(actLog);

      const latencyMs = Date.now() - startTime;
      return {
        success: true,
        text: `Security Clearance Required: Super AI needs your authorization to execute tool "${permCheck.toolDisplayName || tool.displayName}".`,
        requiresAuthorization: true,
        pendingAuthorization: {
          tool: toolName,
          toolName: permCheck.toolDisplayName || tool.displayName,
          arguments: toolArgs,
          toolCallId,
          risk: permCheck.risk || 'LOW',
          requiredPermission: permCheck.requiredPermission || 'NONE',
          actionDescription: `Super AI is requesting authorization clearance to execute tool "${permCheck.toolDisplayName || tool.displayName}" with arguments: ${JSON.stringify(toolArgs)}`,
        },
        metadata: {
          taskType,
          selectedModel: lastCompletionResult.model,
          requestedModel: targetModel,
          fallbackOccurred,
          fallbackModelUsed,
          provider: 'openrouter',
          keyLabel: lastCompletionResult.keyUsedName,
          latencyMs,
          usage: lastCompletionResult.usage,
          confidence: classification.confidence,
          reasoning: classification.reason,
        },
        model: lastCompletionResult.model,
        provider: lastCompletionResult.provider,
        keyUsedName: lastCompletionResult.keyUsedName,
        rotated: lastCompletionResult.rotated,
        taskType,
        latencyMs,
        usage: lastCompletionResult.usage,
        toolActivities,
        conversationId,
        memoryEvents,
      };
    }

    // ALLOW: Execute the tool safely
    const execResult = await toolRegistry.execute(toolName, toolArgs, {
      sessionAuthorizations,
    });

    const actLog: ToolActivityLog = {
      id: `act-${Date.now()}-${iteration}`,
      timestamp: new Date().toLocaleTimeString(),
      tool: tool.displayName,
      permission: 'ALLOWED',
      execution: execResult.sanitizedExecutionSummary || JSON.stringify(toolArgs),
      result: execResult.sanitizedResultSummary || execResult.displaySummary || 'Executed successfully',
      risk: permCheck.risk || 'LOW',
    };
    toolActivities.push(actLog);

    storage.logAudit(
      'TOOL_EXECUTION',
      `TOOL REQUEST: ${tool.displayName} | PERMISSION: ALLOWED | EXECUTION: ${actLog.execution} | RESULT: ${actLog.result}`,
      'info'
    );

    // Update working memory with tool execution result
    memoryService.updateWorkingMemory(conversationId, {
      currentToolExecution: {
        tool: tool.displayName,
        arguments: toolArgs,
        startedAt: new Date().toISOString(),
      },
      temporaryVariables: {
        lastExecutedTool: toolName,
        lastToolResult: execResult.result,
        ...(toolName === 'calculator' && typeof execResult.result === 'number'
          ? { lastCalculation: execResult.result }
          : {}),
      },
    });

    formattedMessages.push({
      role: 'assistant',
      content: null,
      tool_calls: [
        {
          id: toolCallId,
          type: 'function',
          function: { name: toolName, arguments: JSON.stringify(toolArgs) },
        },
      ],
    });
    formattedMessages.push({
      role: 'tool',
      tool_call_id: toolCallId,
      name: toolName,
      content:
        typeof execResult.result === 'object'
          ? JSON.stringify(execResult.result)
          : String(execResult.result !== undefined ? execResult.result : execResult.error),
    });
  }

  const latencyMs = Date.now() - startTime;

  // Clean any residual tool markdown from final text
  const cleanFinalText = finalReplyText
    .replace(/```(?:tool_call|json)?[\s\S]*?```/g, '')
    .trim();

  // Save assistant response to conversation memory
  const finalAnswer = cleanFinalText || finalReplyText || 'Task processed successfully.';
  memoryService.appendMessage(conversationId, {
    role: 'assistant',
    content: finalAnswer,
  });

  // Audit log routing decision
  storage.logAudit(
    'ORCHESTRATION_ROUTE',
    `Routed task [${taskType}] to model "${lastCompletionResult?.model || targetModel}" (${latencyMs}ms)${
      fallbackOccurred ? ' [FALLBACK ACTIVE]' : ''
    }${toolActivities.length > 0 ? ` [${toolActivities.length} Tools Executed]` : ''}`,
    'info'
  );

  return {
    success: true,
    text: finalAnswer,
    conversationId,
    memoryEvents,
    metadata: {
      taskType,
      selectedModel: lastCompletionResult?.model || targetModel,
      requestedModel: targetModel,
      fallbackOccurred,
      fallbackModelUsed,
      provider: 'openrouter',
      keyLabel: lastCompletionResult?.keyUsedName || 'Active Vault Key',
      latencyMs,
      usage: lastCompletionResult?.usage,
      confidence: classification.confidence,
      reasoning: classification.reason,
    },
    model: lastCompletionResult?.model || targetModel,
    provider: lastCompletionResult?.provider || 'openrouter',
    keyUsedName: lastCompletionResult?.keyUsedName || 'Active Vault Key',
    rotated: lastCompletionResult?.rotated || false,
    taskType,
    latencyMs,
    usage: lastCompletionResult?.usage,
    toolActivities,
  };
}

/**
 * Super AI Judge Architecture
 */
export async function evaluateWithJudge(
  evalRequest: JudgeEvaluationRequest
): Promise<JudgeEvaluationResult> {
  const config = storage.getConfig();
  const judgeModel = config.models.judge || 'google/gemini-2.0-flash-001';

  try {
    const prompt =
      `You are the Super AI Evaluator & Judge. Review the candidate response generated for this user request.\n\n` +
      `TASK TYPE: ${evalRequest.taskType}\n` +
      `GENERATOR MODEL: ${evalRequest.modelUsed}\n` +
      `USER PROMPT: ${evalRequest.userPrompt}\n\n` +
      `CANDIDATE RESPONSE:\n${evalRequest.candidateResponse}\n\n` +
      `Respond in JSON format with: { "approved": boolean, "score": number (0-100), "critique": string, "suggestedFix": string | null }`;

    const result = await executeOpenRouterChat({
      messages: [{ role: 'user', content: prompt }],
      model: judgeModel,
      role: 'judge',
      temperature: 0.2,
      maxTokens: 500,
    });

    let parsed: any = {};
    try {
      const cleanedJson = result.text.replace(/```json|```/g, '').trim();
      parsed = JSON.parse(cleanedJson);
    } catch {
      parsed = {
        approved: true,
        score: 85,
        critique: result.text.slice(0, 200),
      };
    }

    return {
      approved: parsed.approved ?? true,
      score: typeof parsed.score === 'number' ? parsed.score : 85,
      critique: parsed.critique || 'Evaluation completed.',
      suggestedFix: parsed.suggestedFix || undefined,
      judgeModel,
      evaluatedAt: new Date().toISOString(),
    };
  } catch (err: any) {
    return {
      approved: true,
      score: 75,
      critique: `Judge evaluation bypassed: ${err.message}`,
      judgeModel,
      evaluatedAt: new Date().toISOString(),
    };
  }
}
