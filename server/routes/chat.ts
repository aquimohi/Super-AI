import { Router } from 'express';
import { orchestrateChatRequest } from '../services/orchestrator.js';

export const chatRouter = Router();

chatRouter.post('/', async (req, res) => {
  try {
    const {
      message,
      conversationId,
      history = [],
      role,
      model,
      hasImages,
      sessionAuthorizations,
      approvedToolCall,
      rejectedToolCall,
      isAutonomousTask,
      taskId,
      taskScopedAuthorization,
      authorizationDecision,
      stepId,
    } = req.body;

    if (!message || typeof message !== 'string' || !message.trim()) {
      return res.status(400).json({ success: false, error: 'Message text is required.' });
    }

    const result = await orchestrateChatRequest({
      message,
      conversationId,
      history,
      forceRole: role,
      forceModel: model,
      hasImages: Boolean(hasImages),
      sessionAuthorizations,
      approvedToolCall,
      rejectedToolCall,
      isAutonomousTask,
      taskId,
      taskScopedAuthorization,
      authorizationDecision,
      stepId,
    });

    res.json(result);
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: err.message || 'Failed to process request through Super AI Orchestrator.',
    });
  }
});

