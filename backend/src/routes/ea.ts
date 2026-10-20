import { Router } from 'express';
import { authMiddleware, asyncHandler, AuthenticatedRequest } from '../middleware';
import { EAInstanceService, BotStateService, PositionService, SettingsService } from '../services';
import { generateApiKey } from '../utils/auth';

const router = Router();

router.use(authMiddleware);

router.post(
  '/',
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { displayName } = req.body;
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
      const apiKey = generateApiKey();
      
      // Create EA instance
      const ea = await EAInstanceService.createEAInstance(userId, apiKey, displayName || 'Trading Bot');
      
      // Initialize settings
      await SettingsService.getOrCreateSettings(ea.id);
      
      // Initialize bot state
      await BotStateService.getOrCreateBotState(ea.id);

      res.status(201).json({
        id: ea.id,
        displayName: ea.displayName,
        apiKey,
        createdAt: ea.createdAt,
      });
    } catch (error: any) {
      console.error('Failed to create EA instance:', error);
      
      // Check for specific database errors
      if (error.code === 'P2002') {
        return res.status(400).json({ error: 'An EA instance with this API key already exists' });
      }
      
      if (error.code === 'P2003') {
        return res.status(400).json({ error: 'Invalid user reference' });
      }
      
      if (error.message?.includes('connect')) {
        return res.status(503).json({ error: 'Database connection failed. Please ensure PostgreSQL is running.' });
      }
      
      throw error; // Re-throw to be caught by global error handler
    }
  })
);

router.get(
  '/',
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const eas = await EAInstanceService.listEAInstances(userId);

    res.json(
      eas.map(ea => ({
        id: ea.id,
        displayName: ea.displayName,
        apiKey: ea.apiKey,
        createdAt: ea.createdAt,
        botState: ea.botState,
        settings: ea.settings,
      }))
    );
  })
);

router.get(
  '/:id',
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { id } = req.params;
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const ea = await EAInstanceService.getEAInstanceById(id);

    if (!ea || ea.userId !== userId) {
      return res.status(404).json({ error: 'EA instance not found' });
    }

    res.json({
      id: ea.id,
      displayName: ea.displayName,
      apiKey: ea.apiKey,
      createdAt: ea.createdAt,
      botState: ea.botState,
      settings: ea.settings,
    });
  })
);

router.delete(
  '/:id',
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { id } = req.params;
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const ea = await EAInstanceService.getEAInstanceById(id);

    if (!ea || ea.userId !== userId) {
      return res.status(404).json({ error: 'EA instance not found' });
    }

    await EAInstanceService.deleteEAInstance(id);

    res.json({ message: 'EA instance deleted' });
  })
);

router.post(
  '/:id/regenerate-key',
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { id } = req.params;
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const ea = await EAInstanceService.getEAInstanceById(id);

    if (!ea || ea.userId !== userId) {
      return res.status(404).json({ error: 'EA instance not found' });
    }

    const newApiKey = generateApiKey();
    await EAInstanceService.regenerateApiKey(id, newApiKey);

    res.json({
      message: 'API key regenerated',
      apiKey: newApiKey,
    });
  })
);

export default router;
