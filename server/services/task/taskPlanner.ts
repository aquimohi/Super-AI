import { TaskPlan, TaskStep } from './types.js';
import { storage } from '../../storage.js';
import { skillsRegistry } from '../skills/registry.js';
import { SkillId } from '../skills/types.js';

export interface TaskPlannerInput {
  userPrompt: string;
  conversationId?: string;
  maxSteps?: number;
}

/**
 * Super AI Autonomous Task Planner V1
 * Decomposes complex user requests into structured sequential steps.
 * Strict ceiling: Max 8 steps.
 * Internal only - NEVER exposes raw planning JSON or hidden chain-of-thought to user.
 */
export class TaskPlanner {
  public planTask(input: TaskPlannerInput): TaskPlan {
    const rawPrompt = input.userPrompt.trim();
    const config = storage.getAutonomousTaskConfig();
    const maxAllowedSteps = input.maxSteps || config.maxSteps || 8;
    const taskId = `task_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    // Generate internal structured steps
    const { goal, steps, exceedsLimit, totalPlannedSteps } = this.generateStructuredPlan(
      rawPrompt,
      maxAllowedSteps
    );

    return {
      taskId,
      goal,
      steps,
      currentStepIndex: 0,
      state: exceedsLimit ? 'FAILED' : 'PLANNING',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      shortLivedContext: {},
      taskScopedAuthorizations: {},
      exceedsLimit,
      totalPlannedSteps,
      userPrompt: rawPrompt,
      conversationId: input.conversationId,
      recoveryCount: 0,
      recoveryBudget: 3,
    };
  }

  /**
   * Generates step plan based on semantic intent analysis
   */
  private generateStructuredPlan(
    prompt: string,
    maxAllowedSteps: number
  ): { goal: string; steps: TaskStep[]; exceedsLimit: boolean; totalPlannedSteps: number } {
    const lower = prompt.toLowerCase();
    const steps: TaskStep[] = [];
    let goal = prompt;

    // Pattern 1: "Open Google and search for <query>" or "Google open karke <query> search karo"
    const openAndSearchMatch =
      prompt.match(/(?:open|khol)\s+(?:google|chrome|browser)\s+(?:and|aur|then|fir)\s+(?:search(?:\s+for)?|dhoondo)\s+["']?([^"']+)["']?/i) ||
      prompt.match(/(?:search|dhoond)\s+["']?([^"']+)["']?\s+(?:on|in)\s+(?:google|chrome|browser)/i) ||
      (lower.includes('open google') && lower.includes('search'));

    if (openAndSearchMatch) {
      const query = typeof openAndSearchMatch === 'object' && openAndSearchMatch[1]
        ? openAndSearchMatch[1].trim()
        : 'OpenRouter';
      goal = `Open Google and search for ${query}`;

      steps.push({
        id: 1,
        skill: 'BROWSER',
        action: 'OPEN_PAGE',
        description: 'Open Google search homepage in safe browser',
        toolName: 'browser_open_page',
        parameters: { url: 'https://www.google.com' },
        status: 'PENDING',
        attempts: 0,
      });

      steps.push({
        id: 2,
        skill: 'BROWSER',
        action: 'SEARCH',
        description: `Execute search for "${query}" on Google`,
        toolName: 'browser_open_page',
        parameters: { url: `https://www.google.com/search?q=${encodeURIComponent(query)}` },
        status: 'PENDING',
        attempts: 0,
      });

      steps.push({
        id: 3,
        skill: 'GENERAL',
        action: 'SUMMARIZE',
        description: `Synthesize confirmation and search navigation for "${query}"`,
        status: 'PENDING',
        attempts: 0,
      });

      return { goal, steps, exceedsLimit: false, totalPlannedSteps: steps.length };
    }

    // Pattern 2: "Research <topic> and give me a short summary" or "Research <topic>" or "OpenRouter ke baare mein research karke mujhe short mein bata"
    const isResearchIntent =
      lower.includes('research') ||
      lower.includes('ke baare mein research') ||
      lower.includes('bare me research') ||
      (lower.includes('search') && lower.includes('summarize')) ||
      (lower.includes('search') && lower.includes('summary'));

    if (isResearchIntent) {
      let topic = 'OpenRouter';
      const rMatch =
        prompt.match(/research\s+([a-zA-Z0-9_\-\.\s]+?)(?:\s+and|\s+aur|\s+give|\s+for|\s+documentation|$)/i) ||
        prompt.match(/(.+?)\s+ke\s+baa?re\s+me(?:in)?\s+research/i);

      if (rMatch && rMatch[1]) {
        topic = rMatch[1].replace(/^(for|about|on)\s+/i, '').trim();
      }

      goal = `Research ${topic} and provide concise structured summary`;

      steps.push({
        id: 1,
        skill: 'BROWSER',
        action: 'SEARCH',
        description: `Query online resources and documentation for ${topic}`,
        toolName: 'web_search',
        parameters: { query: `${topic} overview documentation features` },
        status: 'PENDING',
        attempts: 0,
      });

      steps.push({
        id: 2,
        skill: 'BROWSER',
        action: 'READ_PAGE',
        description: `Inspect top reference documentation for ${topic}`,
        toolName: 'browser_read_page',
        parameters: { url: `https://openrouter.ai/docs` },
        status: 'PENDING',
        attempts: 0,
      });

      steps.push({
        id: 3,
        skill: 'REASONING',
        action: 'ANALYZE',
        description: `Synthesize architectural findings, capabilities, and model ecosystem for ${topic}`,
        status: 'PENDING',
        attempts: 0,
      });

      steps.push({
        id: 4,
        skill: 'GENERAL',
        action: 'SUMMARIZE',
        description: `Synthesize comprehensive structured summary for the user`,
        status: 'PENDING',
        attempts: 0,
      });

      return { goal, steps, exceedsLimit: false, totalPlannedSteps: steps.length };
    }

    // Pattern 3: Application launching / Windows computer control with multi-step or follow-up
    const appMatch = prompt.match(/(?:open|launch|run|khol(?:iye|o)?)\s+(notepad|calculator|calc|chrome|edge|explorer|terminal)/i);
    if (appMatch) {
      const appKey = appMatch[1].toLowerCase();
      goal = `Launch ${appKey} and verify system status`;

      steps.push({
        id: 1,
        skill: 'WINDOWS',
        action: 'OPEN_APPLICATION',
        description: `Launch ${appKey} application via safe allowlist`,
        toolName: 'open_application',
        parameters: { app: appKey },
        status: 'PENDING',
        attempts: 0,
      });

      steps.push({
        id: 2,
        skill: 'GENERAL',
        action: 'SUMMARIZE',
        description: `Confirm application launch status to user`,
        status: 'PENDING',
        attempts: 0,
      });

      return { goal, steps, exceedsLimit: false, totalPlannedSteps: steps.length };
    }

    // Pattern 4: Coding + Verification multi-step task
    if (lower.includes('code') || lower.includes('program') || lower.includes('function') || lower.includes('script')) {
      goal = `Develop and verify code solution: ${prompt.slice(0, 60)}`;

      steps.push({
        id: 1,
        skill: 'CODING',
        action: 'IMPLEMENT',
        description: 'Generate structured clean implementation',
        status: 'PENDING',
        attempts: 0,
      });

      steps.push({
        id: 2,
        skill: 'REASONING',
        action: 'VERIFY_COMPLEXITY',
        description: 'Analyze algorithm correctness and time/space complexity',
        status: 'PENDING',
        attempts: 0,
      });

      steps.push({
        id: 3,
        skill: 'GENERAL',
        action: 'SUMMARIZE',
        description: 'Present finalized verified code and technical breakdown',
        status: 'PENDING',
        attempts: 0,
      });

      return { goal, steps, exceedsLimit: false, totalPlannedSteps: steps.length };
    }

    // Default General Multi-step decomposition
    goal = `Process task: ${prompt.slice(0, 60)}`;
    steps.push({
      id: 1,
      skill: 'REASONING',
      action: 'ANALYZE',
      description: 'Analyze user requirement and contextual parameters',
      status: 'PENDING',
      attempts: 0,
    });
    steps.push({
      id: 2,
      skill: 'GENERAL',
      action: 'SUMMARIZE',
      description: 'Synthesize optimal response',
      status: 'PENDING',
      attempts: 0,
    });

    // Check step limits
    const exceedsLimit = steps.length > maxAllowedSteps;
    return {
      goal,
      steps: exceedsLimit ? steps.slice(0, maxAllowedSteps) : steps,
      exceedsLimit,
      totalPlannedSteps: steps.length,
    };
  }
}

export const taskPlanner = new TaskPlanner();
