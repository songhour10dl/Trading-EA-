import { create } from 'zustand';
import { BotState, AccountInfo, Position, Trade, ActivityFeed, MarketAnalysis } from '../types/index';

interface BotStore extends BotState {
  updateBotStatus: (data: any) => void;
  updateAccount: (data: AccountInfo) => void;
  updatePositions: (positions: Position[]) => void;
  updateMT5: (data: any) => void;
  updateMeta: (data: any) => void;
  addTrade: (trade: Trade) => void;
  updateMarketAnalysis: (analysis: MarketAnalysis[]) => void;
  addActivityFeed: (item: ActivityFeed) => void;
  clearActivityFeed: () => void;
  reset: () => void;
}

const initialState: BotState = {
  bot: {
    id: '',
    status: 'stopped',
    uptime: 0,
    lastUpdate: new Date().toISOString(),
    version: '1.0.0',
  },
  mt5: {
    connected: false,
    accountNumber: '',
    server: '',
    lastConnected: '',
    connectionStrength: 0,
  },
  account: {
    balance: 0,
    equity: 0,
    margin: 0,
    marginUsed: 0,
    marginFree: 0,
    marginLevel: 0,
    floatingPL: 0,
    todayPL: 0,
  },
  positions: [],
  trades: [],
  marketAnalysis: [],
  activityFeed: [],
  strategyName: '',
  marketState: 'closed',
  positionsCount: 0,
  tradingEnabled: false,
};

export const useBotStore = create<BotStore>((set) => ({
  ...initialState,

  updateBotStatus: (data) =>
    set((state) => ({
      bot: { ...state.bot, ...data, lastUpdate: new Date().toISOString() },
    })),

  updateAccount: (data) =>
    set((state) => ({
      account: data,
    })),

  updatePositions: (positions) =>
    set({
      positions,
      positionsCount: positions.length,
    }),

  updateMT5: (data) =>
    set((state) => ({
      mt5: { ...state.mt5, ...data },
    })),

  updateMeta: (data) =>
    set((state) => ({
      strategyName: data?.strategyName ?? state.strategyName,
      marketState: (data?.marketState ?? state.marketState) as any,
      tradingEnabled: data?.tradingEnabled ?? state.tradingEnabled,
    })),

  addTrade: (trade) =>
    set((state) => ({
      trades: [trade, ...state.trades],
    })),

  updateMarketAnalysis: (analysis) =>
    set({
      marketAnalysis: analysis,
    }),

  addActivityFeed: (item) =>
    set((state) => ({
      activityFeed: [item, ...state.activityFeed.slice(0, 99)],
    })),

  clearActivityFeed: () =>
    set({
      activityFeed: [],
    }),

  reset: () => set(initialState),
}));
