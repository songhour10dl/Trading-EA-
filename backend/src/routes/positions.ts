import { Router } from 'express';
import { authMiddleware, asyncHandler, AuthenticatedRequest } from '../middleware';
import { EAInstanceService, CommandService, ActivityLogService } from '../services';
import { getCommandExpiration } from '../utils/auth';

const router = Router();

router.use(authMiddleware);

async function resolvePrimaryEA(userId: string) {
  const eas = await EAInstanceService.listEAInstances(userId);
  return eas.length > 0 ? eas[0] : null;
}

// Queue a CLOSE_POSITION command for the EA to pick up
router.post(
  '/close',
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { ticket } = req.body || {};
    if (!ticket) {
      return res.status(400).json({ error: 'ticket is required' });
    }

    const ea = await resolvePrimaryEA(userId);
    if (!ea) {
      return res.status(404).json({ error: 'No EA instance found' });
    }

    const command = await CommandService.createCommand(
      ea.id,
      'CLOSE_POSITION',
      { ticket: String(ticket) },
      getCommandExpiration(120)
    );

    await ActivityLogService.createActivityLog(
      ea.id,
      'COMMAND_CLOSE_POSITION',
      `Close requested for ticket ${ticket}`,
      'INFO',
      { commandId: command.id, ticket }
    );

    return res.status(201).json({
      data: { id: command.id, type: command.type, status: command.status },
      message: 'Close command queued',
    });
  })
);

// Queue a MODIFY_SL_TP command for the EA to pick up
router.post(
  '/modify',
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { ticket, stopLoss, takeProfit } = req.body || {};
    if (!ticket) {
      return res.status(400).json({ error: 'ticket is required' });
    }
    if (stopLoss === undefined && takeProfit === undefined) {
      return res.status(400).json({ error: 'stopLoss or takeProfit is required' });
    }

    const ea = await resolvePrimaryEA(userId);
    if (!ea) {
      return res.status(404).json({ error: 'No EA instance found' });
    }

    const params: any = { ticket: String(ticket) };
    if (stopLoss !== undefined) params.stopLoss = Number(stopLoss);
    if (takeProfit !== undefined) params.takeProfit = Number(takeProfit);

    const command = await CommandService.createCommand(
      ea.id,
      'MODIFY_SL_TP',
      params,
      getCommandExpiration(120)
    );

    await ActivityLogService.createActivityLog(
      ea.id,
      'COMMAND_MODIFY_SL_TP',
      `Modify requested for ticket ${ticket}`,
      'INFO',
      { commandId: command.id, ...params }
    );

    return res.status(201).json({
      data: { id: command.id, type: command.type, status: command.status },
      message: 'Modify command queued',
    });
  })
);

export default router;