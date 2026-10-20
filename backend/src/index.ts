import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import { createServer } from 'http'
import { Server as SocketIOServer } from 'socket.io'
import 'express-async-errors'

import config from './config'
import { errorHandler, authMiddleware, asyncHandler } from './middleware'
import { PrismaClient } from '@prisma/client'
import { hashPassword, verifyPassword, generateJWT, generateRefreshToken } from './utils/auth'
import { v4 as uuidv4 } from 'uuid'

const prisma = new PrismaClient()

// Routes
import authRoutes from './routes/auth'
import eaRoutes from './routes/ea'
import botRoutes from './routes/bot'
import commandRoutes from './routes/commands'
import settingsRoutes from './routes/settings'
import mt5Routes from './routes/mt5'
import tradesRoutes from './routes/trades'
import activityRoutes from './routes/activity'
import positionsRoutes from './routes/positions'

const app = express()
const httpServer = createServer(app)
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: config.frontendUrl,
    credentials: true,
  },
})

// Middleware
app.use(cors({
  origin: [config.frontendUrl, 'http://tradingbot.local:5000', 'http://tradingbot.local:3000'],
  credentials: true,
}))
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(cookieParser())

;(global as any).io = io
;(global as any).prisma = prisma

// ===== CUSTOM AUTH ROUTES (Using Prisma) =====

app.post('/api/auth/register', asyncHandler(async (req, res) => {
  const { username, email, password } = req.body

  if (!username || !email || !password) {
    return res.status(400).json({ error: 'Missing required fields' })
  }

  if (password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters' })
  }

  // Check if user exists
  const existingUser = await prisma.user.findFirst({
    where: {
      OR: [
        { email: email },
        { username: username }
      ]
    }
  })

  if (existingUser) {
    if (existingUser.email === email) {
      return res.status(409).json({ error: 'Email already exists' })
    }
    if (existingUser.username === username) {
      return res.status(409).json({ error: 'Username already exists' })
    }
  }

  // Hash password
  const passwordHash = await hashPassword(password)

  // Create user
  const user = await prisma.user.create({
    data: {
      username,
      email,
      passwordHash,
    },
    select: {
      id: true,
      username: true,
      email: true,
    }
  })

  // Generate tokens
  const accessToken = generateJWT({ userId: user.id, username: user.username })
  const refreshToken = generateRefreshToken({ userId: user.id, username: user.username })

  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  })

  res.status(201).json({
    user,
    accessToken,
  })
}))

app.post('/api/auth/login', asyncHandler(async (req, res) => {
  const { email, password } = req.body

  if (!email || !password) {
    return res.status(400).json({ error: 'Missing email or password' })
  }

  // Get user by email
  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      username: true,
      email: true,
      passwordHash: true,
    }
  })

  if (!user) {
    return res.status(401).json({ error: 'Invalid email or password' })
  }

  // Verify password
  const isValid = await verifyPassword(password, user.passwordHash)
  if (!isValid) {
    return res.status(401).json({ error: 'Invalid email or password' })
  }

  // Generate tokens
  const accessToken = generateJWT({ userId: user.id, username: user.username })
  const refreshToken = generateRefreshToken({ userId: user.id, username: user.username })

  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  })

  res.json({
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
    },
    accessToken,
  })
}))

app.post('/api/auth/logout', (req, res) => {
  res.clearCookie('refreshToken')
  res.json({ message: 'Logged out' })
})

app.post('/api/auth/change-password', authMiddleware, asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body
  const userId = (req as any).user?.userId

  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'Missing required fields' })
  }

  if (newPassword.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters' })
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      passwordHash: true,
    }
  })

  if (!user) {
    return res.status(404).json({ error: 'User not found' })
  }

  const isValid = await verifyPassword(currentPassword, user.passwordHash)
  if (!isValid) {
    return res.status(401).json({ error: 'Current password is incorrect' })
  }

  const passwordHash = await hashPassword(newPassword)
  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash },
  })

  res.json({ message: 'Password changed successfully' })
}))

// ===== OTHER API ROUTES =====
app.use('/api/ea', eaRoutes)
app.use('/api/bot', botRoutes)
app.use('/api/commands', commandRoutes)
app.use('/api/settings', settingsRoutes)
app.use('/api/mt5', mt5Routes)

app.use('/api/trades', tradesRoutes)
app.use('/api/activity', activityRoutes)
app.use('/api/positions', positionsRoutes)

app.get('/api/market/analysis', authMiddleware, asyncHandler(async (req, res) => {
  const userId = (req as any).user?.userId
  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const eas = await prisma.eAInstance.findMany({
    where: { userId },
    include: { botState: true },
    take: 1,
  })

  if (eas.length === 0) {
    return res.json({ data: [] })
  }

  const botState = eas[0].botState
  res.json({
    data: botState ? [{
      symbol: 'XAUUSD',
      trend: 'neutral',
      support: [],
      resistance: [],
      indicators: {
        rsi: 0,
        macd: 0,
        ma20: 0,
        bbands: { upper: 0, middle: 0, lower: 0 },
      },
      tradeEligible: false,
      reason: botState.marketState || 'Waiting for MT5 EA data',
    }] : [],
  })
}))

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date(),
    environment: config.nodeEnv,
  })
})

// Socket.IO Events
io.on('connection', (socket) => {
  console.log(`✅ Client connected: ${socket.id}`)

  socket.on('subscribe:bot', (eaId: string) => {
    socket.join(`bot:${eaId}`)
    console.log(`📡 Client subscribed to bot:${eaId}`)
  })

  socket.on('disconnect', () => {
    console.log(`❌ Client disconnected: ${socket.id}`)
  })
})

// Error handling
app.use(errorHandler)

// Start server
const port = config.port
httpServer.listen(port, '0.0.0.0', async () => {
  console.log(`✅ Backend running on http://localhost:${port}`)
  console.log(`📊 Frontend URL: ${config.frontendUrl}`)
  console.log(`🌍 Environment: ${config.nodeEnv}`)
  console.log(`💾 Database: PostgreSQL (Prisma ORM)`)
  
  try {
    await prisma.$connect()
    console.log(`✅ Database connected successfully`)
  } catch (error) {
    console.error('❌ Database connection failed:', error)
  }
})

// Graceful shutdown
process.on('SIGINT', async () => {
  await prisma.$disconnect()
  process.exit(0)
})

export default app
