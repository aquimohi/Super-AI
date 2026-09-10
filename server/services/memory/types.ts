export interface ConversationMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  toolCalls?: Array<{
    id?: string;
    name: string;
    arguments: any;
  }>;
  toolResults?: Array<{
    tool: string;
    result: any;
  }>;
}

export interface ConversationRecord {
  id: string;
  createdAt: string;
  updatedAt: string;
  messages: ConversationMessage[];
  title?: string;
  metadata?: Record<string, any>;
}

export interface WorkingMemoryRecord {
  conversationId: string;
  currentObjective?: string;
  currentToolExecution?: {
    tool: string;
    arguments: any;
    startedAt: string;
  };
  temporaryVariables: Record<string, any>;
  currentTaskState?: string;
  updatedAt: string;
}

export interface LongTermMemoryItem {
  id: string;
  category: 'user_preference' | 'project_fact' | 'instruction' | 'general';
  key: string;
  content: string;
  source: 'explicit_command' | 'user_input' | 'system';
  createdAt: string;
  updatedAt: string;
  accessCount: number;
  lastAccessedAt?: string;
  tags: string[];
}

export interface MemoryEvent {
  id: string;
  type: 'MEMORY_STORED' | 'MEMORY_RETRIEVED' | 'MEMORY_UPDATED' | 'MEMORY_DELETED';
  summary: string;
  details?: string;
  timestamp: string;
}

export interface MemoryConfig {
  shortTermMemoryEnabled: boolean;
  longTermMemoryEnabled: boolean;
  workingMemoryEnabled: boolean;
  storageType: 'LOCAL';
  retention: 'session' | '7days' | '30days' | 'infinite';
  maxContextMessages: number;
  maxLongTermItemsToInject: number;
}

export const DEFAULT_MEMORY_CONFIG: MemoryConfig = {
  shortTermMemoryEnabled: true,
  longTermMemoryEnabled: true,
  workingMemoryEnabled: true,
  storageType: 'LOCAL',
  retention: '30days',
  maxContextMessages: 12,
  maxLongTermItemsToInject: 5,
};
