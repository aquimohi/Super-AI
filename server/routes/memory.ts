import { Router, Request, Response } from 'express';
import { memoryService } from '../services/memory/memoryService.js';
import { memoryStorage } from '../services/memory/memoryStorage.js';

export const memoryRouter = Router();

// --- Memory Configuration ---
memoryRouter.get('/config', (req: Request, res: Response) => {
  try {
    const config = memoryService.getConfig();
    res.json({ success: true, config });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

memoryRouter.put('/config', (req: Request, res: Response) => {
  try {
    const updated = memoryService.updateConfig(req.body);
    res.json({ success: true, config: updated });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// --- Long-Term Memories ---
memoryRouter.get('/long-term', (req: Request, res: Response) => {
  try {
    const memories = memoryService.getAllLongTermMemories();
    res.json({ success: true, memories });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

memoryRouter.post('/long-term', (req: Request, res: Response) => {
  try {
    const { key, content, category, tags } = req.body;
    if (!content || !key) {
      return res.status(400).json({ success: false, error: 'Key and content are required.' });
    }

    const item = {
      id: `mem_${Date.now()}`,
      category: category || 'general',
      key,
      content,
      source: 'user_input' as const,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      accessCount: 0,
      tags: tags || [],
    };

    memoryStorage.saveLongTermMemory(item);
    res.json({ success: true, memory: item });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

memoryRouter.delete('/long-term/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = memoryService.deleteLongTermMemory(id);
    if (!result.success) {
      return res.status(404).json({ success: false, error: 'Memory item not found.' });
    }
    res.json({ success: true, event: result.event });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

memoryRouter.delete('/long-term', (req: Request, res: Response) => {
  try {
    memoryService.clearAllLongTermMemories();
    res.json({ success: true, message: 'All long-term memories cleared.' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// --- Conversation Sessions ---
memoryRouter.post('/conversations/new', (req: Request, res: Response) => {
  try {
    const conv = memoryService.getOrCreateConversation();
    res.json({ success: true, conversationId: conv.id });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

memoryRouter.get('/conversations/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const conv = memoryStorage.getConversation(id);
    if (!conv) {
      return res.status(404).json({ success: false, error: 'Conversation not found.' });
    }
    res.json({ success: true, conversation: conv });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

memoryRouter.delete('/conversations/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    memoryService.clearConversation(id);
    res.json({ success: true, message: 'Conversation session cleared.' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// --- Working Memory ---
memoryRouter.get('/working/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const working = memoryService.getWorkingMemory(id);
    res.json({ success: true, working });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});
