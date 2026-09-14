import { ToolDefinition, ToolExecutionResult } from './types.js';
import { triggerGate, getGateState, GateCommand } from '../iot/smartGate.js';

const VALID_COMMANDS: GateCommand[] = ['UNLOCK', 'LOCK', 'PULSE_UNLOCK'];

export const smartGateTool: ToolDefinition = {
  name: 'trigger_smart_gate',
  displayName: 'Smart Gate Control',
  description:
    'Controls the physical smart gate/door lock connected to an ESP32 relay. ' +
    'Use UNLOCK to open the gate, LOCK to secure it, or PULSE_UNLOCK for a timed 5-second unlock (auto-relocks). ' +
    'Requires hardware endpoint to be configured via SMART_GATE_ENDPOINT in .env. ' +
    'Always ask Mohit to confirm before triggering a gate action.',
  requiredPermission: 'SMART_GATE',
  risk: 'HIGH',
  category: 'automation',
  parameters: {
    type: 'object',
    properties: {
      command: {
        type: 'string',
        description:
          'Gate command to execute. UNLOCK = open the gate, LOCK = secure the gate, ' +
          'PULSE_UNLOCK = unlock for 5 seconds then auto-relock (safest for entry).',
        enum: ['UNLOCK', 'LOCK', 'PULSE_UNLOCK'],
      },
      reason: {
        type: 'string',
        description:
          'Brief reason for triggering the gate (for audit log). ' +
          'E.g. "User requested entry via HUD", "Delivery expected", "Security check".',
      },
    },
    required: ['command'],
  },

  execute: async (args): Promise<ToolExecutionResult> => {
    const command = String(args.command || '').toUpperCase().trim() as GateCommand;
    const reason  = String(args.reason || 'Triggered by Super AI on user request').trim();

    // Validate command
    if (!VALID_COMMANDS.includes(command)) {
      return {
        success: false,
        error: `Invalid gate command: "${command}". Valid commands: ${VALID_COMMANDS.join(', ')}`,
        displaySummary: `Smart Gate error: Invalid command "${command}"`,
        sanitizedExecutionSummary: `trigger_smart_gate — invalid command: ${command}`,
        sanitizedResultSummary: 'ERROR: Invalid command',
      };
    }

    const { endpointConfigured } = getGateState();

    // Friendly error if hardware not configured
    if (!endpointConfigured) {
      return {
        success: false,
        error: 'Smart gate hardware endpoint not configured. Set SMART_GATE_ENDPOINT in .env to enable gate control.',
        displaySummary: '🔧 Smart Gate not configured — set SMART_GATE_ENDPOINT in .env',
        sanitizedExecutionSummary: `trigger_smart_gate — endpoint not configured`,
        sanitizedResultSummary: 'NOT CONFIGURED',
      };
    }

    const commandLabel =
      command === 'UNLOCK'       ? '🔓 UNLOCK' :
      command === 'LOCK'         ? '🔒 LOCK' :
      command === 'PULSE_UNLOCK' ? '⏱ PULSE_UNLOCK (5s)' :
      command;

    try {
      const result = await triggerGate(command, reason);

      if (result.success) {
        return {
          success: true,
          result: {
            action: result.action,
            state: result.state,
            message: result.message,
            latencyMs: result.latencyMs,
          },
          displaySummary:
            `${commandLabel} — Gate state: ${result.state} ` +
            `(${result.latencyMs}ms)\n${result.message}`,
          sanitizedExecutionSummary:
            `trigger_smart_gate: ${command} | reason: "${reason.slice(0, 40)}"`,
          sanitizedResultSummary:
            `SUCCESS → state: ${result.state} (${result.latencyMs}ms)`,
        };
      }

      return {
        success: false,
        error: result.error || result.message,
        result: {
          action: result.action,
          state: result.state,
          latencyMs: result.latencyMs,
        },
        displaySummary:
          `${commandLabel} — ❌ FAILED: ${result.error || result.message}`,
        sanitizedExecutionSummary:
          `trigger_smart_gate: ${command} | FAILED`,
        sanitizedResultSummary:
          `FAILED → ${result.error || 'Unknown error'}`,
      };

    } catch (err: any) {
      return {
        success: false,
        error: `Smart gate system error: ${err.message}`,
        displaySummary: `${commandLabel} — 💥 SYSTEM ERROR: ${err.message}`,
        sanitizedExecutionSummary: `trigger_smart_gate — system error`,
        sanitizedResultSummary: `SYSTEM ERROR: ${err.message}`,
      };
    }
  },
};
