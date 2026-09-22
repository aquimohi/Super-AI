/**
 * humanizer.ts — Super AI Text Humanizer
 * 
 * Strips out generic AI writing patterns (ChatGPT-style) and enforces
 * the Super AI voice as defined in design_genius/voice.md.
 * 
 * Called by the orchestrator on all text responses before they are
 * sent to the user or TTS engine.
 */

// ── Banned word replacements ────────────────────────────────────────────────

const WORD_REPLACEMENTS: Array<[RegExp, string]> = [
  // Generic filler openers — just cut them entirely
  [/^(Absolutely!?\s*)/im, ''],
  [/^(Certainly!?\s*)/im, ''],
  [/^(Of course!?\s*)/im, ''],
  [/^(Sure!?\s*)/im, ''],
  [/^(Great(ly)?!?\s*)/im, ''],
  [/^(Definitely!?\s*)/im, ''],

  // Hollow affirmations mid-sentence
  [/\bgreat question\b/gi, ''],
  [/\bi('d| would) be happy to\b/gi, ''],
  [/\bi('m| am) here to help\b/gi, ''],
  [/\bfeel free to\b/gi, ''],
  [/\bdon't hesitate to\b/gi, ''],

  // Closing noise
  [/\blet me know if (you need|there's) (anything|something)(else)?\b\.?/gi, ''],
  [/\bif you have any (more )?(questions?|concerns?|thoughts?)\b[,.]?/gi, ''],
  [/\bhope (this|that) helps?!?\b/gi, ''],
  [/\bis there anything else i can (help|assist) (you with)?\b\.?/gi, ''],

  // Banned power words → natural replacements
  [/\bseamlessly?\b/gi, 'smoothly'],
  [/\brobust(ly)?\b/gi, 'solid'],
  [/\bleverag(e|ing|ed)\b/gi, 'using'],
  [/\butiliz(e|ing|ed|ation)\b/gi, 'using'],
  [/\binnovativ(e|ely|eness)\b/gi, 'new'],
  [/\bcomprehensiv(e|ely)\b/gi, 'thorough'],
  [/\bcutting-edge\b/gi, 'latest'],
  [/\bstate-of-the-art\b/gi, 'best available'],
  [/\bparadigm\b/gi, 'approach'],
  [/\bsynerg(y|ies|ize|istic)\b/gi, 'alignment'],
  [/\bdelve\b/gi, 'look into'],
  [/\bdive in\b/gi, 'start'],
  [/\bempow(er|ers|ering|ered)\b/gi, 'give'],
  [/\boptimiz(e|ing|ed|ation)\b/gi, 'improve'],
  [/\bfacilitat(e|ing|ed)\b/gi, 'help'],
  [/\bstreamlin(e|ing|ed)\b/gi, 'simplify'],
  [/\bpivotin[g]\b/gi, 'shifting'],
  [/\bscalabl[ey]\b/gi, 'flexible'],
];

// ── Structural pattern cleaners ─────────────────────────────────────────────

/**
 * Removes em-dash overuse.
 * Allow max 1 em-dash per response. Convert rest to commas or remove.
 */
function fixEmDashes(text: string): string {
  const matches = text.match(/\s*—\s*/g);
  if (!matches || matches.length <= 1) return text;

  let count = 0;
  return text.replace(/\s*—\s*/g, (match) => {
    count++;
    if (count === 1) return ' — ';
    return ', '; // convert excess em-dashes to commas
  });
}

/**
 * Detects if a response is aggressively over-bulleted for a conversational question.
 * Converts simple bullet lists (3+ items that are each ≤ 10 words) to prose.
 */
function collapseTrivialBullets(text: string): string {
  const bulletRegex = /^[ \t]*[-•*]\s+(.+)$/gm;
  const bullets: string[] = [];
  let match;

  while ((match = bulletRegex.exec(text)) !== null) {
    bullets.push(match[1].trim());
  }

  // Only collapse if it's a short list of short items (conversational, not technical)
  if (bullets.length >= 2 && bullets.length <= 5 && bullets.every(b => b.split(' ').length <= 8)) {
    let result = text;
    bullets.forEach(b => {
      result = result.replace(/^[ \t]*[-•*]\s+.+$/m, '');
    });
    // Join the bullet content into a natural sentence
    const joined = bullets.slice(0, -1).join(', ') + (bullets.length > 1 ? ', and ' + bullets[bullets.length - 1] : bullets[0]);
    result = result.trim() + (result.trim() ? '\n\n' : '') + joined + '.';
    return result.trim();
  }

  return text;
}

/**
 * Cleans up excessive blank lines and trailing whitespace.
 */
function normalizeWhitespace(text: string): string {
  return text
    .replace(/\n{3,}/g, '\n\n')   // max 2 consecutive blank lines
    .replace(/[ \t]+$/gm, '')      // trailing spaces on each line
    .trim();
}

// ── Main export ─────────────────────────────────────────────────────────────

/**
 * Applies all humanization passes to an AI-generated text response.
 * 
 * @param raw - The raw LLM output text
 * @param isVoice - If true, applies extra stripping for TTS (no markdown, shorter)
 * @returns Humanized, on-brand text
 */
export function humanize(raw: string, isVoice = false): string {
  if (!raw || typeof raw !== 'string') return raw;

  let text = raw;

  // 1. Apply word/phrase replacements
  for (const [pattern, replacement] of WORD_REPLACEMENTS) {
    text = text.replace(pattern, replacement);
  }

  // 2. Fix em-dash overuse
  text = fixEmDashes(text);

  // 3. Collapse trivial bullet lists in conversational responses
  if (!isVoice) {
    text = collapseTrivialBullets(text);
  }

  // 4. Normalize whitespace
  text = normalizeWhitespace(text);

  // 5. Voice-specific pass: strip markdown formatting
  if (isVoice) {
    text = text
      .replace(/#{1,6}\s+/g, '')        // strip headings
      .replace(/\*\*(.+?)\*\*/g, '$1')  // strip bold
      .replace(/\*(.+?)\*/g, '$1')      // strip italic
      .replace(/`(.+?)`/g, '$1')        // strip inline code
      .replace(/^[-•*]\s+/gm, '')       // strip bullets
      .replace(/\[(.+?)\]\(.+?\)/g, '$1') // strip links
      .replace(/\n+/g, ' ')             // flatten to single line
      .trim();
  }

  return text;
}

/**
 * Convenience wrapper: humanize for voice output specifically.
 */
export function humanizeForVoice(raw: string): string {
  return humanize(raw, true);
}

/**
 * Reads voice.md to expose the tone guide to LLM system prompts.
 * Call this in your orchestrator system prompt builder.
 */
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export function getVoiceGuide(): string {
  try {
    const voicePath = join(__dirname, 'voice.md');
    return readFileSync(voicePath, 'utf8');
  } catch {
    return ''; // Fail silently — don't crash the orchestrator
  }
}

export function getBrandGuide(): string {
  try {
    const brandPath = join(__dirname, 'brand.md');
    return readFileSync(brandPath, 'utf8');
  } catch {
    return '';
  }
}
