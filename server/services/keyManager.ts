import { storage, SanitizedApiKey, StoredKeyRecord } from '../storage.js';

export interface ExecutableKey {
  id: string;
  name: string;
  rawKey: string;
}

/**
 * Key Manager Service
 * Manages provider key selection, health checking, failover rotation, and rate-limit states.
 */
export const keyManager = {
  /**
   * Retrieves sanitized keys for display.
   */
  getAllKeys(): SanitizedApiKey[] {
    return storage.getAllKeysSanitized();
  },

  /**
   * Retrieves active/enabled executable keys for a provider (e.g. 'openrouter').
   * Keys are sorted with the active primary key first, followed by valid backup keys.
   */
  getExecutableKeys(provider: 'openrouter' | 'openai' | 'anthropic' | 'groq' | 'gemini' = 'openrouter'): ExecutableKey[] {
    return storage.getExecutableKeysForProvider(provider);
  },

  /**
   * Returns whether at least one enabled key is available for a provider.
   */
  hasAvailableKey(provider: 'openrouter' = 'openrouter'): boolean {
    const keys = storage.getExecutableKeysForProvider(provider);
    return keys.length > 0;
  },

  /**
   * Marks a key as rate-limited and triggers failover rotation.
   */
  markRateLimited(keyId: string, errorDetail = 'HTTP 429 Rate Limit'): void {
    storage.updateKey(keyId, {
      status: 'rate_limited',
      lastError: errorDetail,
      lastTestedAt: new Date().toISOString(),
    });
    storage.logAudit(
      'KEY_ROTATION',
      `Key ID ${keyId} marked as rate-limited. Failover engaged.`,
      'warn'
    );
  },

  /**
   * Marks a key as invalid due to auth error.
   */
  markInvalid(keyId: string, errorDetail = 'Authentication Failed'): void {
    storage.updateKey(keyId, {
      status: 'invalid',
      lastError: errorDetail,
      lastTestedAt: new Date().toISOString(),
    });
    storage.logAudit(
      'KEY_ERROR',
      `Key ID ${keyId} marked invalid (${errorDetail}).`,
      'error'
    );
  },

  /**
   * Marks a key as valid after a successful completion.
   */
  markValid(keyId: string): void {
    storage.updateKey(keyId, {
      status: 'valid',
      lastError: undefined,
      lastTestedAt: new Date().toISOString(),
    });
  },
};
