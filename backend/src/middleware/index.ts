import { Request, Response, NextFunction } from 'express';
import { verifyJWT } from '../utils/auth';
import { AuthPayload } from '../types';

export interface AuthenticatedRequest extends Request {
  user?: AuthPayload;
}

export const authMiddleware = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.log('[Auth] Missing or invalid authorization header:', authHeader);
    res.status(401).json({ error: 'Missing authorization token' });
    return;
  }

  const token = authHeader.split(' ')[1];

  if (!token) {
    console.log('[Auth] Token is empty after split');
    res.status(401).json({ error: 'Missing authorization token' });
    return;
  }

  const payload = verifyJWT(token);

  if (!payload) {
    console.log('[Auth] Token verification failed');
    res.status(401).json({ error: 'Invalid or expired token' });
    return;
  }

  req.user = payload;
  next();
};

export const eaApiKeyMiddleware = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
  const apiKey = req.headers['x-api-key'] as string;

  if (!apiKey) {
    res.status(401).json({ error: 'Missing API key' });
    return;
  }

  // API key will be verified in the MT5 routes
  (req as any).apiKey = apiKey;
  next();
};

export const errorHandler = (err: any, req: Request, res: Response, next: NextFunction): void => {
  console.error('Error occurred:', {
    name: err.name,
    message: err.message,
    stack: err.stack,
    code: err.code,
  });

  if (err.name === 'ValidationError') {
    res.status(400).json({ error: err.message });
    return;
  }

  if (err.name === 'UnauthorizedError') {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  // In development, send detailed error information
  if (process.env.NODE_ENV === 'development') {
    res.status(500).json({ 
      error: 'Internal server error',
      details: err.message,
      stack: err.stack 
    });
    return;
  }

  res.status(500).json({ error: 'Internal server error' });
};

export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
