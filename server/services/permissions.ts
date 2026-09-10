import { storage, SystemPermissions, PermissionLevel } from '../storage.js';
import { toolRegistry } from './tools/registry.js';
import { RequiredPermission, ToolRiskLevel } from './tools/types.js';

export interface PermissionCheckResult {
  granted: boolean;
  requiresPrompt: boolean;
  level: PermissionLevel;
  reason?: string;
  toolDisplayName?: string;
  risk?: ToolRiskLevel;
  requiredPermission?: RequiredPermission;
}

/**
 * Maps Tool RequiredPermission to SystemPermissions key
 */
function mapRequiredPermissionToSystemKey(
  perm: RequiredPermission
): keyof SystemPermissions | null {
  switch (perm) {
    case 'WEB_SEARCH':
      return 'webSearch';
    case 'READ_FILES':
      return 'readFiles';
    case 'WRITE_FILES':
      return 'writeFiles';
    case 'EXECUTE_TERMINAL':
      return 'executeTerminal';
    case 'SYSTEM_SETTINGS':
      return 'systemSettings';
    case 'OPEN_APPLICATION':
      return 'openApplication';
    case 'OPEN_URL':
      return 'openUrl';
    case 'OPEN_FOLDER':
      return 'openFolder';
    case 'OPEN_FILE':
      return 'openFile';
    case 'SCREENSHOT':
      return 'screenshot';
    case 'BROWSER_OPEN_PAGE':
      return 'browserOpenPage';
    case 'BROWSER_READ_PAGE':
      return 'browserReadPage';
    case 'BROWSER_FIND_TEXT':
      return 'browserFindText';
    case 'BROWSER_FIND_LINKS':
      return 'browserFindLinks';
    case 'BROWSER_CLICK_LINK':
      return 'browserClickLink';
    case 'BROWSER_GO_BACK':
      return 'browserGoBack';
    case 'BROWSER_GO_FORWARD':
      return 'browserGoForward';
    case 'BROWSER_REFRESH_PAGE':
      return 'browserRefreshPage';
    case 'NONE':
    default:
      return null;
  }
}

/**
 * Checks tool permission level for a given tool call.
 * Enforces per-tool configuration, system permission policies, and session clearance.
 */
export function checkToolPermission(
  toolName: string,
  sessionAuthorizations: string[] = [],
  contextDesc?: string
): PermissionCheckResult {
  const lowerName = toolName.toLowerCase();

  // 1. Check if blocked at registry level (e.g. terminal execution)
  if (toolRegistry.isBlocked(lowerName)) {
    storage.logAudit(
      'TOOL_BLOCKED_POLICY',
      `Tool "${toolName}" was blocked by security policy. Terminal/execution tools are prohibited. ${contextDesc || ''}`,
      'warn'
    );
    return {
      granted: false,
      requiresPrompt: false,
      level: 'DENY',
      reason: `Tool "${toolName}" is NOT AVAILABLE / BLOCKED by system security policy.`,
      toolDisplayName: toolName,
      risk: 'HIGH',
    };
  }

  const tool = toolRegistry.getTool(lowerName);
  if (!tool) {
    return {
      granted: false,
      requiresPrompt: false,
      level: 'DENY',
      reason: `Tool "${toolName}" is not registered in the system.`,
      toolDisplayName: toolName,
      risk: 'HIGH',
    };
  }

  const toolsConfig = storage.getToolsConfig();
  const toolSetting = toolsConfig[lowerName] || { enabled: true, permission: 'ALLOW' };

  // 2. Check if disabled in Control Panel
  if (!toolSetting.enabled) {
    storage.logAudit(
      'TOOL_DISABLED',
      `Tool "${tool.displayName}" was requested but is disabled in the Control Panel.`,
      'warn'
    );
    return {
      granted: false,
      requiresPrompt: false,
      level: 'DENY',
      reason: `Tool "${tool.displayName}" is currently disabled in the Control Panel.`,
      toolDisplayName: tool.displayName,
      risk: tool.risk,
      requiredPermission: tool.requiredPermission,
    };
  }

  // 3. Check tool-level configured permission
  if (toolSetting.permission === 'DENY') {
    storage.logAudit(
      'TOOL_PERMISSION_DENIED',
      `Tool "${tool.displayName}" is restricted by tool policy (DENY). ${contextDesc || ''}`,
      'warn'
    );
    return {
      granted: false,
      requiresPrompt: false,
      level: 'DENY',
      reason: `Tool "${tool.displayName}" is restricted by tool policy (DENY).`,
      toolDisplayName: tool.displayName,
      risk: tool.risk,
      requiredPermission: tool.requiredPermission,
    };
  }

  // 4. Check underlying system-level permission
  const systemKey = mapRequiredPermissionToSystemKey(tool.requiredPermission);
  let effectiveLevel: PermissionLevel = toolSetting.permission;

  if (systemKey) {
    const sysLevel = storage.getConfig().permissions[systemKey] || 'ASK';
    if (sysLevel === 'DENY') {
      storage.logAudit(
        'TOOL_SYSTEM_PERMISSION_DENIED',
        `Tool "${tool.displayName}" requires system permission "${systemKey}" which is set to DENY.`,
        'warn'
      );
      return {
        granted: false,
        requiresPrompt: false,
        level: 'DENY',
        reason: `Action requires system permission '${systemKey}' which is set to DENY in Control Panel.`,
        toolDisplayName: tool.displayName,
        risk: tool.risk,
        requiredPermission: tool.requiredPermission,
      };
    }
    // If either system or tool asks, effective is ASK
    if (sysLevel === 'ASK' || toolSetting.permission === 'ASK') {
      effectiveLevel = 'ASK';
    }
  }

  // 5. Check if user already authorized this in current session
  const isSessionAuthorized =
    sessionAuthorizations.includes(lowerName) ||
    (systemKey && sessionAuthorizations.includes(systemKey)) ||
    sessionAuthorizations.includes(tool.requiredPermission);

  if (isSessionAuthorized) {
    return {
      granted: true,
      requiresPrompt: false,
      level: effectiveLevel,
      toolDisplayName: tool.displayName,
      risk: tool.risk,
      requiredPermission: tool.requiredPermission,
    };
  }

  // 6. If effective level is ASK, require prompt
  if (effectiveLevel === 'ASK') {
    return {
      granted: false,
      requiresPrompt: true,
      level: 'ASK',
      reason: `Super AI is requesting authorization clearance to execute "${tool.displayName}".`,
      toolDisplayName: tool.displayName,
      risk: tool.risk,
      requiredPermission: tool.requiredPermission,
    };
  }

  // 7. ALLOW
  return {
    granted: true,
    requiresPrompt: false,
    level: 'ALLOW',
    toolDisplayName: tool.displayName,
    risk: tool.risk,
    requiredPermission: tool.requiredPermission,
  };
}

/**
 * Checks system permission level for a given action.
 * Evaluates against persisted permission policies.
 */
export function checkPermission(
  action: keyof SystemPermissions,
  contextDesc?: string
): PermissionCheckResult {
  const config = storage.getConfig();
  const level = config.permissions[action] || 'ASK';

  if (level === 'DENY') {
    storage.logAudit(
      'PERMISSION_DENIED',
      `Action "${action}" was blocked by policy (DENY). ${contextDesc || ''}`,
      'warn'
    );
    return {
      granted: false,
      requiresPrompt: false,
      level: 'DENY',
      reason: `Action '${action}' is restricted by system security policy (DENY).`,
    };
  }

  if (level === 'ASK') {
    return {
      granted: false,
      requiresPrompt: true,
      level: 'ASK',
      reason: `Action '${action}' requires user approval before execution.`,
    };
  }

  // ALLOW
  return {
    granted: true,
    requiresPrompt: false,
    level: 'ALLOW',
  };
}
