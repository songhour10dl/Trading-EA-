# MT5 Gold Trading Bot + Live Web Dashboard - Architecture

## System Overview

```
┌─────────────────┐
│  React Web UI   │
│  (Vite + TS)    │
└────────┬────────┘
         │ Socket.IO + REST API
         │ (Authenticated)
         │
┌────────▼─────────────────┐
│  Node.js Backend         │
│  (Express + TypeScript)  │
├──────────────────────────┤
│ • User Management        │
│ • Command Queue          │
│ • Real-time Broadcast    │
│ • Activity Logging       │
│ • Strategy State         │
│ • Notification Service   │
└────────┬────────┬────────┘
         │        │
    ┌────▼──┐  ┌──▼──────────────┐
    │   DB  │  │ Heartbeat Queue │
    │  (PG) │  │ & Task Jobs     │
    └───────┘  └─────────────────┘
         ▲
         │ HTTPS Request
         │ (EA polls for commands)
         │
    ┌────┴──────────────┐
    │  MT5 EA (MQL5)    │
    │  (Windows PC/VPS) │
    ├───────────────────┤
    │ • Indicator Calc  │
    │ • Trade Logic     │
    │ • Risk Mgmt       │
    │ • Order Exec      │
    └───────────────────┘
         │
         └─► MT5 Terminal
             └─► Broker API
```

## Database Schema

```
Users
├── id (UUID, PK)
├── username (unique)
├── email
├── password_hash
├── created_at
└── updated_at

EAInstances
├── id (UUID, PK)
├── user_id (FK)
├── api_key (unique)
├── display_name
├── created_at
└── updated_at

BotState
├── id (UUID, PK)
├── ea_instance_id (FK)
├── status (RUNNING|PAUSED|STOPPED|DISCONNECTED)
├── trading_status (TRADING|WAITING|SIDEWAYS|TRENDING|HIGH_VOL|NEWS_FILTER)
├── active_strategy (sideways|trend|breakout|scalping|martingale)
├── last_heartbeat
├── account_balance
├── account_equity
├── margin_level
├── free_margin
├── open_positions_count
├── floating_pnl
├── daily_realized_pnl
├── current_spread
├── market_state
├── market_analysis_time
└── updated_at

Settings
├── id (UUID, PK)
├── ea_instance_id (FK)
├── symbol (XAUUSD)
├── entry_tf (M1|M5|M15|M30)
├── confirm_tf (M5|M15|M30|H1)
├── trading_enabled (boolean)
├── risk_percentage
├── fixed_lot_size (nullable)
├── max_lot_size
├── max_concurrent_positions
├── max_daily_loss
├── max_daily_trades
├── max_consecutive_losses
├── max_spread
├── sl_type
├── tp_type
├── break_even_enabled
├── trailing_stop_enabled
├── news_blackout_enabled
├── session_restrictions
├── strategy_settings (JSON)
├── martingale_settings (JSON)
├── notification_prefs (JSON)
├── version (incremented on each change)
└── updated_at

StrategySettings
├── id (UUID, PK)
├── ea_instance_id (FK)
├── strategy_name (sideways|trend|breakout|scalping|martingale)
├── enabled (boolean)
├── config (JSON - strategy-specific params)
├── version
└── updated_at

Position
├── id (UUID, PK)
├── ea_instance_id (FK)
├── ticket (from MT5)
├── symbol
├── direction (BUY|SELL)
├── strategy
├── entry_price
├── entry_time
├── current_price
├── lot_size
├── stop_loss
├── take_profit
├── floating_pnl
├── risk_estimate
├── magic_number
├── data (JSON - full MT5 position data)
└── updated_at

Trade
├── id (UUID, PK)
├── ea_instance_id (FK)
├── ticket (from MT5)
├── position_id (FK to Position, nullable)
├── symbol
├── direction (BUY|SELL)
├── strategy
├── entry_price
├── entry_time
├── exit_price
├── exit_time
├── lot_size
├── profit_loss
├── commission
├── swap
├── entry_reason
├── exit_reason
├── duration_minutes
├── risk_at_entry
├── data (JSON - full MT5 deal data)
└── created_at

Command
├── id (UUID, PK)
├── ea_instance_id (FK)
├── type (CLOSE_POSITION|MODIFY_SL_TP|PAUSE|RESUME|etc)
├── status (PENDING|ACKNOWLEDGED|EXECUTED|FAILED)
├── params (JSON)
├── result (JSON)
├── created_at
├── acknowledged_at
├── completed_at
├── expires_at
└── updated_at

ActivityLog
├── id (UUID, PK)
├── ea_instance_id (FK)
├── event_type (EA_START|ORDER_EXECUTED|POSITION_CLOSED|etc)
├── severity (INFO|WARN|ERROR)
├── symbol
├── strategy
├── message
├── data (JSON)
├── created_at

Notification
├── id (UUID, PK)
├── user_id (FK)
├── type (EA_START|MARKET_CHANGE|ORDER_EXECUTED|etc)
├── channel (IN_APP|BROWSER|TELEGRAM)
├── status (SENT|FAILED|DISMISSED)
├── data (JSON)
├── created_at

BacktestResult
├── id (UUID, PK)
├── user_id (FK)
├── strategy
├── config (JSON)
├── symbol
├── date_from
├── date_to
├── total_trades
├── wins
├── losses
├── profit_factor
├── max_drawdown
├── avg_winner
├── avg_loser
├── data (JSON - full backtest stats)
├── created_at
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Create account
- `POST /api/auth/login` - Login and get token
- `POST /api/auth/logout` - Logout
- `POST /api/auth/refresh` - Refresh token
- `POST /api/auth/change-password` - Change password

### EA Management
- `POST /api/ea` - Register new EA instance
- `GET /api/ea` - List user's EAs
- `GET /api/ea/:id` - Get EA details
- `DELETE /api/ea/:id` - Delete EA
- `POST /api/ea/:id/regenerate-key` - Rotate API key

### Bot State & Dashboard
- `GET /api/bot/:eaId/state` - Get current state
- `GET /api/bot/:eaId/positions` - Get open positions
- `GET /api/bot/:eaId/account-info` - Get account summary
- `GET /api/bot/:eaId/market-analysis` - Get market analysis
- `GET /api/bot/:eaId/health` - Get system health

### Settings
- `GET /api/settings/:eaId` - Get current settings
- `PUT /api/settings/:eaId` - Update settings
- `GET /api/settings/:eaId/history` - Settings change history

### Commands
- `POST /api/commands/:eaId` - Submit command (close position, modify SL/TP, etc)
- `GET /api/commands/:eaId` - List pending commands
- `GET /api/commands/:eaId/:commandId` - Get command status

### Strategies
- `GET /api/strategies/:eaId` - List strategies
- `PUT /api/strategies/:eaId/:strategyName` - Update strategy config
- `GET /api/strategies/:eaId/:strategyName/backtest` - Get backtest results

### Trade History
- `GET /api/trades/:eaId` - Get closed trades with filters
- `GET /api/trades/:eaId/analytics` - Get performance analytics
- `GET /api/trades/:eaId/:tradeId` - Get trade details

### Activity & Notifications
- `GET /api/activity/:eaId` - Get activity log
- `GET /api/notifications` - Get user notifications
- `PUT /api/notifications/:id` - Mark notification as read
- `PUT /api/notifications/preferences` - Update notification prefs

### MT5 Integration (EA endpoints)
- `POST /api/mt5/heartbeat` - EA sends heartbeat + state
- `GET /api/mt5/commands/:apiKey` - EA polls for commands
- `POST /api/mt5/command-result/:apiKey` - EA reports command result
- `POST /api/mt5/trade-update/:apiKey` - EA sends order/position updates

## Real-time Events (Socket.IO)

```
Server → Client:
- bot:state-changed
- bot:position-opened
- bot:position-closed
- bot:position-updated
- bot:command-executed
- bot:market-analysis-updated
- bot:strategy-changed
- bot:notification
- bot:health-status

Client → Server:
- (authenticated, commands are REST-only for audit trail)
```

## Security Model

```
User
  ├─ Login (bcrypt hashed password)
  ├─ JWT token (expires in 24h)
  └─ Refresh token (expires in 7d)

EA Instance
  ├─ API Key (generated, used for MT5 auth)
  ├─ HMAC-SHA256 request signing (for EA commands)
  └─ Rate limiting (10 heartbeats/min, 100 commands/day)

Commands
  ├─ Unique ID (prevent duplicates)
  ├─ Expiration (30 seconds default)
  ├─ Audit logged (who, when, what, result)
  └─ Confirmation required for high-risk actions
```

## MT5 EA Integration Flow

```
1. EA starts → generates session ID
2. Every 5-10s: EA sends heartbeat with account state
3. Backend receives heartbeat, validates API key, broadcasts to UI
4. UI sends command (REST API) → stored in DB with PENDING status
5. EA polls (every ~5s) with GET /api/mt5/commands/:apiKey
6. Backend returns pending commands
7. EA executes command in MT5, records result
8. EA sends POST /api/mt5/command-result with status + outcome
9. Backend updates command to ACKNOWLEDGED/EXECUTED/FAILED
10. Backend broadcasts result to UI (Socket.IO)
11. UI updates position state or settings
12. If offline > 30s: mark EA as DISCONNECTED, notify user
13. When EA reconnects: full state sync, no duplicate orders
```

## Deployment Architecture

### Development
```
localhost:3000 (frontend)
localhost:5000 (backend)
localhost:5432 (postgres)
MT5 on local/network machine
```

### Production
```
Frontend: Deployed to Vercel/AWS/Digital Ocean (static)
Backend: Node.js on AWS/Heroku/VPS (auto-scaling)
Database: RDS PostgreSQL (managed)
SSL: Let's Encrypt (HTTPS mandatory)
Auth: JWT (secure, httpOnly cookies for refresh token)
```

## Key Design Principles

1. **Never fabricate trading data** - Only real MT5 state shown
2. **Command audit trail** - Every action logged with timestamp, user, result
3. **Fail-safe defaults** - Martingale disabled, conservative risk limits
4. **Idempotent operations** - Repeated commands don't duplicate trades
5. **Real-time without data loss** - Queue-based command handling
6. **Clear status transitions** - User always knows what bot is doing
7. **Protective stops** - Never remove SL without explicit confirmation
8. **Offline resilience** - EA continues with SL/TP even if backend down
9. **Rate limiting** - Prevent abuse and excessive polling
10. **Encrypted credentials** - API keys, secrets in .env only
