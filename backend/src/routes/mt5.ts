import { Router, Request, Response } from 'express';
import { asyncHandler } from '../middleware';
import {
  EAInstanceService,
  BotStateService,
  PositionService,
  TradeService,
  CommandService,
  ActivityLogService,
} from '../services';

const router = Router();

// --- Heartbeat (no eaApiKeyMiddleware, accepts key from header or body) ---
router.post(
  '/heartbeat',
  asyncHandler(async (req: Request, res: Response) => {
    const apiKey =
      (req.headers['x-api-key'] as string) ||
      (req.body && req.body.apiKey);

    if (!apiKey) {
      return res.status(401).json({ error: 'Missing API key' });
    }

    const ea = await EAInstanceService.getEAInstanceByApiKey(apiKey);
    if (!ea) {
      return res.status(401).json({ error: 'Invalid API key' });
    }

    const { state, positions } = req.body;

    if (!state) {
      return res.status(400).json({ error: 'Missing state in payload' });
    }

    // Update bot state
    await BotStateService.updateBotState(ea.id, {
      status: state.status || 'RUNNING',
      tradingStatus: state.tradingStatus || 'WAITING_FOR_SIGNAL',
      activeStrategy: state.activeStrategy || null,
      lastHeartbeat: new Date(),
      accountBalance: Number(state.accountBalance) || 0,
      accountEquity: Number(state.accountEquity) || 0,
      marginLevel: Number(state.marginLevel) || 0,
      freeMargin: Number(state.freeMargin) || 0,
      openPositionsCount: Array.isArray(positions) ? positions.length : 0,
      floatingPnl: Number(state.floatingPnl) || 0,
      dailyRealizedPnl: Number(state.dailyRealizedPnl) || 0,
      currentSpread: Number(state.currentSpread) || 0,
      marketState: state.marketState || 'UNKNOWN',
      accountNumber: String(state.accountNumber || ''),
      server: String(state.server || ''),
      dailyDrawdownPercent: Number(state.dailyDrawdownPercent) || 0,
      weeklyDrawdownPercent: Number(state.weeklyDrawdownPercent) || 0,
      monthlyDrawdownPercent: Number(state.monthlyDrawdownPercent) || 0,
      dailyProfit: Number(state.dailyProfit) || 0,
      weeklyProfit: Number(state.weeklyProfit) || 0,
      monthlyProfit: Number(state.monthlyProfit) || 0,
      totalProfit: Number(state.totalProfit) || 0,
      recoveryLevel: Number(state.recoveryLevel) || 0,
      newEntriesAllowed: Boolean(state.newEntriesAllowed),
      riskBlockReason: String(state.riskBlockReason || ''),
    });

    // Update positions. Do not delete stale records unless the EA explicitly
    // sent a positions array; a missing field is not an empty snapshot.
    if (Array.isArray(positions)) {
      for (const position of positions) {
        try {
          await PositionService.createOrUpdatePosition(ea.id, {
            ticket: String(position.ticket),
            symbol: position.symbol || '',
            direction: position.direction || 'BUY',
            strategy: position.strategy || 'N/A',
            entryPrice: Number(position.entryPrice) || 0,
            entryTime: position.entryTime ? new Date(Number(position.entryTime) * 1000) : new Date(),
            currentPrice: Number(position.currentPrice) || 0,
            lotSize: Number(position.lotSize) || 0,
            stopLoss: Number(position.stopLoss) || 0,
            takeProfit: Number(position.takeProfit) || 0,
            floatingPnl: Number(position.floatingPnl) || 0,
            magicNumber: Number(position.magicNumber) || 0,
          });
        } catch (err) {
          console.error('Error saving position:', err);
        }
      }

      // Treat each heartbeat as the complete open-position snapshot for this EA.
      // This removes rows after a position is closed in MT5 and prevents stale UI.
      await PositionService.removeMissingPositions(
        ea.id,
        positions.map((position: any) => String(position.ticket))
      );
    }

    // Emit real-time update via Socket.IO
    const io = (global as any).io;
    if (io) {
      io.to(`bot:${ea.id}`).emit('bot:update', {
        state: state,
        positions: positions || [],
      });
    }

    return res.json({
      acknowledged: true,
      timestamp: Date.now(),
      nextHeartbeatInterval: 10000,
    });
  })
);

// --- Commands poll ---
router.get(
  '/commands/:apiKey',
  asyncHandler(async (req: Request, res: Response) => {
    const { apiKey } = req.params;

    const ea = await EAInstanceService.getEAInstanceByApiKey(apiKey);
    if (!ea) {
      return res.status(401).json({ error: 'Invalid API key' });
    }

    const commands = await CommandService.getPendingCommands(ea.id);

    return res.json({
      commands,
      timestamp: Date.now(),
    });
  })
);

// --- Command result ---
router.post(
  '/command-result/:apiKey',
  asyncHandler(async (req: Request, res: Response) => {
    const { apiKey } = req.params;
    const { commandId, status, result } = req.body;

    const ea = await EAInstanceService.getEAInstanceByApiKey(apiKey);
    if (!ea) {
      return res.status(401).json({ error: 'Invalid API key' });
    }

    const command = await CommandService.getCommandById(commandId);
    if (!command || command.eaInstanceId !== ea.id) {
      return res.status(404).json({ error: 'Command not found' });
    }

    await CommandService.updateCommandStatus(commandId, status, result);

    await ActivityLogService.createActivityLog(
      ea.id,
      `COMMAND_${status}`,
      `Command ${command.type} ${status.toLowerCase()}`,
      status === 'FAILED' ? 'ERROR' : 'INFO',
      { commandId, result }
    );

    return res.json({ acknowledged: true, timestamp: Date.now() });
  })
);

// --- Trade update ---
router.post(
  '/trade-update/:apiKey',
  asyncHandler(async (req: Request, res: Response) => {
    const { apiKey } = req.params;
    const { trades } = req.body;

    const ea = await EAInstanceService.getEAInstanceByApiKey(apiKey);
    if (!ea) {
      return res.status(401).json({ error: 'Invalid API key' });
    }

    if (trades && Array.isArray(trades)) {
      for (const trade of trades) {
        const entryTimeSeconds = Number(trade.entryTime);
        const exitTimeSeconds = Number(trade.exitTime);
        const entryTime = Number.isFinite(entryTimeSeconds) && entryTimeSeconds > 0
          ? new Date(entryTimeSeconds * 1000)
          : new Date();
        const exitTime = trade.exitTime !== undefined && trade.exitTime !== null && Number.isFinite(exitTimeSeconds) && exitTimeSeconds > 0
          ? new Date(exitTimeSeconds * 1000)
          : null;
        const profitLoss = trade.profitLoss !== undefined && trade.profitLoss !== null
          ? Number(trade.profitLoss)
          : null;

        const positionId = trade.positionId ? String(trade.positionId) : undefined;
        const priorTrade = await TradeService.getTradeByTicket(ea.id, String(trade.ticket));
        const openingTrade = positionId
          ? await TradeService.getTradeByPositionId(ea.id, positionId)
          : null;
        const existingClosed = priorTrade?.exitTime ? priorTrade : null;
        const entryDirection = openingTrade
          ? (openingTrade.direction === 'BUY' ? 'BUY' : 'SELL')
          : (trade.direction === 'BUY' || trade.direction === 'SELL' ? trade.direction : 'UNKNOWN');
        await TradeService.createOrUpdateTrade(ea.id, {
          ticket: String(trade.dealTicket || trade.ticket),
          positionId: openingTrade?.id ?? priorTrade?.positionId ?? null,
          symbol: String(trade.symbol || 'UNKNOWN'),
          direction: String(entryDirection),
          strategy: trade.strategy || 'N/A',
          entryPrice: Number(trade.entryPrice ?? openingTrade?.entryPrice ?? existingClosed?.entryPrice) || 0,
          entryTime: openingTrade?.entryTime ?? existingClosed?.entryTime ?? entryTime,
          exitPrice: trade.exitPrice !== undefined && trade.exitPrice !== null ? Number(trade.exitPrice) : existingClosed?.exitPrice ?? null,
          exitTime: exitTime ?? existingClosed?.exitTime ?? null,
          lotSize: Number(trade.lotSize ?? openingTrade?.lotSize ?? existingClosed?.lotSize) || 0,
          profitLoss: profitLoss ?? existingClosed?.profitLoss ?? null,
          commission: Number(trade.commission ?? existingClosed?.commission) || 0,
          swap: Number(trade.swap ?? existingClosed?.swap) || 0,
          entryReason: trade.entryReason || null,
          exitReason: trade.exitReason || null,
          riskAtEntry: Number(trade.riskAtEntry) || 0,
          data: trade,
        });

        if (exitTime) {
          await ActivityLogService.createActivityLog(
            ea.id,
            'TRADE_CLOSED',
            `Trade ${trade.ticket} closed. P/L: ${trade.profitLoss}`,
            Number(trade.profitLoss) < 0 ? 'WARN' : 'INFO',
            { ticket: trade.ticket, profitLoss: trade.profitLoss }
          );
        }
      }
    }

    return res.json({ acknowledged: true, timestamp: Date.now() });
  })
);

export default router;
