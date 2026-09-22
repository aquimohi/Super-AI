/**
 * designMemory.ts — Design Genius Memory Module
 *
 * Provides the DESIGNER agent and any other consumer with strongly-typed
 * access to the three Design Brain artifacts:
 *   1. voice.md     — personality & tone rules
 *   2. brand.md     — visual design system rules
 *   3. tokens.css   — frozen CSS custom properties
 *
 * Resolution order (first found wins):
 *   1. server/design_genius/ (canonical source — always edit here)
 *   2. server/memory/design/ (memory-system placeholder fallback)
 *
 * Usage:
 *   import { designMemory } from './designMemory.js';
 *   const context = designMemory.getFullContext();
 *   // Inject context.systemPrompt into DESIGNER agent's messages[0]
 */

import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ── Path Resolution ───────────────────────────────────────────────────────────

/** Returns the content of a design file by searching canonical path first, then memory placeholder. */
function loadDesignFile(filename: string): string {
  const canonicalPath = join(__dirname, '../../design_genius', filename);
  const memoryPath    = join(__dirname, filename);

  if (existsSync(canonicalPath)) {
    try { return readFileSync(canonicalPath, 'utf8'); } catch { /* fall through */ }
  }
  if (existsSync(memoryPath)) {
    try { return readFileSync(memoryPath, 'utf8'); } catch { /* fall through */ }
  }

  console.warn(`[DesignMemory] Could not load "${filename}" from either path. Returning empty.`);
  return '';
}

// ── Types ─────────────────────────────────────────────────────────────────────

export interface DesignContext {
  /** Raw content of voice.md */
  voice: string;
  /** Raw content of brand.md */
  brand: string;
  /** Raw content of tokens.css */
  tokens: string;
  /** Pre-built system prompt string for injection into DESIGNER agent */
  systemPrompt: string;
  /** Compact voice rules summary for COPY_EDITOR agent */
  voiceSummaryPrompt: string;
  /** Whether all three files loaded successfully */
  isComplete: boolean;
}

// ── Cache ─────────────────────────────────────────────────────────────────────

let _cache: DesignContext | null = null;
let _cacheLoadedAt = 0;
const CACHE_TTL_MS = 60_000; // Re-read files every 60s (picks up edits without restart)

// ── Core Builder ─────────────────────────────────────────────────────────────

function buildContext(): DesignContext {
  const voice  = loadDesignFile('voice.md');
  const brand  = loadDesignFile('brand.md');
  const tokens = loadDesignFile('tokens.css');

  const isComplete = Boolean(voice && brand && tokens);

  const systemPrompt = [
    `You are the DESIGNER Agent — Super AI's elite frontend architect.`,
    `You generate React/TSX components. You follow the Super AI Design System STRICTLY.`,
    ``,
    `══ VOICE & TONE RULES (MANDATORY) ══`,
    voice || '(voice rules unavailable)',
    ``,
    `══ BRAND GUIDE ══`,
    brand || '(brand guide unavailable)',
    ``,
    `══ CSS DESIGN TOKENS ══`,
    `Use ONLY these tokens as CSS custom properties (var(--*)) in your components.`,
    tokens || '(tokens unavailable)',
    ``,
    `══ COMPONENT RULES ══`,
    `1. Use var(--color-*), var(--font-*), var(--space-*), var(--glow-*) tokens.`,
    `2. Background: var(--color-bg-panel) or var(--color-bg-glass).`,
    `3. Primary accent: var(--color-gold). Text: var(--color-text-primary).`,
    `4. Borders: var(--color-gold-border). Hover: var(--color-gold-border-active).`,
    `5. Add var(--glow-sm) or var(--glow-md) on interactive elements.`,
    `6. All transitions: var(--duration-normal) var(--ease-default).`,
    `7. No random hex colors. No external UI libraries. No arbitrary values.`,
    `8. Return COMPLETE, self-contained React TSX. Export as default.`,
    `9. No placeholder text. No TODOs. No stub implementations.`,
  ].join('\n');

  const voiceSummaryPrompt = [
    `You are the COPY_EDITOR Agent — Super AI's voice enforcer.`,
    `Apply these voice rules to ALL user-facing text in the component you receive:`,
    ``,
    voice || '(voice rules unavailable)',
    ``,
    `Edit: labels, buttons, placeholders, headings, tooltips, status messages.`,
    `Do NOT change code logic or JSX structure. Return the full updated component.`,
  ].join('\n');

  return { voice, brand, tokens, systemPrompt, voiceSummaryPrompt, isComplete };
}

// ── Public API ────────────────────────────────────────────────────────────────

class DesignMemory {
  /**
   * Returns the full Design Brain context.
   * Results are cached for 60 seconds to avoid disk I/O on every request.
   */
  getFullContext(): DesignContext {
    const now = Date.now();
    if (_cache && now - _cacheLoadedAt < CACHE_TTL_MS) {
      return _cache;
    }
    _cache = buildContext();
    _cacheLoadedAt = now;

    if (_cache.isComplete) {
      console.log('[DesignMemory] ✅ Design Brain context loaded (voice + brand + tokens)');
    } else {
      console.warn('[DesignMemory] ⚠️  Design Brain context partially loaded — some files missing');
    }

    return _cache;
  }

  /** Returns only the DESIGNER system prompt (for quick injection). */
  getDesignerSystemPrompt(): string {
    return this.getFullContext().systemPrompt;
  }

  /** Returns only the COPY_EDITOR voice prompt. */
  getCopyEditorPrompt(): string {
    return this.getFullContext().voiceSummaryPrompt;
  }

  /** Force a cache refresh on next call (useful after editing design files). */
  invalidateCache(): void {
    _cache = null;
    _cacheLoadedAt = 0;
    console.log('[DesignMemory] Cache invalidated — will reload on next access');
  }
}

export const designMemory = new DesignMemory();
