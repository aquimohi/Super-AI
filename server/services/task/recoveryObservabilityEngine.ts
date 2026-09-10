import {
  FailureCategory,
  RecoveryAction,
  TaskExecutionRecord,
  TaskStep,
  TaskPlan,
} from './types.js';
import { storage, RecoveryObservabilityConfig } from '../../storage.js';
import { toolRegistry } from '../tools/registry.js';
import { skillsRegistry } from '../skills/registry.js';

export class RecoveryObservabilityEngine {
  private executionRecords: Map<string, TaskExecutionRecord[]> = new Map();

  /**
   * Safe sanitizer to ensure no API keys, bearer tokens, or provider secrets
   * ever appear in traces, telemetry, or user notifications.
   */
  public sanitizeTelemetry(input: string): string {
    if (!input || typeof input !== 'string') return '';
    return input
      .replace(/sk-[a-zA-Z0-9_-]{20,}/g, '[MASKED_KEY]')
      .replace(/Bearer\s+[a-zA-Z0-9_\-\.]{15,}/gi, 'Bearer [MASKED_TOKEN]')
      .replace(/key-[a-zA-Z0-9_\-]{15,}/gi, '[MASKED_KEY]')
      .replace(/api[_-]?key["':\s]+["']?([a-zA-Z0-9_\-]{8,})["']?/gi, 'apiKey: "[MASKED_KEY]"')
      .replace(/password["':\s]+["']?([^"',\s]+)["']?/gi, 'password: "[MASKED]"');
  }

  /**
   * Deterministic Failure Classifier
   * Categorizes errors into one of the 11 system failure categories.
   */
  public classifyFailure(
    toolName: string | undefined,
    error: any,
    output?: any
  ): FailureCategory {
    const errorStr = (
      (error?.message || '') +
      ' ' +
      (typeof error === 'string' ? error : '') +
      ' ' +
      (typeof output === 'string' ? output : JSON.stringify(output || ''))
    ).toLowerCase();

    // 1. RATE LIMIT
    if (
      errorStr.includes('rate limit') ||
      errorStr.includes('429') ||
      errorStr.includes('quota') ||
      errorStr.includes('too many requests') ||
      errorStr.includes('resource_exhausted') ||
      errorStr.includes('tokens per minute')
    ) {
      return 'RATE_LIMIT';
    }

    // 2. TIMEOUT
    if (
      errorStr.includes('timeout') ||
      errorStr.includes('timed out') ||
      errorStr.includes('deadline exceeded') ||
      errorStr.includes('socket hang up')
    ) {
      return 'TIMEOUT';
    }

    // 3. NETWORK ERROR
    if (
      errorStr.includes('network') ||
      errorStr.includes('fetch failed') ||
      errorStr.includes('econnreset') ||
      errorStr.includes('enotfound') ||
      errorStr.includes('etimedout') ||
      errorStr.includes('connection refused') ||
      errorStr.includes('dns lookup') ||
      errorStr.includes('503') ||
      errorStr.includes('502')
    ) {
      return 'NETWORK_ERROR';
    }

    // 4. AUTHORIZATION DENIED
    if (
      errorStr.includes('authorization denied') ||
      errorStr.includes('permission denied') ||
      errorStr.includes('prohibited') ||
      errorStr.includes('unauthorized') ||
      errorStr.includes('clearance required') ||
      errorStr.includes('access denied')
    ) {
      return 'AUTHORIZATION_DENIED';
    }

    // 5. SKILL DISABLED
    if (
      errorStr.includes('skill') &&
      (errorStr.includes('disabled') || errorStr.includes('not enabled'))
    ) {
      return 'SKILL_DISABLED';
    }

    // 6. TOOL UNAVAILABLE
    if (
      errorStr.includes('tool unavailable') ||
      errorStr.includes('tool not found') ||
      errorStr.includes('unknown tool') ||
      errorStr.includes('no such tool') ||
      errorStr.includes('tool not registered')
    ) {
      return 'TOOL_UNAVAILABLE';
    }

    // 7. INVALID ARGUMENT
    if (
      errorStr.includes('invalid argument') ||
      errorStr.includes('missing parameter') ||
      errorStr.includes('required field') ||
      errorStr.includes('malformed') ||
      errorStr.includes('type error') ||
      errorStr.includes('invalid url') ||
      errorStr.includes('invalid path')
    ) {
      return 'INVALID_ARGUMENT';
    }

    // 8. BROWSER ERROR
    if (
      (toolName && toolName.toLowerCase().startsWith('browser')) ||
      errorStr.includes('browser') ||
      errorStr.includes('puppeteer') ||
      errorStr.includes('page crashed') ||
      errorStr.includes('target closed') ||
      errorStr.includes('navigation failed') ||
      errorStr.includes('selector not found')
    ) {
      return 'BROWSER_ERROR';
    }

    // 9. WINDOWS ACTION ERROR
    if (
      (toolName &&
        ['open_application', 'open_folder', 'open_file', 'screenshot'].includes(
          toolName
        )) ||
      errorStr.includes('windows action') ||
      errorStr.includes('executable not found') ||
      errorStr.includes('process spawn failed') ||
      errorStr.includes('file not found')
    ) {
      return 'WINDOWS_ACTION_ERROR';
    }

    // 10. API ERROR
    if (
      errorStr.includes('api error') ||
      errorStr.includes('500') ||
      errorStr.includes('bad gateway') ||
      errorStr.includes('provider error') ||
      errorStr.includes('model error')
    ) {
      return 'API_ERROR';
    }

    return 'UNKNOWN_ERROR';
  }

  /**
   * Deterministic Recovery Strategy Evaluator
   * Decides strictly within safety bounds. Never loops endlessly.
   */
  public evaluateRecovery(
    category: FailureCategory,
    step: TaskStep,
    plan: TaskPlan,
    config: RecoveryObservabilityConfig
  ): {
    action: RecoveryAction;
    canRecover: boolean;
    reason: string;
    alternativeTool?: { name: string; parameters: any };
  } {
    // Check master switch
    if (!config.enabled) {
      return {
        action: 'STOP_SAFE',
        canRecover: false,
        reason: 'Recovery Engine is currently disabled in Control Panel.',
      };
    }

    // Check maximum recovery attempts budget (default 3)
    const maxBudget = config.maxRecoveryAttempts || 3;
    if (plan.recoveryCount >= maxBudget) {
      return {
        action: 'STOP_SAFE',
        canRecover: false,
        reason: `Maximum recovery budget reached (${plan.recoveryCount}/${maxBudget} attempts). Halting execution safely.`,
      };
    }

    const currentAttempt = step.attempts || 1;

    switch (category) {
      case 'RATE_LIMIT':
        return {
          action: 'FAILOVER_MODEL',
          canRecover: true,
          reason: 'Rate limit encountered. Triggering model/key failover.',
        };

      case 'NETWORK_ERROR':
        if (config.retryFailedNetworkRequests && currentAttempt <= 1) {
          return {
            action: 'RETRY_NETWORK',
            canRecover: true,
            reason: 'Transient network failure detected. Retrying once.',
          };
        }
        return {
          action: 'STOP_SAFE',
          canRecover: false,
          reason: 'Network retry exhausted. Halting task safely.',
        };

      case 'TIMEOUT':
        if (currentAttempt <= 1) {
          return {
            action: 'RETRY_ONCE',
            canRecover: true,
            reason: 'Action timed out. Retrying once with clean connection.',
          };
        }
        return {
          action: 'STOP_SAFE',
          canRecover: false,
          reason: 'Timeout persisted after retry.',
        };

      case 'TOOL_UNAVAILABLE': {
        const alt = this.findAllowedAlternativeTool(step.toolName, step.parameters);
        if (alt) {
          return {
            action: 'SWITCH_ALTERNATIVE_TOOL',
            canRecover: true,
            reason: `Primary tool ${step.toolName} unavailable. Switching to allowed alternative ${alt.name}.`,
            alternativeTool: alt,
          };
        }
        return {
          action: 'STOP_SAFE',
          canRecover: false,
          reason: `Tool ${step.toolName} is unavailable and no allowed alternative exists.`,
        };
      }

      case 'SKILL_DISABLED':
        return {
          action: 'STOP_INFORM_USER',
          canRecover: false,
          reason: `Required skill ${step.skill} is disabled. Stopping and informing user.`,
        };

      case 'AUTHORIZATION_DENIED':
        return {
          action: 'STOP_AUTHORIZATION_DENIED',
          canRecover: false,
          reason: 'Security clearance denied by user or policy. Halting task.',
        };

      case 'INVALID_ARGUMENT':
        if (currentAttempt <= 1) {
          return {
            action: 'PLANNER_CORRECT_ARGUMENTS',
            canRecover: true,
            reason: 'Invalid tool arguments detected. Requesting Planner parameter correction.',
          };
        }
        return {
          action: 'STOP_SAFE',
          canRecover: false,
          reason: 'Parameter correction failed or parameters remained invalid.',
        };

      case 'BROWSER_ERROR':
        if (currentAttempt <= 1) {
          return {
            action: 'RETRY_ONCE',
            canRecover: true,
            reason: 'Browser automation error occurred. Retrying browser action once.',
          };
        }
        return {
          action: 'STOP_SAFE',
          canRecover: false,
          reason: 'Browser action failed repeatedly.',
        };

      case 'WINDOWS_ACTION_ERROR':
        if (currentAttempt <= 1) {
          return {
            action: 'RETRY_ONCE',
            canRecover: true,
            reason: 'System application action failed. Retrying once.',
          };
        }
        return {
          action: 'STOP_SAFE',
          canRecover: false,
          reason: 'Application action failed repeatedly.',
        };

      case 'API_ERROR':
        if (currentAttempt <= 1) {
          return {
            action: 'RETRY_ONCE',
            canRecover: true,
            reason: 'API error response received. Retrying once.',
          };
        }
        return {
          action: 'STOP_SAFE',
          canRecover: false,
          reason: 'API error persisted.',
        };

      case 'UNKNOWN_ERROR':
      default:
        return {
          action: 'STOP_SAFE',
          canRecover: false,
          reason: 'Unknown or unrecoverable error encountered. Stopping safely.',
        };
    }
  }

  /**
   * Locates an allowed and enabled alternative tool if one exists
   */
  public findAllowedAlternativeTool(
    toolName?: string,
    params?: any
  ): { name: string; parameters: any } | null {
    if (!toolName) return null;

    // Alternative for web_search -> browserOpenPage with Google Search
    if (toolName === 'web_search') {
      const browserEnabled = skillsRegistry.isSkillEnabled('BROWSER');
      if (browserEnabled && Boolean(toolRegistry.getTool('browserOpenPage'))) {
        const query = params?.query || 'Super AI search';
        return {
          name: 'browserOpenPage',
          parameters: { url: `https://www.google.com/search?q=${encodeURIComponent(query)}` },
        };
      }
    }

    // Alternative for browserOpenPage -> open_url (system browser)
    if (toolName === 'browserOpenPage') {
      const computerEnabled = skillsRegistry.isSkillEnabled('WINDOWS');
      if (computerEnabled && Boolean(toolRegistry.getTool('open_url'))) {
        return {
          name: 'open_url',
          parameters: { url: params?.url || 'https://google.com' },
        };
      }
    }

    return null;
  }

  /**
   * Deterministic parameter correction for INVALID_ARGUMENT
   */
  public correctParameters(
    toolName: string | undefined,
    rawParams: any,
    errorMsg: string
  ): Record<string, any> {
    const params = { ...(rawParams || {}) };

    if (toolName === 'browserOpenPage' || toolName === 'open_url') {
      // Fix missing protocol
      if (params.url && typeof params.url === 'string') {
        let url = params.url.trim();
        if (!url.startsWith('http://') && !url.startsWith('https://')) {
          url = `https://${url}`;
        }
        params.url = url;
      } else if (!params.url) {
        params.url = 'https://www.google.com';
      }
    } else if (toolName === 'web_search') {
      if (!params.query || typeof params.query !== 'string') {
        params.query = params.q || params.text || params.search || 'Super AI overview';
      }
    } else if (toolName === 'calculator') {
      if (!params.expression && params.expr) {
        params.expression = params.expr;
      }
    } else if (toolName === 'open_application') {
      if (!params.app && params.name) {
        params.app = params.name;
      }
    }

    return params;
  }

  /**
   * Detects explicit cancellation intent across Hinglish and English commands
   */
  public isCancellationIntent(message: string): boolean {
    if (!message || typeof message !== 'string') return false;
    const normalized = message
      .toLowerCase()
      .trim()
      .replace(/[.,!?;:'"]/g, '');

    const exactMatches = [
      'cancel',
      'stop',
      'ruk jao',
      'task cancel karo',
      'cancel task',
      'stop task',
      'task stop karo',
      'rok do',
      'ruko',
      'stop it',
      'abort',
      'abort task',
      'cancel kar do',
      'band karo',
      'halt',
    ];

    if (exactMatches.includes(normalized)) return true;

    if (
      normalized.includes('task cancel') ||
      normalized.includes('cancel the task') ||
      normalized.includes('stop the task') ||
      normalized.includes('ruk jao') ||
      normalized.includes('rok do')
    ) {
      return true;
    }

    return false;
  }

  /**
   * Records execution step observability
   */
  public logExecutionRecord(record: TaskExecutionRecord): void {
    if (!this.executionRecords.has(record.taskId)) {
      this.executionRecords.set(record.taskId, []);
    }
    this.executionRecords.get(record.taskId)!.push(record);
  }

  public getExecutionRecords(taskId: string): TaskExecutionRecord[] {
    return this.executionRecords.get(taskId) || [];
  }

  /**
   * Hinglish Persona Formatter: Success recovery notification
   */
  public formatHinglishRecoverySuccess(
    category: FailureCategory,
    attempt: number
  ): string {
    switch (category) {
      case 'NETWORK_ERROR':
        return `[ RECOVERED ] Network issue aaya tha, retry ke baad task smoothly continue ho gaya.`;
      case 'TIMEOUT':
        return `[ RECOVERED ] Response timeout hua tha, re-establishing ke baad step complete ho gaya.`;
      case 'BROWSER_ERROR':
        return `[ RECOVERED ] Browser response fail hua tha, automated retry ke baad page load ho gaya.`;
      case 'WINDOWS_ACTION_ERROR':
        return `[ RECOVERED ] Application command glitch hua tha, retry ke baad action execute ho gaya.`;
      case 'INVALID_ARGUMENT':
        return `[ RECOVERED ] Parameters me formatting issue tha, Planner dwara arguments auto-correct kar liye gaye.`;
      case 'RATE_LIMIT':
        return `[ RECOVERED ] Rate limit encounter hui, model failover ke baad execution continue raha.`;
      case 'TOOL_UNAVAILABLE':
        return `[ RECOVERED ] Primary tool unavailable tha, safe alternative tool se task continue kiya gaya.`;
      default:
        return `[ RECOVERED ] Intermediate issue detect hua tha, safe recovery ke baad task complete ho gaya.`;
    }
  }

  /**
   * Hinglish Persona Formatter: Failure explanation
   */
  public formatHinglishRecoveryFailure(
    category: FailureCategory,
    detail: string,
    budgetExhausted: boolean = false
  ): string {
    if (budgetExhausted) {
      return `[ TASK FAILED ] Task complete nahi ho paya kyunki maximum recovery attempts (3) reach ho gaye hain. Safety rules ke mutabik execution halt kar diya gaya.`;
    }

    switch (category) {
      case 'BROWSER_ERROR':
        return `[ TASK FAILED ] Task complete nahi ho paya kyunki browser response repeatedly fail hua.`;
      case 'NETWORK_ERROR':
        return `[ TASK FAILED ] Task complete nahi ho paya kyunki connection unstable tha aur network retry fail hua.`;
      case 'SKILL_DISABLED':
        return `[ TASK STOPPED ] Task rok diya gaya kyunki zaroori skill filhal Control Panel me disabled hai.`;
      case 'AUTHORIZATION_DENIED':
        return `[ TASK CANCELLED ] Task complete nahi hua kyunki step authorization deny kar di gayi.`;
      case 'TOOL_UNAVAILABLE':
        return `[ TASK FAILED ] Task complete nahi ho paya kyunki required tool aur uska alternative dono unavailable hain.`;
      default:
        return `[ TASK FAILED ] Task execution fail hua: ${this.sanitizeTelemetry(detail || 'Unexpected error')}.`;
    }
  }
}

export const recoveryObservabilityEngine = new RecoveryObservabilityEngine();
