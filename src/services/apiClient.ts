import {
  StoredApiKey,
  SystemConfig,
  ChatMessage,
  PermissionLevel,
  MemorySettings,
  LongTermMemoryItem,
  MemoryEvent,
  ComputerControlSettings,
  BrowserControlSettings,
  CognitiveEngineConfig,
  CognitiveTraceEvent,
  JudgeEvaluationSummary,
  SkillConfig,
  SkillId,
  AutonomousTaskConfig,
  TaskPlanSummary,
  TaskStep,
  AutonomousTaskState,
} from '../types';

export interface KeyTestResponse {
  valid: boolean;
  label?: string;
  limit?: number;
  usage?: number;
  isFreeTier?: boolean;
  rateLimit?: string;
  error?: string;
}

export interface ChatApiResponse {
  success: boolean;
  text?: string;
  conversationId?: string;
  memoryEvents?: MemoryEvent[];
  model?: string;
  provider?: string;
  keyUsedName?: string;
  rotated?: boolean;
  taskType?: 'GENERAL' | 'REASONING' | 'CODING' | 'VISION';
  latencyMs?: number;
  requiresAuthorization?: boolean;
  pendingAuthorization?: {
    tool: string;
    toolName: string;
    arguments: any;
    risk: 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    requiredPermission: string;
    actionDescription: string;
    toolCallId?: string;
    isAutonomousTask?: boolean;
    taskId?: string;
    stepId?: number;
    stepAction?: string;
  };
  isAutonomousTask?: boolean;
  taskId?: string;
  taskState?: AutonomousTaskState;
  taskSteps?: TaskStep[];
  toolActivities?: Array<{
    id?: string;
    tool: string;
    permission: 'ALLOWED' | 'DENIED' | 'ASKED';
    execution: string;
    result: string;
    risk?: 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  }>;
  metadata?: {
    taskType: 'GENERAL' | 'REASONING' | 'CODING' | 'VISION';
    selectedModel: string;
    requestedModel: string;
    fallbackOccurred: boolean;
    fallbackModelUsed?: string;
    provider: string;
    keyLabel: string;
    latencyMs: number;
    usage?: any;
    confidence?: number;
    reasoning?: string;
  };
  usage?: any;
  error?: string;
  isSetupPrompt?: boolean;
  cognitiveTrace?: CognitiveTraceEvent[];
  judgeEvaluation?: JudgeEvaluationSummary;
}


export const apiClient = {
  // --- Keys ---
  async getKeys(): Promise<StoredApiKey[]> {
    const res = await fetch('/api/keys');
    if (!res.ok) throw new Error(`Failed to load keys: ${res.statusText}`);
    const data = await res.json();
    return data.keys || [];
  },

  async addKey(payload: {
    provider: string;
    name?: string;
    key: string;
    isActive?: boolean;
  }): Promise<StoredApiKey> {
    const res = await fetch('/api/keys', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Failed to add API key.');
    }
    return data.key;
  },

  async updateKey(
    id: string,
    payload: {
      name?: string;
      isEnabled?: boolean;
      isActive?: boolean;
      key?: string;
    }
  ): Promise<StoredApiKey> {
    const res = await fetch(`/api/keys/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Failed to update API key.');
    }
    return data.key;
  },

  async deleteKey(id: string): Promise<void> {
    const res = await fetch(`/api/keys/${id}`, { method: 'DELETE' });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Failed to delete API key.');
    }
  },

  async toggleKey(id: string): Promise<StoredApiKey> {
    const res = await fetch(`/api/keys/${id}/toggle`, { method: 'POST' });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Failed to toggle API key.');
    }
    return data.key;
  },

  async setActiveKey(id: string): Promise<StoredApiKey> {
    const res = await fetch(`/api/keys/${id}/set-active`, { method: 'POST' });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Failed to activate API key.');
    }
    return data.key;
  },

  async testKey(id: string): Promise<KeyTestResponse> {
    const res = await fetch(`/api/keys/${id}/test`, { method: 'POST' });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Failed to test API key.');
    }
    return data.testResult;
  },

  async testRawKey(key: string, provider = 'openrouter'): Promise<KeyTestResponse> {
    const res = await fetch('/api/keys/test-raw', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key, provider }),
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Failed to test key.');
    }
    return data.testResult;
  },

  // --- Configuration ---
  async getConfig(): Promise<SystemConfig & { auditLogs: any[] }> {
    const res = await fetch('/api/config');
    if (!res.ok) throw new Error(`Failed to load config: ${res.statusText}`);
    const data = await res.json();
    return data.config;
  },

  async updateConfigSection<K extends keyof SystemConfig>(
    section: K,
    payload: Partial<SystemConfig[K]>
  ): Promise<SystemConfig[K]> {
    const res = await fetch(`/api/config/${section}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || `Failed to update ${section} config.`);
    }
    return data.data;
  },

  async testPermission(action: string): Promise<{ granted: boolean; level: PermissionLevel; reason?: string }> {
    const res = await fetch(`/api/config/permissions/check/${action}`);
    const data = await res.json();
    return data.result;
  },

  // --- Chat ---
  async sendChatMessage(payload: {
    message: string;
    conversationId?: string;
    history?: ChatMessage[];
    role?: string;
    model?: string;
    hasImages?: boolean;
    sessionAuthorizations?: string[];
    isAutonomousTask?: boolean;
    taskId?: string;
    stepId?: number;
    taskScopedAuthorization?: boolean;
    authorizationDecision?: 'AUTHORIZE_ONCE' | 'ALLOW_FOR_TASK' | 'DENY';
    approvedToolCall?: {
      tool: string;
      arguments: any;
      toolCallId?: string;
    };
    rejectedToolCall?: {
      tool: string;
      arguments: any;
      toolCallId?: string;
      reason?: string;
    };
  }): Promise<ChatApiResponse> {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Failed to communicate with AI provider.');
    }
    return data;
  },

  // --- Memory System ---
  async getMemoryConfig(): Promise<any> {
    const res = await fetch('/api/memory/config');
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Failed to fetch memory configuration');
    }
    return data.config;
  },

  async updateMemoryConfig(config: Partial<MemorySettings>): Promise<any> {
    const res = await fetch('/api/memory/config', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Failed to update memory configuration');
    }
    return data.config;
  },

  async getLongTermMemories(params?: { category?: string; search?: string }): Promise<{ items: LongTermMemoryItem[]; total: number }> {
    const query = new URLSearchParams();
    if (params?.category && params.category !== 'all') query.set('category', params.category);
    if (params?.search) query.set('search', params.search);
    const res = await fetch(`/api/memory/long-term?${query.toString()}`);
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Failed to fetch long-term memories');
    }
    return { items: data.items, total: data.total };
  },

  async addLongTermMemory(item: { key: string; content: string; category?: string; tags?: string[] }): Promise<LongTermMemoryItem> {
    const res = await fetch('/api/memory/long-term', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(item),
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Failed to add long-term memory');
    }
    return data.item;
  },

  async deleteLongTermMemory(id: string): Promise<void> {
    const res = await fetch(`/api/memory/long-term/${id}`, {
      method: 'DELETE',
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Failed to delete long-term memory');
    }
  },

  async clearLongTermMemories(): Promise<number> {
    const res = await fetch('/api/memory/long-term', {
      method: 'DELETE',
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Failed to clear long-term memories');
    }
    return data.clearedCount;
  },

  async getConversations(): Promise<any[]> {
    const res = await fetch('/api/memory/conversations');
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Failed to fetch conversations');
    }
    return data.conversations;
  },

  async getConversation(id: string): Promise<any> {
    const res = await fetch(`/api/memory/conversations/${id}`);
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Failed to fetch conversation session');
    }
    return data.conversation;
  },

  async clearConversation(id: string): Promise<void> {
    const res = await fetch(`/api/memory/conversations/${id}`, {
      method: 'DELETE',
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Failed to clear conversation session');
    }
  },

  async clearAllConversations(): Promise<number> {
    const res = await fetch('/api/memory/conversations', {
      method: 'DELETE',
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Failed to clear conversations');
    }
    return data.clearedCount;
  },

  // --- Computer Control ---
  async getComputerControl(): Promise<ComputerControlSettings> {
    const res = await fetch('/api/config/computer-control');
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Failed to load computer control configuration');
    }
    return data.computerControl;
  },

  async updateComputerControl(updates: Partial<ComputerControlSettings>): Promise<ComputerControlSettings> {
    const res = await fetch('/api/config/computer-control', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Failed to update computer control configuration');
    }
    return data.computerControl;
  },

  async updateComputerControlPermission(
    permKey: keyof ComputerControlSettings['permissions'],
    level: PermissionLevel
  ): Promise<ComputerControlSettings> {
    const res = await fetch(`/api/config/computer-control/permissions/${permKey}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ level }),
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Failed to update computer control permission');
    }
    return data.computerControl;
  },

  // --- Browser Control ---
  async getBrowserControl(): Promise<BrowserControlSettings> {
    const res = await fetch('/api/config/browser-control');
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Failed to load browser control configuration');
    }
    return data.browserControl;
  },

  async updateBrowserControl(updates: Partial<BrowserControlSettings>): Promise<BrowserControlSettings> {
    const res = await fetch('/api/config/browser-control', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Failed to update browser control configuration');
    }
    return data.browserControl;
  },

  async updateBrowserControlPermission(
    permKey: keyof BrowserControlSettings['permissions'],
    level: PermissionLevel
  ): Promise<BrowserControlSettings> {
    const res = await fetch(`/api/config/browser-control/permissions/${permKey}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ level }),
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Failed to update browser control permission');
    }
    return data.browserControl;
  },

  // --- Cognitive Engine ---
  async getCognitiveEngineConfig(): Promise<CognitiveEngineConfig> {
    const res = await fetch('/api/config/cognitive-engine');
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Failed to load cognitive engine configuration');
    }
    return data.cognitiveEngine;
  },

  async updateCognitiveEngineConfig(
    updates: Partial<CognitiveEngineConfig>
  ): Promise<CognitiveEngineConfig> {
    const res = await fetch('/api/config/cognitive-engine', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Failed to update cognitive engine configuration');
    }
    return data.cognitiveEngine;
  },

  // --- Skills System V1 ---
  async getSkills(): Promise<Record<SkillId, SkillConfig>> {
    const res = await fetch('/api/config/skills');
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Failed to load skills configuration');
    }
    return data.skills;
  },

  async updateSkill(
    skillId: SkillId,
    updates: Partial<SkillConfig>
  ): Promise<SkillConfig> {
    const res = await fetch(`/api/config/skills/${skillId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || `Failed to update skill ${skillId}`);
    }
    return data.skill;
  },

  async updateAllSkills(
    skills: Record<SkillId, SkillConfig>
  ): Promise<Record<SkillId, SkillConfig>> {
    const res = await fetch('/api/config/skills', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(skills),
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Failed to update skills configuration');
    }
    return data.skills;
  },

  // Autonomous Task Engine V1 API
  async getAutonomousTaskConfig(): Promise<AutonomousTaskConfig> {
    const res = await fetch('/api/config/autonomous-task');
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Failed to load autonomous task config');
    }
    return data.autonomousTask;
  },

  async updateAutonomousTaskConfig(
    updates: Partial<AutonomousTaskConfig>
  ): Promise<AutonomousTaskConfig> {
    const res = await fetch('/api/config/autonomous-task', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Failed to update autonomous task config');
    }
    return data.autonomousTask;
  },

  async getCurrentTask(conversationId?: string): Promise<TaskPlanSummary | null> {
    const url = conversationId
      ? `/api/tasks/current?conversationId=${encodeURIComponent(conversationId)}`
      : '/api/tasks/current';
    const res = await fetch(url);
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Failed to fetch current task');
    }
    return data.task;
  },

  async pauseTask(taskId: string): Promise<boolean> {
    const res = await fetch(`/api/tasks/${taskId}/pause`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    const data = await res.json();
    return Boolean(data.success);
  },

  async resumeTask(taskId: string): Promise<any> {
    const res = await fetch(`/api/tasks/${taskId}/resume`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Failed to resume task');
    }
    return data.result;
  },

  async cancelTask(taskId: string): Promise<boolean> {
    const res = await fetch(`/api/tasks/${taskId}/cancel`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    const data = await res.json();
    return Boolean(data.success);
  },

  async authorizeTaskStep(
    taskId: string,
    decision: 'AUTHORIZE_ONCE' | 'ALLOW_FOR_TASK' | 'DENY',
    stepId?: number,
    sessionAuthorizations?: string[]
  ): Promise<any> {
    const res = await fetch(`/api/tasks/${taskId}/authorize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ decision, stepId, sessionAuthorizations }),
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Failed to submit authorization');
    }
    return data.result;
  },
};
