import { Router } from 'express';
import { authMiddleware, asyncHandler, AuthenticatedRequest } from '../middleware';
import { EAInstanceService, CommandService, ActivityLogService } from '../services';
import { getCommandExpiration } from '../utils/auth';

const router = Router();

router.use(authMiddleware);

router.post(
  '/:eaId',
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { eaId } = req.params;
    const { type, params } = req.body;
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const ea = await EAInstanceService.getEAInstanceById(eaId);

    if (!ea || ea.userId !== userId) {
      return res.status(404).json({ error: 'EA instance not found' });
    }

    if (!type) {
      return res.status(400).json({ error: 'Command type is required' });
    }

    const expiresAt = getCommandExpiration(30);
    const command = await CommandService.createCommand(eaId, type, params || {}, expiresAt);

    await ActivityLogService.createActivityLog(
      eaId,
      `COMMAND_${type}`,
      `Command ${type} submitted`,
      'INFO',
      { commandId: command.id, params }
    );

    res.status(201).json({
      id: command.id,
      type: command.type,
      status: command.status,
      createdAt: command.createdAt,
    });
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

    const commands = await CommandService.getPendingCommands(eaId);

    res.json(commands);
  })
);

router.get(
  '/:eaId/:commandId',
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { eaId, commandId } = req.params;
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const ea = await EAInstanceService.getEAInstanceById(eaId);

    if (!ea || ea.userId !== userId) {
      return res.status(404).json({ error: 'EA instance not found' });
    }

    const command = await CommandService.getCommandById(commandId);

    if (!command || command.eaInstanceId !== eaId) {
      return res.status(404).json({ error: 'Command not found' });
    }

    res.json(command);
  })
);

export default router;
