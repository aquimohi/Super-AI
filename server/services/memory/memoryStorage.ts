import fs from 'fs';
import path from 'path';
import {
  ConversationRecord,
  WorkingMemoryRecord,
  LongTermMemoryItem,
  MemoryConfig,
  DEFAULT_MEMORY_CONFIG,
} from './types.js';

export interface MemoryStoreData {
  config: MemoryConfig;
  longTerm: LongTermMemoryItem[];
  conversations: Record<string, ConversationRecord>;
  working: Record<string, WorkingMemoryRecord>;
}

export interface IMemoryStorage {
  getConfig(): MemoryConfig;
  updateConfig(updates: Partial<MemoryConfig>): MemoryConfig;
  getConversation(id: string): ConversationRecord | null;
  saveConversation(record: ConversationRecord): void;
  deleteConversation(id: string): boolean;
  clearAllConversations(): void;
  getWorkingMemory(conversationId: string): WorkingMemoryRecord;
  updateWorkingMemory(conversationId: string, updates: Partial<WorkingMemoryRecord>): WorkingMemoryRecord;
  clearWorkingMemory(conversationId: string): void;
  getAllLongTermMemories(): LongTermMemoryItem[];
  getLongTermMemory(id: string): LongTermMemoryItem | null;
  saveLongTermMemory(item: LongTermMemoryItem): void;
  deleteLongTermMemory(id: string): boolean;
  clearAllLongTermMemories(): void;
}

const DATA_DIR = path.join(process.cwd(), '.data');
const MEMORY_FILE = path.join(DATA_DIR, 'superai-memory.json');

// Blacklist patterns for sensitive credentials
const SENSITIVE_PATTERNS = [
  /sk-[a-zA-Z0-9_-]{20,}/i,
  /AIza[0-9A-Za-z-_]{35}/i,
  /bearer\s+[a-zA-Z0-9._-]+/i,
  /password\s*[:=]\s*\S+/i,
  /secret\s*[:=]\s*\S+/i,
  /private[_-]?key/i,
];

export function sanitizeMemoryContent(text: string): { sanitized: string; hasSecrets: boolean } {
  let hasSecrets = false;
  let sanitized = text;

  for (const pattern of SENSITIVE_PATTERNS) {
    if (pattern.test(sanitized)) {
      hasSecrets = true;
      sanitized = sanitized.replace(pattern, '[REDACTED_SENSITIVE_CREDENTIAL]');
    }
  }

  return { sanitized, hasSecrets };
}

export class LocalMemoryStorage implements IMemoryStorage {
  private data: MemoryStoreData;

  constructor() {
    this.data = this.loadFromDisk();
  }

  private loadFromDisk(): MemoryStoreData {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }

      if (fs.existsSync(MEMORY_FILE)) {
        const raw = fs.readFileSync(MEMORY_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        return {
          config: { ...DEFAULT_MEMORY_CONFIG, ...(parsed.config || {}) },
          longTerm: parsed.longTerm || [],
          conversations: parsed.conversations || {},
          working: parsed.working || {},
        };
      }

      const initial: MemoryStoreData = {
        config: { ...DEFAULT_MEMORY_CONFIG },
        longTerm: [],
        conversations: {},
        working: {},
      };
      this.saveToDisk(initial);
      return initial;
    } catch (err) {
      return {
        config: { ...DEFAULT_MEMORY_CONFIG },
        longTerm: [],
        conversations: {},
        working: {},
      };
    }
  }

  private saveToDisk(data: MemoryStoreData): void {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      const tmpFile = `${MEMORY_FILE}.tmp.${Date.now()}`;
      fs.writeFileSync(tmpFile, JSON.stringify(data, null, 2), 'utf-8');
      fs.renameSync(tmpFile, MEMORY_FILE);
    } catch (err) {
      console.error('Failed to write memory to disk:', err);
    }
  }

  // --- Configuration ---
  public getConfig(): MemoryConfig {
    return { ...this.data.config };
  }

  public updateConfig(updates: Partial<MemoryConfig>): MemoryConfig {
    this.data.config = {
      ...this.data.config,
      ...updates,
    };
    this.saveToDisk(this.data);
    return { ...this.data.config };
  }

  // --- Conversation Memory ---
  public getConversation(id: string): ConversationRecord | null {
    const conv = this.data.conversations[id];
    if (!conv) return null;
    return JSON.parse(JSON.stringify(conv));
  }

  public saveConversation(record: ConversationRecord): void {
    this.data.conversations[record.id] = {
      ...record,
      updatedAt: new Date().toISOString(),
    };
    this.pruneConversations();
    this.saveToDisk(this.data);
  }

  public deleteConversation(id: string): boolean {
    if (this.data.conversations[id]) {
      delete this.data.conversations[id];
      delete this.data.working[id];
      this.saveToDisk(this.data);
      return true;
    }
    return false;
  }

  public clearAllConversations(): void {
    this.data.conversations = {};
    this.data.working = {};
    this.saveToDisk(this.data);
  }

  private pruneConversations(): void {
    const retention = this.data.config.retention;
    if (retention === 'infinite') return;

    const now = Date.now();
    let maxAgeMs = 30 * 24 * 60 * 60 * 1000; // 30 days default
    if (retention === '7days') {
      maxAgeMs = 7 * 24 * 60 * 60 * 1000;
    } else if (retention === 'session') {
      maxAgeMs = 2 * 60 * 60 * 1000; // 2 hours
    }

    const conversationIds = Object.keys(this.data.conversations);
    for (const id of conversationIds) {
      const conv = this.data.conversations[id];
      const age = now - new Date(conv.updatedAt || conv.createdAt).getTime();
      if (age > maxAgeMs) {
        delete this.data.conversations[id];
        delete this.data.working[id];
      }
    }
  }

  // --- Working Memory ---
  public getWorkingMemory(conversationId: string): WorkingMemoryRecord {
    if (!this.data.working[conversationId]) {
      this.data.working[conversationId] = {
        conversationId,
        temporaryVariables: {},
        updatedAt: new Date().toISOString(),
      };
    }
    return JSON.parse(JSON.stringify(this.data.working[conversationId]));
  }

  public updateWorkingMemory(
    conversationId: string,
    updates: Partial<WorkingMemoryRecord>
  ): WorkingMemoryRecord {
    const existing = this.getWorkingMemory(conversationId);
    this.data.working[conversationId] = {
      ...existing,
      ...updates,
      temporaryVariables: {
        ...existing.temporaryVariables,
        ...(updates.temporaryVariables || {}),
      },
      updatedAt: new Date().toISOString(),
    };
    this.saveToDisk(this.data);
    return JSON.parse(JSON.stringify(this.data.working[conversationId]));
  }

  public clearWorkingMemory(conversationId: string): void {
    delete this.data.working[conversationId];
    this.saveToDisk(this.data);
  }

  // --- Long-Term Memory ---
  public getAllLongTermMemories(): LongTermMemoryItem[] {
    return JSON.parse(JSON.stringify(this.data.longTerm));
  }

  public getLongTermMemory(id: string): LongTermMemoryItem | null {
    const item = this.data.longTerm.find((m) => m.id === id);
    if (!item) return null;
    return JSON.parse(JSON.stringify(item));
  }

  public saveLongTermMemory(item: LongTermMemoryItem): void {
    // Validate that content doesn't contain secrets
    const { sanitized } = sanitizeMemoryContent(item.content);
    const cleanedItem: LongTermMemoryItem = {
      ...item,
      content: sanitized,
      updatedAt: new Date().toISOString(),
    };

    const existingIndex = this.data.longTerm.findIndex((m) => m.id === item.id || m.key.toLowerCase() === item.key.toLowerCase());
    if (existingIndex >= 0) {
      this.data.longTerm[existingIndex] = cleanedItem;
    } else {
      this.data.longTerm.push(cleanedItem);
    }
    this.saveToDisk(this.data);
  }

  public deleteLongTermMemory(id: string): boolean {
    const initialLen = this.data.longTerm.length;
    this.data.longTerm = this.data.longTerm.filter((m) => m.id !== id && m.key !== id);
    if (this.data.longTerm.length < initialLen) {
      this.saveToDisk(this.data);
      return true;
    }
    return false;
  }

  public clearAllLongTermMemories(): void {
    this.data.longTerm = [];
    this.saveToDisk(this.data);
  }
}

export const memoryStorage: IMemoryStorage = new LocalMemoryStorage();
