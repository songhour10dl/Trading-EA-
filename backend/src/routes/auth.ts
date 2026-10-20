import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { hashPassword, verifyPassword, generateJWT, generateRefreshToken, verifyRefreshToken } from '../utils/auth';
import { asyncHandler, AuthenticatedRequest } from '../middleware';

const router = Router();

// Get in-memory data store
const getStores = () => (global as any).stores;

router.post(
  '/register',
  asyncHandler(async (req, res) => {
    const { username, email, password } = req.body;
    const stores = getStores();

    if (!username || !email || !password) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    // Check if user exists
    const existing = Object.values(stores.users).find((u: any) => u.username === username);
    if (existing) {
      return res.status(409).json({ error: 'Username already exists' });
    }

    const passwordHash = await hashPassword(password);
    const userId = uuidv4();
    
    stores.users[userId] = {
      id: userId,
      username,
      email,
      passwordHash,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const user = stores.users[userId];
    const accessToken = generateJWT({ userId: user.id, username: user.username });
    const refreshToken = generateRefreshToken({ userId: user.id, username: user.username });

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.json({
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
      },
      accessToken,
    });
  })
);

router.post(
  '/login',
  asyncHandler(async (req, res) => {
    const { username, password } = req.body;
    const stores = getStores();

    if (!username || !password) {
      return res.status(400).json({ error: 'Missing username or password' });
    }

    const user = Object.values(stores.users).find((u: any) => u.username === username) as any;
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isValid = await verifyPassword(password, user.passwordHash);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const accessToken = generateJWT({ userId: user.id, username: user.username });
    const refreshToken = generateRefreshToken({ userId: user.id, username: user.username });

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.json({
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
      },
      accessToken,
    });
  })
);

router.post(
  '/refresh',
  asyncHandler(async (req, res) => {
    const refreshToken = req.cookies.refreshToken || req.body.refreshToken;

    if (!refreshToken) {
      return res.status(401).json({ error: 'Missing refresh token' });
    }

    const payload = verifyRefreshToken(refreshToken);
    if (!payload) {
      return res.status(401).json({ error: 'Invalid refresh token' });
    }

    const stores = getStores();
    const user = stores.users[payload.userId];
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    const accessToken = generateJWT({ userId: user.id, username: user.username });

    res.json({ accessToken });
  })
);

router.post(
  '/logout',
  asyncHandler(async (req, res) => {
    res.clearCookie('refreshToken');
    res.json({ message: 'Logged out' });
  })
);

router.post(
  '/change-password',
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user?.userId;
    const stores = getStores();

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    const user = stores.users[userId];
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const isValid = await verifyPassword(currentPassword, user.passwordHash);
    if (!isValid) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    const passwordHash = await hashPassword(newPassword);
    user.passwordHash = passwordHash;
    user.updatedAt = new Date();

    res.json({ message: 'Password changed successfully' });
  })
);

export default router;
