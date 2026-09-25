import fs from 'fs';
import path from 'path';
import { EncryptedPayload, encryptSecret, decryptSecret, maskApiKey } from './crypto.js';
import { SkillConfig, SkillId, INITIAL_SKILLS } from './services/skills/types.js';

export type { SkillConfig, SkillId };

export interface StoredKeyRecord {
  id: string;
  provider: 'openrouter' | 'openai' | 'anthropic' | 'groq' | 'gemini';
  name: string;
  maskedKey: string;
  encryptedPayload: EncryptedPayload;
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
  isEnabled: boolean;
  status: 'valid' | 'invalid' | 'untested' | 'rate_limited';
  lastTestedAt?: string;
  lastError?: string;
}

export interface SanitizedApiKey {
  id: string;
  provider: 'openrouter' | 'openai' | 'anthropic' | 'groq' | 'gemini';
  name: string;
  maskedKey: string;
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
  isEnabled: boolean;
  status: 'valid' | 'invalid' | 'untested' | 'rate_limited';
  lastTestedAt?: string;
  lastError?: string;
}

export interface ModelRoleConfig {
  general: string;
  reasoning: string;
  coding: string;
  vision: string;
  judge: string;
}

export interface AIRoutingConfig {
  defaultProvider: 'openrouter' | 'openai' | 'anthropic' | 'groq' | 'gemini';
  enableFallback: boolean;
  autoRetryOnRateLimit: boolean;
  maxRetryAttempts: number;
  temperature: number;
  maxTokens: number;
}

export type PermissionLevel = 'ALLOW' | 'ASK' | 'DENY';

export interface SystemPermissions {
  microphone: PermissionLevel;
  camera: PermissionLevel;
  readFiles: PermissionLevel;
  writeFiles: PermissionLevel;
  deleteFiles: PermissionLevel;
  browser: PermissionLevel;
  webSearch: PermissionLevel;
  executeTerminal: PermissionLevel;
  // Autonomous Code Execution Sandbox
  executeCode: PermissionLevel;
  runApplications: PermissionLevel;
  systemSettings: PermissionLevel;
  // Windows Computer Control V1 permissions
  openApplication: PermissionLevel;
  openUrl: PermissionLevel;
  openFolder: PermissionLevel;
  openFile: PermissionLevel;
  screenshot: PermissionLevel;
  // Browser Control V1 permissions
  browserOpenPage: PermissionLevel;
  browserReadPage: PermissionLevel;
  browserFindText: PermissionLevel;
  browserFindLinks: PermissionLevel;
  browserClickLink: PermissionLevel;
  browserGoBack: PermissionLevel;
  browserGoForward: PermissionLevel;
  browserRefreshPage: PermissionLevel;
  smartGate: PermissionLevel;
  // Code Evolution
  modifyCode: PermissionLevel;
}

export interface BrowserControlSettings {
  enabled: boolean;
  browserType: 'Dedicated Super AI Browser';
  alwaysAskConfirmation?: boolean;
  permissions: {
    browserOpenPage: PermissionLevel;
    browserReadPage: PermissionLevel;
    browserFindText: PermissionLevel;
    browserFindLinks: PermissionLevel;
    browserClickLink: PermissionLevel;
    browserGoBack: PermissionLevel;
    browserGoForward: PermissionLevel;
    browserRefreshPage: PermissionLevel;
  };
  security: {
    credentialAccess: 'BLOCKED';
    arbitraryJavaScript: 'BLOCKED';
    privateBrowserProfile: 'BLOCKED';
    executableDownloads: 'BLOCKED';
    loginAutomation: 'BLOCKED';
    paymentCheckout: 'BLOCKED';
  };
}

export interface AllowlistedApp {
  id: string;
  name: string;
  aliases: string[];
  executable: string;
  enabled: boolean;
  description: string;
}

export interface AllowlistedFolder {
  id: string;
  name: string;
  aliases: string[];
  path: string;
  enabled: boolean;
}

export interface ComputerControlSettings {
  enabled: boolean;
  alwaysAskConfirmation?: boolean;
  permissions: {
    openApplication: PermissionLevel;
    openUrl: PermissionLevel;
    openFolder: PermissionLevel;
    openFile: PermissionLevel;
    screenshot: PermissionLevel;
  };
  allowlistedApps: AllowlistedApp[];
  allowlistedFolders: AllowlistedFolder[];
}

export type VoiceQualityPreference = 'AUTO' | 'NATURAL_HINDI' | 'INDIAN_ENGLISH' | 'ENGLISH';
export type VoiceProviderType = 'AUTO' | 'LOCAL_BROWSER' | 'CLOUD_TTS';

export interface VoiceSettings {
  voiceInputEnabled: boolean;
  voiceOutputEnabled: boolean;
  voiceProvider?: VoiceProviderType;
  voiceQuality?: VoiceQualityPreference;
  preferredVoiceName?: string;
  language: 'Hindi' | 'Hinglish' | 'English';
  gender?: 'Female';
  speakingStyle: 'Natural Delhi/Hinglish' | 'Futuristic Synthesizer' | 'Executive Tactical';
  voiceSpeed: number;
  pitch?: number;
  voiceVolume: number;
  cloudTtsApiKey?: string;
  cloudTtsEndpoint?: string;
  cloudTtsVoice?: string;
}

export interface MemorySettings {
  retention: 'session' | '7days' | '30days' | 'infinite';
  contextWindowLimit: number;
  vectorStoreEnabled: boolean;
  autoSummarization: boolean;
}

export interface SecuritySettings {
  encryptionAtRest: boolean;
  auditLogging: boolean;
  keyRotationAlertDays: number;
  promptSafetyGuard: boolean;
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  action: string;
  details: string;
  severity: 'info' | 'warn' | 'error';
}

export interface ToolConfigEntry {
  enabled: boolean;
  permission: PermissionLevel;
}

export type JudgeMode = 'AUTO' | 'ALWAYS' | 'OFF';

export interface CognitiveEngineConfig {
  enabled: boolean;
  plannerStatus: 'ACTIVE' | 'STANDBY';
  specialistStatus: 'ACTIVE' | 'STANDBY';
  judgeStatus: 'ACTIVE' | 'STANDBY';
  judgeMode: JudgeMode;
  maxModelCalls: number;
}

export type AutonomousTaskState =
  | 'IDLE'
  | 'PLANNING'
  | 'WAITING_AUTHORIZATION'
  | 'EXECUTING'
  | 'VERIFYING'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELLED';

export interface AutonomousTaskConfig {
  enabled: boolean;
  maxSteps: number;
  retryPerStep: number;
  judgeVerification: JudgeMode;
  authorization: 'REQUIRED';
}

export interface RecoveryObservabilityConfig {
  enabled: boolean;
  maxRecoveryAttempts: number;
  retryFailedNetworkRequests: boolean;
  resumeInterruptedTasks: boolean;
  showDetailedTelemetry: boolean;
  logTraceObservability?: boolean;
  autoAlternativeTools?: boolean;
  failoverOnRateLimit?: boolean;
}

export interface TaskHistoryItem {
  id: string;
  taskId: string;
  taskGoal: string;
  status: AutonomousTaskState;
  stepsCompleted: number;
  totalSteps: number;
  durationSeconds: number;
  recoveryCount: number;
  finalResult: string;
  timestamp: string;
  errorCategory?: string;
}

export interface SmtpEmailConfig {
  enabled: boolean;
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  fromName: string;
  fromEmail: string;
  preset: 'gmail' | 'outlook' | 'sendgrid' | 'mailgun' | 'custom';
}

export interface AppStoreData {
  keys: StoredKeyRecord[];
  models: ModelRoleConfig;
  routing: AIRoutingConfig;
  permissions: SystemPermissions;
  tools: Record<string, ToolConfigEntry>;
  computerControl: ComputerControlSettings;
  browserControl: BrowserControlSettings;
  voice: VoiceSettings;
  memory: MemorySettings;
  security: SecuritySettings;
  cognitiveEngine: CognitiveEngineConfig;
  skills: Record<SkillId, SkillConfig>;
  autonomousTask: AutonomousTaskConfig;
  recoveryObservability: RecoveryObservabilityConfig;
  taskHistory: TaskHistoryItem[];
  email: SmtpEmailConfig;
  auditLogs: AuditLogEntry[];
}

const DATA_DIR = path.join(process.cwd(), '.data');
const STORE_FILE = path.join(DATA_DIR, 'superai-store.json');

const DEFAULT_STORE: AppStoreData = {
  keys: [],
  models: {
    general: 'deepseek/deepseek-chat',
    reasoning: 'deepseek/deepseek-r1',
    coding: 'qwen/qwen-2.5-coder-32b-instruct',
    vision: 'meta-llama/llama-3.2-11b-vision-instruct',
    judge: 'deepseek/deepseek-chat',
  },
  routing: {
    defaultProvider: 'openrouter',
    enableFallback: true,
    autoRetryOnRateLimit: true,
    maxRetryAttempts: 2,
    temperature: 0.7,
    maxTokens: 2048,
  },
  permissions: {
    microphone: 'ASK',
    camera: 'ASK',
    readFiles: 'ASK',
    writeFiles: 'ASK',
    deleteFiles: 'DENY',
    browser: 'ASK',
    webSearch: 'ALLOW',
    executeTerminal: 'DENY',
    executeCode: 'ASK',
    runApplications: 'DENY',
    systemSettings: 'DENY',
    openApplication: 'ASK',
    openUrl: 'ASK',
    openFolder: 'ASK',
    openFile: 'ASK',
    screenshot: 'ASK',
    browserOpenPage: 'ASK',
    browserReadPage: 'ASK',
    browserFindText: 'ASK',
    browserFindLinks: 'ASK',
    browserClickLink: 'ASK',
    browserGoBack: 'ASK',
    browserGoForward: 'ASK',
    browserRefreshPage: 'ASK',
    // IoT Hardware Integration
    smartGate: 'ASK',
    // Code Evolution
    modifyCode: 'ASK',
  },
  tools: {
    calculator: { enabled: true, permission: 'ALLOW' },
    current_time: { enabled: true, permission: 'ALLOW' },
    current_date: { enabled: true, permission: 'ALLOW' },
    web_search: { enabled: true, permission: 'ASK' },
    read_file: { enabled: true, permission: 'ASK' },
    execute_code: { enabled: true, permission: 'ASK' },
    open_application: { enabled: true, permission: 'ASK' },
    open_url: { enabled: true, permission: 'ASK' },
    open_folder: { enabled: true, permission: 'ASK' },
    open_file: { enabled: true, permission: 'ASK' },
    get_active_window: { enabled: true, permission: 'ALLOW' },
    screenshot: { enabled: true, permission: 'ASK' },
    browser_open_page: { enabled: true, permission: 'ASK' },
    browser_read_page: { enabled: true, permission: 'ASK' },
    browser_find_text: { enabled: true, permission: 'ASK' },
    browser_find_links: { enabled: true, permission: 'ASK' },
    browser_click_link: { enabled: true, permission: 'ASK' },
    browser_go_back: { enabled: true, permission: 'ASK' },
    browser_go_forward: { enabled: true, permission: 'ASK' },
    browser_refresh_page: { enabled: true, permission: 'ASK' },
  },
  computerControl: {
    enabled: true,
    permissions: {
      openApplication: 'ALLOW',
      openUrl: 'ALLOW',
      openFolder: 'ASK',
      openFile: 'ASK',
      screenshot: 'ASK',
    },
    allowlistedApps: [
      {
        id: 'chrome',
        name: 'Google Chrome',
        aliases: ['chrome', 'google chrome', 'browser', 'google-chrome'],
        executable: 'chrome.exe',
        enabled: true,
        description: 'Official Google Chrome Web Browser',
      },
      {
        id: 'edge',
        name: 'Microsoft Edge',
        aliases: ['edge', 'msedge', 'microsoft edge'],
        executable: 'msedge.exe',
        enabled: true,
        description: 'Microsoft Edge Browser',
      },
      {
        id: 'notepad',
        name: 'Notepad',
        aliases: ['notepad', 'text editor', 'editor', 'notes'],
        executable: 'notepad.exe',
        enabled: true,
        description: 'Standard Windows Notepad Editor',
      },
      {
        id: 'calculator',
        name: 'Calculator',
        aliases: ['calculator', 'calc', 'math', 'calculator app'],
        executable: 'calc.exe',
        enabled: true,
        description: 'System Calculator Utility',
      },
      {
        id: 'explorer',
        name: 'File Explorer',
        aliases: ['explorer', 'file explorer', 'files', 'my computer', 'this pc'],
        executable: 'explorer.exe',
        enabled: true,
        description: 'Windows File Explorer Shell',
      },
    ],
    allowlistedFolders: [
      {
        id: 'downloads',
        name: 'Downloads',
        aliases: ['downloads', 'download', 'downloads folder'],
        path: 'Downloads',
        enabled: true,
      },
      {
        id: 'documents',
        name: 'Documents',
        aliases: ['documents', 'docs', 'my documents'],
        path: 'Documents',
        enabled: true,
      },
      {
        id: 'desktop',
        name: 'Desktop',
        aliases: ['desktop', 'desktop folder'],
        path: 'Desktop',
        enabled: true,
      },
      {
        id: 'workspace',
        name: 'Workspace Project',
        aliases: ['workspace', 'project', 'current folder', 'app folder'],
        path: '.',
        enabled: true,
      },
      {
        id: 'pictures',
        name: 'Pictures',
        aliases: ['pictures', 'photos', 'images'],
        path: 'Pictures',
        enabled: true,
      },
    ],
  },
  browserControl: {
    enabled: true,
    browserType: 'Dedicated Super AI Browser',
    alwaysAskConfirmation: false,
    permissions: {
      browserOpenPage: 'ASK',
      browserReadPage: 'ASK',
      browserFindText: 'ASK',
      browserFindLinks: 'ASK',
      browserClickLink: 'ASK',
      browserGoBack: 'ASK',
      browserGoForward: 'ASK',
      browserRefreshPage: 'ASK',
    },
    security: {
      credentialAccess: 'BLOCKED',
      arbitraryJavaScript: 'BLOCKED',
      privateBrowserProfile: 'BLOCKED',
      executableDownloads: 'BLOCKED',
      loginAutomation: 'BLOCKED',
      paymentCheckout: 'BLOCKED',
    },
  },
  voice: {
    voiceInputEnabled: false,
    voiceOutputEnabled: false,
    voiceProvider: 'LOCAL_BROWSER',
    voiceQuality: 'AUTO',
    preferredVoiceName: '',
    language: 'Hinglish',
    gender: 'Female',
    speakingStyle: 'Natural Delhi/Hinglish',
    voiceSpeed: 1.0,
    pitch: 1.05,
    voiceVolume: 85,
  },
  memory: {
    retention: '30days',
    contextWindowLimit: 8192,
    vectorStoreEnabled: false,
    autoSummarization: true,
  },
  security: {
    encryptionAtRest: true,
    auditLogging: true,
    keyRotationAlertDays: 90,
    promptSafetyGuard: true,
  },
  cognitiveEngine: {
    enabled: true,
    plannerStatus: 'ACTIVE',
    specialistStatus: 'ACTIVE',
    judgeStatus: 'STANDBY',
    judgeMode: 'AUTO',
    maxModelCalls: 4,
  },
  skills: { ...INITIAL_SKILLS },
  autonomousTask: {
    enabled: true,
    maxSteps: 8,
    retryPerStep: 1,
    judgeVerification: 'AUTO',
    authorization: 'REQUIRED',
  },
  recoveryObservability: {
    enabled: true,
    maxRecoveryAttempts: 3,
    retryFailedNetworkRequests: true,
    resumeInterruptedTasks: true,
    showDetailedTelemetry: false,
  },
  taskHistory: [],
  email: {
    enabled: false,
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    user: '',
    pass: '',
    fromName: 'Super AI',
    fromEmail: '',
    preset: 'gmail',
  },
  auditLogs: [
    {
      id: 'init-log-01',
      timestamp: new Date().toISOString(),
      action: 'SYSTEM_BOOT',
      details: 'Super AI secure storage initialized with AES-256 encryption at rest.',
      severity: 'info',
    },
  ],
};

class StorageManager {
  private data: AppStoreData;

  constructor() {
    this.data = this.loadFromDisk();
  }

  private loadFromDisk(): AppStoreData {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }

      if (fs.existsSync(STORE_FILE)) {
        const raw = fs.readFileSync(STORE_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        return {
          ...DEFAULT_STORE,
          ...parsed,
          models: { ...DEFAULT_STORE.models, ...(parsed.models || {}) },
          routing: { ...DEFAULT_STORE.routing, ...(parsed.routing || {}) },
          permissions: { ...DEFAULT_STORE.permissions, ...(parsed.permissions || {}) },
          tools: { ...DEFAULT_STORE.tools, ...(parsed.tools || {}) },
          computerControl: {
            ...DEFAULT_STORE.computerControl,
            ...(parsed.computerControl || {}),
            permissions: {
              ...DEFAULT_STORE.computerControl.permissions,
              ...(parsed.computerControl?.permissions || {}),
            },
            allowlistedApps: parsed.computerControl?.allowlistedApps || DEFAULT_STORE.computerControl.allowlistedApps,
            allowlistedFolders: parsed.computerControl?.allowlistedFolders || DEFAULT_STORE.computerControl.allowlistedFolders,
          },
          voice: {
            ...DEFAULT_STORE.voice,
            ...(parsed.voice || {}),
            pitch: parsed.voice?.pitch ?? DEFAULT_STORE.voice.pitch,
            gender: parsed.voice?.gender ?? DEFAULT_STORE.voice.gender,
          },
          memory: { ...DEFAULT_STORE.memory, ...(parsed.memory || {}) },
          security: { ...DEFAULT_STORE.security, ...(parsed.security || {}) },
          cognitiveEngine: { ...DEFAULT_STORE.cognitiveEngine, ...(parsed.cognitiveEngine || {}) },
          skills: { ...INITIAL_SKILLS, ...(parsed.skills || {}) },
          email: { ...DEFAULT_STORE.email, ...(parsed.email || {}) },
          keys: parsed.keys || [],
          auditLogs: parsed.auditLogs || DEFAULT_STORE.auditLogs,
        };
      }

      this.saveToDisk(DEFAULT_STORE);
      return { ...DEFAULT_STORE };
    } catch (err) {
      return { ...DEFAULT_STORE };
    }
  }

  private saveToDisk(data: AppStoreData): void {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      const tmpFile = `${STORE_FILE}.tmp.${Date.now()}`;
      fs.writeFileSync(tmpFile, JSON.stringify(data, null, 2), 'utf-8');
      fs.renameSync(tmpFile, STORE_FILE);
    } catch (err) {
      // ignore or handle
    }
  }

  public logAudit(action: string, details: string, severity: 'info' | 'warn' | 'error' = 'info'): void {
    const entry: AuditLogEntry = {
      id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      timestamp: new Date().toISOString(),
      action,
      details,
      severity,
    };
    this.data.auditLogs.unshift(entry);
    if (this.data.auditLogs.length > 60) {
      this.data.auditLogs = this.data.auditLogs.slice(0, 60);
    }
    this.saveToDisk(this.data);
  }

  // --- API Key Methods ---

  public getAllKeysSanitized(): SanitizedApiKey[] {
    return this.data.keys.map((k) => ({
      id: k.id,
      provider: k.provider,
      name: k.name,
      maskedKey: k.maskedKey,
      createdAt: k.createdAt,
      updatedAt: k.updatedAt,
      isActive: k.isActive,
      isEnabled: k.isEnabled,
      status: k.status,
      lastTestedAt: k.lastTestedAt,
      lastError: k.lastError,
    }));
  }

  public getKeyRecord(id: string): StoredKeyRecord | undefined {
    return this.data.keys.find((k) => k.id === id);
  }

  public addKey(params: {
    provider: 'openrouter' | 'openai' | 'anthropic' | 'groq' | 'gemini';
    name: string;
    rawKey: string;
    isActive?: boolean;
  }): SanitizedApiKey {
    const existingProviderKeys = this.data.keys.filter((k) => k.provider === params.provider);
    const shouldBeActive = params.isActive ?? (existingProviderKeys.length === 0);

    if (shouldBeActive) {
      // Unset active on other keys of this provider
      this.data.keys.forEach((k) => {
        if (k.provider === params.provider) {
          k.isActive = false;
        }
      });
    }

    const encrypted = encryptSecret(params.rawKey);
    const masked = maskApiKey(params.rawKey);
    const now = new Date().toISOString();

    const record: StoredKeyRecord = {
      id: `key-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      provider: params.provider,
      name: params.name || `${params.provider.toUpperCase()} Key ${existingProviderKeys.length + 1}`,
      maskedKey: masked,
      encryptedPayload: encrypted,
      createdAt: now,
      updatedAt: now,
      isActive: shouldBeActive,
      isEnabled: true,
      status: 'untested',
    };

    this.data.keys.push(record);
    this.logAudit('KEY_ADDED', `Added new ${params.provider} key: "${record.name}" [${masked}]`);
    this.saveToDisk(this.data);

    return {
      id: record.id,
      provider: record.provider,
      name: record.name,
      maskedKey: record.maskedKey,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      isActive: record.isActive,
      isEnabled: record.isEnabled,
      status: record.status,
    };
  }

  public updateKey(
    id: string,
    updates: {
      name?: string;
      rawKey?: string;
      isEnabled?: boolean;
      isActive?: boolean;
      status?: 'valid' | 'invalid' | 'untested' | 'rate_limited';
      lastTestedAt?: string;
      lastError?: string;
    }
  ): SanitizedApiKey | null {
    const key = this.data.keys.find((k) => k.id === id);
    if (!key) return null;

    if (updates.name !== undefined) key.name = updates.name;
    if (updates.isEnabled !== undefined) key.isEnabled = updates.isEnabled;
    if (updates.status !== undefined) key.status = updates.status;
    if (updates.lastTestedAt !== undefined) key.lastTestedAt = updates.lastTestedAt;
    if (updates.lastError !== undefined) key.lastError = updates.lastError;

    if (updates.isActive === true) {
      this.data.keys.forEach((k) => {
        if (k.provider === key.provider) {
          k.isActive = k.id === id;
        }
      });
    } else if (updates.isActive === false) {
      key.isActive = false;
    }

    if (updates.rawKey && updates.rawKey.trim()) {
      key.encryptedPayload = encryptSecret(updates.rawKey.trim());
      key.maskedKey = maskApiKey(updates.rawKey.trim());
      key.status = 'untested';
      this.logAudit('KEY_UPDATED', `Rotated key secret for "${key.name}" [${key.maskedKey}]`);
    }

    key.updatedAt = new Date().toISOString();
    this.saveToDisk(this.data);

    return {
      id: key.id,
      provider: key.provider,
      name: key.name,
      maskedKey: key.maskedKey,
      createdAt: key.createdAt,
      updatedAt: key.updatedAt,
      isActive: key.isActive,
      isEnabled: key.isEnabled,
      status: key.status,
      lastTestedAt: key.lastTestedAt,
      lastError: key.lastError,
    };
  }

  public deleteKey(id: string): boolean {
    const idx = this.data.keys.findIndex((k) => k.id === id);
    if (idx === -1) return false;

    const removed = this.data.keys.splice(idx, 1)[0];

    // If removed key was active, promote another enabled key for that provider
    if (removed.isActive) {
      const nextAvailable = this.data.keys.find((k) => k.provider === removed.provider && k.isEnabled);
      if (nextAvailable) {
        nextAvailable.isActive = true;
      }
    }

    this.logAudit('KEY_DELETED', `Deleted key "${removed.name}" [${removed.maskedKey}]`);
    this.saveToDisk(this.data);
    return true;
  }

  public setActiveKey(id: string): SanitizedApiKey | null {
    const target = this.data.keys.find((k) => k.id === id);
    if (!target) return null;

    this.data.keys.forEach((k) => {
      if (k.provider === target.provider) {
        k.isActive = k.id === id;
      }
    });

    // Also auto-enable it if disabled
    target.isEnabled = true;
    target.updatedAt = new Date().toISOString();
    this.logAudit('KEY_ACTIVATED', `Set "${target.name}" [${target.maskedKey}] as primary active key for ${target.provider}`);
    this.saveToDisk(this.data);

    return {
      id: target.id,
      provider: target.provider,
      name: target.name,
      maskedKey: target.maskedKey,
      createdAt: target.createdAt,
      updatedAt: target.updatedAt,
      isActive: target.isActive,
      isEnabled: target.isEnabled,
      status: target.status,
      lastTestedAt: target.lastTestedAt,
      lastError: target.lastError,
    };
  }

  /**
   * Retrieves the raw decrypted key for backend operations only.
   * Never exposed to frontend responses.
   */
  public getDecryptedKey(id: string): string | null {
    const key = this.data.keys.find((k) => k.id === id);
    if (!key) return null;
    return decryptSecret(key.encryptedPayload);
  }

  /**
   * Returns an ordered list of enabled keys for a provider:
   * First the active key (if enabled), followed by other enabled fallback keys.
   */
  public getExecutableKeysForProvider(provider: 'openrouter' | 'openai' | 'anthropic' | 'groq' | 'gemini'): {
    id: string;
    name: string;
    rawKey: string;
  }[] {
    const providerKeys = this.data.keys.filter((k) => k.provider === provider && k.isEnabled);

    // Sort active key first
    providerKeys.sort((a, b) => (b.isActive ? 1 : 0) - (a.isActive ? 1 : 0));

    const result: { id: string; name: string; rawKey: string }[] = [];
    for (const record of providerKeys) {
      const raw = decryptSecret(record.encryptedPayload);
      if (raw) {
        result.push({
          id: record.id,
          name: record.name,
          rawKey: raw,
        });
      }
    }
    return result;
  }

  // --- Configuration Management ---

  public getConfig(): {
    models: ModelRoleConfig;
    routing: AIRoutingConfig;
    permissions: SystemPermissions;
    tools: Record<string, ToolConfigEntry>;
    computerControl: ComputerControlSettings;
    voice: VoiceSettings;
    memory: MemorySettings;
    security: SecuritySettings;
    cognitiveEngine: CognitiveEngineConfig;
    skills: Record<SkillId, SkillConfig>;
    auditLogs: AuditLogEntry[];
  } {
    return {
      models: this.data.models,
      routing: this.data.routing,
      permissions: this.data.permissions,
      tools: this.data.tools || DEFAULT_STORE.tools,
      computerControl: this.getComputerControlConfig(),
      voice: {
        ...this.data.voice,
        cloudTtsApiKey: this.data.voice?.cloudTtsApiKey ? '••••••••' : undefined,
      },
      memory: this.data.memory,
      security: this.data.security,
      cognitiveEngine: this.getCognitiveEngineConfig(),
      skills: this.getSkills(),
      auditLogs: this.data.auditLogs,
    };
  }

  public getCognitiveEngineConfig(): CognitiveEngineConfig {
    return this.data.cognitiveEngine || DEFAULT_STORE.cognitiveEngine;
  }

  public updateCognitiveEngineConfig(
    updates: Partial<CognitiveEngineConfig>
  ): CognitiveEngineConfig {
    const current = this.getCognitiveEngineConfig();
    this.data.cognitiveEngine = {
      ...current,
      ...updates,
    };
    this.logAudit(
      'COGNITIVE_ENGINE_UPDATED',
      `Cognitive Brain configuration updated. Judge Mode: ${this.data.cognitiveEngine.judgeMode}`
    );
    this.saveToDisk(this.data);
    return this.data.cognitiveEngine;
  }

  public getComputerControlConfig(): ComputerControlSettings {
    return this.data.computerControl || DEFAULT_STORE.computerControl;
  }

  public updateComputerControlConfig(
    updates: Partial<ComputerControlSettings>
  ): ComputerControlSettings {
    const current = this.getComputerControlConfig();
    this.data.computerControl = {
      ...current,
      ...updates,
      permissions: {
        ...current.permissions,
        ...(updates.permissions || {}),
      },
      allowlistedApps: updates.allowlistedApps || current.allowlistedApps,
      allowlistedFolders: updates.allowlistedFolders || current.allowlistedFolders,
    };

    if (updates.permissions) {
      this.data.permissions = {
        ...this.data.permissions,
        ...updates.permissions,
      };
    }

    this.logAudit('COMPUTER_CONTROL_CONFIG_UPDATED', 'Updated Computer Control security settings and allowlists.');
    this.saveToDisk(this.data);
    return this.data.computerControl;
  }

  public updateComputerControlPermission(
    permKey: keyof ComputerControlSettings['permissions'],
    level: PermissionLevel
  ): ComputerControlSettings {
    const current = this.getComputerControlConfig();
    current.permissions[permKey] = level;
    this.data.permissions[permKey] = level;
    this.logAudit('COMPUTER_CONTROL_PERMISSION_CHANGED', `Changed permission for ${permKey} to ${level}`);
    this.saveToDisk(this.data);
    return current;
  }

  public getBrowserControlConfig(): BrowserControlSettings {
    return this.data.browserControl || DEFAULT_STORE.browserControl;
  }

  public getBrowserControl(): BrowserControlSettings {
    return this.getBrowserControlConfig();
  }

  public updateBrowserControl(
    updates: Partial<BrowserControlSettings>
  ): BrowserControlSettings {
    return this.updateBrowserControlConfig(updates);
  }

  public updateBrowserControlConfig(
    updates: Partial<BrowserControlSettings>
  ): BrowserControlSettings {
    const current = this.getBrowserControlConfig();
    this.data.browserControl = {
      ...current,
      ...updates,
      permissions: {
        ...current.permissions,
        ...(updates.permissions || {}),
      },
      security: {
        ...current.security,
      },
    };

    if (updates.permissions) {
      this.data.permissions = {
        ...this.data.permissions,
        ...updates.permissions,
      };
    }

    this.logAudit('BROWSER_CONTROL_CONFIG_UPDATED', 'Updated Browser Control security settings and permissions.');
    this.saveToDisk(this.data);
    return this.data.browserControl;
  }

  public updateBrowserControlPermission(
    permKey: keyof BrowserControlSettings['permissions'],
    level: PermissionLevel
  ): BrowserControlSettings {
    const current = this.getBrowserControlConfig();
    current.permissions[permKey] = level;
    this.data.permissions[permKey] = level;
    this.logAudit('BROWSER_CONTROL_PERMISSION_CHANGED', `Changed permission for ${permKey} to ${level}`);
    this.saveToDisk(this.data);
    return current;
  }

  public getToolsConfig(): Record<string, ToolConfigEntry> {
    return this.data.tools || DEFAULT_STORE.tools;
  }

  public updateToolConfig(
    toolName: string,
    updates: Partial<ToolConfigEntry>
  ): Record<string, ToolConfigEntry> {
    const current = this.data.tools?.[toolName] || { enabled: true, permission: 'ALLOW' };
    if (!this.data.tools) {
      this.data.tools = { ...DEFAULT_STORE.tools };
    }
    this.data.tools[toolName] = { ...current, ...updates };
    this.logAudit('TOOL_CONFIG_UPDATED', `Updated tool "${toolName}": ${JSON.stringify(updates)}`);
    this.saveToDisk(this.data);
    return this.data.tools;
  }

  public updateAllToolsConfig(
    toolsConfig: Record<string, ToolConfigEntry>
  ): Record<string, ToolConfigEntry> {
    this.data.tools = {
      ...(this.data.tools || DEFAULT_STORE.tools),
      ...toolsConfig,
    };
    this.logAudit('TOOLS_CONFIG_BATCH_UPDATED', 'Updated tools permission matrix in Control Panel.');
    this.saveToDisk(this.data);
    return this.data.tools;
  }

  public getSkills(): Record<SkillId, SkillConfig> {
    return this.data.skills || { ...INITIAL_SKILLS };
  }

  public getSkill(id: SkillId): SkillConfig | undefined {
    return (this.data.skills || INITIAL_SKILLS)[id];
  }

  public updateSkill(id: SkillId, updates: Partial<SkillConfig>): SkillConfig {
    if (!this.data.skills) {
      this.data.skills = { ...INITIAL_SKILLS };
    }
    const current = this.data.skills[id] || INITIAL_SKILLS[id];
    this.data.skills[id] = {
      ...current,
      ...updates,
    };
    this.logAudit(
      'SKILL_UPDATED',
      `Updated skill "${id}": ${updates.enabled !== undefined ? (updates.enabled ? 'ENABLED' : 'DISABLED') : JSON.stringify(updates)}`
    );
    this.saveToDisk(this.data);
    return this.data.skills[id];
  }

  public updateAllSkills(skills: Record<SkillId, SkillConfig>): Record<SkillId, SkillConfig> {
    this.data.skills = {
      ...(this.data.skills || INITIAL_SKILLS),
      ...skills,
    };
    this.logAudit('SKILLS_BATCH_UPDATED', 'Updated Skills Registry configurations.');
    this.saveToDisk(this.data);
    return this.data.skills;
  }

  public updateSectionConfig<K extends keyof Omit<AppStoreData, 'keys' | 'auditLogs'>>(
    section: K,
    updates: Partial<AppStoreData[K]>
  ): AppStoreData[K] {
    if (section === 'voice') {
      const voiceUpdates = (updates || {}) as Partial<VoiceSettings>;
      const currentVoice = this.data.voice || DEFAULT_STORE.voice;
      const preservedApiKey =
        voiceUpdates.cloudTtsApiKey === '••••••••' || voiceUpdates.cloudTtsApiKey === undefined
          ? currentVoice.cloudTtsApiKey
          : voiceUpdates.cloudTtsApiKey;

      this.data.voice = {
        ...currentVoice,
        ...voiceUpdates,
        cloudTtsApiKey: preservedApiKey,
      };
      this.logAudit('CONFIG_UPDATED', 'Updated VOICE configuration.');
      this.saveToDisk(this.data);
      return {
        ...this.data.voice,
        cloudTtsApiKey: this.data.voice?.cloudTtsApiKey ? '••••••••' : undefined,
      } as any;
    }

    this.data[section] = {
      ...this.data[section],
      ...updates,
    };
    this.logAudit('CONFIG_UPDATED', `Updated ${String(section).toUpperCase()} configuration.`);
    this.saveToDisk(this.data);
    return this.data[section];
  }

  public getAutonomousTaskConfig(): AutonomousTaskConfig {
    return (
      this.data.autonomousTask || {
        enabled: true,
        maxSteps: 8,
        retryPerStep: 1,
        judgeVerification: 'AUTO',
        authorization: 'REQUIRED',
      }
    );
  }

  public updateAutonomousTaskConfig(updates: Partial<AutonomousTaskConfig>): AutonomousTaskConfig {
    if (!this.data.autonomousTask) {
      this.data.autonomousTask = {
        enabled: true,
        maxSteps: 8,
        retryPerStep: 1,
        judgeVerification: 'AUTO',
        authorization: 'REQUIRED',
      };
    }
    this.data.autonomousTask = {
      ...this.data.autonomousTask,
      ...updates,
    };
    this.logAudit('AUTONOMOUS_TASK_CONFIG_UPDATED', `Updated Autonomous Task Engine configuration.`);
    this.saveToDisk(this.data);
    return this.data.autonomousTask;
  }

  public getRecoveryObservabilityConfig(): RecoveryObservabilityConfig {
    return (
      this.data.recoveryObservability || {
        enabled: true,
        maxRecoveryAttempts: 3,
        retryFailedNetworkRequests: true,
        resumeInterruptedTasks: true,
        showDetailedTelemetry: false,
      }
    );
  }

  public updateRecoveryObservabilityConfig(
    updates: Partial<RecoveryObservabilityConfig>
  ): RecoveryObservabilityConfig {
    if (!this.data.recoveryObservability) {
      this.data.recoveryObservability = {
        enabled: true,
        maxRecoveryAttempts: 3,
        retryFailedNetworkRequests: true,
        resumeInterruptedTasks: true,
        showDetailedTelemetry: false,
      };
    }
    this.data.recoveryObservability = {
      ...this.data.recoveryObservability,
      ...updates,
    };
    this.logAudit(
      'RECOVERY_OBSERVABILITY_CONFIG_UPDATED',
      `Updated Recovery & Observability configuration: ${JSON.stringify(updates)}`
    );
    this.saveToDisk(this.data);
    return this.data.recoveryObservability;
  }

  public getTaskHistory(): TaskHistoryItem[] {
    return this.data.taskHistory || [];
  }

  public addTaskHistory(item: Omit<TaskHistoryItem, 'id' | 'timestamp'>): TaskHistoryItem {
    if (!this.data.taskHistory) {
      this.data.taskHistory = [];
    }
    const historyRecord: TaskHistoryItem = {
      ...item,
      id: `task_hist_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toLocaleTimeString(),
    };
    // Keep max 50 historical task items
    this.data.taskHistory.unshift(historyRecord);
    if (this.data.taskHistory.length > 50) {
      this.data.taskHistory = this.data.taskHistory.slice(0, 50);
    }
    this.saveToDisk(this.data);
    return historyRecord;
  }

  public clearTaskHistory(): void {
    this.data.taskHistory = [];
    this.saveToDisk(this.data);
  }

  // ── SMTP Email Configuration ────────────────────────────────────────────────
  public getEmailConfig(): SmtpEmailConfig {
    return this.data.email || DEFAULT_STORE.email;
  }

  public getSanitizedEmailConfig(): Omit<SmtpEmailConfig, 'pass'> & { hasPass: boolean } {
    const config = this.getEmailConfig();
    return {
      enabled: config.enabled,
      host: config.host,
      port: config.port,
      secure: config.secure,
      user: config.user,
      fromName: config.fromName,
      fromEmail: config.fromEmail,
      preset: config.preset,
      hasPass: Boolean(config.pass && config.pass.trim()),
    };
  }

  public updateEmailConfig(updates: Partial<SmtpEmailConfig>): SmtpEmailConfig {
    const current = this.getEmailConfig();
    this.data.email = {
      ...current,
      ...updates,
      pass: updates.pass !== undefined && updates.pass !== '' ? updates.pass : (updates.pass === '' ? '' : current.pass),
    };
    this.logAudit(
      'EMAIL_CONFIG_UPDATED',
      `SMTP email configuration updated: host=${this.data.email.host}, port=${this.data.email.port}, enabled=${this.data.email.enabled}`
    );
    this.saveToDisk(this.data);
    return this.data.email;
  }
}

export const storage = new StorageManager();
