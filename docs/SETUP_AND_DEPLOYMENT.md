# MT5 Gold Trading Bot - Setup & Deployment Guide

## Quick Start

### Prerequisites

- Node.js 18+ with npm
- PostgreSQL 14+
- MetaTrader 5 terminal
- Windows machine or VPS for MT5 EA

### Backend Setup (5 minutes)

```bash
cd backend
npm install
npx prisma generate
npx prisma migrate dev --name init
```

Create `.env` file:

```
DATABASE_URL="postgresql://user:password@localhost:5432/mt5_trading_bot"
NODE_ENV="development"
PORT=5000
FRONTEND_URL="http://localhost:3000"
JWT_SECRET="your-random-secret-key-here"
JWT_REFRESH_SECRET="your-random-refresh-secret"
MT5_EA_SECRET="your-random-ea-secret-key"
```

Start backend:

```bash
npm run dev
```

The backend will be available at `http://localhost:5000`

### Frontend Setup (5 minutes)

```bash
cd frontend
npm install
```

Create `.env.local`:

```
VITE_API_URL="http://localhost:5000"
VITE_SOCKET_IO_URL="http://localhost:5000"
```

Start frontend:

```bash
npm run dev
```

The frontend will be available at `http://localhost:3000`

### MT5 EA Setup (10 minutes)

1. **Open MetaTrader 5 and navigate to the Expert Advisors folder:**
   - File → Open Data Folder → MQL5 → Experts
   - Copy `GoldTradingBot.mq5` to this folder

2. **Configure WebRequest Whitelist:**
   - Tools → Options → Expert Advisors
   - Check "Allow WebRequests for listed URLs"
   - Add: `http://localhost:5000`
   - Also add: `https://your-production-domain.com` for production

3. **Create a new chart for XAUUSD:**
   - Right-click symbol list → Symbols
   - Find and enable XAUUSD
   - Create a chart: Insert → Chart → XAUUSD, H1

4. **Attach the EA to the chart:**
   - Drag GoldTradingBot.mq5 from Navigator onto the chart
   - Or right-click chart → Expert Advisors → Attach Expert Advisor

5. **Configure EA Parameters:**
   - In the Expert Advisor dialog, set:
     - `EAName`: "My Trading Bot"
     - `MagicNumber`: 20260516 (unique identifier)
     - `BackendURL`: "http://localhost:5000"
     - `ApiKey`: Generate from dashboard
     - `TradingEnabled`: false (start disabled)
     - `RiskPercentage`: 1.0
     - `MaxSpread`: 5.0
     - `HeartbeatInterval`: 10

6. **Enable EA:**
   - Ensure "AutoTrading" is enabled in MT5 (top toolbar)
   - Click "Allow" when prompted for WebRequest permission

## Testing Workflow

### 1. Test Backend API

```bash
# Register user
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","email":"test@example.com","password":"password123"}'

# Login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","password":"password123"}'

# Create EA instance
curl -X POST http://localhost:5000/api/ea \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"displayName":"My Trading Bot"}'
```

### 2. Test Frontend Dashboard

- Open http://localhost:3000
- Register and login
- Create an EA instance
- Copy the API Key
- Put the API Key in MT5 EA settings

### 3. Test MT5 Integration

- Start MT5 with the EA attached
- Check the Expert tab in MT5 for connection logs
- The dashboard should show "CONNECTED" within 30 seconds
- You should see account data updating in real-time

### 4. Test Command Execution

- From the dashboard, try to:
  - Pause/Resume trading
  - Close a position (if one exists in demo)
  - Update settings
- Watch the MT5 Expert tab to see commands being processed

## Production Deployment

### Backend Deployment (AWS/Heroku/VPS)

```bash
# Build
npm run build

# Deploy to cloud (example with Heroku)
heroku create mt5-trading-bot
git push heroku main

# Set environment variables
heroku config:set DATABASE_URL="your-prod-db-url"
heroku config:set JWT_SECRET="your-production-secret"
```

### Frontend Deployment (Vercel/Netlify)

```bash
npm run build
# Deploy dist/ folder to Vercel/Netlify
```

### Database

For production, use a managed PostgreSQL service:

- AWS RDS
- DigitalOcean Managed Databases
- Azure Database for PostgreSQL
- Heroku Postgres

### SSL/HTTPS

- Use Let's Encrypt for free SSL certificates
- Configure HTTPS in production (.env: `FRONTEND_URL="https://..."`)
- Update MT5 EA WebRequest URL to HTTPS

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                 User's Browser                          │
│  (React Dashboard - http://localhost:3000)              │
└────────────┬────────────────────────────────────────────┘
             │ REST API + WebSocket
             │ (Socket.IO)
             │
┌────────────▼────────────────────────────────────────────┐
│        Backend Server (Node.js + Express)               │
│        (http://localhost:5000)                          │
├─────────────────────────────────────────────────────────┤
│  • User Authentication                                  │
│  • Command Queue & Processing                          │
│  • Real-time Broadcasting                              │
│  • Activity Logging                                    │
│  • Risk Management Validation                          │
└────────┬────────────────────┬───────────────────────────┘
         │                    │
    ┌────▼────┐       ┌───────▼────────┐
    │PostgreSQL│       │Background Jobs │
    │Database  │       │& Task Queue    │
    └──────────┘       └────────────────┘
         ▲
         │ HTTPS Requests
         │ (Heartbeat + Command Polling)
         │
┌────────┴────────────────────────────────────────────────┐
│    MetaTrader 5 Terminal (Windows PC/VPS)               │
├─────────────────────────────────────────────────────────┤
│  • Expert Advisor (MQL5)                               │
│  • Indicator Calculations                              │
│  • Order Execution                                     │
│  • Account Data Collection                             │
│  • Risk Controls & Protective Stops                    │
└─────────────────────────────────────────────────────────┘
```

## Security Checklist

- [ ] Change all default secrets in `.env`
- [ ] Enable HTTPS for production
- [ ] Use environment variables for all sensitive data
- [ ] Rotate API keys regularly
- [ ] Enable rate limiting on backend
- [ ] Add request signing with HMAC-SHA256
- [ ] Log all trading commands with user info
- [ ] Implement audit trail for sensitive actions
- [ ] Use secure cookies (httpOnly, secure, sameSite)
- [ ] Validate all user input on backend
- [ ] Implement CORS properly (restrict to your domain)
- [ ] Monitor for suspicious activity
- [ ] Regular backups of PostgreSQL database
- [ ] Never log sensitive data (passwords, API keys)

## Troubleshooting

### Backend won't start

```bash
# Check if port 5000 is in use
netstat -ano | findstr :5000

# Check database connection
npx prisma db push --force-reset
```

### MT5 EA can't connect

- Check firewall allows outbound HTTPS connections
- Verify `BackendURL` in EA settings
- Check WebRequest URL whitelist in MT5
- Look at MT5 Expert tab for error messages
- Ensure `AutoTrading` is enabled

### Dashboard shows "DISCONNECTED"

- Check if MT5 is running with EA attached
- Verify API key matches in both EA and dashboard
- Check backend logs for connection errors
- Ensure heartbeat interval is not too long

### Commands not executing

- Verify EA status is "RUNNING" (not "PAUSED" or "STOPPED")
- Check command hasn't expired (30-second default timeout)
- Look at MT5 Journal tab for MT5 errors
- Verify position exists before trying to close it

### Performance issues

- Check database query performance
- Monitor Socket.IO connections
- Reduce heartbeat frequency if needed
- Use database indexes on frequently queried fields

## API Documentation

### Authentication Endpoints

```
POST /api/auth/register
POST /api/auth/login
POST /api/auth/logout
POST /api/auth/refresh
POST /api/auth/change-password
```

### EA Management

```
POST /api/ea                                 # Create EA
GET /api/ea                                  # List EAs
GET /api/ea/:id                              # Get EA details
DELETE /api/ea/:id                           # Delete EA
POST /api/ea/:id/regenerate-key             # Rotate API key
```

### Bot State & Dashboard

```
GET /api/bot/:eaId/state                    # Get bot status
GET /api/bot/:eaId/positions                # Get open positions
GET /api/bot/:eaId/account-info             # Get account summary
GET /api/bot/:eaId/market-analysis          # Get market state
GET /api/bot/:eaId/health                   # Get system health
```

### Commands

```
POST /api/commands/:eaId                    # Submit command
GET /api/commands/:eaId                     # List pending commands
GET /api/commands/:eaId/:commandId          # Get command status
```

### Settings

```
GET /api/settings/:eaId                     # Get settings
PUT /api/settings/:eaId                     # Update settings
```

### Trade History

```
GET /api/trades/:eaId                       # Get trades with filters
GET /api/trades/:eaId/analytics             # Get performance metrics
```

### MT5 Integration (EA endpoints)

```
POST /api/mt5/heartbeat                     # EA sends heartbeat
GET /api/mt5/commands/:apiKey               # EA polls for commands
POST /api/mt5/command-result/:apiKey        # EA reports result
POST /api/mt5/trade-update/:apiKey          # EA sends trade updates
```

## Real-time Events (Socket.IO)

Subscribe to events in the dashboard:

```javascript
socket.on("bot:state-changed", (data) => {});
socket.on("bot:position-opened", (position) => {});
socket.on("bot:position-closed", (position) => {});
socket.on("bot:command-executed", (command) => {});
socket.on("bot:notification", (notification) => {});
```

## Support & Debugging

### Enable Debug Logging

Backend:

```
LOG_LEVEL=debug npm run dev
```

Frontend:

```
window.localStorage.debug = 'mt5-bot:*'
```

MT5:

- Check Expert tab in MT5 terminal for detailed logs
- Enable "Debugging" in EA settings

### Common Error Codes

| Code  | Meaning            | Solution                          |
| ----- | ------------------ | --------------------------------- |
| 401   | Invalid API Key    | Regenerate API key from dashboard |
| 403   | Forbidden          | Check user permissions            |
| 422   | Invalid Parameters | Validate command parameters       |
| 500   | Server Error       | Check backend logs                |
| 10061 | Connection Refused | Backend not running or wrong URL  |

## Next Steps

1. **Customize Strategies:** Modify MQL5 EA to implement your specific trading logic
2. **Add Risk Controls:** Adjust martingale settings and maximum drawdown limits
3. **Monitor Performance:** Use Trade History page to analyze results
4. **Deploy to Production:** Follow production deployment steps above
5. **Backup Data:** Set up regular database backups

---

For more information, see ARCHITECTURE.md and the source code comments.
