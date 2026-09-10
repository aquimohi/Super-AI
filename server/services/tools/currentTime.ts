import { ToolDefinition, ToolExecutionResult } from './types.js';

export const currentTimeTool: ToolDefinition = {
  name: 'current_time',
  displayName: 'Current Time',
  description: 'Returns the current local and UTC time, supporting optional timezone conversion.',
  requiredPermission: 'NONE',
  risk: 'LOW',
  category: 'utility',
  parameters: {
    type: 'object',
    properties: {
      timezone: {
        type: 'string',
        description: 'Optional IANA timezone name (e.g. "Asia/Kolkata", "America/New_York", "UTC"). Defaults to system local time.',
      },
    },
  },
  execute: (args): ToolExecutionResult => {
    const now = new Date();
    const tz = args.timezone ? String(args.timezone).trim() : undefined;

    try {
      const time12 = now.toLocaleTimeString('en-US', {
        timeZone: tz,
        hour: 'numeric',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
      });

      const time24 = now.toLocaleTimeString('en-US', {
        timeZone: tz,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      });

      const timeZoneName =
        tz ||
        Intl.DateTimeFormat().resolvedOptions().timeZone ||
        'Local System Time';

      const data = {
        time: time12,
        time24,
        iso: now.toISOString(),
        timezone: timeZoneName,
      };

      return {
        success: true,
        result: data,
        displaySummary: `Current time: ${time12} (${timeZoneName})`,
        sanitizedExecutionSummary: tz ? `Timezone: ${tz}` : 'Default system timezone',
        sanitizedResultSummary: `${time12} [${timeZoneName}]`,
      };
    } catch (err: any) {
      // Fallback without custom timezone if invalid
      const fallbackTime = now.toLocaleTimeString();
      return {
        success: true,
        result: {
          time: fallbackTime,
          iso: now.toISOString(),
          timezone: 'Local (Fallback)',
          warning: `Invalid timezone "${tz}", defaulted to local.`,
        },
        displaySummary: `Current time: ${fallbackTime}`,
        sanitizedExecutionSummary: 'Local fallback',
        sanitizedResultSummary: fallbackTime,
      };
    }
  },
};
