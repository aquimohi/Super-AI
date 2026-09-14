import { PermissionLevel, SystemPermissions } from '../../storage.js';

export type ToolRiskLevel = 'LOW' | 'MEDIUM' | 'HIGH';

export type RequiredPermission =
  | 'NONE'
  | 'WEB_SEARCH'
  | 'READ_FILES'
  | 'WRITE_FILES'
  | 'EXECUTE_TERMINAL'
  | 'EXECUTE_CODE'
  | 'SYSTEM_SETTINGS'
  | 'OPEN_APPLICATION'
  | 'OPEN_URL'
  | 'OPEN_FOLDER'
  | 'OPEN_FILE'
  | 'SCREENSHOT'
  | 'BROWSER_OPEN_PAGE'
  | 'BROWSER_READ_PAGE'
  | 'BROWSER_FIND_TEXT'
  | 'BROWSER_FIND_LINKS'
  | 'BROWSER_CLICK_LINK'
  | 'BROWSER_GO_BACK'
  | 'BROWSER_GO_FORWARD'
  | 'BROWSER_REFRESH_PAGE'
  | 'SMART_GATE'
  | 'MODIFY_CODE';

export interface ToolParameterProperty {
  type: string;
  description: string;
  enum?: string[];
  items?: any;
}

export interface ToolParameterSchema {
  type: 'object';
  properties: Record<string, ToolParameterProperty>;
  required?: string[];
}

export interface ToolExecutionContext {
  sessionAuthorizations?: string[];
  userId?: string;
  requestId?: string;
}

export interface ToolExecutionResult {
  success: boolean;
  result?: any;
  error?: string;
  displaySummary?: string;
  sanitizedExecutionSummary?: string;
  sanitizedResultSummary?: string;
}

export interface ToolDefinition {
  name: string;
  displayName: string;
  description: string;
  parameters: ToolParameterSchema;
  requiredPermission: RequiredPermission;
  risk: ToolRiskLevel;
  category: 'utility' | 'system' | 'web' | 'filesystem' | 'automation' | 'computer-control';
  execute: (
    args: Record<string, any>,
    context?: ToolExecutionContext
  ) => Promise<ToolExecutionResult> | ToolExecutionResult;
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
