import { Router, Request, Response } from 'express';
import { storage } from '../storage.js';
import { emailService } from '../services/email/emailService.js';

export const emailRouter = Router();

/**
 * GET /api/email/config
 * Retrieves sanitized SMTP configuration (password masked).
 */
emailRouter.get('/config', (_req: Request, res: Response) => {
  try {
    const config = storage.getSanitizedEmailConfig();
    return res.json({ success: true, config });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message || 'Failed to read email config' });
  }
});

/**
 * PUT /api/email/config
 * Updates SMTP configuration settings.
 */
emailRouter.put('/config', (req: Request, res: Response) => {
  try {
    const { enabled, host, port, secure, user, pass, fromEmail, fromName } = req.body || {};

    const updates: any = {};
    if (typeof enabled === 'boolean') updates.enabled = enabled;
    if (typeof host === 'string') updates.host = host.trim();
    if (typeof port === 'number' || typeof port === 'string') {
      const p = parseInt(String(port), 10);
      if (!isNaN(p) && p > 0 && p <= 65535) updates.port = p;
    }
    if (typeof secure === 'boolean') updates.secure = secure;
    if (typeof user === 'string') updates.user = user.trim();
    if (typeof pass === 'string' && pass.trim().length > 0) updates.pass = pass.trim();
    if (typeof fromEmail === 'string') updates.fromEmail = fromEmail.trim();
    if (typeof fromName === 'string') updates.fromName = fromName.trim();

    storage.updateEmailConfig(updates);
    const sanitized = storage.getSanitizedEmailConfig();

    storage.logAudit(
      'SMTP_CONFIG_UPDATED',
      `SMTP configuration updated (Host: ${sanitized.host}, Port: ${sanitized.port}, User: ${sanitized.user})`,
      'info'
    );

    return res.json({
      success: true,
      message: 'SMTP settings saved successfully',
      config: sanitized,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message || 'Failed to update email config' });
  }
});

/**
 * POST /api/email/test
 * Tests the SMTP server connection and credentials.
 */
emailRouter.post('/test', async (req: Request, res: Response) => {
  try {
    const customConfig = req.body && Object.keys(req.body).length > 0 ? req.body : undefined;
    const result = await emailService.testConnection(customConfig);

    return res.json({
      success: result.success,
      message: result.message,
      banner: result.banner,
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      message: err.message || 'Internal error during SMTP test',
    });
  }
});

/**
 * POST /api/email/send
 * Dispatches an email via SMTP.
 */
emailRouter.post('/send', async (req: Request, res: Response) => {
  try {
    const { to, subject, html, text, cc, bcc, fromName } = req.body || {};

    if (!to || !subject) {
      return res.status(400).json({
        success: false,
        error: 'Recipient (to) and subject are required.',
      });
    }

    const result = await emailService.sendEmail({
      to,
      subject,
      html,
      text,
      cc,
      bcc,
      fromName,
    });

    if (result.success) {
      return res.json({
        success: true,
        messageId: result.messageId,
        message: 'Email dispatched successfully.',
      });
    } else {
      return res.status(502).json({
        success: false,
        error: result.error || 'Failed to send email via SMTP.',
      });
    }
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: err.message || 'Internal server error while sending email',
    });
  }
});

/**
 * GET /api/email/history
 * Returns the audit trail of dispatched emails.
 */
emailRouter.get('/history', (_req: Request, res: Response) => {
  try {
    const history = emailService.getHistory();
    return res.json({ success: true, history });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message || 'Failed to retrieve email history' });
  }
});

/**
 * DELETE /api/email/history
 * Clears sent email logs.
 */
emailRouter.delete('/history', (_req: Request, res: Response) => {
  try {
    emailService.clearHistory();
    return res.json({ success: true, message: 'Email history cleared successfully' });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message || 'Failed to clear email history' });
  }
});
