export interface AuthPayload {
  userId: string;
  username: string;
}

export interface BotStateData {
  status: 'RUNNING' | 'PAUSED' | 'STOPPED' | 'DISCONNECTED';
  tradingStatus: 'TRADING' | 'WAITING_FOR_SIGNAL' | 'SIDEWAYS' | 'TRENDING' | 'HIGH_VOLATILITY' | 'NEWS_FILTER';
  activeStrategy?: string;
  lastHeartbeat?: Date;
  accountBalance: number;
  accountEquity: number;
  marginLevel: number;
  freeMargin: number;
  openPositionsCount: number;
  floatingPnl: number;
  dailyRealizedPnl: number;
  currentSpread: number;
  marketState: 'SIDEWAYS' | 'TRENDING' | 'BREAKOUT' | 'HIGH_VOLATILITY' | 'UNKNOWN';
  marketAnalysisTime?: Date;
}

export interface PositionData {
  id: string;
  ticket: string;
  symbol: string;
  direction: 'BUY' | 'SELL';
  strategy?: string;
  entryPrice: number;
  entryTime: Date;
  currentPrice: number;
  lotSize: number;
  stopLoss?: number;
  takeProfit?: number;
  floatingPnl: number;
  riskEstimate?: number;
  magicNumber?: number;
}

export interface TradeData {
  id: string;
  ticket: string;
  symbol: string;
  direction: 'BUY' | 'SELL';
  strategy?: string;
  entryPrice: number;
  entryTime: Date;
  exitPrice?: number;
  exitTime?: Date;
  lotSize: number;
  profitLoss?: number;
  commission?: number;
  swap?: number;
  entryReason?: string;
  exitReason?: string;
  durationMinutes?: number;
  riskAtEntry?: number;
}

export interface CommandData {
  id: string;
  type: string;
  status: 'PENDING' | 'ACKNOWLEDGED' | 'EXECUTED' | 'FAILED';
  params: Record<string, any>;
  result?: Record<string, any>;
  createdAt: Date;
  expiresAt: Date;
}

export interface ActivityLogData {
  id: string;
  eventType: string;
  severity: 'INFO' | 'WARN' | 'ERROR';
  symbol?: string;
  strategy?: string;
  message: string;
  data?: Record<string, any>;
  createdAt: Date;
}

export interface NotificationData {
  id: string;
  type: string;
  channel: 'IN_APP' | 'BROWSER' | 'TELEGRAM';
  status: 'SENT' | 'FAILED' | 'DISMISSED';
  data?: Record<string, any>;
  createdAt: Date;
}

export interface HeartbeatPayload {
  timestamp: number;
  signature: string; // HMAC-SHA256 signature
  state: BotStateData;
  positions: PositionData[];
  openOrders?: any[];
}

export interface CommandResponse {
  commandId: string;
  acknowledged: boolean;
  timestamp: number;
  signature: string;
}
