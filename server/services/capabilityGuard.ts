/**
 * Super AI Capability Guard
 * Enforces honesty and strict boundary recognition for tasks that Super AI
 * cannot perform (physical hardware, destructive OS commands, hacking,
 * financial transactions, physical world interactions, and unsupported apps).
 */

import { storage } from '../storage.js';

export interface CapabilityCheckResult {
  isUnsupported: boolean;
  category:
    | 'HARDWARE'
    | 'DESTRUCTIVE_OS'
    | 'HACKING'
    | 'PHYSICAL_WORLD'
    | 'FINANCIAL'
    | 'COMMUNICATION'
    | 'UNSUPPORTED_APP'
    | 'UNKNOWN_ACTION';
  explanation: string;
  suggestedAlternative?: string;
}

export function evaluateCapability(rawMessage: string): CapabilityCheckResult | null {
  if (!rawMessage || typeof rawMessage !== 'string') return null;
  const lower = rawMessage.toLowerCase().trim();

  // 1. Hardware / Device Physical Controls
  // Camera / Webcam
  if (
    /\b(camera|webcam)\s+(open|kholo|chalu|on|start|record|capture|chalao)\b/i.test(lower) ||
    /\b(open|launch|start|kholo|chalu\s+karo|on\s+karo)\s+(?:the\s+|my\s+)?(camera|webcam)\b/i.test(lower) ||
    /\b(take|kheencho|capture)\s+(?:a\s+)?photo\s+(?:with|from)\s+(?:webcam|camera)\b/i.test(lower)
  ) {
    return {
      isUnsupported: true,
      category: 'HARDWARE',
      explanation: 'Main physical webcam ya camera hardware direct operate nahi kar sakta bhai. Browser environment me direct camera trigger allowed nahi hai.',
      suggestedAlternative: 'Agar desktop screen dekhna hai toh main screenshot capture kar sakta hoon.',
    };
  }

  // Bluetooth / Audio Hardware Pairing
  if (
    /\b(bluetooth|earbuds?|airpods?|headphone|earphone)\s+(on|chalu|connect|pair|kholo|band)\b/i.test(lower) ||
    /\b(on|chalu|connect|pair|kholo|turn\s+on)\s+(?:the\s+)?(bluetooth)\b/i.test(lower)
  ) {
    return {
      isUnsupported: true,
      category: 'HARDWARE',
      explanation: 'Bluetooth ya device hardware pairing mere access me nahi hai. System settings me jaake Bluetooth manage karein.',
    };
  }

  // Phone calls / SMS / SIM actions
  if (
    /\b(call|phone)\s+(lagao|karo|milao|bhejo|dial)\b/i.test(lower) ||
    /\b(make|place)\s+(a\s+)?(phone\s+)?call\b/i.test(lower) ||
    /\bsend\s+(an?\s+)?sms\b/i.test(lower)
  ) {
    return {
      isUnsupported: true,
      category: 'HARDWARE',
      explanation: 'Main direct phone calls ya SMS dispatch nahi kar sakti. Messaging ke liye WhatsApp Web (`open whatsapp`) ya Telegram Web (`open telegram`) open kar sakti hoon.',
      suggestedAlternative: 'Try: "open whatsapp" ya "open telegram"',
    };
  }

  // Direct Outgoing Email Dispatch (Dynamic based on SMTP configuration)
  if (
    (/\b([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})\b/i.test(lower) &&
      /\b(mail\s+karo|email\s+karo|send\s+mail|send\s+email|bhejo|mail|email)\b/i.test(lower)) ||
    /\b(mail\s+karo|send\s+email\s+to|send\s+mail\s+to|email\s+bhej\s*do)\b/i.test(lower)
  ) {
    const emailConfig = storage.getEmailConfig();
    if (emailConfig && emailConfig.enabled) {
      // SMTP service is enabled! Let emailPlanner or sendEmailTool execute it.
      return null;
    }
    const emailMatch = lower.match(/\b([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})\b/);
    const targetEmail = emailMatch ? emailMatch[1] : '';
    return {
      isUnsupported: true,
      category: 'COMMUNICATION',
      explanation: `Outgoing email bhejne ke liye SMTP service currently disabled ya unconfigured hai. **Control Panel -> SMTP Email** me jakar Gmail, Outlook ya custom SMTP credentials enable karein. Tab tak main ${targetEmail ? `"${targetEmail}" ke liye ` : ''}aapko email draft bana kar de sakti hoon.`,
      suggestedAlternative: 'Try: "Control Panel me SMTP Email setup karein" ya "email draft likho"',
    };
  }

  // Flashlight / Torch
  if (
    /\b(flashlight|torch)\s+(on|chalu|jalao|off|band)\b/i.test(lower) ||
    /\b(turn|switch)\s+(?:on|off)\s+(?:the\s+)?(flashlight|torch)\b/i.test(lower)
  ) {
    return {
      isUnsupported: true,
      category: 'HARDWARE',
      explanation: 'Flashlight ya device hardware control mere control layer me available nahi hai.',
    };
  }

  // 2. Destructive OS Operations
  if (
    /\b(shutdown|shut\s+down|power\s+off|restart|reboot|turn\s+off\s+pc|pc\s+band|computer\s+band)\b/i.test(lower) ||
    /\b(system\s+reboot|format\s+[a-z]:|delete\s+system32|wipe\s+disk)\b/i.test(lower)
  ) {
    return {
      isUnsupported: true,
      category: 'DESTRUCTIVE_OS',
      explanation: 'Safety policy ki wajah se PC shutdown, restart ya system files format karna strictly prohibited hai.',
    };
  }

  // 3. Black-Hat Hacking & Account Compromise
  if (
    /\b(hack|crack|bypass|steal|sniff)\s+(?:the\s+|someone'?s\s+|my\s+)?(wifi|wi-fi|password|account|instagram|insta|facebook|fb|whatsapp|email|database|cctv)\b/i.test(lower) ||
    /\b(wifi|password|instagram|whatsapp)\s+(hack|crack)\s*(karo|karna|kardo)?\b/i.test(lower)
  ) {
    return {
      isUnsupported: true,
      category: 'HACKING',
      explanation: 'Kisi ka account, Wi-Fi ya password hack karna security aur ethical policies ke mutabiq strictly blocked hai.',
    };
  }

  // 4. Physical World Actions (Food, Drinks, Cleaning, Home Appliances)
  if (
    /\b(chai|coffee|paani|water|khana|food|pizza|burger|roti)\s+(banao|lao|le\s+aao|order\s+karo|deliver|bhejo)\b/i.test(lower) ||
    /\b(make|cook|bring|fetch)\s+(me\s+)?(coffee|tea|water|food)\b/i.test(lower)
  ) {
    return {
      isUnsupported: true,
      category: 'PHYSICAL_WORLD',
      explanation: 'Main ek software AI hoon bhai, physical saman lana ya khana banana mere bas me nahi hai. Main digital queries, coding aur web browsing handle kar sakta hoon.',
    };
  }

  if (
    /\b(fan|ac|air\s+conditioner|cooler|bulb|tubelight|door|gate|light|lights)\s+(chalu|chalao|on|band|off|lock|unlock)\s*(karo|kardo)?\b/i.test(lower)
  ) {
    return {
      isUnsupported: true,
      category: 'PHYSICAL_WORLD',
      explanation: 'Ghar ke physical appliances ya lights direct operate karne ka IoT connection configured nahi hai.',
    };
  }

  // 5. Financial & Banking Transactions
  if (
    /\b(paise|money|rupees|amount|funds)\s+(transfer|bhejo|send|pay)\s*(karo|kardo)?\b/i.test(lower) ||
    /\b(upi|gpay|paytm|phonepe)\s+(karo|se\s+bhejo|transfer)\b/i.test(lower) ||
    /\b(transfer|send)\s+(money|funds|crypto|bitcoin)\b/i.test(lower) ||
    /\b(flight|train|bus|movie\s+ticket)\s+book\s+karo\b/i.test(lower) ||
    /\b(buy|purchase)\s+(stocks?|crypto|shares?)\b/i.test(lower)
  ) {
    return {
      isUnsupported: true,
      category: 'FINANCIAL',
      explanation: 'Direct financial transactions, UPI payments ya ticket booking security safeguards ki wajah se restricted hain.',
    };
  }

  // 6. Common Non-Allowlisted Desktop Applications
  const unsupportedApps: Record<string, string> = {
    vlc: 'VLC Media Player',
    photoshop: 'Adobe Photoshop',
    premiere: 'Adobe Premiere Pro',
    illustrator: 'Adobe Illustrator',
    blender: 'Blender 3D',
    steam: 'Steam Client',
    epic: 'Epic Games Launcher',
    torrent: 'BitTorrent / uTorrent',
    utorrent: 'uTorrent',
    virtualbox: 'VirtualBox',
    vmware: 'VMware',
    word: 'Microsoft Word',
    excel: 'Microsoft Excel',
    powerpoint: 'Microsoft PowerPoint',
  };

  for (const [appKey, appDisplayName] of Object.entries(unsupportedApps)) {
    const appPattern = new RegExp(`^(?:open|launch|kholo|chalao)\\s+(?:the\\s+)?${appKey}\\b|\\b${appKey}\\s+(?:kholo|open|chalao)\\b`, 'i');
    if (appPattern.test(lower)) {
      return {
        isUnsupported: true,
        category: 'UNSUPPORTED_APP',
        explanation: `${appDisplayName} local security allowlist me permitted nahi hai. Main permitted apps (Chrome, Edge, Notepad, Calculator, File Explorer) aur web services open kar sakta hoon.`,
        suggestedAlternative: 'Web version try karein ya Control Panel me app allowlist inspect karein.',
      };
    }
  }

  return null;
}
