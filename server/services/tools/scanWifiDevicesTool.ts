import { ToolDefinition, ToolExecutionResult, ToolExecutionContext } from './types.js';
import { scanWifiDevices } from './wifiScanner.js';

export const scanWifiDevicesTool: ToolDefinition = {
  name: 'scan_wifi_devices',
  displayName: 'Scan Wi-Fi Devices',
  description: 'Scans the local Wi-Fi network and returns a list of active connected devices (IP and MAC addresses). Use this when the user asks who is on the network or connected to Wi-Fi.',
  parameters: {
    type: 'object',
    properties: {},
    required: []
  },
  requiredPermission: 'NONE',
  risk: 'LOW',
  category: 'system',
  execute: async (args: Record<string, any>, context?: ToolExecutionContext): Promise<ToolExecutionResult> => {
    try {
      const devices = await scanWifiDevices();
      return {
        success: true,
        result: devices,
        displaySummary: `Found ${devices.length} active dynamic devices on the local Wi-Fi router.`,
        sanitizedResultSummary: `Scanned Wi-Fi and found ${devices.length} devices.`
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to scan Wi-Fi devices'
      };
    }
  }
};
