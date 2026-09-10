import { PermissionLevel } from '../../storage.js';
import { ToolRiskLevel } from '../tools/types.js';

export type BrowserActionType =
  | 'open_page'
  | 'read_page'
  | 'find_text'
  | 'find_links'
  | 'click_link'
  | 'go_back'
  | 'go_forward'
  | 'refresh_page';

export type BlockedBrowserActionType =
  | 'blocked_arbitrary_js'
  | 'blocked_login_automation'
  | 'blocked_password_entry'
  | 'blocked_payment_checkout'
  | 'blocked_download_executable'
  | 'blocked_profile_access'
  | 'blocked_scheme'
  | 'blocked_captcha_bypass';

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

export interface BrowserLinkItem {
  text: string;
  href: string;
  title?: string;
}

export interface BrowserSessionState {
  conversationId: string;
  currentUrl: string | null;
  pageTitle: string;
  pageText: string;
  links: BrowserLinkItem[];
  history: string[];
  historyIndex: number;
  lastAction: string | null;
  actionResult: string | null;
  lastUpdated: number;
}

export interface PlannedBrowserAction {
  action: BrowserActionType | 'blocked_browser_action';
  blockedReason?: string;
  parameters: Record<string, any>;
  risk: ToolRiskLevel;
  displayName: string;
  actionDescription: string;
  requiredPermission: keyof BrowserControlSettings['permissions'];
  toolName: string;
}

export interface BrowserActionResult {
  success: boolean;
  action: string;
  url?: string;
  title?: string;
  content?: string;
  links?: BrowserLinkItem[];
  matchedText?: string[];
  details?: string;
  error?: string;
  latencyMs: number;
}
