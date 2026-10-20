-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ea_instances" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "apiKey" TEXT NOT NULL,
    "displayName" TEXT NOT NULL DEFAULT 'Trading Bot',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ea_instances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bot_state" (
    "id" TEXT NOT NULL,
    "eaInstanceId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DISCONNECTED',
    "tradingStatus" TEXT NOT NULL DEFAULT 'WAITING_FOR_SIGNAL',
    "activeStrategy" TEXT,
    "lastHeartbeat" TIMESTAMP(3),
    "accountBalance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "accountEquity" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "marginLevel" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "freeMargin" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "openPositionsCount" INTEGER NOT NULL DEFAULT 0,
    "floatingPnl" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "dailyRealizedPnl" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "currentSpread" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "marketState" TEXT NOT NULL DEFAULT 'UNKNOWN',
    "marketAnalysisTime" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bot_state_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "settings" (
    "id" TEXT NOT NULL,
    "eaInstanceId" TEXT NOT NULL,
    "symbol" TEXT NOT NULL DEFAULT 'XAUUSD',
    "entryTf" TEXT NOT NULL DEFAULT 'M1',
    "confirmTf" TEXT NOT NULL DEFAULT 'M5',
    "tradingEnabled" BOOLEAN NOT NULL DEFAULT false,
    "riskPercentage" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "fixedLotSize" DOUBLE PRECISION,
    "maxLotSize" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "maxConcurrentPositions" INTEGER NOT NULL DEFAULT 3,
    "maxDailyLoss" DOUBLE PRECISION NOT NULL DEFAULT -100,
    "maxDailyTrades" INTEGER NOT NULL DEFAULT 50,
    "maxConsecutiveLosses" INTEGER NOT NULL DEFAULT 5,
    "maxSpread" DOUBLE PRECISION NOT NULL DEFAULT 5.0,
    "slType" TEXT NOT NULL DEFAULT 'FIXED',
    "tpType" TEXT NOT NULL DEFAULT 'FIXED',
    "breakEvenEnabled" BOOLEAN NOT NULL DEFAULT false,
    "trailingStopEnabled" BOOLEAN NOT NULL DEFAULT false,
    "newsBlackoutEnabled" BOOLEAN NOT NULL DEFAULT false,
    "sessionRestrictions" TEXT NOT NULL DEFAULT '',
    "strategySettings" JSONB NOT NULL DEFAULT '{}',
    "martingaleSettings" JSONB NOT NULL DEFAULT '{}',
    "notificationPrefs" JSONB NOT NULL DEFAULT '{}',
    "version" INTEGER NOT NULL DEFAULT 1,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "strategy_settings" (
    "id" TEXT NOT NULL,
    "eaInstanceId" TEXT NOT NULL,
    "strategyName" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "config" JSONB NOT NULL DEFAULT '{}',
    "version" INTEGER NOT NULL DEFAULT 1,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "strategy_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "positions" (
    "id" TEXT NOT NULL,
    "eaInstanceId" TEXT NOT NULL,
    "ticket" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "direction" TEXT NOT NULL,
    "strategy" TEXT,
    "entryPrice" DOUBLE PRECISION NOT NULL,
    "entryTime" TIMESTAMP(3) NOT NULL,
    "currentPrice" DOUBLE PRECISION NOT NULL,
    "lotSize" DOUBLE PRECISION NOT NULL,
    "stopLoss" DOUBLE PRECISION,
    "takeProfit" DOUBLE PRECISION,
    "floatingPnl" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "riskEstimate" DOUBLE PRECISION,
    "magicNumber" INTEGER,
    "data" JSONB NOT NULL DEFAULT '{}',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "positions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trades" (
    "id" TEXT NOT NULL,
    "eaInstanceId" TEXT NOT NULL,
    "ticket" TEXT NOT NULL,
    "positionId" TEXT,
    "symbol" TEXT NOT NULL,
    "direction" TEXT NOT NULL,
    "strategy" TEXT,
    "entryPrice" DOUBLE PRECISION NOT NULL,
    "entryTime" TIMESTAMP(3) NOT NULL,
    "exitPrice" DOUBLE PRECISION,
    "exitTime" TIMESTAMP(3),
    "lotSize" DOUBLE PRECISION NOT NULL,
    "profitLoss" DOUBLE PRECISION,
    "commission" DOUBLE PRECISION,
    "swap" DOUBLE PRECISION,
    "entryReason" TEXT,
    "exitReason" TEXT,
    "durationMinutes" INTEGER,
    "riskAtEntry" DOUBLE PRECISION,
    "data" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "trades_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "commands" (
    "id" TEXT NOT NULL,
    "eaInstanceId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "params" JSONB NOT NULL DEFAULT '{}',
    "result" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acknowledgedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "commands_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "activity_logs" (
    "id" TEXT NOT NULL,
    "eaInstanceId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "severity" TEXT NOT NULL DEFAULT 'INFO',
    "symbol" TEXT,
    "strategy" TEXT,
    "message" TEXT NOT NULL,
    "data" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "activity_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'SENT',
    "data" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dismissedAt" TIMESTAMP(3),

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "backtest_results" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "strategy" TEXT NOT NULL,
    "config" JSONB NOT NULL DEFAULT '{}',
    "symbol" TEXT NOT NULL,
    "dateFrom" TIMESTAMP(3) NOT NULL,
    "dateTo" TIMESTAMP(3) NOT NULL,
    "totalTrades" INTEGER NOT NULL,
    "wins" INTEGER NOT NULL,
    "losses" INTEGER NOT NULL,
    "profitFactor" DOUBLE PRECISION,
    "maxDrawdown" DOUBLE PRECISION,
    "avgWinner" DOUBLE PRECISION,
    "avgLoser" DOUBLE PRECISION,
    "data" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "backtest_results_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "ea_instances_apiKey_key" ON "ea_instances"("apiKey");

-- CreateIndex
CREATE UNIQUE INDEX "bot_state_eaInstanceId_key" ON "bot_state"("eaInstanceId");

-- CreateIndex
CREATE UNIQUE INDEX "settings_eaInstanceId_key" ON "settings"("eaInstanceId");

-- CreateIndex
CREATE UNIQUE INDEX "strategy_settings_eaInstanceId_strategyName_key" ON "strategy_settings"("eaInstanceId", "strategyName");

-- CreateIndex
CREATE UNIQUE INDEX "positions_ticket_key" ON "positions"("ticket");

-- CreateIndex
CREATE INDEX "positions_eaInstanceId_idx" ON "positions"("eaInstanceId");

-- CreateIndex
CREATE INDEX "positions_ticket_idx" ON "positions"("ticket");

-- CreateIndex
CREATE INDEX "trades_eaInstanceId_idx" ON "trades"("eaInstanceId");

-- CreateIndex
CREATE INDEX "trades_symbol_idx" ON "trades"("symbol");

-- CreateIndex
CREATE INDEX "trades_createdAt_idx" ON "trades"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "trades_eaInstanceId_ticket_key" ON "trades"("eaInstanceId", "ticket");

-- CreateIndex
CREATE INDEX "commands_eaInstanceId_idx" ON "commands"("eaInstanceId");

-- CreateIndex
CREATE INDEX "commands_status_idx" ON "commands"("status");

-- CreateIndex
CREATE INDEX "activity_logs_eaInstanceId_idx" ON "activity_logs"("eaInstanceId");

-- CreateIndex
CREATE INDEX "activity_logs_eventType_idx" ON "activity_logs"("eventType");

-- CreateIndex
CREATE INDEX "activity_logs_createdAt_idx" ON "activity_logs"("createdAt");

-- CreateIndex
CREATE INDEX "notifications_userId_idx" ON "notifications"("userId");

-- CreateIndex
CREATE INDEX "notifications_type_idx" ON "notifications"("type");

-- CreateIndex
CREATE INDEX "backtest_results_userId_idx" ON "backtest_results"("userId");

-- CreateIndex
CREATE INDEX "backtest_results_strategy_idx" ON "backtest_results"("strategy");

-- AddForeignKey
ALTER TABLE "ea_instances" ADD CONSTRAINT "ea_instances_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bot_state" ADD CONSTRAINT "bot_state_eaInstanceId_fkey" FOREIGN KEY ("eaInstanceId") REFERENCES "ea_instances"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "settings" ADD CONSTRAINT "settings_eaInstanceId_fkey" FOREIGN KEY ("eaInstanceId") REFERENCES "ea_instances"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "strategy_settings" ADD CONSTRAINT "strategy_settings_eaInstanceId_fkey" FOREIGN KEY ("eaInstanceId") REFERENCES "ea_instances"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "positions" ADD CONSTRAINT "positions_eaInstanceId_fkey" FOREIGN KEY ("eaInstanceId") REFERENCES "ea_instances"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trades" ADD CONSTRAINT "trades_eaInstanceId_fkey" FOREIGN KEY ("eaInstanceId") REFERENCES "ea_instances"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trades" ADD CONSTRAINT "trades_positionId_fkey" FOREIGN KEY ("positionId") REFERENCES "positions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commands" ADD CONSTRAINT "commands_eaInstanceId_fkey" FOREIGN KEY ("eaInstanceId") REFERENCES "ea_instances"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_eaInstanceId_fkey" FOREIGN KEY ("eaInstanceId") REFERENCES "ea_instances"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "backtest_results" ADD CONSTRAINT "backtest_results_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
