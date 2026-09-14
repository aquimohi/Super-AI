export type AIState = 'IDLE' | 'LISTENING' | 'THINKING' | 'PROCESSING' | 'EXECUTING' | 'SPEAKING' | 'ERROR' | 'AUTHORIZATION' | 'RECOVERING';

// ─── IoT / Radar Types ───────────────────────────────────────────────────────
export interface RadarReading {
  /** True when a person is present (stationary or moving) */
  presence: boolean;
  /** True when active movement is detected */
  motion: boolean;
  /** Breaths per minute — null if sensor doesn't support */
  breathingRate: number | null;
  /** Distance to nearest target in metres — null if unavailable */
  distance: number | null;
  /** Signal/detection strength 0-100 */
  signalStrength: number;
  /** ISO timestamp */
  timestamp: string;
  /** Hardware sensor identifier e.g. "esp32-01" */
  sensorId: string;
}

export type RadarSocketState = 'connecting' | 'connected' | 'disconnected' | 'error';

export type AIProvider = 'openrouter' | 'openai' | 'anthropic' | 'groq' | 'gemini';

export type KeyValidationStatus = 'valid' | 'invalid' | 'untested' | 'rate_limited';

export interface StoredApiKey {
  id: string;
  provider: AIProvider;
  name: string;
  maskedKey: string;
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
  isEnabled: boolean;
  status: KeyValidationStatus;
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
  defaultProvider: AIProvider;
  enableFallback: boolean;
  autoRetryOnRateLimit: boolean;
  maxRetryAttempts: number;
  temperature: number;
  maxTokens: number;
}

export type PermissionLevel = 'ALLOW' | 'ASK' | 'DENY';

export type ToolRiskLevel = 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface ToolItem {
  id: string;
  name: string;
  identifier: string;
  description: string;
  risk: ToolRiskLevel;
  requiredPermission: string;
  category: string;
  enabled: boolean;
  permission: PermissionLevel;
}

export interface PendingToolAuthorization {
  tool: string;
  toolName: string;
  arguments: any;
  risk: ToolRiskLevel;
  requiredPermission: string;
  actionDescription: string;
  toolCallId?: string;
  isAutonomousTask?: boolean;
  taskId?: string;
  stepId?: number;
  stepAction?: string;
}

export interface ToolActivityLog {
  id: string;
  timestamp: string;
  tool: string;
  permission: 'ALLOWED' | 'DENIED' | 'ASKED';
  execution: string;
  result: string;
  risk: ToolRiskLevel;
}

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
  // IoT Hardware Integration
  smartGate: PermissionLevel;
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

export interface MemoryEvent {
  id: string;
  type: 'MEMORY_STORED' | 'MEMORY_RETRIEVED' | 'MEMORY_UPDATED' | 'MEMORY_DELETED';
  summary: string;
  details?: string;
  timestamp: string;
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

export interface MemorySettings {
  shortTermMemoryEnabled?: boolean;
  longTermMemoryEnabled?: boolean;
  workingMemoryEnabled?: boolean;
  storageType?: 'LOCAL';
  retention: 'session' | '7days' | '30days' | 'infinite';
  contextWindowLimit: number;
  vectorStoreEnabled: boolean;
  autoSummarization: boolean;
  maxContextMessages?: number;
  maxLongTermItemsToInject?: number;
}

export interface ToolDefinition {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  category: 'system' | 'web' | 'automation' | 'filesystem';
  requiresPermission: keyof SystemPermissions;
}

export interface SecuritySettings {
  encryptionAtRest: boolean;
  auditLogging: boolean;
  keyRotationAlertDays: number;
  promptSafetyGuard: boolean;
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

export type SkillId =
  | 'GENERAL'
  | 'CODING'
  | 'REASONING'
  | 'BROWSER'
  | 'WINDOWS'
  | 'MEMORY'
  | 'VISION';

export interface SkillConfig {
  skillId: SkillId;
  name: string;
  description: string;
  category: string;
  enabled: boolean;
  availableTools: string[];
  requiredPermissions: string[];
  preferredModelRole: 'general' | 'reasoning' | 'coding' | 'vision';
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
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

export interface CognitiveTraceEvent {
  id: string;
  agent: 'PLANNER' | 'SPECIALIST' | 'JUDGE' | 'TOOL' | 'SKILL' | 'TASK' | 'RECOVERY' | 'RESULT';
  action: string;
  detail: string;
  timestamp: string;
  status?: 'ACTIVE' | 'COMPLETED' | 'STANDBY' | 'APPROVED' | 'REVISED' | 'SKIPPED' | 'FALLBACK';
}

export type AutonomousTaskState =
  | 'IDLE'
  | 'PLANNING'
  | 'WAITING_AUTHORIZATION'
  | 'EXECUTING'
  | 'RECOVERING'
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
  logTraceObservability: boolean;
  autoAlternativeTools: boolean;
  failoverOnRateLimit: boolean;
}

export interface TaskHistoryItem {
  id: string;
  taskId: string;
  taskGoal: string;
  status: 'COMPLETED' | 'FAILED' | 'CANCELLED';
  stepsCompleted: number;
  totalSteps: number;
  durationSeconds: number;
  recoveryCount: number;
  finalResult: string;
  timestamp: string;
  errorCategory?: string;
}

export interface TaskStep {
  id: number;
  skill: SkillId;
  action: string;
  description: string;
  status?: 'PENDING' | 'EXECUTING' | 'COMPLETED' | 'FAILED' | 'SKIPPED';
  attempts?: number;
  resultSummary?: string;
  error?: string;
}

export interface TaskPlanSummary {
  taskId: string;
  goal: string;
  state: AutonomousTaskState;
  currentStepIndex: number;
  totalSteps: number;
  steps: TaskStep[];
  createdAt: number;
  updatedAt: number;
}

export interface JudgeEvaluationSummary {
  verdict: 'APPROVED' | 'REVISED' | 'SKIPPED' | 'STANDBY';
  score?: number;
  critique?: string;
  model?: string;
  revisionsMade?: boolean;
}

export interface SystemConfig {
  models: ModelRoleConfig;
  routing: AIRoutingConfig;
  permissions: SystemPermissions;
  voice: VoiceSettings;
  memory: MemorySettings;
  security: SecuritySettings;
  computerControl?: ComputerControlSettings;
  browserControl?: BrowserControlSettings;
  cognitiveEngine?: CognitiveEngineConfig;
  skills?: Record<SkillId, SkillConfig>;
  autonomousTask?: AutonomousTaskConfig;
  recoveryObservability?: RecoveryObservabilityConfig;
}

export type ControlPanelSection =
  | 'dashboard'
  | 'autonomous-task'
  | 'recovery-observability'
  | 'cognitive-engine'
  | 'skills'
  | 'api-keys'
  | 'models'
  | 'routing'
  | 'permissions'
  | 'computer-control'
  | 'browser-control'
  | 'voice'
  | 'memory'
  | 'tools'
  | 'security';

export interface AIStateConfig {
  name: AIState;
  label: string;
  tagline: string;
  color: string;
  glowColor: string;
  particleSpeed: number;
  rotationSpeed: number;
  ringSpeed: number;
  pulseIntensity: number;
  particleCount: number;
  description: string;
}

export interface SystemMetrics {
  quantumCore: string;
  fluxLevel: number;
  neuralLoad: number;
  synapseFrequency: string;
  activeNodes: number;
  memoryIntegrity: number;
  temperatureKelvin: number;
  fps: number;
}

export interface ChatMessage {
  id: string;
  sender: 'USER' | 'SUPER_AI' | 'SYSTEM';
  text: string;
  timestamp: string;
  stateTriggered?: AIState;
  modelUsed?: string;
  providerUsed?: string;
  taskType?: 'GENERAL' | 'REASONING' | 'CODING' | 'VISION';
  keyUsedName?: string;
  latencyMs?: number;
  fallbackOccurred?: boolean;
  isError?: boolean;
  toolActivities?: ToolActivityLog[];
  memoryEvents?: MemoryEvent[];
  cognitiveTrace?: CognitiveTraceEvent[];
  judgeEvaluation?: JudgeEvaluationSummary;
  conversationId?: string;
  isAutonomousTask?: boolean;
  taskId?: string;
  taskState?: AutonomousTaskState;
}

