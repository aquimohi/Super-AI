import { Router } from 'express';
import { autonomousTaskEngine } from '../services/task/autonomousTaskEngine.js';
import { memoryService } from '../services/memory/memoryService.js';
import { storage } from '../storage.js';

export const taskRouter = Router();

// GET /api/tasks/current - Retrieve active task info
taskRouter.get('/current', (req, res) => {
  try {
    const conversationId = req.query.conversationId as string | undefined;
    const task = autonomousTaskEngine.getCurrentTask(conversationId);
    if (!task) {
      return res.json({ success: true, task: null });
    }
    return res.json({
      success: true,
      task: {
        taskId: task.taskId,
        goal: task.goal,
        state: task.state,
        currentStepIndex: task.currentStepIndex,
        totalSteps: task.steps.length,
        steps: task.steps.map((s) => ({
          id: s.id,
          skill: s.skill,
          action: s.action,
          description: s.description,
          status: s.status,
          attempts: s.attempts,
        })),
        createdAt: task.createdAt,
        updatedAt: task.updatedAt,
      },
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/tasks/:taskId/pause - Pause an active task
taskRouter.post('/:taskId/pause', (req, res) => {
  try {
    const { taskId } = req.params;
    const success = autonomousTaskEngine.pauseTask(taskId);
    return res.json({ success, message: success ? 'Task paused' : 'Unable to pause task' });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/tasks/:taskId/resume - Resume a paused task
taskRouter.post('/:taskId/resume', async (req, res) => {
  try {
    const { taskId } = req.params;
    const result = await autonomousTaskEngine.resumeTask(taskId);
    if (!result) {
      return res.status(400).json({ success: false, error: 'Task cannot be resumed or does not exist.' });
    }
    return res.json({ success: true, result });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/tasks/:taskId/cancel - Cancel task execution
taskRouter.post('/:taskId/cancel', (req, res) => {
  try {
    const { taskId } = req.params;
    const success = autonomousTaskEngine.cancelTask(taskId);
    return res.json({ success, message: success ? 'Task cancelled' : 'Unable to cancel task' });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/tasks/:taskId/authorize - Submit step authorization decision
taskRouter.post('/:taskId/authorize', async (req, res) => {
  try {
    const { taskId } = req.params;
    const { decision, stepId, sessionAuthorizations } = req.body;

    if (!decision || !['AUTHORIZE_ONCE', 'ALLOW_FOR_TASK', 'DENY'].includes(decision)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid decision. Must be AUTHORIZE_ONCE, ALLOW_FOR_TASK, or DENY.',
      });
    }

    const result = await autonomousTaskEngine.runTask({
      taskId,
      stepId,
      authorizationDecision: decision,
      taskScopedAuthorization: decision === 'ALLOW_FOR_TASK',
      sessionAuthorizations,
    });

    // If completed and message produced, record into conversation
    if (result.success && !result.requiresAuthorization && result.text) {
      const currentTask = autonomousTaskEngine.getCurrentTask();
      if (currentTask?.conversationId) {
        memoryService.appendMessage(currentTask.conversationId, {
          role: 'assistant',
          content: result.text,
        });
      }
    }

    return res.json({ success: true, result });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/tasks/recovery/config - Get recovery and observability configuration
taskRouter.get('/recovery/config', (req, res) => {
  try {
    const config = storage.getRecoveryObservabilityConfig();
    return res.json({ success: true, config });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/tasks/recovery/config - Update recovery and observability configuration
taskRouter.post('/recovery/config', (req, res) => {
  try {
    const updated = storage.updateRecoveryObservabilityConfig(req.body);
    return res.json({ success: true, config: updated });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/tasks/history - Get compact task execution history
taskRouter.get('/history', (req, res) => {
  try {
    const history = storage.getTaskHistory();
    return res.json({ success: true, history });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/tasks/history/clear - Clear task execution history
taskRouter.post('/history/clear', (req, res) => {
  try {
    storage.clearTaskHistory();
    return res.json({ success: true, message: 'Task history cleared' });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/tasks/run - Run a task (supports simulation flags for testing)
taskRouter.post('/run', async (req, res) => {
  try {
    const { userPrompt, conversationId, sessionAuthorizations, simulationFlags } = req.body;
    if (!userPrompt) {
      return res.status(400).json({ success: false, error: 'userPrompt is required' });
    }

    const result = await autonomousTaskEngine.runTask({
      userPrompt,
      conversationId,
      sessionAuthorizations,
      simulationFlags,
    });

    return res.json({ success: true, result });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});
