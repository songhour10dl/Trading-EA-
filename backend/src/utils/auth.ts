import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import config from '../config';
import { AuthPayload } from '../types';

export const generateApiKey = (): string => {
  return crypto.randomBytes(32).toString('hex');
};

export const generateApiKeySignature = (apiKey: string, payload: any, secret: string): string => {
  const message = JSON.stringify(payload);
  return crypto.createHmac('sha256', secret).update(`${apiKey}:${message}`).digest('hex');
};

export const verifyApiKeySignature = (apiKey: string, payload: any, signature: string, secret: string): boolean => {
  const expectedSignature = generateApiKeySignature(apiKey, payload, secret);
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature));
};

export const hashPassword = async (password: string): Promise<string> => {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
};

export const verifyPassword = async (password: string, hash: string): Promise<boolean> => {
  return bcrypt.compare(password, hash);
};

export const generateJWT = (payload: AuthPayload, expiresIn = config.jwtExpiresIn): string => {
  return jwt.sign(payload, config.jwtSecret, { expiresIn });
};

export const generateRefreshToken = (payload: AuthPayload): string => {
  return jwt.sign(payload, config.jwtRefreshSecret, { expiresIn: config.jwtRefreshExpiresIn });
};

export const verifyJWT = (token: string): AuthPayload | null => {
  try {
    return jwt.verify(token, config.jwtSecret) as AuthPayload;
  } catch (error) {
    return null;
  }
};

export const verifyRefreshToken = (token: string): AuthPayload | null => {
  try {
    return jwt.verify(token, config.jwtRefreshSecret) as AuthPayload;
  } catch (error) {
    return null;
  }
};

export const generateCommandId = (): string => {
  return uuidv4();
};

export const getCommandExpiration = (secondsFromNow = 30): Date => {
  return new Date(Date.now() + secondsFromNow * 1000);
};
