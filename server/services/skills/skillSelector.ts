import { SkillId } from './types.js';
import { TaskCategory } from '../classifier.js';

export interface SkillSelectionContext {
  hasImages?: boolean;
  isBrowserAction?: boolean;
  isComputerAction?: boolean;
  taskType?: TaskCategory;
  toolRequired?: string;
}

export interface SkillSelectionResult {
  skillId: SkillId;
  confidence: number;
  reason: string;
}

/**
 * Deterministically maps user intent and planned action to the appropriate Super AI Skill.
 */
export function selectSkill(
  message: string,
  context?: SkillSelectionContext
): SkillSelectionResult {
  const raw = (message || '').trim();
  const lower = raw.toLowerCase();

  // 1. VISION SKILL
  if (context?.hasImages) {
    return {
      skillId: 'VISION',
      confidence: 1.0,
      reason: 'Multimodal input detected: request includes attached image or visual asset.',
    };
  }

  const visionPhrases = [
    /analyze this image/i,
    /describe (what you see|this (image|photo|picture|screenshot))/i,
    /look at this (image|photo|picture|screenshot)/i,
    /what is in this (image|photo|picture|screenshot)/i,
    /inspect this (image|photo|picture|screenshot)/i,
    /ye image explain karo/i,
    /yeh photo dekho/i,
    /is photo me kya hai/i,
    /is image ko explain karo/i,
    /ocr/i,
  ];
  for (const regex of visionPhrases) {
    if (regex.test(lower)) {
      return {
        skillId: 'VISION',
        confidence: 0.95,
        reason: 'Visual inspection or image description requested.',
      };
    }
  }

  // 2. BROWSER SKILL
  if (context?.isBrowserAction || (context?.toolRequired && context.toolRequired.startsWith('browser_'))) {
    return {
      skillId: 'BROWSER',
      confidence: 1.0,
      reason: 'Browser automation action detected.',
    };
  }

  const browserPhrases = [
    /^(open|visit|go to)\s+(https?:\/\/|[a-z0-9-]+\.[a-z]{2,})/i,
    /(website|webpage|page|url)\s+(kholo|open karo|navigate karo)/i,
    /google\s+(kholo|open karo|search karo)/i,
    /search (the )?web (for )?/i,
    /search online for /i,
    /open .* in browser/i,
    /open (chrome|edge|browser)/i,
    /browser\s+(kholo|open)/i,
    /internet par search karo/i,
  ];
  for (const regex of browserPhrases) {
    if (regex.test(lower)) {
      return {
        skillId: 'BROWSER',
        confidence: 0.95,
        reason: 'Web browsing or internet navigation intent identified.',
      };
    }
  }

  // 3. WINDOWS COMPUTER CONTROL SKILL
  if (context?.isComputerAction || (context?.toolRequired && ['open_application', 'open_folder', 'open_file', 'screenshot', 'get_active_window'].includes(context.toolRequired))) {
    return {
      skillId: 'WINDOWS',
      confidence: 1.0,
      reason: 'Windows desktop computer control action detected.',
    };
  }

  const windowsPhrases = [
    /^(open|launch|kholo)\s+(notepad|calculator|calc|paint|explorer|settings|files?)/i,
    /(notepad|calculator|calc|paint|explorer)\s+(kholo|open karo|launch karo)/i,
    /(take|capture)\s+(a\s+)?screenshot/i,
    /screenshot\s+(lo|kheecho|capture karo)/i,
    /open (my |the )?(downloads|documents|desktop|pictures|music|folder|file)/i,
    /(folder|directory)\s+kholo/i,
  ];
  for (const regex of windowsPhrases) {
    if (regex.test(lower)) {
      return {
        skillId: 'WINDOWS',
        confidence: 0.95,
        reason: 'Windows desktop control or application launch requested.',
      };
    }
  }

  // 4. MEMORY SKILL
  const memoryPhrases = [
    /mere project ka naam kya hai/i,
    /mera naam kya hai/i,
    /what is my project name/i,
    /what do you remember about/i,
    /mujhe yaad hai/i,
    /yaad karo/i,
    /recall from memory/i,
    /what did i (say|tell you) earlier/i,
    /previous context/i,
    /check your memory/i,
    /super ai memory/i,
    /remember that/i,
    /yaad rakhna/i,
  ];
  for (const regex of memoryPhrases) {
    if (regex.test(lower)) {
      return {
        skillId: 'MEMORY',
        confidence: 0.95,
        reason: 'Long-term neural memory recall or storage requested.',
      };
    }
  }

  // 5. CODING SKILL
  if (context?.taskType === 'CODING') {
    return {
      skillId: 'CODING',
      confidence: 0.95,
      reason: 'Task classified as Software Engineering / Coding.',
    };
  }

  const codingPhrases = [
    /python (code|function|script|program) bana/i,
    /(code|function|program|script) bana/i,
    /(code|function|script) likh/i,
    /duplicate finder bana/i,
    /write a (python|javascript|typescript|c\+\+|sql|rust|go|react) (function|script|program|class)/i,
    /create a (function|script|algorithm|regex|endpoint)/i,
    /implement (an algorithm|sorting|binary search|recursion code)/i,
    /fix this bug/i,
    /debug this code/i,
    /refactor this code/i,
  ];
  for (const regex of codingPhrases) {
    if (regex.test(lower)) {
      return {
        skillId: 'CODING',
        confidence: 0.95,
        reason: 'Code implementation, programming script, or software development requested.',
      };
    }
  }

  // 6. REASONING SKILL
  if (context?.taskType === 'REASONING') {
    return {
      skillId: 'REASONING',
      confidence: 0.95,
      reason: 'Task classified as Deep Reasoning & Proofs.',
    };
  }

  const reasoningPhrases = [
    /recursion explain karo/i,
    /explain recursion/i,
    /complexity analyze karo/i,
    /time complexity/i,
    /space complexity/i,
    /mathematical proof/i,
    /step[- ]by[- ]step logic/i,
    /prove that/i,
    /solve this (riddle|puzzle)/i,
  ];
  for (const regex of reasoningPhrases) {
    if (regex.test(lower)) {
      return {
        skillId: 'REASONING',
        confidence: 0.95,
        reason: 'Step-by-step logic, complexity, or mathematical deduction requested.',
      };
    }
  }

  // 7. GENERAL (Default)
  return {
    skillId: 'GENERAL',
    confidence: 0.9,
    reason: 'Conversational dialogue, general query, or standard utility.',
  };
}
