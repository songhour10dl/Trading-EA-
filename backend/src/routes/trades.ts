import { Router, Response } from 'express';
import { authMiddleware, asyncHandler, AuthenticatedRequest } from '../middleware';
import { EAInstanceService, TradeService } from '../services';

const router = Router();

router.use(authMiddleware);

// Get trades for user's first EA instance
router.get(
  '/',
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { symbol, strategy, from, to } = req.query;
    const userId = req.user?.userId;

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const eas = await EAInstanceService.listEAInstances(userId);
    
    if (eas.length === 0) {
      return res.json({ data: [], message: 'No EA instances found' });
    }

    const filters = {
      symbol: symbol as string,
      strategy: strategy as string,
      from: from ? new Date(from as string) : undefined,
      to: to ? new Date(to as string) : undefined,
    };

    const trades = await TradeService.getTrades(eas.map((ea: any) => ea.id), filters);
    res.json({ data: trades.map(mapTradeForFrontend) });
    return;
  })
);

// Get trade metrics for user's first EA instance
router.get(
  '/metrics',
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user?.userId;

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const eas = await EAInstanceService.listEAInstances(userId);
    
    if (eas.length === 0) {
      return res.json({ data: {
        totalTrades: 0,
        closedTrades: 0,
        wins: 0,
        losses: 0,
        winRate: 0,
        totalProfit: 0,
        avgWinner: 0,
        avgLoser: 0,
        profitFactor: 0,
      }});
    }

    const analytics = await TradeService.getTradeAnalytics(eas.map((ea: any) => ea.id));
    res.json({ data: analytics });
    return;
  })
);

router.get(
  '/:eaId',
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { eaId } = req.params;
    const { symbol, strategy, from, to } = req.query;
    const userId = req.user?.userId;

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const ea = await EAInstanceService.getEAInstanceById(eaId);
    if (!ea || ea.userId !== userId) {
      res.status(404).json({ error: 'EA instance not found' });
      return;
    }

    const filters = {
      symbol: symbol as string,
      strategy: strategy as string,
      from: from ? new Date(from as string) : undefined,
      to: to ? new Date(to as string) : undefined,
    };

    const trades = await TradeService.getTrades(eaId, filters);
    res.json({ data: trades.map(mapTradeForFrontend) });
    return;
  })
);

router.get(
  '/:eaId/analytics',
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { eaId } = req.params;
    const userId = req.user?.userId;

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const ea = await EAInstanceService.getEAInstanceById(eaId);
    if (!ea || ea.userId !== userId) {
      res.status(404).json({ error: 'EA instance not found' });
      return;
    }

    const analytics = await TradeService.getTradeAnalytics(eaId);
    res.json(analytics);
    return;
  })
);

export default router;

function mapTradeForFrontend(trade: any) {
  const profit = Number(trade.profitLoss ?? 0);
  const entryPrice = Number(trade.entryPrice ?? 0);
  const exitPrice = Number(trade.exitPrice ?? 0);
  const seconds = trade.exitTime && trade.entryTime
    ? Math.max(0, Math.floor((new Date(trade.exitTime).getTime() - new Date(trade.entryTime).getTime()) / 1000))
    : null;

  return {
    ...trade,
    realizedPL: profit,
    realizedPLPercent: entryPrice > 0 ? ((exitPrice - entryPrice) / entryPrice) * 100 : 0,
    duration: seconds === null ? 'Open' : `${Math.floor(seconds / 60)}m ${seconds % 60}s`,
    winLoss: trade.exitTime ? (profit > 0 ? 'WIN' : profit < 0 ? 'LOSS' : 'BREAKEVEN') : 'OPEN',
  };
}
