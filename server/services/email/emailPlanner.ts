import { storage } from '../../storage.js';
import { emailService } from './emailService.js';
import { memoryService } from '../memory/memoryService.js';
import { ToolActivityLog } from '../tools/types.js';

export interface PlannedEmailParams {
  to: string;
  subject: string;
  body: string;
  isHtml?: boolean;
}

export class EmailPlanner {
  /**
   * Detects if the user query is commanding the agent to send or dispatch an email.
   */
  public isEmailIntent(rawMessage: string): boolean {
    const lower = (rawMessage || '').trim().toLowerCase();
    const hasEmail = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/i.test(lower);

    // 1. Explicit email address + action word
    if (
      hasEmail &&
      /\b(mail\s+karo|email\s+karo|send\s+mail|send\s+email|bhejo|mail\s+bhejo|email\s+bhej\s*do|mail\s+kar\s*do|send)\b/i.test(lower)
    ) {
      return true;
    }

    // 2. Command phrases: "send email to", "email bhej do", "mail bhejna hai"
    if (
      /\b(send\s+email|send\s+mail|email\s+bhejo|mail\s+karo|email\s+dispatch)\b/i.test(lower)
    ) {
      return true;
    }

    return false;
  }

  /**
   * Extracts recipient, subject, and body from user query.
   */
  public parseEmailParams(rawMessage: string): PlannedEmailParams {
    const emailMatch = rawMessage.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i);
    const to = emailMatch ? emailMatch[1] : '';

    let subject = '';
    let body = '';

    // Try extracting subject: "subject: ...", "subject ...", "vishay ..."
    const subjectMatch = rawMessage.match(/\b(?:subject|vishay)\s*(?::|-|is)?\s*["']?([^,"'\n]+?)["']?(?=\s*(?:body|message|text|content|and|$))/i);
    if (subjectMatch) {
      subject = subjectMatch[1].trim();
    }

    // Try extracting body: "body: ...", "message: ...", "content: ..."
    const bodyMatch = rawMessage.match(/\b(?:body|message|text|content)\s*(?::|-|is)?\s*["']?([^"'\n]+(?:[\r\n]+[^"'\n]+)*)["']?$/i);
    if (bodyMatch) {
      body = bodyMatch[1].trim();
    }

    // Fallbacks if not explicitly structured
    if (!subject) {
      // Look for contextual hint
      if (/project/i.test(rawMessage)) subject = 'Super AI: Project Status & Update';
      else if (/lead/i.test(rawMessage)) subject = 'Verified Business Leads Report';
      else if (/meeting/i.test(rawMessage)) subject = 'Meeting Schedule & Discussion';
      else subject = 'Update from Super AI';
    }

    if (!body) {
      // Clean query of command phrases to use as body
      let cleaned = rawMessage
        .replace(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/gi, '')
        .replace(/\b(mail\s+karo|email\s+karo|send\s+mail|send\s+email|bhejo|mail\s+bhej\s*do|mail\s+kar\s*do|ko|me|par)\b/gi, '')
        .trim();
      body = cleaned.length > 5 ? cleaned : 'Hello, this is an automated dispatch sent via Super AI SMTP Email Service.';
    }

    return { to, subject, body, isHtml: true };
  }

  /**
   * Plans and executes or prepares the email dispatch.
   */
  public async planAndExecute(
    rawMessage: string,
    conversationId: string = 'default'
  ): Promise<any | null> {
    if (!this.isEmailIntent(rawMessage)) return null;

    const startTime = Date.now();
    const emailConfig = storage.getEmailConfig();
    const params = this.parseEmailParams(rawMessage);

    // If SMTP is NOT configured or NOT enabled:
    if (!emailConfig.enabled || !emailConfig.host || !emailConfig.user) {
      const responseText =
        `⚠️ **SMTP Service Not Configured or Disabled**\n\n` +
        `Main direct outgoing email send nahi kar sakti kyunki SMTP service setup nahi hai.\n\n` +
        `### 🚀 Kaise Setup Karein:\n` +
        `1. Upar right-side me **Control Panel** (Settings) icon par click karein.\n` +
        `2. **SMTP Email** tab open karein.\n` +
        `3. Apna provider choose karein (**Gmail**, **Outlook**, **SendGrid**, ya **Custom SMTP**).\n` +
        `4. Email & App Password enter karke **"Test Connection"** verify karein aur Save karein.\n\n` +
        `---\n\n` +
        `📝 **Aapke Liye Ready Email Draft**:\n` +
        `* **To**: \`${params.to || 'recipient@example.com'}\`\n` +
        `* **Subject**: \`${params.subject}\`\n` +
        `* **Message**:\n` +
        `> ${params.body.replace(/\n/g, '\n> ')}\n\n` +
        `SMTP configure hote hi aap mujhse bolenge: *"Send email to ${params.to || 'recipient@example.com'}"* aur main 1 second me background se dispatch kar dungi!`;

      memoryService.appendMessage(conversationId, { role: 'user', content: rawMessage });
      memoryService.appendMessage(conversationId, { role: 'assistant', content: responseText });

      return {
        success: true,
        text: responseText,
        conversationId,
        memoryEvents: [],
        metadata: {
          taskType: 'GENERAL',
          selectedModel: 'Super AI Email Planner',
          requestedModel: 'internal/email-planner',
          fallbackOccurred: false,
          provider: 'local-email' as any,
          keyLabel: 'SMTP Email Planner',
          latencyMs: Date.now() - startTime,
          confidence: 1.0,
          reasoning: 'SMTP service not enabled. Provided setup instructions and email draft.',
        },
        model: 'Super AI Email Planner',
        provider: 'local-email' as any,
        keyUsedName: 'SMTP Email Service',
        rotated: false,
        taskType: 'GENERAL',
        latencyMs: Date.now() - startTime,
        toolActivities: [
          {
            id: `act_${Date.now()}`,
            timestamp: new Date().toLocaleTimeString(),
            tool: 'SMTP Email Service',
            permission: 'DENIED',
            execution: `send_smtp_email(to="${params.to}")`,
            result: 'UNCONFIGURED: SMTP settings disabled or missing host/credentials',
            risk: 'LOW',
          },
        ],
      };
    }

    // If recipient email is missing:
    if (!params.to) {
      const responseText =
        `Bhai, email address missing hai! Kripya recipient ka valid email address specify karein.\n\n` +
        `**Example:**\n` +
        `* \`aquimohi@gmail.com ko mail karo subject Project Update body All systems operational\`\n` +
        `* \`send email to user@domain.com with subject Greetings\``;

      return {
        success: true,
        text: responseText,
        conversationId,
        memoryEvents: [],
        metadata: {
          taskType: 'GENERAL',
          selectedModel: 'Super AI Email Planner',
          requestedModel: 'internal/email-planner',
          fallbackOccurred: false,
          provider: 'local-email' as any,
          keyLabel: 'SMTP Email Planner',
          latencyMs: Date.now() - startTime,
          confidence: 1.0,
          reasoning: 'Recipient email address missing in user command.',
        },
        model: 'Super AI Email Planner',
        provider: 'local-email' as any,
        keyUsedName: 'SMTP Email Service',
        rotated: false,
        taskType: 'GENERAL',
        latencyMs: Date.now() - startTime,
      };
    }

    // Dispatch the email via emailService
    try {
      const sendResult = await emailService.sendEmail({
        to: params.to,
        subject: params.subject,
        html: `<p style="font-size: 15px; color: #333333; line-height: 1.6;">${params.body.replace(/\n/g, '<br/>')}</p>`,
        text: params.body,
        fromName: emailConfig.fromName || 'Super AI',
      });

      const latencyMs = Date.now() - startTime;

      if (sendResult.success) {
        const responseText =
          `⚡ **Email Successfully Dispatched!**\n\n` +
          `Aapka email background me SMTP server ke through successfully deliver ho chuka hai:\n\n` +
          `* 📬 **Recipient**: \`${params.to}\`\n` +
          `* 🏷️ **Subject**: **${params.subject}**\n` +
          `* 🆔 **Message-ID**: \`${sendResult.messageId}\`\n` +
          `* 🌐 **SMTP Relay**: \`${emailConfig.host}:${emailConfig.port}\`\n` +
          `* 🕒 **Timestamp**: \`${new Date().toLocaleString()}\`\n\n` +
          `> **Message Content**:\n` +
          `> ${params.body.replace(/\n/g, '\n> ')}\n\n` +
          `*Email sent history aap **Control Panel -> SMTP Email** me dekh sakte hain.*`;

        memoryService.appendMessage(conversationId, { role: 'user', content: rawMessage });
        memoryService.appendMessage(conversationId, { role: 'assistant', content: responseText });

        return {
          success: true,
          text: responseText,
          conversationId,
          memoryEvents: [],
          metadata: {
            taskType: 'GENERAL',
            selectedModel: 'Super AI SMTP Engine',
            requestedModel: 'internal/smtp-engine',
            fallbackOccurred: false,
            provider: 'local-email' as any,
            keyLabel: 'SMTP Mail Relay',
            latencyMs,
            confidence: 1.0,
            reasoning: `Dispatched outgoing email to ${params.to} via SMTP host ${emailConfig.host}.`,
          },
          model: 'Super AI SMTP Engine',
          provider: 'local-email' as any,
          keyUsedName: 'SMTP Mail Relay',
          rotated: false,
          taskType: 'GENERAL',
          latencyMs,
          toolActivities: [
            {
              id: `act_${Date.now()}`,
              timestamp: new Date().toLocaleTimeString(),
              tool: 'SMTP Email Service',
              permission: 'ALLOWED',
              execution: `send_smtp_email(to="${params.to}", subject="${params.subject}")`,
              result: `SUCCESS: MessageId ${sendResult.messageId}`,
              risk: 'MEDIUM',
            },
          ],
        };
      } else {
        const responseText =
          `❌ **SMTP Email Delivery Failed**\n\n` +
          `Server ne error return kiya: \`${sendResult.error}\`\n\n` +
          `Kripya check karein:\n` +
          `1. Control Panel me credentials (App Password) sahi hain ya nahi.\n` +
          `2. SMTP host aur port (${emailConfig.host}:${emailConfig.port}) accessible hai.\n` +
          `3. Control Panel me "Test Connection" button dabakar verify karein.`;

        memoryService.appendMessage(conversationId, { role: 'user', content: rawMessage });
        memoryService.appendMessage(conversationId, { role: 'assistant', content: responseText });

        return {
          success: true,
          text: responseText,
          conversationId,
          memoryEvents: [],
          metadata: {
            taskType: 'GENERAL',
            selectedModel: 'Super AI SMTP Engine',
            requestedModel: 'internal/smtp-engine',
            fallbackOccurred: false,
            provider: 'local-email' as any,
            keyLabel: 'SMTP Mail Relay',
            latencyMs,
            confidence: 0.2,
            reasoning: `SMTP delivery failed: ${sendResult.error}`,
          },
          model: 'Super AI SMTP Engine',
          provider: 'local-email' as any,
          keyUsedName: 'SMTP Mail Relay',
          rotated: false,
          taskType: 'GENERAL',
          latencyMs,
          toolActivities: [
            {
              id: `act_${Date.now()}`,
              timestamp: new Date().toLocaleTimeString(),
              tool: 'SMTP Email Service',
              permission: 'ALLOWED',
              execution: `send_smtp_email(to="${params.to}")`,
              result: `FAILED: ${sendResult.error}`,
              risk: 'MEDIUM',
            },
          ],
        };
      }
    } catch (err: any) {
      const responseText = `❌ Email send karte waqt internal error aayi: ${err.message}`;
      return {
        success: false,
        text: responseText,
        conversationId,
        metadata: {
          taskType: 'GENERAL',
          selectedModel: 'Super AI SMTP Engine',
          requestedModel: 'internal/smtp-engine',
          fallbackOccurred: false,
          provider: 'local-email' as any,
          keyLabel: 'SMTP Mail Relay',
          latencyMs: Date.now() - startTime,
          confidence: 0,
          reasoning: err.message,
        },
        model: 'Super AI SMTP Engine',
        provider: 'local-email' as any,
        keyUsedName: 'SMTP Mail Relay',
        rotated: false,
        taskType: 'GENERAL',
        latencyMs: Date.now() - startTime,
      };
    }
  }
}

export const emailPlanner = new EmailPlanner();
