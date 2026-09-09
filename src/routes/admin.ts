import { Router, Request, Response } from 'express';
import {
  verifyPassword,
  createAdminSession,
  logAuthAttempt,
} from '../middleware/adminAuth';

const router = Router();

// Rate limiting configuration for failed attempts
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const MAX_FAILED_ATTEMPTS = 5;

export interface AuthRequestBody {
  password?: string;
}

export interface AuthSuccessResponse {
  success: true;
  message: string;
}

export interface AuthErrorResponse {
  success: false;
  message: string;
}

export type AuthResponse = AuthSuccessResponse | AuthErrorResponse;

interface FailedAttemptRecord {
  count: number;
  firstFailedAttempt: number;
}

// In-memory rate limiting map for failed login attempts by IP
const failedAttemptsMap = new Map<string, FailedAttemptRecord>();

/**
 * Helper to get client IP address.
 */
const getClientIp = (req: Request): string => {
  return req.ip || req.socket.remoteAddress || 'unknown';
};

/**
 * Checks if the IP is currently rate-limited due to excessive failed attempts.
 */
export const isRateLimited = (ip: string, now: number = Date.now()): boolean => {
  const record = failedAttemptsMap.get(ip);
  if (!record) return false;

  // If window has passed, reset record
  if (now - record.firstFailedAttempt > RATE_LIMIT_WINDOW_MS) {
    failedAttemptsMap.delete(ip);
    return false;
  }

  return record.count >= MAX_FAILED_ATTEMPTS;
};

/**
 * Records a failed authentication attempt for an IP.
 */
export const recordFailedAttempt = (ip: string, now: number = Date.now()): void => {
  // Evict oldest entry if map exceeds safe size (e.g., 1000 IPs) to prevent memory leak
  if (failedAttemptsMap.size >= 1000 && !failedAttemptsMap.has(ip)) {
    const oldestKey = failedAttemptsMap.keys().next().value;
    if (oldestKey !== undefined) {
      failedAttemptsMap.delete(oldestKey);
    }
  }

  const record = failedAttemptsMap.get(ip);

  if (!record || now - record.firstFailedAttempt > RATE_LIMIT_WINDOW_MS) {
    failedAttemptsMap.set(ip, {
      count: 1,
      firstFailedAttempt: now,
    });
  } else {
    record.count += 1;
    failedAttemptsMap.set(ip, record);
  }
};

/**
 * Clears failed attempts on successful authentication.
 */
export const clearFailedAttempts = (ip: string): void => {
  failedAttemptsMap.delete(ip);
};

/**
 * Helper to reset the entire rate limit map (useful for unit tests).
 */
export const resetRateLimitMap = (): void => {
  failedAttemptsMap.clear();
};

/**
 * POST /api/admin/authenticate
 * Hidden admin authentication endpoint.
 */
router.post(
  '/authenticate',
  async (
    req: Request<Record<string, string>, AuthResponse, AuthRequestBody>,
    res: Response<AuthResponse>
  ): Promise<void> => {
    const ip = getClientIp(req);
    const now = Date.now();

    // Check rate limit for failed attempts
    if (isRateLimited(ip, now)) {
      logAuthAttempt('AUTHENTICATE', false, ip, 'Rate limit exceeded');
      res.status(429).json({
        success: false,
        message: 'Too many failed login attempts. Please try again later.',
      });
      return;
    }

    const { password } = req.body || {};

    // Validate password against ADMIN_PASSWORD env var
    const isValid = verifyPassword(password);

    if (!isValid) {
      recordFailedAttempt(ip, now);
      logAuthAttempt('AUTHENTICATE', false, ip, 'Invalid password');
      res.status(401).json({
        success: false,
        message: 'Invalid password',
      });
      return;
    }

    // Password valid -> Clear failed attempts tracking
    clearFailedAttempts(ip);

    // Create session in Upstash Redis
    const session = await createAdminSession(ip);

    if (!session) {
      logAuthAttempt('AUTHENTICATE', false, ip, 'Session creation failed');
      res.status(500).json({
        success: false,
        message: 'Failed to create session',
      });
      return;
    }

    logAuthAttempt('AUTHENTICATE', true, ip, 'Admin authenticated successfully');

    // Set secure httpOnly cookie with session token
    const isProduction = process.env.NODE_ENV === 'production';
    res.cookie('admin_session', session.token, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'strict',
      maxAge: 15 * 60 * 1000, // 15 minutes in ms
      path: '/',
    });

    res.json({
      success: true,
      message: 'Authenticated',
    });
  }
);

export default router;
