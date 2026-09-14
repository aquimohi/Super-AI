import { ToolDefinition, ToolExecutionResult, ToolExecutionContext } from './types.js';
import { calculatorTool } from './calculator.js';
import { currentTimeTool } from './currentTime.js';
import { currentDateTool } from './currentDate.js';
import { webSearchTool } from './webSearch.js';
import { readFileTool } from './readFile.js';
import { executeCodeTool } from './executeCode.js';
import {
  openApplicationTool,
  openUrlTool,
  openFolderTool,
  openFileTool,
  getActiveWindowTool,
  screenshotTool,
} from './computerControlTools.js';
import {
  browserOpenPageTool,
  browserReadPageTool,
  browserFindTextTool,
  browserFindLinksTool,
  browserClickLinkTool,
  browserGoBackTool,
  browserGoForwardTool,
  browserRefreshPageTool,
} from '../browser/browserTools.js';
import { smartGateTool } from './smartGateTool.js';
import { repoModifierTool } from './repoModifierTool.js';

class ToolRegistry {
  private tools: Map<string, ToolDefinition> = new Map();

  // Explicitly blocked tool identifiers
  private blockedTools: Set<string> = new Set([
    'terminal',
    'execute_terminal',
    'run_command',
    'bash',
    'sh',
    'shell',
    'exec',
    'powershell',
    'powershell.exe',
    'cmd',
    'cmd.exe',
    'python',
    'python3',
    'script',
    'batch',
    'regedit',
    'wscript',
    'cscript',
    'write_file',
    'delete_file',
    'modify_file',
    'spawn',
    'eval',
    // Browser High-Risk / Prohibited tools
    'browser_arbitrary_js',
    'browser_profile_access',
    'browser_credential_access',
    'browser_login_automation',
    'browser_password_entry',
    'browser_payment_checkout',
    'browser_download_executable',
    'browser_prohibited_scheme',
    'browser_captcha_bypass',
  ]);

  constructor() {
    this.register(calculatorTool);
    this.register(currentTimeTool);
    this.register(currentDateTool);
    this.register(webSearchTool);
    this.register(readFileTool);
    // Autonomous Code Execution Sandbox
    this.register(executeCodeTool);
    this.register(openApplicationTool);
    this.register(openUrlTool);
    this.register(openFolderTool);
    this.register(openFileTool);
    this.register(getActiveWindowTool);
    this.register(screenshotTool);
    // Browser Automation V1 tools
    this.register(browserOpenPageTool);
    this.register(browserReadPageTool);
    this.register(browserFindTextTool);
    this.register(browserFindLinksTool);
    this.register(browserClickLinkTool);
    this.register(browserGoBackTool);
    this.register(browserGoForwardTool);
    this.register(browserRefreshPageTool);
    // IoT Hardware Integration
    this.register(smartGateTool);
    // Code Evolution
    this.register(repoModifierTool);
  }

  public register(tool: ToolDefinition): void {
    this.tools.set(tool.name.toLowerCase(), tool);
  }

  public getTool(name: string): ToolDefinition | undefined {
    return this.tools.get(name.toLowerCase());
  }

  public isBlocked(name: string): boolean {
    return this.blockedTools.has(name.toLowerCase());
  }

  public getAllTools(): ToolDefinition[] {
    return Array.from(this.tools.values());
  }

  /**
   * Format OpenRouter / OpenAI compatible tools array
   */
  public getToolDefinitionsForModel(): Array<{
    type: 'function';
    function: {
      name: string;
      description: string;
      parameters: any;
    };
  }> {
    return this.getAllTools().map((t) => ({
      type: 'function',
      function: {
        name: t.name,
        description: t.description,
        parameters: t.parameters,
      },
    }));
  }

  /**
   * Format concise documentation of available tools for system instructions
   */
  public getSystemToolInstructions(): string {
    return (
      `SUPER AI TOOLS & EXECUTION CAPABILITIES:\n` +
      `You have access to the following server-side validated tools:\n\n` +
      `1. calculator: Perform mathematical calculations and evaluate expressions.\n` +
      `   Parameters: { "expression": string } (e.g. "125 * 48", "sqrt(144) + 10")\n` +
      `   RULE: You MUST use calculator for any calculation, math question, or arithmetic instead of doing mental math.\n\n` +
      `2. current_time: Get the current local system time and UTC time.\n` +
      `   Parameters: { "timezone"?: string } (e.g. "Asia/Kolkata", "UTC")\n` +
      `   RULE: You MUST use current_time whenever the user asks for the current time.\n\n` +
      `3. current_date: Get today's current date, day of week, and year.\n` +
      `   Parameters: { "timezone"?: string }\n` +
      `   RULE: You MUST use current_date whenever the user asks what today's date is.\n\n` +
      `4. web_search: Search the live web for facts, news, documentation, or real-time info.\n` +
      `   Parameters: { "query": string }\n` +
      `   RULE: You MUST use web_search whenever the user asks to search the web or find live information.\n\n` +
      `5. read_file: Read an approved workspace file (e.g. "package.json", "metadata.json", "src/types.ts").\n` +
      `   Parameters: { "path": string }\n` +
      `   RULE: You MUST use read_file whenever the user asks to read, inspect, or check a workspace file.\n\n` +
      `6. open_application: Open an allowlisted desktop application safely.\n` +
      `   Allowlisted applications: chrome, edge, notepad, calculator, explorer.\n` +
      `   Parameters: { "application": "chrome" | "notepad" | "calculator" | "explorer" | "edge" }\n` +
      `   Example user prompts: "Chrome kholo", "Notepad kholo", "Open calculator"\n` +
      `   SECURITY RULE: Never provide arbitrary executable paths (e.g. C:\\unknown\\malware.exe).\n\n` +
      `7. open_url: Open a web URL in the system default browser (HTTP/HTTPS only).\n` +
      `   Parameters: { "url": string }\n` +
      `   Example user prompts: "Google kholo" -> { "url": "https://www.google.com" }, "Open youtube.com"\n\n` +
      `8. open_folder: Open a permitted safe folder in the file manager.\n` +
      `   Permitted folders: Downloads, Documents, Desktop, Workspace, Pictures.\n` +
      `   Parameters: { "folder": "Downloads" | "Documents" | "Desktop" | "Workspace" | "Pictures" }\n` +
      `   Example user prompts: "Downloads folder kholo", "Open documents"\n\n` +
      `9. open_file: Open a permitted workspace file using system default handler.\n` +
      `   Parameters: { "path": string }\n` +
      `   Example user prompts: "Ye file open karo", "Open package.json"\n\n` +
      `10. get_active_window: Inspect current active foreground application or window title.\n` +
      `    Parameters: {}\n\n` +
      `11. screenshot: Capture a screenshot of the current window or desktop ONLY when explicitly requested.\n` +
      `    Parameters: { "reason": string }\n` +
      `    Example user prompts: "Current window ka screenshot lo", "Take a screenshot"\n\n` +
      `12. execute_code: Write and execute Python or JavaScript code in a secure sandbox.\n` +
      `   Parameters: { "code": string, "language": "python" | "javascript" }\n` +
      `   RULE: You MUST use execute_code whenever the user asks you to write AND run/test a script or program.\n` +
      `   RULE: Always write complete, self-contained code (no shell commands, no subprocess calls).\n` +
      `   RULE: The sandbox enforces a strict 5-second timeout — avoid infinite loops.\n` +
      `   Example: User asks "Write a Python script to calculate primes" → generate code, then call execute_code to run it and show results.\n\n` +
      `13. trigger_smart_gate: Control the physical smart gate/door lock via ESP32 relay hardware.\n` +
      `   Parameters: { "command": "UNLOCK" | "LOCK" | "PULSE_UNLOCK", "reason"?: string }\n` +
      `   RULE: Use PULSE_UNLOCK for safe timed entry (auto-relocks after 5s). Always confirm before triggering.\n` +
      `   Example: User says "Gate kholo" → { command: "PULSE_UNLOCK", reason: "User requested entry" }\n\n` +
      `14. modify_backend_code: Modify backend source files, validate with TypeScript, and push to Git.\n` +
      `   Parameters: { "files": [{ "path": string, "content": string }], "commitMessage": string }\n` +
      `   RULE: Use this to autonomously evolve the codebase based on instructions. Modifying core configs (.env, package.json) is blocked.\n` +
      `   Example: User says "Add timestamps to chat controller" → Generate new code, then call modify_backend_code to save and push.\n\n` +
      `HOW TO CALL TOOLS:\n` +
      `- If your interface supports native function calling, invoke the function directly.\n` +
      `- Otherwise, output a single JSON block:\n` +
      `\`\`\`tool_call\n` +
      `{\n` +
      `  "tool": "<tool_name>",\n` +
      `  "arguments": { ... }\n` +
      `}\n` +
      `\`\`\`\n` +
      `When requesting a tool, do not add introductory small talk. Once the tool executes, the server will return the structured tool result to you (e.g. { "success": true, "action": "open_application", "target": "chrome" }), and then you generate the final natural conversational answer for the user (e.g. "Chrome khol diya.") without exposing raw JSON.\n` +
      `CRITICAL SECURITY POLICY: Terminal execution, bash commands, PowerShell, CMD scripts, registry modifications, and credential access are strictly prohibited and permanently blocked. Use execute_code (sandboxed) for any code execution needs.`
    );
  }

  /**
   * Executes a tool by name with safety checks
   */
  public async execute(
    name: string,
    args: Record<string, any>,
    context?: ToolExecutionContext
  ): Promise<ToolExecutionResult> {
    const lowerName = name.toLowerCase();

    // Check blocked tools explicitly
    if (this.isBlocked(lowerName)) {
      return {
        success: false,
        error: `Tool "${name}" is NOT AVAILABLE / BLOCKED by security policy. Terminal and execution tools are prohibited in this environment.`,
        displaySummary: `Tool "${name}" is BLOCKED by security policy.`,
        sanitizedExecutionSummary: `command: ${name}`,
        sanitizedResultSummary: 'NOT AVAILABLE / BLOCKED BY POLICY',
      };
    }

    const tool = this.getTool(lowerName);
    if (!tool) {
      return {
        success: false,
        error: `Unknown tool "${name}". Available tools: ${Array.from(this.tools.keys()).join(', ')}`,
        displaySummary: `Tool "${name}" not found.`,
        sanitizedExecutionSummary: `tool: ${name}`,
        sanitizedResultSummary: 'TOOL NOT FOUND',
      };
    }

    try {
      return await tool.execute(args, context);
    } catch (err: any) {
      return {
        success: false,
        error: `Unexpected failure in tool "${name}": ${err.message}`,
        displaySummary: `Error executing ${name}: ${err.message}`,
        sanitizedExecutionSummary: `tool: ${name}`,
        sanitizedResultSummary: `EXECUTION ERROR: ${err.message}`,
      };
    }
  }
}

export const toolRegistry = new ToolRegistry();
