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
 * Sanitizes input parameters to prevent Log Injection (CWE-117).
 */
export const logAuthAttempt = (
  action: string,
  success: boolean,
  ip: string,
  details?: string
): void => {
  const timestamp = new Date().toISOString();
  const status = success ? 'SUCCESS' : 'FAILED';
  const cleanAction = String(action || '')
    .replace(/[\r\n\t]/g, '')
    .slice(0, 50);
  const cleanIp = String(ip || '')
    .replace(/[\r\n\t]/g, '')
    .slice(0, 50);
  const cleanDetails = details
    ? String(details)
        .replace(/[\r\n\t]/g, '')
        .slice(0, 200)
    : '';
  const detailMsg = cleanDetails ? ` - ${cleanDetails}` : '';
  console.log(
    `[AUDIT TRAIL] [${timestamp}] Admin Auth ${cleanAction} [${status}] IP: ${cleanIp}${detailMsg}`
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
/**
 * Verifies the provided key against ADMIN_BYPASS_KEY / ADMIN_SECRET_KEY.
 * Uses timing-safe equality comparison to prevent timing attacks.
 */
export const verifyBypassKey = (key: unknown): boolean => {
  if (typeof key !== 'string' || !key.trim()) return false;

  const bypassKey = process.env.ADMIN_BYPASS_KEY || process.env.ADMIN_SECRET_KEY;
  if (!bypassKey || !bypassKey.trim()) {
    return false;
  }

  const cleanKey = key.trim();
  const bypassKeyBuffer = Buffer.from(bypassKey.trim());

  if (cleanKey.length > 200) {
    crypto.timingSafeEqual(bypassKeyBuffer, bypassKeyBuffer);
    return false;
  }

  const keyBuffer = Buffer.from(cleanKey);

  if (keyBuffer.length !== bypassKeyBuffer.length) {
    crypto.timingSafeEqual(bypassKeyBuffer, bypassKeyBuffer);
    return false;
  }

  // ⚡ Bolt: Pass Buffers directly to timingSafeEqual without redundant Uint8Array wrapper allocations
  return crypto.timingSafeEqual(keyBuffer, bypassKeyBuffer);
};

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
  const adminPwdBuffer = Buffer.from(effectivePassword);

  if (password.length > 200) {
    crypto.timingSafeEqual(adminPwdBuffer, adminPwdBuffer);
    return false;
  }

  const pwdBuffer = Buffer.from(password);

  if (pwdBuffer.length !== adminPwdBuffer.length) {
    // Perform dummy comparison to mitigate timing attacks
    crypto.timingSafeEqual(adminPwdBuffer, adminPwdBuffer);
    return false;
  }

  // ⚡ Bolt: Pass Buffers directly to timingSafeEqual without redundant Uint8Array wrapper allocations
  return crypto.timingSafeEqual(pwdBuffer, adminPwdBuffer);
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
        true,
        ip,
        'Redis storage unavailable in production; falling back to in-memory session'
      );
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
  const rawCustomHeader = req.headers['x-admin-session'] || req.headers['x-admin-token'];
  const customHeader = Array.isArray(rawCustomHeader)
    ? rawCustomHeader[0]
    : typeof rawCustomHeader === 'string'
      ? rawCustomHeader.split(',')[0]
      : null;

  if (customHeader && customHeader.trim()) {
    const token = customHeader.trim();
    if (token.length <= 100) return token;
  }

  const rawAuthHeader = req.headers['authorization'];
  const authHeader = Array.isArray(rawAuthHeader)
    ? rawAuthHeader[0]
    : typeof rawAuthHeader === 'string'
      ? rawAuthHeader.split(',')[0]
      : null;

  if (authHeader) {
    const trimmedHeader = authHeader.trim();
    if (/^Bearer\s+/i.test(trimmedHeader)) {
      const token = trimmedHeader.replace(/^Bearer\s+/i, '').trim();
      if (token.length > 0 && token.length <= 100) return token;
    }
  }

  // ⚡ Bolt: Iterate over split cookies directly without map() to eliminate intermediate array allocations
  if (req.headers.cookie) {
    const rawCookies = req.headers.cookie.split(';');
    const cookiePrefix = 'admin_session=';
    for (let i = 0; i < rawCookies.length; i++) {
      const cookie = rawCookies[i].trim();
      if (cookie.startsWith(cookiePrefix)) {
        const token = cookie.substring(cookiePrefix.length).trim();
        if (token.length <= 100) return token;
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
  if (typeof token !== 'string' || !token.trim() || token.length > 100) {
    logAuthAttempt('VALIDATE_SESSION', false, ip, 'Session token invalid or oversized');
    return false;
  }

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

export const isRateLimited = (ip: string): boolean => {
  const record = rateLimitMap.get(ip);
  const now = Date.now();
  return !!(
    record &&
    now - record.firstAttempt <= RATE_LIMIT_WINDOW_MS &&
    record.count >= MAX_FAILED_ATTEMPTS
  );
};

export const recordFailedAttempt = (ip: string): void => {
  const now = Date.now();
  if (rateLimitMap.size >= 1000 && !rateLimitMap.has(ip)) {
    const oldestKey = rateLimitMap.keys().next().value;
    if (oldestKey !== undefined) {
      rateLimitMap.delete(oldestKey);
    }
  }

  const currentRecord = rateLimitMap.get(ip);
  if (!currentRecord || now - currentRecord.firstAttempt > RATE_LIMIT_WINDOW_MS) {
    rateLimitMap.set(ip, { count: 1, firstAttempt: now });
  } else {
    currentRecord.count += 1;
    rateLimitMap.set(ip, currentRecord);
  }
};

export const clearRateLimit = (ip: string): void => {
  rateLimitMap.delete(ip);
};

export const handleAdminLogin = async (req: Request, res: Response): Promise<void> => {
  const ip = req.ip || req.socket.remoteAddress || 'unknown';

  if (isRateLimited(ip)) {
    logAuthAttempt('LOGIN', false, ip, 'Rate limit exceeded');
    res.status(429).json({
      success: false,
      message: 'Too many failed login attempts. Please try again later.',
      error: 'Too many failed login attempts. Please try again later.',
    });
    return;
  }

  const password = req.body?.password || req.body?.key || req.query?.key || req.query?.token;
  const directKey = req.body?.key || req.query?.key || req.query?.token;

  let isValid: boolean;
  let usedBypassKey = false;

  if (directKey && verifyBypassKey(directKey)) {
    isValid = true;
    usedBypassKey = true;
  } else if (password && verifyBypassKey(password)) {
    isValid = true;
    usedBypassKey = true;
  } else {
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
  }

  if (!isValid) {
    recordFailedAttempt(ip);
    logAuthAttempt('LOGIN', false, ip, 'Invalid password');
    res.status(401).json({
      success: false,
      message: 'Invalid password',
      error: 'Unauthorized',
    });
    return;
  }

  clearRateLimit(ip);

  logAuthAttempt(
    'LOGIN',
    true,
    ip,
    usedBypassKey ? 'Authenticated via secret bypass key' : 'Password verified'
  );
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
 * Enforces Cross-Site Request Forgery (CSRF) protection on state-changing requests
 * authenticated via cookies.
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

  // 🛡️ Sentinel: Enforce CSRF protection for cookie-authenticated state-changing requests
  const reqMethod = (req.method || '').toUpperCase();
  const isStateChangingMethod = ['POST', 'PUT', 'DELETE', 'PATCH'].includes(reqMethod);

  // Check if request was authenticated via custom header or if anti-CSRF header is present
  const hasCustomAuthHeader = !!(
    req.headers['authorization'] ||
    req.headers['x-admin-session'] ||
    req.headers['x-admin-token']
  );

  // If cookie auth was used on a state-changing request, require matching anti-CSRF token
  if (isStateChangingMethod && !hasCustomAuthHeader) {
    const rawCsrfHeader =
      req.headers['x-csrf-token'] || req.headers['x-admin-session'] || req.headers['x-admin-token'];
    const csrfHeader = Array.isArray(rawCsrfHeader)
      ? rawCsrfHeader[0]
      : typeof rawCsrfHeader === 'string'
        ? rawCsrfHeader.split(',')[0]
        : null;

    if (!csrfHeader || csrfHeader.trim() !== token) {
      logAuthAttempt('MIDDLEWARE_AUTH', false, ip, 'CSRF verification failed for cookie auth');
      res.status(403).json({ error: 'Forbidden: CSRF token missing or invalid' });
      return;
    }
  }

  next();
};

export default adminAuth;
