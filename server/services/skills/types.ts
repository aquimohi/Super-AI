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

export const INITIAL_SKILLS: Record<SkillId, SkillConfig> = {
  GENERAL: {
    skillId: 'GENERAL',
    name: 'General Assistant',
    description: 'Conversational dialogue, general queries, system time, date, and basic arithmetic computation.',
    category: 'GENERAL',
    enabled: true,
    availableTools: ['calculator', 'current_time', 'current_date', 'web_search'],
    requiredPermissions: ['webSearch'],
    preferredModelRole: 'general',
    riskLevel: 'LOW',
  },
  CODING: {
    skillId: 'CODING',
    name: 'Coding & Software Engineering',
    description: 'Code synthesis, algorithms, syntax debugging, refactoring, and codebase file inspection.',
    category: 'CODING',
    enabled: true,
    availableTools: ['read_file'],
    requiredPermissions: ['readFiles'],
    preferredModelRole: 'coding',
    riskLevel: 'LOW',
  },
  REASONING: {
    skillId: 'REASONING',
    name: 'Deep Reasoning & Proofs',
    description: 'Step-by-step logic deduction, computational complexity analysis, mathematical proofs, and problem solving.',
    category: 'REASONING',
    enabled: true,
    availableTools: ['calculator'],
    requiredPermissions: [],
    preferredModelRole: 'reasoning',
    riskLevel: 'LOW',
  },
  BROWSER: {
    skillId: 'BROWSER',
    name: 'Controlled Browser Automation',
    description: 'Isolated web page navigation, reading content, link clicking, and web search verification.',
    category: 'BROWSER',
    enabled: true,
    availableTools: [
      'browser_open_page',
      'browser_read_page',
      'browser_find_text',
      'browser_find_links',
      'browser_click_link',
      'browser_go_back',
      'browser_go_forward',
      'browser_refresh_page',
    ],
    requiredPermissions: [
      'browserOpenPage',
      'browserReadPage',
      'browserFindText',
      'browserFindLinks',
      'browserClickLink',
      'browserGoBack',
      'browserGoForward',
      'browserRefreshPage',
    ],
    preferredModelRole: 'general',
    riskLevel: 'MEDIUM',
  },
  WINDOWS: {
    skillId: 'WINDOWS',
    name: 'Windows Safe Computer Control',
    description: 'Safely launch allowlisted applications, open approved folders, inspect active windows, and capture screenshots.',
    category: 'WINDOWS',
    enabled: true,
    availableTools: [
      'open_application',
      'open_url',
      'open_folder',
      'open_file',
      'get_active_window',
      'screenshot',
    ],
    requiredPermissions: [
      'openApplication',
      'openUrl',
      'openFolder',
      'openFile',
      'screenshot',
    ],
    preferredModelRole: 'general',
    riskLevel: 'MEDIUM',
  },
  MEMORY: {
    skillId: 'MEMORY',
    name: 'Neural Memory Vault',
    description: 'User recall, project facts, cross-session personal context retrieval, and structured memory management.',
    category: 'MEMORY',
    enabled: true,
    availableTools: [],
    requiredPermissions: [],
    preferredModelRole: 'general',
    riskLevel: 'LOW',
  },
  VISION: {
    skillId: 'VISION',
    name: 'Multimodal Vision & Inspection',
    description: 'Analyze screenshots, inspect uploaded images, UI visual analysis, and OCR descriptions.',
    category: 'VISION',
    enabled: true,
    availableTools: ['screenshot'],
    requiredPermissions: ['screenshot', 'camera'],
    preferredModelRole: 'vision',
    riskLevel: 'LOW',
  },
};
