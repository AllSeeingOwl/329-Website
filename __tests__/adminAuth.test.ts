/// <reference types="jest" />
/* eslint-disable @typescript-eslint/no-explicit-any */
import { Request, Response, NextFunction } from 'express';

// Declare mock functions before jest.mock uses them via variable hoisting (or inside jest.mock factory)
const mockSet = jest.fn();
const mockGet = jest.fn();
const mockDel = jest.fn();

jest.mock('@upstash/redis', () => {
  return {
    Redis: jest.fn().mockImplementation(() => {
      return {
        set: (...args: any[]) => mockSet(...args),
        get: (...args: any[]) => mockGet(...args),
        del: (...args: any[]) => mockDel(...args),
      };
    }),
  };
});

import adminAuth, {
  verifyPassword,
  generateSessionToken,
  createAdminSession,
  extractSessionToken,
  validateAdminSession,
  handleAdminLogin,
  logAuthAttempt,
} from '../src/middleware/adminAuth';

describe('adminAuth Middleware & Utilities', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };
    process.env.KV_REST_API_URL = 'https://test-kv.upstash.io';
    process.env.KV_REST_API_TOKEN = 'test-token';
    process.env.ADMIN_PASSWORD = 'test-secret-password';
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('verifyPassword', () => {
    it('returns true when correct password is provided', () => {
      (expect as any)(verifyPassword('test-secret-password')).toBe(true);
    });

    it('returns false when incorrect password is provided', () => {
      (expect as any)(verifyPassword('wrong-password')).toBe(false);
    });

    it('returns false for non-string input', () => {
      (expect as any)(verifyPassword(12345)).toBe(false);
      (expect as any)(verifyPassword(null)).toBe(false);
      (expect as any)(verifyPassword(undefined)).toBe(false);
    });

    it('falls back to "admin" if ADMIN_PASSWORD environment variable is empty', () => {
      delete process.env.ADMIN_PASSWORD;
      (expect as any)(verifyPassword('admin')).toBe(true);
      (expect as any)(verifyPassword('wrong')).toBe(false);
    });
  });

  describe('generateSessionToken', () => {
    it('generates a 64-character hex string (32 bytes)', () => {
      const token1 = generateSessionToken();
      const token2 = generateSessionToken();

      (expect as any)(token1.length).toBe(64);
      (expect as any)(token2.length).toBe(64);
      (expect as any)(token1).not.toEqual(token2);
    });
  });

  describe('createAdminSession', () => {
    it('stores session in Redis with 15-minute TTL (900 seconds)', async () => {
      mockSet.mockResolvedValue('OK');

      const session = await createAdminSession('127.0.0.1');

      (expect as any)(session).not.toBeNull();
      (expect as any)(session?.token.length).toBe(64);
      (expect as any)(mockSet).toHaveBeenCalledWith(
        `admin:session:${session?.token}`,
        (expect as any).any(String),
        { ex: 900 }
      );

      const storedData = JSON.parse(mockSet.mock.calls[0][1]);
      (expect as any)(storedData.token).toBe(session?.token);
      (expect as any)(storedData.createdAt).toBeDefined();
      (expect as any)(storedData.expiresAt).toBeDefined();
    });

    it('handles Redis failure gracefully and falls back to in-memory session', async () => {
      mockSet.mockRejectedValue(new Error('Redis connection timeout'));

      const session = await createAdminSession('127.0.0.1');
      (expect as any)(session).not.toBeNull();
      (expect as any)(session?.token.length).toBe(64);
    });
  });

  describe('extractSessionToken', () => {
    it('extracts token from X-Admin-Session header', () => {
      const req = { headers: { 'x-admin-session': 'session-token-123' } } as unknown as Request;
      (expect as any)(extractSessionToken(req)).toBe('session-token-123');
    });

    it('extracts token from X-Admin-Token header', () => {
      const req = { headers: { 'x-admin-token': 'session-token-456' } } as unknown as Request;
      (expect as any)(extractSessionToken(req)).toBe('session-token-456');
    });

    it('extracts token from Authorization Bearer header', () => {
      const req = { headers: { authorization: 'Bearer session-token-789' } } as unknown as Request;
      (expect as any)(extractSessionToken(req)).toBe('session-token-789');
    });

    it('extracts token from admin_session cookie', () => {
      const req = {
        headers: { cookie: 'theme=dark; admin_session=cookie-token-abc; lang=en' },
      } as unknown as Request;
      (expect as any)(extractSessionToken(req)).toBe('cookie-token-abc');
    });

    it('returns null if no token is found', () => {
      const req = { headers: {} } as unknown as Request;
      (expect as any)(extractSessionToken(req)).toBeNull();
    });
  });

  describe('validateAdminSession', () => {
    it('validates active non-expired session from Redis', async () => {
      const expiresAt = new Date(Date.now() + 1000 * 60 * 10).toISOString();
      const mockSession = JSON.stringify({
        token: 'valid-token',
        createdAt: new Date().toISOString(),
        expiresAt,
      });

      mockGet.mockResolvedValue(mockSession);

      const isValid = await validateAdminSession('valid-token', '127.0.0.1');

      (expect as any)(isValid).toBe(true);
      (expect as any)(mockGet).toHaveBeenCalledWith('admin:session:valid-token');
    });

    it('returns false and deletes token if session in Redis is expired', async () => {
      const expiresAt = new Date(Date.now() - 1000 * 60).toISOString(); // 1 min ago
      const mockSession = JSON.stringify({
        token: 'expired-token',
        createdAt: new Date(Date.now() - 1000 * 60 * 20).toISOString(),
        expiresAt,
      });

      mockGet.mockResolvedValue(mockSession);
      mockDel.mockResolvedValue(1);

      const isValid = await validateAdminSession('expired-token', '127.0.0.1');

      (expect as any)(isValid).toBe(false);
      (expect as any)(mockDel).toHaveBeenCalledWith('admin:session:expired-token');
    });

    it('returns false if session does not exist in Redis or memory', async () => {
      mockGet.mockResolvedValue(null);

      const isValid = await validateAdminSession('non-existent', '127.0.0.1');
      (expect as any)(isValid).toBe(false);
    });

    it('handles Redis error without crashing', async () => {
      mockGet.mockRejectedValue(new Error('Redis connection drop'));

      const isValid = await validateAdminSession('token', '127.0.0.1');
      (expect as any)(isValid).toBe(false);
    });
  });

  describe('handleAdminLogin', () => {
    it('returns 200 with token and expiry on valid password', async () => {
      mockSet.mockResolvedValue('OK');

      const req = {
        ip: '192.168.1.1',
        body: { password: 'test-secret-password' },
      } as unknown as Request;

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      } as unknown as Response;

      await handleAdminLogin(req, res);

      (expect as any)(res.json).toHaveBeenCalledWith({
        success: true,
        token: (expect as any).any(String),
        expiresAt: (expect as any).any(String),
      });
    });

    it('returns 401 on invalid password', async () => {
      const req = {
        ip: '192.168.1.1',
        body: { password: 'wrong-password' },
      } as unknown as Request;

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      } as unknown as Response;

      await handleAdminLogin(req, res);

      (expect as any)(res.status).toHaveBeenCalledWith(401);
      (expect as any)(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Unauthorized',
      });
    });
  });

  describe('adminAuth Middleware', () => {
    it('calls next() when request presents valid session token', async () => {
      const expiresAt = new Date(Date.now() + 1000 * 60 * 10).toISOString();
      mockGet.mockResolvedValue(
        JSON.stringify({
          token: 'active-session',
          createdAt: new Date().toISOString(),
          expiresAt,
        })
      );

      const req = {
        ip: '10.0.0.1',
        headers: { 'x-admin-session': 'active-session' },
      } as unknown as Request;

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      } as unknown as Response;

      const next = jest.fn() as NextFunction;

      await adminAuth(req, res, next);

      (expect as any)(next).toHaveBeenCalled();
      (expect as any)(res.status).not.toHaveBeenCalled();
    });

    it('returns 401 when token is missing', async () => {
      const req = {
        ip: '10.0.0.1',
        headers: {},
      } as unknown as Request;

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      } as unknown as Response;

      const next = jest.fn() as NextFunction;

      await adminAuth(req, res, next);

      (expect as any)(res.status).toHaveBeenCalledWith(401);
      (expect as any)(res.json).toHaveBeenCalledWith({
        error: 'Unauthorized: Admin session required',
      });
      (expect as any)(next).not.toHaveBeenCalled();
    });

    it('returns 401 when session is invalid or expired', async () => {
      mockGet.mockResolvedValue(null);

      const req = {
        ip: '10.0.0.1',
        headers: { authorization: 'Bearer invalid-session' },
      } as unknown as Request;

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      } as unknown as Response;

      const next = jest.fn() as NextFunction;

      await adminAuth(req, res, next);

      (expect as any)(res.status).toHaveBeenCalledWith(401);
      (expect as any)(res.json).toHaveBeenCalledWith({
        error: 'Unauthorized: Invalid or expired admin session',
      });
      (expect as any)(next).not.toHaveBeenCalled();
    });
  });

  describe('audit logging', () => {
    it('logs audit messages with timestamp and action details', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      logAuthAttempt('TEST_ACTION', true, '127.0.0.1', 'Details here');

      (expect as any)(consoleSpy).toHaveBeenCalledWith(
        (expect as any).stringMatching(
          /\[AUDIT TRAIL\] \[.*\] Admin Auth TEST_ACTION \[SUCCESS\] IP: 127\.0\.0\.1 - Details here/
        )
      );

      consoleSpy.mockRestore();
    });
  });
});
