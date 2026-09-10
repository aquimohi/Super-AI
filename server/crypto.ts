import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), '.data');
const SALT_FILE = path.join(DATA_DIR, 'machine-salt.key');

/**
 * Derives a consistent 256-bit encryption key for the application.
 * Uses APP_SECRET_KEY env variable if provided, otherwise creates/reads
 * a secure persistent local machine salt.
 */
function getMasterKey(): Buffer {
  if (process.env.APP_SECRET_KEY && process.env.APP_SECRET_KEY.length >= 16) {
    return crypto.scryptSync(process.env.APP_SECRET_KEY, 'super-ai-salt-2026', 32);
  }

  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }

    if (fs.existsSync(SALT_FILE)) {
      const storedSalt = fs.readFileSync(SALT_FILE, 'utf-8').trim();
      return crypto.scryptSync(storedSalt, 'super-ai-persistent-salt', 32);
    }

    // Generate persistent salt
    const newSalt = crypto.randomBytes(32).toString('hex');
    fs.writeFileSync(SALT_FILE, newSalt, { encoding: 'utf-8', mode: 0o600 });
    return crypto.scryptSync(newSalt, 'super-ai-persistent-salt', 32);
  } catch (err) {
    // Fallback in case of filesystem restriction
    return crypto.scryptSync('super-ai-default-master-seed-2026', 'super-ai-fallback', 32);
  }
}

export interface EncryptedPayload {
  encryptedData: string;
  iv: string;
  authTag: string;
}

/**
 * Encrypts a secret value at rest using AES-256-GCM.
 */
export function encryptSecret(plainText: string): EncryptedPayload {
  const masterKey = getMasterKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', masterKey, iv);

  let encrypted = cipher.update(plainText, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag().toString('hex');

  return {
    encryptedData: encrypted,
    iv: iv.toString('hex'),
    authTag,
  };
}

/**
 * Decrypts a secret value in memory when needed.
 * Returns null if authentication tag or key fails.
 */
export function decryptSecret(payload: EncryptedPayload): string | null {
  try {
    const masterKey = getMasterKey();
    const decipher = crypto.createDecipheriv(
      'aes-256-gcm',
      masterKey,
      Buffer.from(payload.iv, 'hex')
    );
    decipher.setAuthTag(Buffer.from(payload.authTag, 'hex'));

    let decrypted = decipher.update(payload.encryptedData, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (err) {
    return null;
  }
}

/**
 * Masks an API key for safe frontend display.
 * e.g. "sk-or-v1-abcdef1234567890" -> "sk-or-••••••••7890"
 * Never returns the full key.
 */
export function maskApiKey(rawKey: string): string {
  if (!rawKey) return '••••••••••••';
  const trimmed = rawKey.trim();
  if (trimmed.length <= 8) {
    return '••••••••';
  }

  // Preserve prefix if like "sk-or-" or "sk-"
  if (trimmed.startsWith('sk-or-')) {
    const suffix = trimmed.slice(-4);
    return `sk-or-••••••••${suffix}`;
  }

  if (trimmed.startsWith('sk-')) {
    const suffix = trimmed.slice(-4);
    return `sk-••••••••${suffix}`;
  }

  const prefix = trimmed.slice(0, 4);
  const suffix = trimmed.slice(-4);
  return `${prefix}••••••••${suffix}`;
}
