import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { redis, isRedisAvailable } from '../redis';

// 15 minutes in seconds
const SESSION_TTL_SECONDS = 15 * 60;

export interface AdminSession {
  token: string;
  createdAt: string;
  expiresAt: string;
}

// In-memory session store fallback when Redis is unavailable or unconfigured (non-production only)
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
  console.log(
    `[AUDIT TRAIL] [${timestamp}] Admin Auth ${action} [${status}] IP: ${ip}${detailMsg}`
  );
};

/**
 * Generates a cryptographically random session token.
 */
export const generateSessionToken = (): string => {
  return crypto.randomBytes(32).toString('hex');
};

/**
 * Verifies the provided password against ADMIN_PASSWORD.
 * Uses timing-safe equality comparison to prevent timing attacks.
 */
export const verifyPassword = (password: unknown): boolean => {
  if (typeof password !== 'string') return false;

  const isProduction = process.env.NODE_ENV === 'production';
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (isProduction && (!adminPassword || !adminPassword.trim())) {
    throw new Error(
      'Production authentication error: ADMIN_PASSWORD environment variable must be configured in production.'
    );
  }

  const effectivePassword = adminPassword || 'admin';

  const pwdBuffer = Buffer.from(password);
  const adminPwdBuffer = Buffer.from(effectivePassword);

  if (pwdBuffer.length !== adminPwdBuffer.length) {
    // Perform dummy comparison to mitigate timing attacks
    crypto.timingSafeEqual(adminPwdBuffer, adminPwdBuffer);
    return false;
  }

  return crypto.timingSafeEqual(new Uint8Array(pwdBuffer), new Uint8Array(adminPwdBuffer));
};

/**
 * Creates a secure session using @upstash/redis with a 15-minute timeout.
 * Requires Redis in production; falls back to in-memory sessions in dev/test.
 */
export const createAdminSession = async (ip: string = 'unknown'): Promise<AdminSession | null> => {
  const isProduction = process.env.NODE_ENV === 'production';
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
    if (isProduction) {
      logAuthAttempt(
        'CREATE_SESSION',
        false,
        ip,
        'Redis storage required in production but unavailable'
      );
      return null;
    }
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
 * Validates session token against Upstash Redis (with in-memory fallback in non-prod).
 */
export const validateAdminSession = async (
  token: string,
  ip: string = 'unknown'
): Promise<boolean> => {
  const isProduction = process.env.NODE_ENV === 'production';
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

  // Fallback to in-memory session if Redis did not return sessionData (non-production only)
  if (!sessionData && !isProduction && inMemorySessions.has(token)) {
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
 * Destroys an admin session by token.
 */
export const destroyAdminSession = async (token: string): Promise<void> => {
  if (isRedisAvailable()) {
    try {
      await redis.del(`admin:session:${token}`);
    } catch (err) {
      console.error('Error deleting admin session from Redis:', err);
    }
  }
  inMemorySessions.delete(token);
};

/**
 * Handles admin login verification and session creation.
 */
interface RateLimitRecord {
  count: number;
  firstAttempt: number;
}
const rateLimitMap = new Map<string, RateLimitRecord>();
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILED_ATTEMPTS = 5;

export const resetRateLimitMap = (): void => {
  rateLimitMap.clear();
};

export const handleAdminLogin = async (req: Request, res: Response): Promise<void> => {
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  const now = Date.now();

  const record = rateLimitMap.get(ip);
  if (
    record &&
    now - record.firstAttempt <= RATE_LIMIT_WINDOW_MS &&
    record.count >= MAX_FAILED_ATTEMPTS
  ) {
    logAuthAttempt('LOGIN', false, ip, 'Rate limit exceeded');
    res.status(429).json({
      success: false,
      message: 'Too many failed login attempts. Please try again later.',
      error: 'Too many failed login attempts. Please try again later.',
    });
    return;
  }

  const { password } = req.body || {};

  let isValid: boolean;
  try {
    isValid = verifyPassword(password);
  } catch (err) {
    if (err instanceof Error && err.message.includes('ADMIN_PASSWORD')) {
      res.status(500).json({
        success: false,
        message: 'Server configuration error: ADMIN_PASSWORD not configured',
        error: 'Server configuration error: ADMIN_PASSWORD not configured',
      });
      return;
    }
    throw err;
  }

  if (!isValid) {
    const currentRecord = rateLimitMap.get(ip);
    if (!currentRecord || now - currentRecord.firstAttempt > RATE_LIMIT_WINDOW_MS) {
      rateLimitMap.set(ip, { count: 1, firstAttempt: now });
    } else {
      currentRecord.count += 1;
      rateLimitMap.set(ip, currentRecord);
    }
    logAuthAttempt('LOGIN', false, ip, 'Invalid password');
    res.status(401).json({
      success: false,
      message: 'Invalid password',
      error: 'Unauthorized',
    });
    return;
  }

  rateLimitMap.delete(ip);

  logAuthAttempt('LOGIN', true, ip, 'Password verified');
  const session = await createAdminSession(ip);

  if (!session) {
    res.status(500).json({
      success: false,
      message: 'Failed to create session due to storage error',
      error: 'Failed to create session due to storage error',
    });
    return;
  }

  const isProduction = process.env.NODE_ENV === 'production';

  if (typeof res.cookie === 'function') {
    res.cookie('admin_session', session.token, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'strict',
      maxAge: SESSION_TTL_SECONDS * 1000,
      path: '/',
    });
  }

  const responseBody: Record<string, unknown> = {
    success: true,
    message: 'Authenticated',
    expiresAt: session.expiresAt,
  };

  // Provide token in non-production environments to support automated test suites expecting body.token
  if (!isProduction) {
    responseBody.token = session.token;
  }

  res.json(responseBody);
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
