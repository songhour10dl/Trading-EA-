import { Router } from 'express';
import { authMiddleware, asyncHandler, AuthenticatedRequest } from '../middleware';
import { EAInstanceService, SettingsService } from '../services';

const router = Router();

router.use(authMiddleware);

// Get settings for the user's first EA instance
router.get(
  '/',
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const eas = await EAInstanceService.listEAInstances(userId);
    
    if (eas.length === 0) {
      return res.status(404).json({ error: 'No EA instance found' });
    }

    const settings = await SettingsService.getSettings(eas[0].id);
    res.json({ data: settings });
  })
);

// Save settings for the user's first EA instance
router.post(
  '/',
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const eas = await EAInstanceService.listEAInstances(userId);
    
    if (eas.length === 0) {
      return res.status(404).json({ error: 'No EA instance found' });
    }

    const updated = await SettingsService.updateSettings(eas[0].id, req.body);
    res.json({ data: updated, message: 'Settings updated successfully' });
  })
);

router.get(
  '/:eaId',
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { eaId } = req.params;
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const ea = await EAInstanceService.getEAInstanceById(eaId);
    if (!ea || ea.userId !== userId) {
      return res.status(404).json({ error: 'EA instance not found' });
    }

    const settings = await SettingsService.getSettings(eaId);
    res.json(settings);
  })
);

router.put(
  '/:eaId',
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { eaId } = req.params;
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const ea = await EAInstanceService.getEAInstanceById(eaId);
    if (!ea || ea.userId !== userId) {
      return res.status(404).json({ error: 'EA instance not found' });
    }

    const updated = await SettingsService.updateSettings(eaId, req.body);
    res.json(updated);
  })
);

export default router;
