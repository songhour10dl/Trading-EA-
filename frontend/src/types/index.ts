// Core Types
export interface User {
  id: string;
  email: string;
  username: string;
  token: string;
}

export interface BotStatus {
  id: string;
  status: 'running' | 'paused' | 'stopped' | 'error';
  uptime: number;
  lastUpdate: string;
  version: string;
}

export interface MT5Connection {
  connected: boolean;
  accountNumber: string;
  server: string;
  lastConnected: string;
  connectionStrength: number;
}

export interface AccountInfo {
  balance: number;
  equity: number;
  margin: number;
  marginUsed: number;
  marginFree: number;
  marginLevel: number;
  floatingPL: number;
  todayPL: number;
}

export interface Position {
  ticket: string;
  symbol: string;
  direction: 'BUY' | 'SELL';
  strategy: string;
  entryPrice: number;
  currentPrice: number;
  lotSize: number;
  stopLoss: number;
  takeProfit: number;
  floatingPL: number;
  floatingPLPercent: number;
  duration: string;
  risk: number;
  openTime: string;
  riskRewardRatio: number;
}

export interface Trade {
  ticket: string;
  symbol: string;
  direction: 'BUY' | 'SELL';
  strategy: string;
  entryPrice: number;
  exitPrice: number;
  lotSize: number;
  realizedPL: number;
  realizedPLPercent: number;
  duration: string;
  openTime: string;
  closeTime: string;
  winLoss: 'WIN' | 'LOSS';
}

export interface MarketAnalysis {
  symbol: string;
  trend: 'bullish' | 'bearish' | 'sideways';
  support: number[];
  resistance: number[];
  indicators: {
    rsi: number;
    macd: number;
    bbands: { upper: number; middle: number; lower: number };
    ma20: number;
    ma50: number;
    ma200: number;
  };
  tradeEligible: boolean;
  reason: string;
}

export interface ActivityFeed {
  id: string;
  timestamp: string;
  type: 'trade' | 'command' | 'event' | 'error' | 'rejection';
  title: string;
  description: string;
  severity: 'info' | 'warning' | 'error' | 'success';
  details?: Record<string, any>;
}

export interface BotState {
  bot: BotStatus;
  mt5: MT5Connection;
  account: AccountInfo;
  positions: Position[];
  trades: Trade[];
  marketAnalysis: MarketAnalysis[];
  activityFeed: ActivityFeed[];
  strategyName: string;
  marketState: 'open' | 'closed' | 'premarket';
  positionsCount: number;
  tradingEnabled: boolean;
}

export interface Settings {
  riskPercentage: number;
  maxPositions: number;
  maxDrawdown: number;
  selectedStrategy: string;
  notificationsEnabled: boolean;
  soundAlertsEnabled: boolean;
  emailAlertsEnabled: boolean;
  dailyLossLimit: number;
}

export interface PerformanceMetrics {
  totalTrades: number;
  winRate: number;
  lossRate: number;
  profitFactor: number;
  maxDrawdown: number;
  maxConsecutiveWins: number;
  maxConsecutiveLosses: number;
  averageWinSize: number;
  averageLossSize: number;
  totalProfit: number;
  performanceByStrategy: Record<string, any>;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  username: string;
  password: string;
  confirmPassword: string;
}
