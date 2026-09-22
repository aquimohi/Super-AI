import { Router } from 'express';
import { orchestrateChatRequest } from '../services/orchestrator.js';
import { generateSpeech } from '../services/ttsService.js';

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

    // Phase 6: Inject Custom Cinematic TTS audio (Base64)
    if (result.success && result.text) {
      try {
        const audioBase64 = await generateSpeech(result.text);
        if (audioBase64) {
          result.audioBase64 = audioBase64;
        }
      } catch (ttsErr) {
        console.error('[chatRouter] TTS Generation failed:', ttsErr);
      }
    }

    res.json(result);
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: err.message || 'Failed to process request through Super AI Orchestrator.',
    });
  }
});

