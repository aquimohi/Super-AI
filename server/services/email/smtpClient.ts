import net from 'net';
import tls from 'tls';
import crypto from 'crypto';

export interface SmtpClientConfig {
  host: string;
  port: number;
  secure: boolean; // true for 465 (implicit TLS), false for 587/25 (STARTTLS)
  user: string;
  pass: string;
  timeoutMs?: number;
}

export interface SendMailOptions {
  from: string;
  fromName?: string;
  to: string | string[];
  subject: string;
  text?: string;
  html?: string;
  replyTo?: string;
  cc?: string | string[];
  bcc?: string | string[];
}

export interface SendMailResult {
  success: boolean;
  messageId: string;
  response: string;
}

export class SmtpClient {
  /**
   * Tests the connection and authentication to the SMTP server.
   */
  public static async verifyConnection(
    config: SmtpClientConfig
  ): Promise<{ success: boolean; message: string; banner?: string }> {
    return new Promise((resolve) => {
      let isResolved = false;
      const timeoutMs = config.timeoutMs || 12000;

      const finish = (success: boolean, message: string, banner?: string) => {
        if (!isResolved) {
          isResolved = true;
          resolve({ success, message, banner });
        }
      };

      const timer = setTimeout(() => {
        finish(false, `Connection timed out after ${timeoutMs}ms trying to reach ${config.host}:${config.port}`);
      }, timeoutMs);

      SmtpClient.createSession(config, (err, session) => {
        if (err || !session) {
          clearTimeout(timer);
          finish(false, err?.message || 'Failed to establish connection to SMTP server.');
          return;
        }

        session.sendCommand('QUIT', () => {
          session.close();
          clearTimeout(timer);
          finish(true, `Successfully connected and authenticated with ${config.host}:${config.port}`, session.banner);
        });
      });
    });
  }

  /**
   * Sends an email via SMTP.
   */
  public static async sendMail(
    config: SmtpClientConfig,
    options: SendMailOptions
  ): Promise<SendMailResult> {
    return new Promise((resolve, reject) => {
      const timeoutMs = config.timeoutMs || 20000;
      let isFinished = false;

      const finishError = (err: Error) => {
        if (!isFinished) {
          isFinished = true;
          clearTimeout(timer);
          reject(err);
        }
      };

      const finishSuccess = (result: SendMailResult) => {
        if (!isFinished) {
          isFinished = true;
          clearTimeout(timer);
          resolve(result);
        }
      };

      const timer = setTimeout(() => {
        finishError(new Error(`SMTP transaction timed out after ${timeoutMs}ms`));
      }, timeoutMs);

      SmtpClient.createSession(config, (err, session) => {
        if (err || !session) {
          finishError(err || new Error('Failed to open SMTP session.'));
          return;
        }

        const toList = Array.isArray(options.to) ? options.to : [options.to];
        const recipients = [...toList];
        if (options.cc) {
          recipients.push(...(Array.isArray(options.cc) ? options.cc : [options.cc]));
        }
        if (options.bcc) {
          recipients.push(...(Array.isArray(options.bcc) ? options.bcc : [options.bcc]));
        }

        // 1. MAIL FROM
        const cleanFrom = options.from.replace(/<|>/g, '').trim();
        session.sendCommand(`MAIL FROM:<${cleanFrom}>`, (fromRes) => {
          if (!fromRes.startsWith('250')) {
            session.close();
            finishError(new Error(`MAIL FROM rejected by server: ${fromRes}`));
            return;
          }

          // 2. RCPT TO for each recipient
          let recipientIndex = 0;
          const sendNextRcpt = () => {
            if (recipientIndex >= recipients.length) {
              // 3. DATA command
              session.sendCommand('DATA', (dataRes) => {
                if (!dataRes.startsWith('354')) {
                  session.close();
                  finishError(new Error(`DATA command rejected by server: ${dataRes}`));
                  return;
                }

                // 4. Construct RFC 2822 / 5322 MIME message
                const messageId = `<${Date.now()}.${crypto.randomBytes(8).toString('hex')}@superai.local>`;
                const rawMime = SmtpClient.buildMimeMessage(options, messageId);

                // 5. Send DATA body terminated with CRLF.CRLF
                session.sendRawData(`${rawMime}\r\n.\r\n`, (endRes) => {
                  session.sendCommand('QUIT', () => {
                    session.close();
                    if (endRes.startsWith('250')) {
                      finishSuccess({
                        success: true,
                        messageId,
                        response: endRes,
                      });
                    } else {
                      finishError(new Error(`Failed to transmit email body: ${endRes}`));
                    }
                  });
                });
              });
              return;
            }

            const rcpt = recipients[recipientIndex++].replace(/<|>/g, '').trim();
            session.sendCommand(`RCPT TO:<${rcpt}>`, (rcptRes) => {
              if (!rcptRes.startsWith('250') && !rcptRes.startsWith('251')) {
                session.close();
                finishError(new Error(`Recipient rejected (${rcpt}): ${rcptRes}`));
                return;
              }
              sendNextRcpt();
            });
          };

          sendNextRcpt();
        });
      });
    });
  }

  /**
   * Internal session builder supporting Implicit TLS, Plain, and STARTTLS.
   */
  private static createSession(
    config: SmtpClientConfig,
    callback: (err: Error | null, session?: SmtpSession) => void
  ): void {
    const isImplicitTls = config.secure || config.port === 465;

    let socket: net.Socket | tls.TLSSocket;

    if (isImplicitTls) {
      socket = tls.connect({
        host: config.host,
        port: config.port,
        rejectUnauthorized: false, // Allows self-signed in test environments
      });
    } else {
      socket = net.connect({
        host: config.host,
        port: config.port,
      });
    }

    const session = new SmtpSession(socket);

    socket.on('error', (err) => {
      callback(err);
    });

    // Wait for greeting
    session.readResponse((greeting) => {
      if (!greeting.startsWith('220')) {
        session.close();
        callback(new Error(`Invalid SMTP greeting from server: ${greeting}`));
        return;
      }
      session.banner = greeting;

      // Send EHLO
      session.sendCommand('EHLO localhost', (ehloRes) => {
        if (!ehloRes.startsWith('250')) {
          // Fallback to HELO
          session.sendCommand('HELO localhost', (heloRes) => {
            if (!heloRes.startsWith('250')) {
              session.close();
              callback(new Error(`EHLO/HELO failed: ${heloRes}`));
              return;
            }
            SmtpClient.authenticateSession(session, config, callback);
          });
          return;
        }

        // Check if STARTTLS is needed (port 587 or 25)
        const supportsStartTls = /STARTTLS/i.test(ehloRes);
        if (!isImplicitTls && supportsStartTls && config.port !== 2525) {
          session.sendCommand('STARTTLS', (startTlsRes) => {
            if (!startTlsRes.startsWith('220')) {
              session.close();
              callback(new Error(`STARTTLS rejected: ${startTlsRes}`));
              return;
            }

            // Upgrade to TLS
            session.upgradeToTls(config.host, () => {
              // Re-issue EHLO after TLS handshake
              session.sendCommand('EHLO localhost', () => {
                SmtpClient.authenticateSession(session, config, callback);
              });
            });
          });
        } else {
          SmtpClient.authenticateSession(session, config, callback);
        }
      });
    });
  }

  private static authenticateSession(
    session: SmtpSession,
    config: SmtpClientConfig,
    callback: (err: Error | null, session?: SmtpSession) => void
  ): void {
    if (!config.user || !config.pass) {
      // Unauthenticated SMTP (e.g. internal relay)
      callback(null, session);
      return;
    }

    // AUTH LOGIN
    session.sendCommand('AUTH LOGIN', (authRes) => {
      if (!authRes.startsWith('334')) {
        // Try AUTH PLAIN
        const plainCreds = Buffer.from(`\0${config.user}\0${config.pass}`).toString('base64');
        session.sendCommand(`AUTH PLAIN ${plainCreds}`, (plainRes) => {
          if (!plainRes.startsWith('235')) {
            session.close();
            callback(new Error(`SMTP Authentication failed: ${plainRes}`));
            return;
          }
          callback(null, session);
        });
        return;
      }

      // Send Base64 Username
      const b64User = Buffer.from(config.user).toString('base64');
      session.sendCommand(b64User, (userRes) => {
        if (!userRes.startsWith('334')) {
          session.close();
          callback(new Error(`SMTP Username rejected: ${userRes}`));
          return;
        }

        // Send Base64 Password
        const b64Pass = Buffer.from(config.pass).toString('base64');
        session.sendCommand(b64Pass, (passRes) => {
          if (!passRes.startsWith('235')) {
            session.close();
            callback(new Error(`SMTP Password authentication failed: ${passRes}`));
            return;
          }
          callback(null, session);
        });
      });
    });
  }

  /**
   * Constructs MIME encoded message content with HTML and plain-text fallback.
   */
  private static buildMimeMessage(options: SendMailOptions, messageId: string): string {
    const boundary = `----=_Part_${Date.now()}_${crypto.randomBytes(6).toString('hex')}`;
    const dateStr = new Date().toUTCString();

    const fromHeader = options.fromName
      ? `"${SmtpClient.escapeHeader(options.fromName)}" <${options.from}>`
      : options.from;

    const toHeader = Array.isArray(options.to) ? options.to.join(', ') : options.to;
    const subjectEncoded = `=?UTF-8?B?${Buffer.from(options.subject, 'utf8').toString('base64')}?=`;

    const headers: string[] = [
      `From: ${fromHeader}`,
      `To: ${toHeader}`,
      `Subject: ${subjectEncoded}`,
      `Date: ${dateStr}`,
      `Message-ID: ${messageId}`,
      `MIME-Version: 1.0`,
      `X-Mailer: Super AI Autonomous Neural Mailer v1.0`,
    ];

    if (options.replyTo) {
      headers.push(`Reply-To: ${options.replyTo}`);
    }
    if (options.cc) {
      const ccStr = Array.isArray(options.cc) ? options.cc.join(', ') : options.cc;
      headers.push(`Cc: ${ccStr}`);
    }

    const textContent = options.text || (options.html ? options.html.replace(/<[^>]*>?/gm, ' ') : '');
    const htmlContent = options.html || `<div style="font-family: sans-serif; font-size: 14px; color: #111;">${textContent.replace(/\n/g, '<br/>')}</div>`;

    headers.push(`Content-Type: multipart/alternative; boundary="${boundary}"`);

    let body = headers.join('\r\n') + '\r\n\r\n';

    // 1. Plain Text part
    body += `--${boundary}\r\n`;
    body += `Content-Type: text/plain; charset=UTF-8\r\n`;
    body += `Content-Transfer-Encoding: base64\r\n\r\n`;
    body += SmtpClient.wrapBase64(Buffer.from(textContent, 'utf8').toString('base64')) + '\r\n\r\n';

    // 2. HTML part
    body += `--${boundary}\r\n`;
    body += `Content-Type: text/html; charset=UTF-8\r\n`;
    body += `Content-Transfer-Encoding: base64\r\n\r\n`;
    body += SmtpClient.wrapBase64(Buffer.from(htmlContent, 'utf8').toString('base64')) + '\r\n\r\n';

    body += `--${boundary}--`;

    return body;
  }

  private static escapeHeader(val: string): string {
    return val.replace(/["\r\n]/g, '');
  }

  private static wrapBase64(b64: string): string {
    return b64.replace(/(.{76})/g, '$1\r\n');
  }
}

/**
 * Low-level SMTP Session handler over Socket.
 */
class SmtpSession {
  private socket: net.Socket | tls.TLSSocket;
  private buffer = '';
  public banner = '';

  constructor(socket: net.Socket | tls.TLSSocket) {
    this.socket = socket;
  }

  public readResponse(callback: (response: string) => void): void {
    const onData = (data: Buffer) => {
      this.buffer += data.toString('utf8');

      // Check if complete multi-line response received
      const lines = this.buffer.split('\r\n');
      if (lines.length > 1) {
        const lastLine = lines[lines.length - 2]; // line before trailing empty
        // In SMTP, completion line has 3 digits followed by a space (e.g. "250 OK" vs "250-SIZE")
        if (/^\d{3}\s/.test(lastLine)) {
          this.socket.removeListener('data', onData);
          const fullResponse = this.buffer.trim();
          this.buffer = '';
          callback(fullResponse);
        }
      }
    };

    this.socket.on('data', onData);
  }

  public sendCommand(cmd: string, callback: (response: string) => void): void {
    this.readResponse(callback);
    this.socket.write(`${cmd}\r\n`);
  }

  public sendRawData(data: string, callback: (response: string) => void): void {
    this.readResponse(callback);
    this.socket.write(data);
  }

  public upgradeToTls(host: string, callback: () => void): void {
    this.socket = tls.connect({
      socket: this.socket as net.Socket,
      host,
      rejectUnauthorized: false,
    });
    this.socket.once('secureConnect', () => {
      callback();
    });
  }

  public close(): void {
    try {
      this.socket.end();
      this.socket.destroy();
    } catch {
      // ignore
    }
  }
}
