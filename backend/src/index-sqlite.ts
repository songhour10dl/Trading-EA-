import express from 'express'
import cors from 'cors'
import { createServer } from 'http'
import { Server as SocketIOServer } from 'socket.io'
import { v4 as uuidv4 } from 'uuid'
import bcrypt from 'bcrypt'
import Database from 'better-sqlite3'
import path from 'path'

const app = express()
const httpServer = createServer(app)
const io = new SocketIOServer(httpServer, {
  cors: { origin: '*', credentials: true },
})

// Initialize SQLite Database
const dbPath = path.join(process.cwd(), 'trading_bot.db')
const db = new Database(dbPath)
db.pragma('journal_mode = WAL')

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS ea_instances (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    api_key TEXT UNIQUE NOT NULL,
    display_name TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS bot_state (
    id TEXT PRIMARY KEY,
    ea_instance_id TEXT UNIQUE NOT NULL,
    status TEXT DEFAULT 'DISCONNECTED',
    trading_status TEXT DEFAULT 'WAITING_FOR_SIGNAL',
    active_strategy TEXT,
    last_heartbeat DATETIME,
    account_balance REAL DEFAULT 0,
    account_equity REAL DEFAULT 0,
    margin_level REAL DEFAULT 0,
    free_margin REAL DEFAULT 0,
    open_positions_count INTEGER DEFAULT 0,
    floating_pnl REAL DEFAULT 0,
    daily_realized_pnl REAL DEFAULT 0,
    current_spread REAL DEFAULT 0,
    market_state TEXT DEFAULT 'UNKNOWN',
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (ea_instance_id) REFERENCES ea_instances(id)
  );
`)

// Middleware
app.use(cors())
app.use(express.json())

// ===== AUTHENTICATION =====

// Helper function to get user by email
const getUserByEmail = (email: string) => {
  const stmt = db.prepare('SELECT * FROM users WHERE email = ?')
  return stmt.get(email) as any
}

// Helper function to get user by username
const getUserByUsername = (username: string) => {
  const stmt = db.prepare('SELECT * FROM users WHERE username = ?')
  return stmt.get(username) as any
}

// Helper function to get user by ID
const getUserById = (id: string) => {
  const stmt = db.prepare('SELECT * FROM users WHERE id = ?')
  return stmt.get(id) as any
}

// Register
app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, email, password } = req.body

    if (!username || !email || !password) {
      return res.status(400).json({ error: 'Missing required fields' })
    }

    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' })
    }

    // Check if user already exists
    if (getUserByEmail(email)) {
      return res.status(409).json({ error: 'Email already exists' })
    }

    if (getUserByUsername(username)) {
      return res.status(409).json({ error: 'Username already exists' })
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10)
    const userId = uuidv4()

    // Insert user
    const stmt = db.prepare(`
      INSERT INTO users (id, username, email, password_hash)
      VALUES (?, ?, ?, ?)
    `)
    stmt.run(userId, username, email, passwordHash)

    // Get user
    const user = getUserById(userId)

    // Generate token
    const token = 'token-' + uuidv4()

    res.status(201).json({
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
      },
      accessToken: token,
    })
  } catch (error) {
    console.error('Register error:', error)
    res.status(500).json({ error: 'Registration failed' })
  }
})

// Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body

    if (!email || !password) {
      return res.status(400).json({ error: 'Missing email or password' })
    }

    // Get user by email
    const user = getUserByEmail(email)
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' })
    }

    // Verify password
    const isValid = await bcrypt.compare(password, user.password_hash)
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid email or password' })
    }

    // Generate token
    const token = 'token-' + uuidv4()

    res.json({
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
      },
      accessToken: token,
    })
  } catch (error) {
    console.error('Login error:', error)
    res.status(500).json({ error: 'Login failed' })
  }
})

app.post('/api/auth/logout', (req, res) => {
  res.json({ message: 'Logged out' })
})

// ===== EA MANAGEMENT =====
app.get('/api/ea', (req, res) => {
  try {
    const stmt = db.prepare('SELECT * FROM ea_instances LIMIT 1')
    const ea = stmt.get() as any
    res.json(ea ? [ea] : [])
  } catch (error) {
    res.status(500).json({ error: 'Failed to get EA' })
  }
})

app.post('/api/ea', (req, res) => {
  try {
    const { displayName } = req.body
    const eaId = uuidv4()
    const apiKey = uuidv4()
    const userId = 'user1' // In real app, get from auth token

    const stmt = db.prepare(`
      INSERT INTO ea_instances (id, user_id, api_key, display_name)
      VALUES (?, ?, ?, ?)
    `)
    stmt.run(eaId, userId, apiKey, displayName || 'Trading Bot')

    // Create bot state
    const botStateStmt = db.prepare(`
      INSERT INTO bot_state (id, ea_instance_id)
      VALUES (?, ?)
    `)
    botStateStmt.run(uuidv4(), eaId)

    res.status(201).json({
      id: eaId,
      apiKey: apiKey,
      displayName: displayName || 'Trading Bot',
    })
  } catch (error) {
    console.error('EA creation error:', error)
    res.status(500).json({ error: 'Failed to create EA' })
  }
})

// ===== BOT STATE & DASHBOARD =====
app.get('/api/bot/:eaId/state', (req, res) => {
  try {
    const stmt = db.prepare('SELECT * FROM bot_state WHERE ea_instance_id = ?')
    const state = stmt.get(req.params.eaId)
    res.json(state || {})
  } catch (error) {
    res.status(500).json({ error: 'Failed to get bot state' })
  }
})

app.get('/api/bot/:eaId/positions', (req, res) => {
  res.json([])
})

app.get('/api/bot/:eaId/account-info', (req, res) => {
  try {
    const stmt = db.prepare('SELECT * FROM bot_state WHERE ea_instance_id = ?')
    const state = stmt.get(req.params.eaId) as any
    res.json({
      accountBalance: state?.account_balance || 50000,
      accountEquity: state?.account_equity || 50000,
      marginLevel: state?.margin_level || 0,
      freeMargin: state?.free_margin || 50000,
      openPositionsCount: state?.open_positions_count || 0,
      floatingPnl: state?.floating_pnl || 0,
      dailyRealizedPnl: state?.daily_realized_pnl || 0,
      currentSpread: state?.current_spread || 2.5,
    })
  } catch (error) {
    res.status(500).json({ error: 'Failed to get account info' })
  }
})

app.get('/api/bot/:eaId/market-analysis', (req, res) => {
  try {
    const stmt = db.prepare('SELECT * FROM bot_state WHERE ea_instance_id = ?')
    const state = stmt.get(req.params.eaId) as any
    res.json({
      marketState: state?.market_state || 'UNKNOWN',
      marketAnalysisTime: state?.last_heartbeat,
      tradingStatus: state?.trading_status || 'WAITING_FOR_SIGNAL',
    })
  } catch (error) {
    res.status(500).json({ error: 'Failed to get market analysis' })
  }
})

app.get('/api/bot/:eaId/health', (req, res) => {
  try {
    const stmt = db.prepare('SELECT * FROM bot_state WHERE ea_instance_id = ?')
    const state = stmt.get(req.params.eaId) as any
    res.json({
      status: state?.status || 'DISCONNECTED',
      lastHeartbeat: state?.last_heartbeat,
      isHealthy: state?.status === 'RUNNING',
    })
  } catch (error) {
    res.status(500).json({ error: 'Failed to get health' })
  }
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
  res.status(201).json({
    id: uuidv4(),
    type: req.body.type,
    status: 'PENDING',
    createdAt: new Date(),
  })
})

app.get('/api/commands/:eaId', (req, res) => {
  res.json([])
})

// ===== MT5 INTEGRATION =====
app.post('/api/mt5/heartbeat', (req, res) => {
  try {
    const apiKey = req.body.apiKey
    const state = req.body.state

    // Update bot state
    const stmt = db.prepare(`
      UPDATE bot_state
      SET status = ?, trading_status = ?, account_balance = ?, 
          account_equity = ?, floating_pnl = ?, last_heartbeat = CURRENT_TIMESTAMP
      WHERE ea_instance_id = (
        SELECT id FROM ea_instances WHERE api_key = ?
      )
    `)
    stmt.run(
      state?.status || 'RUNNING',
      state?.tradingStatus || 'WAITING_FOR_SIGNAL',
      state?.accountBalance || 50000,
      state?.accountEquity || 50000,
      state?.floatingPnl || 0,
      apiKey
    )

    io.emit('bot:state-changed', state)
    res.json({ acknowledged: true, timestamp: Date.now() })
  } catch (error) {
    console.error('Heartbeat error:', error)
    res.status(500).json({ error: 'Failed to process heartbeat' })
  }
})

app.get('/api/mt5/commands/:apiKey', (req, res) => {
  res.json({ commands: [] })
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
  console.log(`💾 Database: ${dbPath}`)
  console.log(`📝 Now accepting registrations and logins!`)
})

export default app
