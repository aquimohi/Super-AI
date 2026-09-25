import fs from 'fs';
import path from 'path';
import { storage, SmtpEmailConfig } from '../../storage.js';
import { SmtpClient, SendMailOptions, SendMailResult } from './smtpClient.js';

export interface SentEmailRecord {
  id: string;
  to: string | string[];
  subject: string;
  from: string;
  fromName: string;
  timestamp: string;
  status: 'SENT' | 'FAILED';
  messageId?: string;
  error?: string;
  preview?: string;
}

const DATA_DIR = path.join(process.cwd(), '.data', 'emails');
const HISTORY_FILE = path.join(DATA_DIR, 'history.json');

export class EmailService {
  private history: SentEmailRecord[] = [];

  constructor() {
    this.history = this.loadHistory();
  }

  private loadHistory(): SentEmailRecord[] {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      if (fs.existsSync(HISTORY_FILE)) {
        const raw = fs.readFileSync(HISTORY_FILE, 'utf8');
        return JSON.parse(raw);
      }
    } catch (err) {
      console.warn('[EmailService] Failed to read email history:', err);
    }
    return [];
  }

  private saveHistory(): void {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      fs.writeFileSync(HISTORY_FILE, JSON.stringify(this.history, null, 2), 'utf8');
    } catch (err) {
      console.error('[EmailService] Failed to save email history:', err);
    }
  }

  /**
   * Verify SMTP connection status.
   */
  public async testConnection(customConfig?: Partial<SmtpEmailConfig>): Promise<{
    success: boolean;
    message: string;
    banner?: string;
  }> {
    const activeConfig = {
      ...storage.getEmailConfig(),
      ...(customConfig || {}),
    };

    if (!activeConfig.host || !activeConfig.port) {
      return {
        success: false,
        message: 'SMTP Host and Port are required to test connection.',
      };
    }

    return SmtpClient.verifyConnection({
      host: activeConfig.host,
      port: activeConfig.port,
      secure: activeConfig.secure,
      user: activeConfig.user,
      pass: activeConfig.pass,
      timeoutMs: 12000,
    });
  }

  /**
   * Send email using configured SMTP service.
   */
  public async sendEmail(options: {
    to: string | string[];
    subject: string;
    text?: string;
    html?: string;
    fromName?: string;
    fromEmail?: string;
    cc?: string | string[];
    bcc?: string | string[];
  }): Promise<{ success: boolean; messageId?: string; record?: SentEmailRecord; error?: string }> {
    const config = storage.getEmailConfig();

    if (!config.enabled) {
      return {
        success: false,
        error: 'SMTP Email Service is currently disabled in Control Panel. Enable it to dispatch emails.',
      };
    }

    if (!config.host || !config.user || !config.pass) {
      return {
        success: false,
        error: 'SMTP configuration is incomplete. Host, username, and password/app password are required.',
      };
    }

    const senderEmail = options.fromEmail || config.fromEmail || config.user;
    const senderName = options.fromName || config.fromName || 'Super AI';

    const sendOptions: SendMailOptions = {
      from: senderEmail,
      fromName: senderName,
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html || (options.text ? SmtpClientStyledTemplate(options.subject, options.text) : undefined),
      cc: options.cc,
      bcc: options.bcc,
    };

    try {
      const result: SendMailResult = await SmtpClient.sendMail(
        {
          host: config.host,
          port: config.port,
          secure: config.secure,
          user: config.user,
          pass: config.pass,
        },
        sendOptions
      );

      const record: SentEmailRecord = {
        id: `email_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        to: options.to,
        subject: options.subject,
        from: senderEmail,
        fromName: senderName,
        timestamp: new Date().toISOString(),
        status: 'SENT',
        messageId: result.messageId,
        preview: (options.text || options.html || '').replace(/<[^>]*>?/gm, ' ').slice(0, 150),
      };

      this.history.unshift(record);
      if (this.history.length > 100) this.history = this.history.slice(0, 100);
      this.saveHistory();

      storage.logAudit(
        'EMAIL_SENT',
        `Email dispatched to ${Array.isArray(options.to) ? options.to.join(', ') : options.to} | Subject: "${options.subject}"`,
        'info'
      );

      return {
        success: true,
        messageId: result.messageId,
        record,
      };
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'Unknown SMTP transmission error';

      const failedRecord: SentEmailRecord = {
        id: `email_fail_${Date.now()}`,
        to: options.to,
        subject: options.subject,
        from: senderEmail,
        fromName: senderName,
        timestamp: new Date().toISOString(),
        status: 'FAILED',
        error: errMsg,
        preview: (options.text || '').slice(0, 150),
      };

      this.history.unshift(failedRecord);
      this.saveHistory();

      storage.logAudit(
        'EMAIL_SEND_FAILED',
        `Failed to send email to ${Array.isArray(options.to) ? options.to.join(', ') : options.to}: ${errMsg}`,
        'error'
      );

      return {
        success: false,
        error: errMsg,
        record: failedRecord,
      };
    }
  }

  public getHistory(): SentEmailRecord[] {
    return [...this.history];
  }

  public clearHistory(): void {
    this.history = [];
    this.saveHistory();
  }
}

/**
 * Standard professional HTML email template generator.
 */
function SmtpClientStyledTemplate(subject: string, bodyText: string): string {
  const formattedBody = bodyText
    .replace(/\n\n/g, '</p><p style="margin: 0 0 16px; color: #374151; line-height: 1.6;">')
    .replace(/\n/g, '<br/>');

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${subject}</title>
</head>
<body style="margin: 0; padding: 30px 15px; background-color: #0f172a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0">
    <tr>
      <td align="center">
        <table width="600" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; width: 100%; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.3);">
          <!-- Header -->
          <tr>
            <td style="padding: 28px 32px; background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%);">
              <table width="100%" border="0" cellspacing="0" cellpadding="0">
                <tr>
                  <td>
                    <div style="color: #ffffff; font-size: 20px; font-weight: 700; letter-spacing: -0.5px;">
                      ⚡ SUPER AI
                    </div>
                    <div style="color: #bae6fd; font-size: 12px; margin-top: 4px; text-transform: uppercase; letter-spacing: 1px;">
                      Autonomous Neural Dispatch
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Subject Title -->
          <tr>
            <td style="padding: 32px 32px 16px;">
              <h1 style="margin: 0; font-size: 22px; font-weight: 700; color: #0f172a; line-height: 1.3;">
                ${subject}
              </h1>
            </td>
          </tr>

          <!-- Message Body -->
          <tr>
            <td style="padding: 0 32px 32px; font-size: 15px; color: #334155; line-height: 1.6;">
              <p style="margin: 0 0 16px;">
                ${formattedBody}
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 20px 32px; background-color: #f8fafc; border-top: 1px solid #e2e8f0; font-size: 12px; color: #64748b; line-height: 1.5;">
              <table width="100%" border="0" cellspacing="0" cellpadding="0">
                <tr>
                  <td>
                    This message was autonomously dispatched via <strong>Super AI SMTP Email Service</strong>.
                  </td>
                  <td align="right" style="color: #94a3b8; font-size: 11px;">
                    ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

export const emailService = new EmailService();
