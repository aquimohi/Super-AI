import { storage, VoiceSettings } from '../storage.js';

export interface CleanSpokenTextOptions {
  stripCodeBlocks?: boolean;
  maxSentenceCount?: number;
}

/**
 * Voice Subsystem Server Service
 * Manages server-side voice configurations, Hinglish/Hindi text sanitization for spoken synthesis,
 * and future cloud TTS endpoint preparations.
 */
export const voiceService = {
  getSettings(): VoiceSettings {
    return storage.getConfig().voice;
  },

  updateSettings(updates: Partial<VoiceSettings>): VoiceSettings {
    return storage.updateSectionConfig('voice', updates);
  },

  /**
   * Prepares response text for natural spoken voice synthesis.
   * Strips complex markdown code blocks, backticks, URLs, and excessive symbols
   * so browser speech engines or TTS services pronounce the text naturally.
   */
  prepareSpokenTranscript(text: string, options: CleanSpokenTextOptions = {}): string {
    if (!text) return '';

    let cleaned = text;

    // Remove markdown code blocks (e.g. ```javascript ... ```)
    cleaned = cleaned.replace(/```[\s\S]*?```/g, ' [code snippet provided on screen] ');

    // Remove inline code backticks `code`
    cleaned = cleaned.replace(/`([^`]+)`/g, '$1');

    // Remove markdown links [text](url) -> text
    cleaned = cleaned.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');

    // Remove markdown headers #, ##, ###
    cleaned = cleaned.replace(/^#+\s+/gm, '');

    // Remove bold/italics asterisks **text** -> text
    cleaned = cleaned.replace(/\*\*([^*]+)\*\*/g, '$1');
    cleaned = cleaned.replace(/\*([^*]+)\*/g, '$1');

    // Clean multiple line breaks and normalize spacing
    cleaned = cleaned.replace(/\n+/g, ' ').replace(/\s+/g, ' ').trim();

    return cleaned;
  },
};
