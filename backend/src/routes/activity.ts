import { Router } from 'express';
import { authMiddleware, asyncHandler, AuthenticatedRequest } from '../middleware';
import { EAInstanceService, ActivityLogService } from '../services';

const router = Router();

router.use(authMiddleware);

// Get activity logs for user's first EA instance
router.get(
  '/',
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { eventType, severity, from, limit } = req.query;
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const eas = await EAInstanceService.listEAInstances(userId);
    
    if (eas.length === 0) {
      return res.json({ data: [] });
    }

    const filters = {
      eventType: eventType as string,
      severity: severity as string,
      from: from ? new Date(from as string) : undefined,
    };

    const logs = await ActivityLogService.getActivityLogs(eas[0].id, filters);
    res.json({ data: logs.slice(0, parseInt(limit as string) || 100) });
  })
);

router.get(
  '/:eaId',
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { eaId } = req.params;
    const { eventType, severity, from, limit } = req.query;
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const ea = await EAInstanceService.getEAInstanceById(eaId);
    if (!ea || ea.userId !== userId) {
      return res.status(404).json({ error: 'EA instance not found' });
    }

    const filters = {
      eventType: eventType as string,
      severity: severity as string,
      from: from ? new Date(from as string) : undefined,
    };

    const logs = await ActivityLogService.getActivityLogs(eaId, filters);
    res.json(logs.slice(0, parseInt(limit as string) || 100));
  })
);

export default router;
