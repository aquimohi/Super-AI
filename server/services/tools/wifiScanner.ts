import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface WifiDevice {
  ip: string;
  mac: string;
  type: string;
}

export async function scanWifiDevices(): Promise<WifiDevice[]> {
  try {
    // Note: arp -a is widely supported on Windows and unix-like systems.
    const { stdout } = await execAsync('arp -a');
    
    // Parse the ARP table output
    const lines = stdout.split('\n');
    const devices: WifiDevice[] = [];
    
    // Simple regex to extract IP and MAC
    // Windows format:  192.168.1.5  ab-cd-ef-12-34-56  dynamic
    const ipMacRegex = /([0-9]+\.[0-9]+\.[0-9]+\.[0-9]+)\s+([a-f0-9:-]+)\s+(dynamic|static)/i;

    for (const line of lines) {
      const match = line.match(ipMacRegex);
      if (match) {
        const ip = match[1];
        const mac = match[2];
        const type = match[3].toLowerCase();
        
        // We only care about dynamic devices (actual connected devices on DHCP)
        // because static usually includes broadcast addresses (e.g. 255.255.255.255)
        if (type === 'dynamic') {
          devices.push({ ip, mac, type });
        }
      }
    }
    
    return devices;
  } catch (error) {
    console.error('[WifiScanner] Error scanning network:', error);
    throw new Error('Failed to scan local Wi-Fi devices. Check server permissions.');
  }
}
