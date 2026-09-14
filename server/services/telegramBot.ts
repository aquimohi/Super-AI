/**
 * Super AI — Telegram Cross-Device Bridge
 *
 * Routes Telegram messages (text + voice) directly into the existing
 * Super AI multi-model cognitive orchestrator. Supports the full tool
 * execution pipeline including permission prompts via Telegram inline keyboards.
 *
 * Architecture:
 *   Mohit (Telegram) → TelegramBot (polling)
 *     → text msg  → orchestrateChatRequest()
 *     → voice msg → Gemini/Whisper transcription → orchestrateChatRequest()
 *   Orchestrator returns:
 *     → ALLOW tool  → auto-execute, send result
 *     → ASK tool    → inline keyboard confirm → user taps → re-run
 *     → DENY tool   → send refusal
 *   Final AI text → bot.sendMessage() back to Mohit
 */

import * as TelegramBotLib from 'node-telegram-bot-api';
import type { Message, CallbackQuery } from 'node-telegram-bot-api';

// node-telegram-bot-api is a CommonJS module; unwrap the default export
const TelegramBot = (TelegramBotLib as any).default ?? TelegramBotLib;
type TelegramBot = InstanceType<typeof TelegramBot>;
import { orchestrateChatRequest, OrchestrationResponse } from './orchestrator.js';
import { randomBytes } from 'crypto';
import path from 'path';
import fs from 'fs';

// ─── Session Types ─────────────────────────────────────────────────────────────

interface TelegramSession {
  conversationId: string;
  sessionAuthorizations: string[];
}

interface PendingConfirmation {
  chatId: number;
  messageId: number;     // message with the inline keyboard
  originalText: string;  // the user message that triggered the tool
  tool: string;
  toolName: string;
  toolArguments: any;
  toolCallId: string;
  risk: string;
  actionDescription: string;
  conversationId: string;
  sessionAuthorizations: string[];
  createdAt: number;
}

// ─── State ─────────────────────────────────────────────────────────────────────

const chatSessions = new Map<number, TelegramSession>();
const pendingConfirmations = new Map<string, PendingConfirmation>();

// Cleanup stale pending confirmations every 10 minutes
const PENDING_TTL_MS = 10 * 60 * 1000;

function cleanupStaleConfirmations() {
  const now = Date.now();
  for (const [key, val] of pendingConfirmations.entries()) {
    if (now - val.createdAt > PENDING_TTL_MS) {
      pendingConfirmations.delete(key);
    }
  }
}
setInterval(cleanupStaleConfirmations, PENDING_TTL_MS);

// ─── Session Management ────────────────────────────────────────────────────────

function getOrCreateSession(chatId: number): TelegramSession {
  if (!chatSessions.has(chatId)) {
    chatSessions.set(chatId, {
      conversationId: `tg_${chatId}_${Date.now()}`,
      sessionAuthorizations: [],
    });
  }
  return chatSessions.get(chatId)!;
}

// ─── Whitelist Check ───────────────────────────────────────────────────────────

function isAllowedChat(chatId: number): boolean {
  const allowed = process.env.TELEGRAM_ALLOWED_CHAT_ID;
  if (!allowed || !allowed.trim()) return true; // open mode if not configured
  return allowed.trim().split(',').map(s => s.trim()).includes(String(chatId));
}

// ─── Text Formatting ───────────────────────────────────────────────────────────

/**
 * Escape Telegram MarkdownV2 special characters
 */
function escapeMarkdown(text: string): string {
  return text.replace(/([_*\[\]()~`>#+\-=|{}.!\\])/g, '\\$1');
}

/**
 * Format the orchestration response for Telegram.
 * Appends sandbox stdout/stderr if execute_code was called.
 */
function formatResponse(response: OrchestrationResponse): string {
  let text = response.text || '(No response)';

  // Append sandbox execution output if present
  const sandboxActivity = response.toolActivities?.find(a => a.tool === 'execute_code');
  if (sandboxActivity && sandboxActivity.permission === 'ALLOWED') {
    const outputLine = sandboxActivity.result || '';
    const hasOutput = outputLine && !outputLine.includes('TIMEOUT') && !outputLine.includes('ERROR');
    if (hasOutput) {
      // Extract language from sanitized summary if possible
      const langMatch = (sandboxActivity.execution || '').match(/\b(Python|JavaScript)\b/i);
      const lang = langMatch ? langMatch[1] : 'Code';
      text += `\n\n\`\`\`\n🖥 ${lang} Sandbox Output:\n${outputLine.slice(0, 800)}\n\`\`\``;
    }
  }

  // Trim to Telegram's 4096 character limit
  if (text.length > 4000) {
    text = text.slice(0, 3990) + '\n...(truncated)';
  }

  return text;
}

// ─── Voice Transcription ───────────────────────────────────────────────────────

/**
 * Transcribes a Telegram voice note OGG buffer.
 * Tries Gemini audio REST first (reuses GEMINI_API_KEY).
 * Falls back to OpenAI Whisper if OPENAI_WHISPER_KEY is set.
 * Returns null if no transcription service is available.
 */
async function transcribeVoice(oggBuffer: Buffer, mimeType = 'audio/ogg'): Promise<string | null> {
  // 1. Gemini audio transcription
  const geminiKey = process.env.GEMINI_API_KEY;
  if (geminiKey) {
    try {
      const base64Audio = oggBuffer.toString('base64');
      const body = {
        contents: [
          {
            parts: [
              {
                inlineData: {
                  mimeType,
                  data: base64Audio,
                },
              },
              {
                text: 'Transcribe the spoken words in this audio exactly. Return only the transcript, no explanation.',
              },
            ],
          },
        ],
      };

      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        }
      );

      if (res.ok) {
        const data = await res.json();
        const transcript = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
        if (transcript) {
          console.log('[TelegramBot] Voice transcribed via Gemini:', transcript.slice(0, 60));
          return transcript;
        }
      }
    } catch (err: any) {
      console.warn('[TelegramBot] Gemini transcription failed:', err.message);
    }
  }

  // 2. OpenAI Whisper fallback
  const whisperKey = process.env.OPENAI_WHISPER_KEY;
  if (whisperKey) {
    try {
      const FormData = (await import('node:stream')).Readable; // Node built-in
      // Write buffer to a temp file for multipart upload
      const tmpPath = path.join(process.cwd(), 'sandbox_workspace', `voice_${Date.now()}.ogg`);
      fs.writeFileSync(tmpPath, oggBuffer);

      const formData = new (await import('form-data')).default();
      formData.append('file', fs.createReadStream(tmpPath), {
        filename: 'voice.ogg',
        contentType: 'audio/ogg',
      });
      formData.append('model', 'whisper-1');

      const res = await fetch('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${whisperKey}`,
          ...formData.getHeaders(),
        },
        body: formData as any,
      });

      fs.unlinkSync(tmpPath);

      if (res.ok) {
        const data = await res.json();
        const transcript = data?.text?.trim();
        if (transcript) {
          console.log('[TelegramBot] Voice transcribed via Whisper:', transcript.slice(0, 60));
          return transcript;
        }
      }
    } catch (err: any) {
      console.warn('[TelegramBot] Whisper transcription failed:', err.message);
    }
  }

  return null;
}

// ─── Authorization Prompt ──────────────────────────────────────────────────────

async function sendAuthorizationPrompt(
  bot: TelegramBot,
  chatId: number,
  response: OrchestrationResponse,
  originalText: string,
  session: TelegramSession
): Promise<void> {
  const pending = response.pendingAuthorization!;
  const confirmId = randomBytes(8).toString('hex');

  const riskEmoji: Record<string, string> = {
    LOW: '🟡',
    MEDIUM: '🟠',
    HIGH: '🔴',
    CRITICAL: '💀',
    NONE: '🟢',
  };

  const langLabel = pending.arguments?.language === 'python'
    ? 'Python 🐍'
    : pending.arguments?.language === 'javascript'
    ? 'JavaScript ⚡'
    : '';

  const toolLabel = `${pending.toolName}${langLabel ? ` [${langLabel}]` : ''}`;
  const risk = String(pending.risk || 'MEDIUM');
  const emoji = riskEmoji[risk] || '🟠';

  const promptText =
    `${emoji} *Super AI — Authorization Required*\n\n` +
    `Tool: \`${toolLabel}\`\n` +
    `Action: ${pending.actionDescription}\n` +
    `Risk: \`${risk}\`\n\n` +
    `_Ek action execute karna chahta hoon — confirm karo?_`;

  let sentMsg: Message | undefined;
  try {
    sentMsg = await bot.sendMessage(chatId, promptText, {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [
            { text: '✅ Allow Once', callback_data: `allow:${confirmId}` },
            { text: '❌ Deny', callback_data: `deny:${confirmId}` },
          ],
        ],
      },
    });
  } catch (err: any) {
    console.error('[TelegramBot] Failed to send auth prompt:', err.message);
    return;
  }

  pendingConfirmations.set(confirmId, {
    chatId,
    messageId: sentMsg!.message_id,
    originalText,
    tool: pending.tool,
    toolName: pending.toolName,
    toolArguments: pending.arguments,
    toolCallId: pending.toolCallId || `call_${Date.now()}`,
    risk,
    actionDescription: pending.actionDescription,
    conversationId: session.conversationId,
    sessionAuthorizations: [...session.sessionAuthorizations],
    createdAt: Date.now(),
  });
}

// ─── Process Message ───────────────────────────────────────────────────────────

async function processMessage(
  bot: TelegramBot,
  chatId: number,
  text: string,
  session: TelegramSession,
  approvedToolCall?: { tool: string; arguments: any; toolCallId?: string },
  rejectedToolCall?: { tool: string; arguments?: any; toolCallId?: string }
): Promise<void> {
  try {
    await bot.sendChatAction(chatId, 'typing');

    const response = await orchestrateChatRequest({
      message: text,
      conversationId: session.conversationId,
      sessionAuthorizations: session.sessionAuthorizations,
      approvedToolCall,
      rejectedToolCall,
    });

    // Handle authorization required (ASK-level tool)
    if (response.requiresAuthorization && response.pendingAuthorization) {
      await sendAuthorizationPrompt(bot, chatId, response, text, session);
      return;
    }

    // Send the reply
    const replyText = formatResponse(response);
    await bot.sendMessage(chatId, replyText, { parse_mode: 'Markdown' }).catch(async () => {
      // Fallback to plain text if Markdown parse fails
      await bot.sendMessage(chatId, response.text || '(No response)');
    });

  } catch (err: any) {
    console.error('[TelegramBot] processMessage error:', err);
    try {
      await bot.sendMessage(chatId, `⚠️ Kuch error aa gayi: ${err.message || 'Unknown error'}`);
    } catch { /* ignore send failure */ }
  }
}

// ─── Bot Initialization ────────────────────────────────────────────────────────

let botInstance: TelegramBot | null = null;

export async function initTelegramBot(): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;

  if (!token || !token.trim()) {
    console.log('[TelegramBot] TELEGRAM_BOT_TOKEN not set — Telegram bridge disabled.');
    return;
  }

  try {
    const bot = new TelegramBot(token, {
      polling: {
        interval: 300,
        autoStart: true,
        params: { timeout: 10 },
      },
    });

    botInstance = bot;

    // ── Polling error guard: never crash the main process ──────────────────
    bot.on('polling_error', (err) => {
      console.error('[TelegramBot] Polling error:', (err as any).message || err);
    });

    bot.on('error', (err) => {
      console.error('[TelegramBot] Bot error:', err.message);
    });

    // ── Startup validation ──────────────────────────────────────────────────
    try {
      const me = await bot.getMe();
      console.log(`[TelegramBot] ✅ Connected as @${me.username} (${me.first_name})`);
    } catch (err: any) {
      console.error('[TelegramBot] ❌ Failed to connect — invalid token or network issue:', err.message);
      return;
    }

    // ── Text Message Handler ────────────────────────────────────────────────
    bot.on('message', async (msg: Message) => {
      try {
        const chatId = msg.chat.id;

        // Whitelist enforcement
        if (!isAllowedChat(chatId)) {
          console.warn(`[TelegramBot] Ignored message from unauthorized chatId: ${chatId}`);
          return;
        }

        const session = getOrCreateSession(chatId);

        // Voice notes
        if (msg.voice) {
          await bot.sendChatAction(chatId, 'typing');
          try {
            const fileLink = await bot.getFileLink(msg.voice.file_id);
            const audioRes = await fetch(fileLink);
            const oggBuffer = Buffer.from(await audioRes.arrayBuffer());
            const transcript = await transcribeVoice(oggBuffer);

            if (!transcript) {
              await bot.sendMessage(
                chatId,
                '🎙️ Bhai, voice notes ke liye transcription configured nahi hai!\n\n' +
                'GEMINI_API_KEY ya OPENAI_WHISPER_KEY set karo `.env` mein.',
              );
              return;
            }

            await bot.sendMessage(chatId, `🎙️ _Transcribed:_ "${transcript}"`, { parse_mode: 'Markdown' });
            await processMessage(bot, chatId, transcript, session);
          } catch (err: any) {
            console.error('[TelegramBot] Voice processing error:', err.message);
            await bot.sendMessage(chatId, '⚠️ Voice note process karne mein error aa gayi. Dobara try karo.');
          }
          return;
        }

        // Regular text
        const text = msg.text?.trim();
        if (!text) return;

        await processMessage(bot, chatId, text, session);

      } catch (err: any) {
        console.error('[TelegramBot] Unhandled message error:', err);
      }
    });

    // ── Inline Keyboard Callback Handler (Tool Authorization) ───────────────
    bot.on('callback_query', async (query: CallbackQuery) => {
      try {
        const data = query.data || '';
        const chatId = query.message?.chat.id;
        if (!chatId) return;

        // Ack immediately to remove Telegram's loading spinner
        await bot.answerCallbackQuery(query.id);

        const [action, confirmId] = data.split(':');
        const confirmation = pendingConfirmations.get(confirmId);

        if (!confirmation) {
          await bot.sendMessage(chatId, '⌛ Yeh authorization request expire ho gayi. Message dobara bhejo.');
          return;
        }

        // Remove inline keyboard from original prompt message
        await bot.editMessageReplyMarkup(
          { inline_keyboard: [] },
          { chat_id: chatId, message_id: confirmation.messageId }
        ).catch(() => { /* ignore if already edited */ });

        pendingConfirmations.delete(confirmId);

        const session = getOrCreateSession(chatId);

        if (action === 'allow') {
          // Add to session authorizations for this chatId
          if (!session.sessionAuthorizations.includes(confirmation.tool)) {
            session.sessionAuthorizations.push(confirmation.tool);
          }

          await bot.sendMessage(chatId, `✅ *Allowed:* \`${confirmation.toolName}\` — executing...`, {
            parse_mode: 'Markdown',
          });

          await processMessage(
            bot,
            chatId,
            confirmation.originalText,
            session,
            {
              tool: confirmation.tool,
              arguments: confirmation.toolArguments,
              toolCallId: confirmation.toolCallId,
            }
          );

        } else {
          // DENY
          await bot.sendMessage(
            chatId,
            `🔒 *Denied:* \`${confirmation.toolName}\` — action cancel kar diya.`,
            { parse_mode: 'Markdown' }
          );

          await processMessage(
            bot,
            chatId,
            confirmation.originalText,
            session,
            undefined,
            {
              tool: confirmation.tool,
              arguments: confirmation.toolArguments,
              toolCallId: confirmation.toolCallId,
            }
          );
        }

      } catch (err: any) {
        console.error('[TelegramBot] Callback query error:', err.message);
        try {
          if (query.message?.chat.id) {
            await bot.sendMessage(query.message.chat.id, '⚠️ Authorization process karne mein error aa gayi.');
          }
        } catch { /* ignore */ }
      }
    });

    console.log('[TelegramBot] 🚀 Telegram bridge active — polling for messages...');

  } catch (err: any) {
    // Never crash the main server — just log
    console.error('[TelegramBot] Fatal initialization error (server will continue):', err.message);
  }
}

/**
 * Gracefully stop the bot (called on server shutdown)
 */
export async function stopTelegramBot(): Promise<void> {
  if (botInstance) {
    try {
      await botInstance.stopPolling();
      console.log('[TelegramBot] Polling stopped gracefully.');
    } catch (err: any) {
      console.warn('[TelegramBot] Error stopping polling:', err.message);
    }
    botInstance = null;
  }
}
