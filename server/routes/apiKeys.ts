import { Router } from 'express';
import { storage } from '../storage.js';
import { testOpenRouterKey } from '../services/openrouter.js';

export const apiKeysRouter = Router();

// GET all keys (always masked, secrets never exposed)
apiKeysRouter.get('/', (req, res) => {
  try {
    const keys = storage.getAllKeysSanitized();
    res.json({ success: true, keys });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST add new key
apiKeysRouter.post('/', async (req, res) => {
  try {
    const { provider = 'openrouter', name, key, isActive } = req.body;

    if (!key || typeof key !== 'string' || !key.trim()) {
      return res.status(400).json({ success: false, error: 'API Key string is required.' });
    }

    const created = storage.addKey({
      provider,
      name: name?.trim() || undefined,
      rawKey: key.trim(),
      isActive: Boolean(isActive),
    });

    // Automatically perform non-blocking validation check on new key
    if (provider === 'openrouter') {
      testOpenRouterKey(key.trim()).then((testResult) => {
        storage.updateKey(created.id, {
          status: testResult.valid ? 'valid' : 'invalid',
          lastTestedAt: new Date().toISOString(),
          lastError: testResult.error,
        });
      }).catch(() => {});
    }

    res.status(201).json({ success: true, key: created });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT update key (edit name, enable/disable, or update raw key)
apiKeysRouter.put('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { name, isEnabled, isActive, key } = req.body;

    const updated = storage.updateKey(id, {
      name: name?.trim(),
      isEnabled: isEnabled !== undefined ? Boolean(isEnabled) : undefined,
      isActive: isActive !== undefined ? Boolean(isActive) : undefined,
      rawKey: key?.trim() ? key.trim() : undefined,
    });

    if (!updated) {
      return res.status(404).json({ success: false, error: 'Key not found.' });
    }

    res.json({ success: true, key: updated });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE key
apiKeysRouter.delete('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const deleted = storage.deleteKey(id);
    if (!deleted) {
      return res.status(404).json({ success: false, error: 'Key not found.' });
    }
    res.json({ success: true, message: 'API key successfully deleted.' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST toggle enabled/disabled
apiKeysRouter.post('/:id/toggle', (req, res) => {
  try {
    const { id } = req.params;
    const record = storage.getKeyRecord(id);
    if (!record) {
      return res.status(404).json({ success: false, error: 'Key not found.' });
    }

    const updated = storage.updateKey(id, {
      isEnabled: !record.isEnabled,
    });

    res.json({ success: true, key: updated });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST set active
apiKeysRouter.post('/:id/set-active', (req, res) => {
  try {
    const { id } = req.params;
    const updated = storage.setActiveKey(id);
    if (!updated) {
      return res.status(404).json({ success: false, error: 'Key not found.' });
    }
    res.json({ success: true, key: updated });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST test specific saved key
apiKeysRouter.post('/:id/test', async (req, res) => {
  try {
    const { id } = req.params;
    const rawKey = storage.getDecryptedKey(id);

    if (!rawKey) {
      return res.status(404).json({ success: false, error: 'Key not found or cannot be decrypted.' });
    }

    const testResult = await testOpenRouterKey(rawKey);

    storage.updateKey(id, {
      status: testResult.valid ? 'valid' : 'invalid',
      lastTestedAt: new Date().toISOString(),
      lastError: testResult.error,
    });

    storage.logAudit(
      'KEY_TESTED',
      `Key test result for ID ${id}: ${testResult.valid ? 'VALID' : `FAILED (${testResult.error})`}`,
      testResult.valid ? 'info' : 'warn'
    );

    res.json({ success: true, testResult });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST test unsaved raw key before adding
apiKeysRouter.post('/test-raw', async (req, res) => {
  try {
    const { key, provider = 'openrouter' } = req.body;
    if (!key || !key.trim()) {
      return res.status(400).json({ success: false, error: 'Key string is required.' });
    }

    if (provider === 'openrouter') {
      const testResult = await testOpenRouterKey(key.trim());
      return res.json({ success: true, testResult });
    }

    res.json({ success: true, testResult: { valid: true, label: 'Unverified provider' } });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});
