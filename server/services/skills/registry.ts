import { SkillConfig, SkillId, INITIAL_SKILLS } from './types.js';
import { storage } from '../../storage.js';

class SkillsRegistry {
  /**
   * Retrieves all registered skills with their latest enabled status from persistent storage.
   */
  public getAllSkills(): SkillConfig[] {
    const stored = storage.getSkills();
    return Object.values(stored);
  }

  /**
   * Retrieves a specific skill by its ID.
   */
  public getSkill(id: SkillId): SkillConfig | undefined {
    const stored = storage.getSkills();
    return stored[id];
  }

  /**
   * Checks if a skill is currently enabled.
   */
  public isSkillEnabled(id: SkillId): boolean {
    const skill = this.getSkill(id);
    return skill ? skill.enabled : false;
  }

  /**
   * Updates a single skill's configuration and persists to storage.
   */
  public updateSkill(id: SkillId, updates: Partial<SkillConfig>): SkillConfig {
    return storage.updateSkill(id, updates);
  }

  /**
   * Batch updates all skills.
   */
  public updateAllSkills(skills: Record<SkillId, SkillConfig>): Record<SkillId, SkillConfig> {
    return storage.updateAllSkills(skills);
  }

  /**
   * Returns list of tools available across all currently enabled skills.
   */
  public getAvailableTools(): string[] {
    const skills = this.getAllSkills().filter((s) => s.enabled);
    const tools = new Set<string>();
    for (const s of skills) {
      for (const t of s.availableTools) {
        tools.add(t);
      }
    }
    return Array.from(tools);
  }
}

export const skillsRegistry = new SkillsRegistry();
