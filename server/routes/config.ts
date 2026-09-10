import { Router } from 'express';
import { storage } from '../storage.js';
import { checkPermission, checkToolPermission } from '../services/permissions.js';
import { toolRegistry } from '../services/tools/registry.js';

export const configRouter = Router();

// GET full configuration
configRouter.get('/', (req, res) => {
  try {
    const config = storage.getConfig();
    res.json({ success: true, config });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET tools configuration with registry metadata
configRouter.get('/tools', (req, res) => {
  try {
    const toolsConfig = storage.getToolsConfig();
    const registeredTools = toolRegistry.getAllTools().map((t) => {
      const config = toolsConfig[t.name] || { enabled: true, permission: t.requiredPermission === 'NONE' ? 'ALLOW' : 'ASK' };
      return {
        id: t.name,
        name: t.displayName,
        identifier: t.name,
        description: t.description,
        risk: t.risk,
        requiredPermission: t.requiredPermission,
        category: t.category,
        enabled: config.enabled ?? true,
        permission: config.permission ?? (t.requiredPermission === 'NONE' ? 'ALLOW' : 'ASK'),
      };
    });

    res.json({
      success: true,
      tools: registeredTools,
      rawConfig: toolsConfig,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT update single tool configuration
configRouter.put('/tools/:toolName', (req, res) => {
  try {
    const { toolName } = req.params;
    const { enabled, permission } = req.body;
    const updated = storage.updateToolConfig(toolName, { enabled, permission });
    res.json({ success: true, tool: toolName, tools: updated });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET computer control settings and allowlists
configRouter.get('/computer-control', (req, res) => {
  try {
    const config = storage.getComputerControlConfig();
    res.json({ success: true, computerControl: config });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT update computer control settings
configRouter.put('/computer-control', (req, res) => {
  try {
    const updated = storage.updateComputerControlConfig(req.body);
    res.json({ success: true, computerControl: updated });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT update computer control permission
configRouter.put('/computer-control/permissions/:permKey', (req, res) => {
  try {
    const { permKey } = req.params;
    const { level } = req.body;
    const updated = storage.updateComputerControlPermission(permKey as any, level);
    res.json({ success: true, computerControl: updated });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET browser control settings
configRouter.get('/browser-control', (_req, res) => {
  try {
    const browserControl = storage.getBrowserControlConfig();
    res.json({ success: true, browserControl });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT update browser control settings
configRouter.put('/browser-control', (req, res) => {
  try {
    const updated = storage.updateBrowserControlConfig(req.body);
    res.json({ success: true, browserControl: updated });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT update browser control permission
configRouter.put('/browser-control/permissions/:permKey', (req, res) => {
  try {
    const { permKey } = req.params;
    const { level } = req.body;
    const updated = storage.updateBrowserControlPermission(permKey as any, level);
    res.json({ success: true, browserControl: updated });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET cognitive engine settings
configRouter.get('/cognitive-engine', (_req, res) => {
  try {
    const cognitiveEngine = storage.getCognitiveEngineConfig();
    res.json({ success: true, cognitiveEngine });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT update cognitive engine settings
configRouter.put('/cognitive-engine', (req, res) => {
  try {
    const updated = storage.updateCognitiveEngineConfig(req.body);
    res.json({ success: true, cognitiveEngine: updated });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET all skills
configRouter.get('/skills', (_req, res) => {
  try {
    const skills = storage.getSkills();
    res.json({ success: true, skills });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT update single skill
configRouter.put('/skills/:skillId', (req, res) => {
  try {
    const { skillId } = req.params;
    const updated = storage.updateSkill(skillId as any, req.body);
    res.json({ success: true, skill: updated, skills: storage.getSkills() });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT batch update skills
configRouter.put('/skills', (req, res) => {
  try {
    const updated = storage.updateAllSkills(req.body);
    res.json({ success: true, skills: updated });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT update section configuration (models, routing, permissions, tools, computerControl, browserControl, voice, memory, security, cognitiveEngine, skills)
configRouter.put('/:section', (req, res) => {
  try {
    const { section } = req.params;
    const validSections = [
      'models',
      'routing',
      'permissions',
      'tools',
      'computerControl',
      'browserControl',
      'voice',
      'memory',
      'security',
      'cognitiveEngine',
      'skills',
    ];

    if (!validSections.includes(section)) {
      return res.status(400).json({ success: false, error: `Invalid configuration section: ${section}` });
    }

    if (section === 'skills') {
      const updated = storage.updateAllSkills(req.body);
      return res.json({ success: true, section, data: updated });
    }

    if (section === 'tools') {
      const updated = storage.updateAllToolsConfig(req.body);
      return res.json({ success: true, section, data: updated });
    }

    if (section === 'computerControl') {
      const updated = storage.updateComputerControlConfig(req.body);
      return res.json({ success: true, section, data: updated });
    }

    if (section === 'browserControl') {
      const updated = storage.updateBrowserControlConfig(req.body);
      return res.json({ success: true, section, data: updated });
    }

    if (section === 'cognitiveEngine') {
      const updated = storage.updateCognitiveEngineConfig(req.body);
      return res.json({ success: true, section, data: updated });
    }

    if (section === 'autonomousTask') {
      const updated = storage.updateAutonomousTaskConfig(req.body);
      return res.json({ success: true, section, data: updated });
    }

    const updated = storage.updateSectionConfig(section as any, req.body);
    res.json({ success: true, section, data: updated });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET autonomous task engine config
configRouter.get('/autonomous-task', (req, res) => {
  try {
    const config = storage.getAutonomousTaskConfig();
    res.json({ success: true, autonomousTask: config });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT update autonomous task engine config
configRouter.put('/autonomous-task', (req, res) => {
  try {
    const updated = storage.updateAutonomousTaskConfig(req.body);
    res.json({ success: true, autonomousTask: updated });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET permission check helper endpoint
configRouter.get('/permissions/check/:action', (req, res) => {
  try {
    const { action } = req.params;
    const result = checkPermission(action as any, req.query.desc as string);
    res.json({ success: true, action, result });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET tool permission check endpoint
configRouter.get('/tools/check/:toolName', (req, res) => {
  try {
    const { toolName } = req.params;
    const sessionAuth = typeof req.query.session === 'string' ? req.query.session.split(',') : [];
    const result = checkToolPermission(toolName, sessionAuth, req.query.desc as string);
    res.json({ success: true, tool: toolName, result });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

