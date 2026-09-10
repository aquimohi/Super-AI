import crypto from 'crypto';
import {
  ConversationMessage,
  ConversationRecord,
  WorkingMemoryRecord,
  LongTermMemoryItem,
  MemoryEvent,
  MemoryConfig,
} from './types.js';
import { IMemoryStorage, memoryStorage, sanitizeMemoryContent } from './memoryStorage.js';
import { storage } from '../../storage.js';

export interface MemoryContextResult {
  systemPromptAdditions: string;
  retrievedMemories: LongTermMemoryItem[];
  workingMemory: WorkingMemoryRecord;
  events: MemoryEvent[];
}

export class MemoryService {
  private storage: IMemoryStorage;

  constructor(customStorage?: IMemoryStorage) {
    this.storage = customStorage || memoryStorage;
  }

  // --- Configuration ---
  public getConfig(): MemoryConfig {
    return this.storage.getConfig();
  }

  public updateConfig(updates: Partial<MemoryConfig>): MemoryConfig {
    const updated = this.storage.updateConfig(updates);
    try {
      storage.logAudit('MEMORY_CONFIG_UPDATED', `Updated memory configuration: ${JSON.stringify(updates)}`);
    } catch {
      // ignore
    }
    return updated;
  }

  // --- Conversation Management ---
  public getOrCreateConversation(conversationId?: string): ConversationRecord {
    const id = conversationId || `conv_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
    let conv = this.storage.getConversation(id);
    if (!conv) {
      conv = {
        id,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        messages: [],
      };
      this.storage.saveConversation(conv);
    }
    return conv;
  }

  public appendMessage(
    conversationId: string,
    message: Omit<ConversationMessage, 'id' | 'timestamp'>
  ): ConversationMessage {
    const config = this.storage.getConfig();
    const conv = this.getOrCreateConversation(conversationId);

    const fullMsg: ConversationMessage = {
      ...message,
      id: `msg_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
      timestamp: new Date().toISOString(),
    };

    if (config.shortTermMemoryEnabled) {
      conv.messages.push(fullMsg);
      // Keep within bounds
      if (conv.messages.length > config.maxContextMessages * 2) {
        conv.messages = conv.messages.slice(-config.maxContextMessages * 2);
      }
      this.storage.saveConversation(conv);
    }

    return fullMsg;
  }

  public clearConversation(conversationId: string): void {
    this.storage.deleteConversation(conversationId);
    this.storage.clearWorkingMemory(conversationId);
    try {
      storage.logAudit('CONVERSATION_CLEARED', `Cleared conversation session: ${conversationId}`);
    } catch {
      // ignore
    }
  }

  // --- Working Memory ---
  public getWorkingMemory(conversationId: string): WorkingMemoryRecord {
    return this.storage.getWorkingMemory(conversationId);
  }

  public updateWorkingMemory(
    conversationId: string,
    updates: Partial<WorkingMemoryRecord>
  ): WorkingMemoryRecord {
    const config = this.storage.getConfig();
    if (!config.workingMemoryEnabled) {
      return this.storage.getWorkingMemory(conversationId);
    }
    return this.storage.updateWorkingMemory(conversationId, updates);
  }

  // --- Long-Term Memory & Commands ---
  public getAllLongTermMemories(): LongTermMemoryItem[] {
    return this.storage.getAllLongTermMemories();
  }

  public deleteLongTermMemory(id: string): { success: boolean; event?: MemoryEvent } {
    const item = this.storage.getLongTermMemory(id);
    const success = this.storage.deleteLongTermMemory(id);
    if (success && item) {
      const event: MemoryEvent = {
        id: `ev_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
        type: 'MEMORY_DELETED',
        summary: `Deleted: "${item.content}"`,
        details: `Key: ${item.key}`,
        timestamp: new Date().toISOString(),
      };
      try {
        storage.logAudit('MEMORY_DELETED', `Deleted memory [${item.key}]: "${item.content}"`);
      } catch {
        // ignore
      }
      return { success: true, event };
    }
    return { success };
  }

  public clearAllLongTermMemories(): void {
    this.storage.clearAllLongTermMemories();
    try {
      storage.logAudit('ALL_LONG_TERM_MEMORIES_CLEARED', 'Purged all long-term memories.');
    } catch {
      // ignore
    }
  }

  /**
   * Detect explicit "Remember" or "Forget" instructions from the user.
   */
  public processExplicitMemoryCommands(
    userText: string
  ): {
    handled: boolean;
    type?: 'REMEMBER' | 'FORGET';
    message?: string;
    event?: MemoryEvent;
    rejectedDueToSecret?: boolean;
  } {
    const trimmed = userText.trim();

    // 1. Check for sensitive secrets before saving
    const { hasSecrets } = sanitizeMemoryContent(trimmed);

    // Explicit Forget patterns
    const forgetMatch = trimmed.match(
      /^(?:please\s+)?(?:forget|delete\s+memory(?:\s+about)?|remove\s+memory(?:\s+about)?)\s+(?:that\s+)?(.+)/i
    ) || trimmed.match(/^(?:yaad\s+mat\s+rakhna|bhool\s+jao)\s+(?:ki\s+)?(.+)/i);

    if (forgetMatch) {
      const target = forgetMatch[1].trim().replace(/[.?!]+$/, '');
      const allMemories = this.storage.getAllLongTermMemories();
      const targetKeywords = this.extractKeywords(target);

      // Find best match
      let bestMatch: LongTermMemoryItem | null = null;
      let highestScore = 0;

      for (const m of allMemories) {
        let score = 0;
        const memoryWords = this.extractKeywords(`${m.key} ${m.content}`);
        for (const kw of targetKeywords) {
          if (memoryWords.includes(kw)) score += 1;
        }
        if (score > highestScore) {
          highestScore = score;
          bestMatch = m;
        }
      }

      if (bestMatch && highestScore > 0) {
        this.storage.deleteLongTermMemory(bestMatch.id);
        const event: MemoryEvent = {
          id: `ev_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
          type: 'MEMORY_DELETED',
          summary: `"${bestMatch.content}"`,
          timestamp: new Date().toISOString(),
        };
        try {
          storage.logAudit('MEMORY_DELETED', `Deleted memory [${bestMatch.id}]: "${bestMatch.content}"`);
        } catch {
          // ignore
        }
        return {
          handled: true,
          type: 'FORGET',
          message: `Understood. I have deleted the memory: "${bestMatch.content}".`,
          event,
        };
      } else {
        return {
          handled: true,
          type: 'FORGET',
          message: `I checked long-term memory, but found no existing record matching "${target}".`,
        };
      }
    }

    // Explicit Remember patterns
    const rememberMatch = trimmed.match(
      /^(?:please\s+)?(?:remember|keep\s+in\s+mind|note\s+down)\s+(?:that\s+)?(.+)/i
    ) || trimmed.match(/^(?:yaad\s+rakhna|yaad\s+rakho)\s+(?:ki\s+)?(.+)/i);

    if (rememberMatch) {
      if (hasSecrets) {
        return {
          handled: true,
          type: 'REMEMBER',
          rejectedDueToSecret: true,
          message:
            'Security Gate Refusal: Long-term memory policy strictly forbids storing sensitive secrets, API keys, passwords, or authentication credentials.',
        };
      }

      const fact = rememberMatch[1].trim().replace(/[.?!]+$/, '');
      const config = this.storage.getConfig();

      if (!config.longTermMemoryEnabled) {
        return {
          handled: true,
          type: 'REMEMBER',
          message: 'Long-term memory is currently toggled OFF in system settings. Enable it in the Control Panel to persist facts.',
        };
      }

      // Determine category and key
      let category: LongTermMemoryItem['category'] = 'general';
      let key = fact.toLowerCase().replace(/[^a-z0-9]+/g, '_').slice(0, 32);

      if (/prefer|favorite|like|always|style/i.test(fact)) {
        category = 'user_preference';
        key = `pref_${key}`;
      } else if (/project|app|codebase|system/i.test(fact)) {
        category = 'project_fact';
        key = `proj_${key}`;
      }

      const tags = this.extractKeywords(fact);

      const memoryItem: LongTermMemoryItem = {
        id: `mem_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
        category,
        key,
        content: fact,
        source: 'explicit_command',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        accessCount: 0,
        tags,
      };

      this.storage.saveLongTermMemory(memoryItem);

      const event: MemoryEvent = {
        id: `ev_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
        type: 'MEMORY_STORED',
        summary: `"${fact}"`,
        timestamp: new Date().toISOString(),
      };

      try {
        storage.logAudit('MEMORY_STORED', `Stored memory [${key}]: "${fact}"`);
      } catch {
        // ignore
      }

      return {
        handled: true,
        type: 'REMEMBER',
        message: `Affirmative. I have secured this fact in long-term memory: "${fact}".`,
        event,
      };
    }

    return { handled: false };
  }

  /**
   * Search and retrieve relevant memories based on query token relevance.
   */
  public retrieveRelevantMemories(query: string): {
    memories: LongTermMemoryItem[];
    events: MemoryEvent[];
  } {
    const config = this.storage.getConfig();
    if (!config.longTermMemoryEnabled) {
      return { memories: [], events: [] };
    }

    const allMemories = this.storage.getAllLongTermMemories();
    if (allMemories.length === 0) {
      return { memories: [], events: [] };
    }

    const queryKeywords = this.extractKeywords(query);
    if (queryKeywords.length === 0) {
      return { memories: [], events: [] };
    }

    // Score memories
    const scored: Array<{ memory: LongTermMemoryItem; score: number }> = [];

    for (const mem of allMemories) {
      let score = 0;
      const memWords = this.extractKeywords(`${mem.key} ${mem.content} ${mem.tags.join(' ')}`);

      for (const qWord of queryKeywords) {
        if (memWords.includes(qWord)) {
          score += 2;
        } else {
          // Check substring / fuzzy inclusion
          for (const mWord of memWords) {
            if (mWord.includes(qWord) || qWord.includes(mWord)) {
              score += 1;
              break;
            }
          }
        }
      }

      if (score > 0) {
        scored.push({ memory: mem, score });
      }
    }

    scored.sort((a, b) => b.score - a.score);
    const topMatches = scored.slice(0, config.maxLongTermItemsToInject).map((s) => s.memory);

    const events: MemoryEvent[] = [];
    for (const mem of topMatches) {
      mem.accessCount = (mem.accessCount || 0) + 1;
      mem.lastAccessedAt = new Date().toISOString();
      this.storage.saveLongTermMemory(mem);

      events.push({
        id: `ev_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
        type: 'MEMORY_RETRIEVED',
        summary: `"${mem.content}"`,
        timestamp: new Date().toISOString(),
      });
      try {
        storage.logAudit('MEMORY_RETRIEVED', `Retrieved memory [${mem.id}]: "${mem.content}"`);
      } catch {
        // ignore
      }
    }

    return { memories: topMatches, events };
  }

  /**
   * Build complete contextual system prompt extensions.
   */
  public buildContextPrompt(
    conversationId: string,
    currentQuery: string
  ): MemoryContextResult {
    const config = this.storage.getConfig();
    const working = this.getWorkingMemory(conversationId);
    const { memories, events } = this.retrieveRelevantMemories(currentQuery);

    const sections: string[] = [];

    // 1. Long-term memory section
    if (config.longTermMemoryEnabled && memories.length > 0) {
      sections.push(
        `[LONG-TERM USER & PROJECT MEMORY - RETRIEVED FACTS]\n` +
          memories.map((m) => `• ${m.content}`).join('\n') +
          `\n(Apply these preferences and facts naturally without explicitly quoting the memory matrix unless asked.)`
      );
    }

    // 2. Working memory section
    if (config.workingMemoryEnabled) {
      const vars = Object.entries(working.temporaryVariables);
      const parts: string[] = [];
      if (working.currentObjective) {
        parts.push(`Current Objective: ${working.currentObjective}`);
      }
      if (working.currentTaskState) {
        parts.push(`Task State: ${working.currentTaskState}`);
      }
      if (vars.length > 0) {
        const varList = vars
          .map(([k, v]) => `${k}=${typeof v === 'object' ? JSON.stringify(v) : String(v)}`)
          .join(', ');
        parts.push(`Working Variables: ${varList}`);
      }
      if (parts.length > 0) {
        sections.push(`[ACTIVE WORKING MEMORY]\n` + parts.join('\n'));
      }
    }

    return {
      systemPromptAdditions: sections.join('\n\n'),
      retrievedMemories: memories,
      workingMemory: working,
      events,
    };
  }

  private extractKeywords(text: string): string[] {
    const stopWords = new Set([
      'the', 'is', 'at', 'which', 'on', 'a', 'an', 'and', 'or', 'in', 'with', 'for', 'to', 'of',
      'that', 'this', 'it', 'my', 'your', 'me', 'you', 'please', 'can', 'what', 'how', 'when',
      'where', 'why', 'who', 'be', 'are', 'was', 'were', 'ki', 'hai', 'ka', 'ke', 'ko', 'se',
    ]);

    return text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 1 && !stopWords.has(w));
  }
}

export const memoryService = new MemoryService();
