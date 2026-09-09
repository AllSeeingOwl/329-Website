import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { Redis } from '@upstash/redis';

// 15 minutes in seconds
const SESSION_TTL_SECONDS = 15 * 60;

// Initialize Upstash Redis client with KV environment variables or fallback
const redis = new Redis({
  url: process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL || '',
  token: process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || '',
});

const isRedisAvailable = (): boolean => {
  return !!(
    (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) ||
    (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN)
  );
};

export interface AdminSession {
  token: string;
  createdAt: string;
  expiresAt: string;
}

// In-memory session store fallback when Redis is unavailable or unconfigured
const inMemorySessions = new Map<string, AdminSession>();

/**
 * Log authentication attempts with timestamps for audit trails.
 */
export const logAuthAttempt = (
  action: string,
  success: boolean,
  ip: string,
  details?: string
): void => {
  const timestamp = new Date().toISOString();
  const status = success ? 'SUCCESS' : 'FAILED';
  const detailMsg = details ? ` - ${details}` : '';
  console.log(`[AUDIT TRAIL] [${timestamp}] Admin Auth ${action} [${status}] IP: ${ip}${detailMsg}`);
};

/**
 * Generates a cryptographically random session token.
 */
export const generateSessionToken = (): string => {
  return crypto.randomBytes(32).toString('hex');
};

/**
 * Verifies the provided password against ADMIN_PASSWORD (or fallback 'admin').
 * Uses timing-safe equality comparison to prevent timing attacks.
 */
export const verifyPassword = (password: unknown): boolean => {
  if (typeof password !== 'string') return false;
  const adminPassword = process.env.ADMIN_PASSWORD || 'admin';

  const pwdBuffer = Buffer.from(password);
  const adminPwdBuffer = Buffer.from(adminPassword);

  if (pwdBuffer.length !== adminPwdBuffer.length) {
    // Perform dummy comparison to mitigate timing attacks
    crypto.timingSafeEqual(adminPwdBuffer, adminPwdBuffer);
    return false;
  }

  return crypto.timingSafeEqual(new Uint8Array(pwdBuffer), new Uint8Array(adminPwdBuffer));
};

/**
 * Creates a secure session using @upstash/redis with a 15-minute timeout.
 * Falls back to in-memory sessions if Redis is unconfigured or encounters errors.
 */
export const createAdminSession = async (ip: string = 'unknown'): Promise<AdminSession | null> => {
  const token = generateSessionToken();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + SESSION_TTL_SECONDS * 1000).toISOString();

  const sessionData: AdminSession = {
    token,
    createdAt: now.toISOString(),
    expiresAt,
  };

  let redisStored = false;

  if (isRedisAvailable()) {
    try {
      await redis.set(`admin:session:${token}`, JSON.stringify(sessionData), {
        ex: SESSION_TTL_SECONDS,
      });
      redisStored = true;
    } catch (error) {
      console.error('Redis connection error while creating admin session:', error);
    }
  }

  if (!redisStored) {
    inMemorySessions.set(token, sessionData);
  }

  logAuthAttempt('CREATE_SESSION', true, ip, `Token created, expires in 15 mins`);
  return sessionData;
};

/**
 * Extract token from request headers (Authorization, X-Admin-Session, X-Admin-Token)
 * or cookies (admin_session).
 */
export const extractSessionToken = (req: Request): string | null => {
  // Check headers first
  const customHeader = req.headers['x-admin-session'] || req.headers['x-admin-token'];
  if (typeof customHeader === 'string' && customHeader.trim()) {
    return customHeader.trim();
  }

  const authHeader = req.headers['authorization'];
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.split(' ')[1].trim();
  }

  // Check cookies if available
  if (req.headers.cookie) {
    const cookies = req.headers.cookie.split(';').map((c) => c.trim());
    for (const cookie of cookies) {
      if (cookie.startsWith('admin_session=')) {
        return cookie.substring('admin_session='.length).trim();
      }
    }
  }

  return null;
};

/**
 * Validates session token against Upstash Redis (with in-memory fallback).
 */
export const validateAdminSession = async (
  token: string,
  ip: string = 'unknown'
): Promise<boolean> => {
  let sessionData: AdminSession | null = null;

  if (isRedisAvailable()) {
    try {
      const sessionStr = await redis.get<string | object>(`admin:session:${token}`);
      if (sessionStr) {
        sessionData =
          typeof sessionStr === 'string' ? JSON.parse(sessionStr) : (sessionStr as AdminSession);
      }
    } catch (error) {
      console.error('Redis connection error while validating admin session:', error);
    }
  }

  // Fallback to in-memory session if Redis did not return sessionData
  if (!sessionData && inMemorySessions.has(token)) {
    sessionData = inMemorySessions.get(token) || null;
  }

  if (!sessionData) {
    logAuthAttempt('VALIDATE_SESSION', false, ip, 'Session expired or not found');
    return false;
  }

  if (new Date(sessionData.expiresAt).getTime() < Date.now()) {
    if (isRedisAvailable()) {
      try {
        await redis.del(`admin:session:${token}`);
      } catch {
        // Ignore deletion error on expired token
      }
    }
    inMemorySessions.delete(token);
    logAuthAttempt('VALIDATE_SESSION', false, ip, 'Session expired');
    return false;
  }

  logAuthAttempt('VALIDATE_SESSION', true, ip, 'Session valid');
  return true;
};

/**
 * Handles admin login verification and session creation.
 */
export const handleAdminLogin = async (req: Request, res: Response): Promise<void> => {
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  const { password } = req.body || {};

  if (process.env.NODE_ENV === 'production' && !process.env.ADMIN_PASSWORD) {
    console.warn('WARNING: ADMIN_PASSWORD should be set in production. Using fallback.');
  }

  const isValid = verifyPassword(password);
  if (!isValid) {
    logAuthAttempt('LOGIN', false, ip, 'Invalid password');
    res.status(401).json({ success: false, error: 'Unauthorized' });
    return;
  }

  logAuthAttempt('LOGIN', true, ip, 'Password verified');
  const session = await createAdminSession(ip);

  if (!session) {
    res.status(500).json({ success: false, error: 'Failed to create session due to storage error' });
    return;
  }

  res.json({
    success: true,
    token: session.token,
    expiresAt: session.expiresAt,
  });
};

/**
 * Express middleware for protecting admin routes using session tokens.
 */
const adminAuth = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  const token = extractSessionToken(req);

  if (!token) {
    logAuthAttempt('MIDDLEWARE_AUTH', false, ip, 'Missing token header/cookie');
    res.status(401).json({ error: 'Unauthorized: Admin session required' });
    return;
  }

  const isValid = await validateAdminSession(token, ip);
  if (!isValid) {
    res.status(401).json({ error: 'Unauthorized: Invalid or expired admin session' });
    return;
  }

  next();
};

export default adminAuth;
