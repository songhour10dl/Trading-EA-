import { Router } from 'express';
import { authMiddleware, asyncHandler, AuthenticatedRequest } from '../middleware';
import { EAInstanceService, BotStateService, PositionService } from '../services';

const router = Router();

router.use(authMiddleware);

// --- Summary status for the user's primary EA instance ---
router.get(
  '/status',
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const eas = await EAInstanceService.listEAInstances(userId);

    if (eas.length === 0) {
      return res.status(404).json({ error: 'No EA instance found. Please create one first.' });
    }

    const ea = eas[0];
    const botState = ea.botState || (await BotStateService.getOrCreateBotState(ea.id));
    const positions = await PositionService.getPositions(ea.id);

    // MT5 is considered online when a heartbeat arrived within the last 30 seconds
    const lastHb = botState?.lastHeartbeat ? new Date(botState.lastHeartbeat).getTime() : 0;
    const secondsSinceHb = lastHb ? (Date.now() - lastHb) / 1000 : Infinity;
    const mt5Connected = secondsSinceHb < 30;

    return res.json({
      data: {
        bot: {
          id: ea.id,
          status: (botState?.status || 'DISCONNECTED').toLowerCase(),
          uptime: 0,
          version: '1.0.0',
          lastUpdate: botState?.updatedAt || new Date(),
        },
        mt5: {
          connected: mt5Connected,
          accountNumber: botState?.accountNumber || '',
          server: botState?.server || '',
          lastConnected: botState?.lastHeartbeat || '',
          connectionStrength: mt5Connected ? 100 : 0,
          secondsSinceHeartbeat: Number.isFinite(secondsSinceHb) ? Math.round(secondsSinceHb) : null,
        },
        account: {
          balance: botState?.accountBalance || 0,
          equity: botState?.accountEquity || 0,
          margin: botState?.accountBalance || 0,
          marginUsed: 0,
          marginFree: botState?.freeMargin || 0,
          marginLevel: botState?.marginLevel || 0,
          floatingPL: botState?.floatingPnl || 0,
          todayPL: botState?.dailyRealizedPnl || 0,
        },
        performance: {
          dailyDrawdownPercent: botState?.dailyDrawdownPercent || 0,
          weeklyDrawdownPercent: botState?.weeklyDrawdownPercent || 0,
          monthlyDrawdownPercent: botState?.monthlyDrawdownPercent || 0,
          dailyProfit: botState?.dailyProfit || 0,
          weeklyProfit: botState?.weeklyProfit || 0,
          monthlyProfit: botState?.monthlyProfit || 0,
          totalProfit: botState?.totalProfit || 0,
          recoveryLevel: botState?.recoveryLevel || 0,
          newEntriesAllowed: botState?.newEntriesAllowed || false,
          riskBlockReason: botState?.riskBlockReason || '',
        },
        positions: (positions || []).map((p: any) => {
          const floating = Number(p.floatingPnl) || 0;
          const entry = Number(p.entryPrice) || 0;
          const lots = Number(p.lotSize) || 0;
          // Approximate return on the position's notional exposure
          const notional = entry * lots * 100000;
          const pct = notional > 0 ? (floating / notional) * 100 : 0;

          return {
            ticket: String(p.ticket),
            symbol: p.symbol || 'N/A',
            direction: p.direction || 'BUY',
            strategy: p.strategy || 'MANUAL',
            entryPrice: entry,
            currentPrice: Number(p.currentPrice) || 0,
            lotSize: lots,
            stopLoss: Number(p.stopLoss) || 0,
            takeProfit: Number(p.takeProfit) || 0,
            floatingPL: floating,
            floatingPLPercent: pct,
            openTime: p.entryTime ? new Date(p.entryTime).toISOString() : new Date().toISOString(),
            duration: '',
            risk: Number(p.riskEstimate) || 0,
            riskRewardRatio: 0,
            magicNumber: Number(p.magicNumber) || 0,
            isManual: (Number(p.magicNumber) || 0) === 0,
          };
        }),
        strategyName: botState?.activeStrategy || 'N/A',
        marketState: botState?.marketState || 'UNKNOWN',
        tradingEnabled: botState?.status === 'RUNNING',
      },
    });
  })
);

router.get(
  '/:eaId/state',
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

    const botState = await BotStateService.getBotState(eaId);

    return res.json(botState);
  })
);

router.get(
  '/:eaId/positions',
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

    const positions = await PositionService.getPositions(eaId);

    return res.json(positions);
  })
);

router.get(
  '/:eaId/account-info',
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

    const botState = await BotStateService.getBotState(eaId);

    return res.json({
      accountBalance: botState?.accountBalance || 0,
      accountEquity: botState?.accountEquity || 0,
      marginLevel: botState?.marginLevel || 0,
      freeMargin: botState?.freeMargin || 0,
      openPositionsCount: botState?.openPositionsCount || 0,
      floatingPnl: botState?.floatingPnl || 0,
      dailyRealizedPnl: botState?.dailyRealizedPnl || 0,
      currentSpread: botState?.currentSpread || 0,
    });
  })
);

router.get(
  '/:eaId/market-analysis',
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

    const botState = await BotStateService.getBotState(eaId);

    return res.json({
      marketState: botState?.marketState || 'UNKNOWN',
      marketAnalysisTime: botState?.marketAnalysisTime,
      tradingStatus: botState?.tradingStatus,
    });
  })
);

router.get(
  '/:eaId/health',
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

    const botState = await BotStateService.getBotState(eaId);
    const lastHeartbeat = botState?.lastHeartbeat;
    const now = new Date();
    const timeSinceHeartbeat = lastHeartbeat ? (now.getTime() - new Date(lastHeartbeat).getTime()) / 1000 : null;
    const isHealthy = timeSinceHeartbeat !== null ? timeSinceHeartbeat < 30 : false;

    return res.json({
      status: botState?.status || 'DISCONNECTED',
      lastHeartbeat,
      timeSinceHeartbeatSeconds: timeSinceHeartbeat,
      isHealthy,
      database: 'connected',
      timestamp: now,
    });
  })
);

export default router;
