import express from 'express'
import cors from 'cors'
import { createServer } from 'http'
import { Server as SocketIOServer } from 'socket.io'
import { v4 as uuidv4 } from 'uuid'

const app = express()
const httpServer = createServer(app)
const io = new SocketIOServer(httpServer, {
  cors: { origin: '*', credentials: true },
})

// Simple in-memory store
const store: any = {
  user: { id: 'user1', username: 'demo', email: 'demo@example.com' },
  ea: {
    id: 'ea1',
    userId: 'user1',
    apiKey: 'demo-api-key-12345',
    displayName: 'Demo Bot',
  },
  botState: {
    id: 'bot1',
    eaInstanceId: 'ea1',
    status: 'DISCONNECTED',
    tradingStatus: 'WAITING_FOR_SIGNAL',
    activeStrategy: 'sideways',
    lastHeartbeat: null,
    accountBalance: 50000,
    accountEquity: 50000,
    marginLevel: 0,
    freeMargin: 50000,
    openPositionsCount: 0,
    floatingPnl: 0,
    dailyRealizedPnl: 0,
    currentSpread: 2.5,
    marketState: 'UNKNOWN',
  },
  positions: [],
  commands: [],
}

// Middleware
app.use(cors())
app.use(express.json())

// ===== SIMPLIFIED AUTH (NO DATABASE) =====
app.post('/api/auth/register', (req, res) => {
  const { username, email, password } = req.body
  if (!username || !email || !password) {
    return res.status(400).json({ error: 'Missing fields' })
  }
  const token = 'token-' + uuidv4()
  store.user = { id: uuidv4(), username, email }
  res.json({ user: store.user, accessToken: token })
})

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body
  if (!email || !password) {
    return res.status(400).json({ error: 'Missing fields' })
  }
  const token = 'token-' + uuidv4()
  res.json({ user: store.user, accessToken: token })
})

app.post('/api/auth/logout', (req, res) => {
  res.json({ message: 'Logged out' })
})

// ===== EA MANAGEMENT =====
app.get('/api/ea', (req, res) => {
  res.json([store.ea])
})

app.post('/api/ea', (req, res) => {
  const newEA = {
    id: uuidv4(),
    userId: store.user.id,
    apiKey: uuidv4(),
    displayName: req.body.displayName || 'Trading Bot',
  }
  store.ea = newEA
  res.status(201).json(newEA)
})

// ===== BOT STATE & DASHBOARD =====
app.get('/api/bot/:eaId/state', (req, res) => {
  res.json(store.botState)
})

app.get('/api/bot/:eaId/positions', (req, res) => {
  res.json(store.positions)
})

app.get('/api/bot/:eaId/account-info', (req, res) => {
  res.json({
    accountBalance: store.botState.accountBalance,
    accountEquity: store.botState.accountEquity,
    marginLevel: store.botState.marginLevel,
    freeMargin: store.botState.freeMargin,
    openPositionsCount: store.botState.openPositionsCount,
    floatingPnl: store.botState.floatingPnl,
    dailyRealizedPnl: store.botState.dailyRealizedPnl,
    currentSpread: store.botState.currentSpread,
  })
})

app.get('/api/bot/:eaId/market-analysis', (req, res) => {
  res.json({
    marketState: store.botState.marketState,
    marketAnalysisTime: store.botState.lastHeartbeat,
    tradingStatus: store.botState.tradingStatus,
  })
})

app.get('/api/bot/:eaId/health', (req, res) => {
  res.json({
    status: store.botState.status,
    lastHeartbeat: store.botState.lastHeartbeat,
    isHealthy: store.botState.status === 'RUNNING',
  })
})

// ===== SETTINGS =====
app.get('/api/settings/:eaId', (req, res) => {
  res.json({
    symbol: 'XAUUSD',
    tradingEnabled: false,
    riskPercentage: 1.0,
    maxSpread: 5.0,
  })
})

app.put('/api/settings/:eaId', (req, res) => {
  res.json({ message: 'Settings updated' })
})

// ===== COMMANDS =====
app.post('/api/commands/:eaId', (req, res) => {
  const command = {
    id: uuidv4(),
    type: req.body.type,
    status: 'PENDING',
    createdAt: new Date(),
  }
  store.commands.push(command)
  res.status(201).json(command)
})

app.get('/api/commands/:eaId', (req, res) => {
  res.json(store.commands.filter((c: any) => c.status === 'PENDING'))
})

// ===== MT5 INTEGRATION =====
app.post('/api/mt5/heartbeat', (req, res) => {
  store.botState.status = 'RUNNING'
  store.botState.lastHeartbeat = new Date()
  store.botState.accountBalance = req.body.state?.accountBalance || 50000
  store.botState.accountEquity = req.body.state?.accountEquity || 50000
  store.botState.floatingPnl = req.body.state?.floatingPnl || 0
  
  // Broadcast to connected clients
  io.emit('bot:state-changed', store.botState)
  
  res.json({ acknowledged: true, timestamp: Date.now() })
})

app.get('/api/mt5/commands/:apiKey', (req, res) => {
  res.json({ commands: store.commands })
})

app.post('/api/mt5/command-result/:apiKey', (req, res) => {
  res.json({ acknowledged: true })
})

// ===== HEALTH CHECK =====
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() })
})

// ===== SOCKET.IO =====
io.on('connection', (socket) => {
  console.log(`✅ Client connected: ${socket.id}`)

  socket.on('subscribe:bot', (eaId: string) => {
    socket.join(`bot:${eaId}`)
  })

  socket.on('disconnect', () => {
    console.log(`❌ Client disconnected: ${socket.id}`)
  })
})

// ===== START SERVER =====
const PORT = 5000
httpServer.listen(PORT, () => {
  console.log(`✅ Backend running on http://localhost:${PORT}`)
  console.log(`📝 Demo credentials:`)
  console.log(`   Username: demo`)
  console.log(`   Password: demo (anything works)`)
  console.log(`🔑 API Key: demo-api-key-12345`)
})

export default app
