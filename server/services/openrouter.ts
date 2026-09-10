import { storage } from '../storage.js';

export interface OpenRouterTestResult {
  valid: boolean;
  label?: string;
  limit?: number;
  usage?: number;
  isFreeTier?: boolean;
  rateLimit?: string;
  error?: string;
}

export interface ChatCompletionMessage {
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string | null;
  tool_calls?: ChatCompletionToolCall[];
  tool_call_id?: string;
  name?: string;
}

export interface ChatCompletionRequest {
  messages: ChatCompletionMessage[];
  role?: 'general' | 'reasoning' | 'coding' | 'vision' | 'judge';
  model?: string;
  temperature?: number;
  maxTokens?: number;
  tools?: any[];
}

export interface ChatCompletionToolCall {
  id?: string;
  type?: string;
  function: {
    name: string;
    arguments: string;
  };
}

export interface ChatCompletionResult {
  text: string;
  model: string;
  provider: string;
  keyUsedId: string;
  keyUsedName: string;
  rotated: boolean;
  usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
  toolCalls?: ChatCompletionToolCall[];
}

/**
 * Tests an OpenRouter API key directly against the official OpenRouter auth verification endpoint.
 */
export async function testOpenRouterKey(rawKey: string): Promise<OpenRouterTestResult> {
  const trimmedKey = rawKey.trim();
  if (!trimmedKey) {
    return { valid: false, error: 'Key cannot be empty.' };
  }

  try {
    const response = await fetch('https://openrouter.ai/api/v1/auth/key', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${trimmedKey}`,
        'HTTP-Referer': 'https://superai.local',
        'X-Title': 'Super AI Assistant',
      },
    });

    if (response.status === 200) {
      const json = await response.json();
      const data = json?.data || {};
      return {
        valid: true,
        label: data.label || 'Active Key',
        limit: data.limit,
        usage: data.usage,
        isFreeTier: data.is_free_tier,
        rateLimit: data.rate_limit ? `${data.rate_limit.requests} req / ${data.rate_limit.interval}` : undefined,
      };
    }

    if (response.status === 401 || response.status === 403) {
      return { valid: false, error: 'Invalid API key or authentication failed (HTTP 401/403).' };
    }

    if (response.status === 429) {
      return { valid: false, error: 'Rate limit reached on this key (HTTP 429).' };
    }

    const errText = await response.text().catch(() => '');
    return { valid: false, error: `OpenRouter returned status ${response.status}: ${errText.slice(0, 120)}` };
  } catch (err: any) {
    return { valid: false, error: `Connection failed: ${err.message || 'Network error'}` };
  }
}

/**
 * Sends a chat completion to OpenRouter with automatic key rotation and fallback.
 * If the active key fails due to rate limits (429) or temporary API failure, it seamlessly
 * attempts the next enabled key in the rotation pool.
 */
export async function executeOpenRouterChat(
  req: ChatCompletionRequest
): Promise<ChatCompletionResult> {
  const availableKeys = storage.getExecutableKeysForProvider('openrouter');

  if (availableKeys.length === 0) {
    throw new Error(
      'NO_KEYS_CONFIGURED: No enabled OpenRouter API keys found. Please add or enable a key in the Admin Control Panel.'
    );
  }

  const config = storage.getConfig();
  const targetModel =
    req.model ||
    (req.role && config.models[req.role] ? config.models[req.role] : config.models.general);

  const voiceLang = config.voice?.language || 'Hinglish';

  let systemInstructions =
    'You are Super AI, an advanced, highly capable holographic tactical assistant. ' +
    'Provide clear, accurate, helpful, and structured responses. ' +
    'Personality: Confident, calm, helpful, slightly witty when appropriate, not overly formal. ' +
    'Do NOT use "Sir" in every response. ' +
    'IMPORTANT FOR SPOKEN VOICE: Keep spoken answers crisp, direct, and conversational (usually 2 to 4 punchy sentences) so they sound natural when read aloud, unless the user explicitly asks for an extensive list or essay. ' +
    'Do NOT imitate or impersonate any specific real person.\n';

  if (voiceLang === 'Hinglish') {
    systemInstructions +=
      'Conversational Style: Natural Delhi/North-Indian conversational Hinglish. ' +
      'Rules for Hinglish:\n' +
      '1. Respond in natural everyday Hinglish using Roman English script, seamlessly blended with standard English technical terms.\n' +
      '2. Do NOT mechanically convert technical terms into Hindi. Preserve English words naturally (e.g., computer, program, project, code, model, error, test, voice, microphone, file, system, database).\n' +
      '   Bad: "मैं आपका कंप्यूटर प्रोग्राम बना दूंगा"\n' +
      '   Preferred: "Main aapka computer program bana dunga."\n' +
      '   Another example: "Samajh gaya. Main pehle project check karta hoon, phir jo problem hai usko fix karte hain."\n' +
      '3. Strictly avoid overly formal, archaic textbook vocabulary like "कृपया", "अतः", "तत्पश्चात", "महोदय", etc.\n' +
      '4. Use natural, authentic conversational phrasing:\n' +
      '   - "theek hai"\n' +
      '   - "samajh gaya"\n' +
      '   - "ek minute"\n' +
      '   - "main check karta hoon"\n' +
      '   - "ho gaya"\n' +
      '   - "rukho, main verify karta hoon"\n' +
      '5. Do NOT overuse "sir". Keep spoken answers crisp, direct, and conversational (usually 2 to 4 punchy sentences) so they sound completely natural when read aloud by the speech engine.\n' +
      '6. If the user explicitly speaks or asks exclusively in English, you may respond in English with the same confident, calm, direct style.';
  } else if (voiceLang === 'Hindi') {
    systemInstructions +=
      'Conversational Style: Natural modern conversational Hindi. ' +
      'Respond in natural, fluent Hindi. ' +
      'Keep it confident, calm, helpful, and concise. Not overly formal.\n' +
      'Examples:\n' +
      '- "समझ गया। मैं अभी चेक करता हूँ।"\n' +
      '- "हो गया। यह काम पूरा हो चुका है।"\n' +
      '- "एक मिनट, मैं इसे वेरीफाई कर रहा हूँ।"\n' +
      '- "इस एक्शन के लिए अनुमति चाहिए।"';
  } else {
    systemInstructions +=
      'Conversational Style: Crisp, confident, calm, slightly witty tactical English. Keep spoken responses short and direct where appropriate.';
  }

  const finalMessages = [
    { role: 'system', content: systemInstructions },
    ...req.messages,
  ];

  let lastError: Error | null = null;
  let rotationOccurred = false;

  for (let i = 0; i < availableKeys.length; i++) {
    const keyCandidate = availableKeys[i];
    if (i > 0) rotationOccurred = true;

    try {
      const requestPayload: any = {
        model: targetModel,
        messages: finalMessages,
        temperature: req.temperature ?? config.routing.temperature ?? 0.7,
        max_tokens: req.maxTokens ?? config.routing.maxTokens ?? 2048,
      };

      if (req.tools && Array.isArray(req.tools) && req.tools.length > 0) {
        requestPayload.tools = req.tools;
        requestPayload.tool_choice = 'auto';
      }

      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${keyCandidate.rawKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://superai.local',
          'X-Title': 'Super AI Assistant',
        },
        body: JSON.stringify(requestPayload),
      });

      // Handle rate limits and transient errors with automatic fallback
      if (response.status === 429) {
        // Mark key as rate limited in storage
        storage.updateKey(keyCandidate.id, {
          status: 'rate_limited',
          lastError: 'HTTP 429 Rate Limit',
          lastTestedAt: new Date().toISOString(),
        });
        storage.logAudit(
          'KEY_ROTATION',
          `Key "${keyCandidate.name}" encountered HTTP 429 rate limit. Rotating to next enabled key.`,
          'warn'
        );
        lastError = new Error(`Rate limited on key "${keyCandidate.name}"`);
        continue; // Try next enabled key!
      }

      if (response.status === 401 || response.status === 403) {
        storage.updateKey(keyCandidate.id, {
          status: 'invalid',
          lastError: 'HTTP 401/403 Authentication Error',
          lastTestedAt: new Date().toISOString(),
        });
        storage.logAudit(
          'KEY_ERROR',
          `Key "${keyCandidate.name}" failed with HTTP ${response.status}. Rotating to next enabled key.`,
          'error'
        );
        lastError = new Error(`Authentication error on key "${keyCandidate.name}"`);
        continue;
      }

      if (!response.ok) {
        const errorBody = await response.text().catch(() => '');
        // If 400 relates to tools/functions not being supported by the model, retry cleanly without tools
        if ((response.status === 400 || response.status === 422) && requestPayload.tools) {
          const fallbackMessages = finalMessages.map((m: any) => {
            if (m.role === 'tool') {
              return { role: 'user', content: `[TOOL RESULT FOR ${m.name || 'tool'}]: ${m.content}` };
            }
            if (m.role === 'assistant' && m.tool_calls) {
              return {
                role: 'assistant',
                content: m.content || `[Requested tool: ${m.tool_calls?.[0]?.function?.name || 'tool'}]`,
              };
            }
            return m;
          });
          const retryPayload: any = {
            ...requestPayload,
            messages: fallbackMessages,
          };
          delete retryPayload.tools;
          delete retryPayload.tool_choice;

          const retryRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${keyCandidate.rawKey}`,
              'Content-Type': 'application/json',
              'HTTP-Referer': 'https://superai.local',
              'X-Title': 'Super AI Assistant',
            },
            body: JSON.stringify(retryPayload),
          });

          if (retryRes.ok) {
            const retryJson = await retryRes.json();
            const rChoice = retryJson?.choices?.[0];
            return {
              text: rChoice?.message?.content || rChoice?.text || '',
              model: retryJson?.model || targetModel,
              provider: 'openrouter',
              keyUsedId: keyCandidate.id,
              keyUsedName: keyCandidate.name,
              rotated: rotationOccurred,
              usage: retryJson?.usage,
              toolCalls: rChoice?.message?.tool_calls,
            };
          }
        }
        lastError = new Error(`OpenRouter Error ${response.status}: ${errorBody.slice(0, 150)}`);
        continue;
      }

      const json = await response.json();
      const choice = json?.choices?.[0];
      const replyContent = choice?.message?.content || choice?.text || '';

      // Mark key as validated
      storage.updateKey(keyCandidate.id, {
        status: 'valid',
        lastError: undefined,
        lastTestedAt: new Date().toISOString(),
      });

      return {
        text: replyContent,
        model: json?.model || targetModel,
        provider: 'openrouter',
        keyUsedId: keyCandidate.id,
        keyUsedName: keyCandidate.name,
        rotated: rotationOccurred,
        usage: json?.usage,
        toolCalls: choice?.message?.tool_calls,
      };
    } catch (err: any) {
      lastError = err;
      storage.logAudit(
        'REQUEST_ERROR',
        `Network issue with key "${keyCandidate.name}": ${err.message}. Rotating...`,
        'warn'
      );
    }
  }

  throw lastError || new Error('All available OpenRouter keys failed to process the request.');
}
