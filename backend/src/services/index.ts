import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class UserService {
  static async getUserById(userId: string) {
    return prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        email: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  static async getUserByUsername(username: string) {
    return prisma.user.findUnique({
      where: { username },
      select: {
        id: true,
        username: true,
        email: true,
        passwordHash: true,
      },
    });
  }

  static async createUser(username: string, email: string, passwordHash: string) {
    return prisma.user.create({
      data: {
        username,
        email,
        passwordHash,
      },
      select: {
        id: true,
        username: true,
        email: true,
      },
    });
  }

  static async updatePassword(userId: string, passwordHash: string) {
    return prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
      select: {
        id: true,
        username: true,
        email: true,
      },
    });
  }
}

export class EAInstanceService {
  static async createEAInstance(userId: string, apiKey: string, displayName: string) {
    return prisma.eAInstance.create({
      data: {
        userId,
        apiKey,
        displayName,
      },
    });
  }

  static async getEAInstanceById(eaId: string) {
    return prisma.eAInstance.findUnique({
      where: { id: eaId },
      include: {
        botState: true,
        settings: true,
      },
    });
  }

  static async getEAInstanceByApiKey(apiKey: string) {
    return prisma.eAInstance.findUnique({
      where: { apiKey },
      include: {
        botState: true,
        settings: true,
      },
    });
  }

  static async listEAInstances(userId: string) {
    return prisma.eAInstance.findMany({
      where: { userId },
      include: {
        botState: true,
        settings: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  static async deleteEAInstance(eaId: string) {
    return prisma.eAInstance.delete({
      where: { id: eaId },
    });
  }

  static async regenerateApiKey(eaId: string, newApiKey: string) {
    return prisma.eAInstance.update({
      where: { id: eaId },
      data: { apiKey: newApiKey },
    });
  }
}

export class BotStateService {
  static async getOrCreateBotState(eaInstanceId: string) {
    let botState = await prisma.botState.findUnique({
      where: { eaInstanceId },
    });

    if (!botState) {
      botState = await prisma.botState.create({
        data: {
          eaInstanceId,
          status: 'DISCONNECTED',
        },
      });
    }

    return botState;
  }

  static async updateBotState(eaInstanceId: string, data: any) {
    return prisma.botState.update({
      where: { eaInstanceId },
      data: {
        ...data,
        updatedAt: new Date(),
      },
    });
  }

  static async getBotState(eaInstanceId: string) {
    return prisma.botState.findUnique({
      where: { eaInstanceId },
    });
  }
}

export class PositionService {
  static async createOrUpdatePosition(eaInstanceId: string, positionData: any) {
    const existingPosition = await prisma.position.findUnique({
      where: { ticket: positionData.ticket },
    });

    if (existingPosition) {
      return prisma.position.update({
        where: { id: existingPosition.id },
        data: {
          ...positionData,
          updatedAt: new Date(),
        },
      });
    }

    return prisma.position.create({
      data: {
        eaInstanceId,
        ...positionData,
      },
    });
  }

  static async getPositions(eaInstanceId: string) {
    return prisma.position.findMany({
      where: { eaInstanceId },
      orderBy: { entryTime: 'desc' },
    });
  }

  static async removeMissingPositions(eaInstanceId: string, openTickets: string[]) {
    return prisma.position.deleteMany({
      where: {
        eaInstanceId,
        ticket: { notIn: openTickets },
      },
    });
  }

  static async closePosition(positionId: string) {
    return prisma.position.delete({
      where: { id: positionId },
    });
  }

  static async getPositionByTicket(ticket: string) {
    return prisma.position.findUnique({
      where: { ticket },
    });
  }
}

export class TradeService {
  static async getTradeByTicket(eaInstanceId: string, ticket: string) {
    return prisma.trade.findFirst({
      where: { eaInstanceId, ticket },
    });
  }

  static async getTradeByPositionId(eaInstanceId: string, positionId: string) {
    return prisma.trade.findFirst({ where: { eaInstanceId, positionId } });
  }

  static async createOrUpdateTrade(eaInstanceId: string, tradeData: any) {
    const existingTrade = await this.getTradeByTicket(eaInstanceId, tradeData.ticket);

    if (existingTrade) {
      return prisma.trade.update({
        where: { id: existingTrade.id },
        data: {
          ...tradeData,
        },
      });
    }

    return prisma.trade.create({
      data: {
        eaInstanceId,
        ...tradeData,
      },
    });
  }

  static async getTrades(eaInstanceIds: string | string[], filters?: any) {
    const ids = Array.isArray(eaInstanceIds) ? eaInstanceIds : [eaInstanceIds];
    const where: any = { eaInstanceId: { in: ids } };

    if (filters?.symbol) {
      where.symbol = filters.symbol;
    }

    if (filters?.strategy) {
      where.strategy = filters.strategy;
    }

    if (filters?.from) {
      where.exitTime = { ...(where.exitTime || {}), gte: filters.from };
    }

    if (filters?.to) {
      where.exitTime = { ...(where.exitTime || {}), lte: filters.to };
    }

    return prisma.trade.findMany({
      where,
      orderBy: { entryTime: 'desc' },
      take: filters?.limit || 500,
    });
  }

  static async getTradeAnalytics(eaInstanceIds: string | string[]) {
    const ids = Array.isArray(eaInstanceIds) ? eaInstanceIds : [eaInstanceIds];
    const trades = await prisma.trade.findMany({
      where: {
        eaInstanceId: { in: ids },
        exitTime: { not: null },
      },
    });

    const closedTrades = trades.filter(t => t.profitLoss !== null);
    const wins = closedTrades.filter(t => (t.profitLoss || 0) > 0).length;
    const losses = closedTrades.filter(t => (t.profitLoss || 0) <= 0).length;

    const totalProfit = closedTrades.reduce((sum, t) => sum + (t.profitLoss || 0), 0);
    const grossProfit = closedTrades.filter(t => (t.profitLoss || 0) > 0).reduce((sum, t) => sum + (t.profitLoss || 0), 0);
    const grossLoss = Math.abs(closedTrades.filter(t => (t.profitLoss || 0) < 0).reduce((sum, t) => sum + (t.profitLoss || 0), 0));
    const avgWinner = wins > 0 ? grossProfit / wins : 0;
    const avgLoser = losses > 0 ? -grossLoss / losses : 0;

    const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : 0;

    return {
      totalTrades: trades.length,
      closedTrades: closedTrades.length,
      wins,
      losses,
      winRate: closedTrades.length > 0 ? (wins / closedTrades.length) * 100 : 0,
      totalProfit,
      avgTrade: closedTrades.length > 0 ? totalProfit / closedTrades.length : 0,
      avgWinner,
      avgLoser,
      profitFactor,
    };
  }
}

export class CommandService {
  static async createCommand(eaInstanceId: string, type: string, params: any, expiresAt: Date) {
    return prisma.command.create({
      data: {
        eaInstanceId,
        type,
        params,
        expiresAt,
        status: 'PENDING',
      },
    });
  }

  static async getPendingCommands(eaInstanceId: string) {
    return prisma.command.findMany({
      where: {
        eaInstanceId,
        status: 'PENDING',
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  static async updateCommandStatus(commandId: string, status: string, result?: any) {
    return prisma.command.update({
      where: { id: commandId },
      data: {
        status,
        result,
        completedAt: status === 'PENDING' ? undefined : new Date(),
        acknowledgedAt: status === 'ACKNOWLEDGED' ? new Date() : undefined,
      },
    });
  }

  static async getCommandById(commandId: string) {
    return prisma.command.findUnique({
      where: { id: commandId },
    });
  }
}

export class ActivityLogService {
  static async createActivityLog(eaInstanceId: string, eventType: string, message: string, severity = 'INFO', data?: any) {
    return prisma.activityLog.create({
      data: {
        eaInstanceId,
        eventType,
        severity,
        message,
        data: data || {},
      },
    });
  }

  static async getActivityLogs(eaInstanceId: string, filters?: any) {
    const where: any = { eaInstanceId };

    if (filters?.eventType) {
      where.eventType = filters.eventType;
    }

    if (filters?.severity) {
      where.severity = filters.severity;
    }

    if (filters?.from) {
      where.createdAt = { gte: filters.from };
    }

    return prisma.activityLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }
}

export class SettingsService {
  static async getOrCreateSettings(eaInstanceId: string) {
    let settings = await prisma.settings.findUnique({
      where: { eaInstanceId },
    });

    if (!settings) {
      settings = await prisma.settings.create({
        data: {
          eaInstanceId,
        },
      });
    }

    return settings;
  }

  static async updateSettings(eaInstanceId: string, data: any) {
    const settings = await this.getOrCreateSettings(eaInstanceId);

    // Only pass fields that exist on the Settings model
    const allowedFields = [
      'symbol', 'entryTf', 'confirmTf', 'tradingEnabled',
      'riskPercentage', 'fixedLotSize', 'maxLotSize',
      'maxConcurrentPositions', 'maxDailyLoss', 'maxDailyTrades',
      'maxConsecutiveLosses', 'maxSpread', 'slType', 'tpType',
      'breakEvenEnabled', 'trailingStopEnabled', 'newsBlackoutEnabled',
      'sessionRestrictions', 'strategySettings', 'martingaleSettings',
      'notificationPrefs',
    ];

    const cleanData: any = {};
    for (const key of allowedFields) {
      if (data[key] !== undefined && data[key] !== null) {
        cleanData[key] = data[key];
      }
    }

    return prisma.settings.update({
      where: { eaInstanceId },
      data: {
        ...cleanData,
        version: settings.version + 1,
      },
    });
  }

  static async getSettings(eaInstanceId: string) {
    return prisma.settings.findUnique({
      where: { eaInstanceId },
    });
  }
}

export default prisma;
