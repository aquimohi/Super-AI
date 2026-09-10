import { ToolDefinition, ToolExecutionResult } from './types.js';

export const currentDateTool: ToolDefinition = {
  name: 'current_date',
  displayName: 'Current Date',
  description: 'Returns the current date, day of the week, month, and year.',
  requiredPermission: 'NONE',
  risk: 'LOW',
  category: 'utility',
  parameters: {
    type: 'object',
    properties: {
      timezone: {
        type: 'string',
        description: 'Optional IANA timezone name (e.g. "Asia/Kolkata", "UTC"). Defaults to local system date.',
      },
    },
  },
  execute: (args): ToolExecutionResult => {
    const now = new Date();
    const tz = args.timezone ? String(args.timezone).trim() : undefined;

    try {
      const formattedLong = now.toLocaleDateString('en-US', {
        timeZone: tz,
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });

      const dayOfWeek = now.toLocaleDateString('en-US', {
        timeZone: tz,
        weekday: 'long',
      });

      const isoDate = now.toISOString().split('T')[0];

      const data = {
        date: formattedLong,
        isoDate,
        dayOfWeek,
        year: now.getFullYear(),
        timezone: tz || Intl.DateTimeFormat().resolvedOptions().timeZone,
      };

      return {
        success: true,
        result: data,
        displaySummary: `Current date: ${formattedLong}`,
        sanitizedExecutionSummary: tz ? `Timezone: ${tz}` : 'Default system timezone',
        sanitizedResultSummary: formattedLong,
      };
    } catch (err: any) {
      const fallbackDate = now.toDateString();
      return {
        success: true,
        result: {
          date: fallbackDate,
          isoDate: now.toISOString().split('T')[0],
          warning: `Invalid timezone "${tz}", defaulted to local date.`,
        },
        displaySummary: `Current date: ${fallbackDate}`,
        sanitizedExecutionSummary: 'Local fallback',
        sanitizedResultSummary: fallbackDate,
      };
    }
  },
};
