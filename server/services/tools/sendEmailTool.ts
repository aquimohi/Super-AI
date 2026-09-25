import { ToolDefinition, ToolExecutionResult } from './types.js';
import { emailService } from '../email/emailService.js';
import { storage } from '../../storage.js';

export const sendEmailTool: ToolDefinition = {
  name: 'send_smtp_email',
  displayName: 'SMTP Outgoing Email Dispatcher',
  description:
    'Dispatches a professional email via the configured SMTP server (Gmail, Outlook, SendGrid, etc.) to specified recipient(s). Supports subject, HTML/plain text body, and sender customization.',
  parameters: {
    type: 'object',
    properties: {
      to: {
        type: 'string',
        description: 'Recipient email address (e.g. "recipient@example.com")',
      },
      subject: {
        type: 'string',
        description: 'Subject title of the email',
      },
      body: {
        type: 'string',
        description: 'Email content message (plain text or HTML)',
      },
      isHtml: {
        type: 'boolean',
        description: 'Set to true if body contains HTML tags or should be sent with rich styling (default: true)',
      },
      fromName: {
        type: 'string',
        description: 'Custom sender display name (default: Super AI)',
      },
    },
    required: ['to', 'subject', 'body'],
  },
  requiredPermission: 'NONE',
  risk: 'MEDIUM',
  category: 'automation',
  execute: async (args): Promise<ToolExecutionResult> => {
    const to = (args.to || '').trim();
    const subject = (args.subject || '').trim();
    const body = (args.body || '').trim();
    const isHtml = args.isHtml !== false;
    const fromName = args.fromName?.trim() || undefined;

    if (!to || !to.includes('@')) {
      return {
        success: false,
        error: 'Invalid recipient email address provided.',
        sanitizedExecutionSummary: `send_smtp_email({ to: "${to}" })`,
        sanitizedResultSummary: 'Error: Invalid recipient email address.',
      };
    }

    if (!subject) {
      return {
        success: false,
        error: 'Email subject cannot be empty.',
        sanitizedExecutionSummary: `send_smtp_email({ to: "${to}", subject: "" })`,
        sanitizedResultSummary: 'Error: Empty subject.',
      };
    }

    const emailConfig = storage.getEmailConfig();
    if (!emailConfig.enabled) {
      return {
        success: false,
        error: 'SMTP email service is currently disabled in Control Panel. Please enable it in Settings.',
        sanitizedExecutionSummary: `send_smtp_email({ to: "${to}", subject: "${subject}" })`,
        sanitizedResultSummary: 'Error: SMTP service disabled.',
      };
    }

    try {
      const sendResult = await emailService.sendEmail({
        to,
        subject,
        html: isHtml ? body : undefined,
        text: !isHtml ? body : undefined,
        fromName,
      });

      if (sendResult.success) {
        return {
          success: true,
          result: {
            messageId: sendResult.messageId,
            to,
            subject,
            status: 'SENT',
          },
          displaySummary: `Email sent to ${to} (Subject: "${subject}")`,
          sanitizedExecutionSummary: `send_smtp_email({ to: "${to}", subject: "${subject}" })`,
          sanitizedResultSummary: `SUCCESS: Dispatched with message ID ${sendResult.messageId}`,
        };
      } else {
        return {
          success: false,
          error: sendResult.error || 'SMTP delivery failed.',
          sanitizedExecutionSummary: `send_smtp_email({ to: "${to}", subject: "${subject}" })`,
          sanitizedResultSummary: `FAILED: ${sendResult.error}`,
        };
      }
    } catch (err: any) {
      return {
        success: false,
        error: err.message || 'Exception during email dispatch.',
        sanitizedExecutionSummary: `send_smtp_email({ to: "${to}", subject: "${subject}" })`,
        sanitizedResultSummary: `EXCEPTION: ${err.message}`,
      };
    }
  },
};
