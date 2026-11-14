import crypto from 'crypto';
import path from 'path';
import { Request, Response, NextFunction } from 'express';
import { getActivePhase, MLTK_PHASES } from '../db';
import { extractSessionToken, validateAdminSession } from './middleware/adminAuth';

/**
 * Server-side enforcement for the ARG release phases.
 *
 * 1. Held-back modules (per the active phase in MLTK_PHASES) are refused with the in-universe
 *    held-back page unless the request carries a valid admin session (admins can preview).
 * 2. Zine downloads require the zine access cookie, issued by /api/verify after the reader enters
 *    the serial from the physical zine. Without it the reader is sent to /system-override.
 */

const ZINE_ACCESS_COOKIE = 'zine_access';
const ZINE_ACCESS_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

const PROTECTED_DOWNLOADS = new Set([
  'UNCUT_PUZZLE.pdf',
  'VIRTUE_VILLAGE_LAYOUTS.pdf',
  'SEEDLESS_GRAPES_MOTEL_BLUEPRINTS.zip',
  '104_9_PIRATE_INTERCEPT.mp3',
]);

const getAccessSecret = (): string =>
  process.env.ACCESS_COOKIE_SECRET ||
  process.env.AUTH_PASSWORD ||
  process.env.ADMIN_PASSWORD ||
  'local-dev-zine-access-secret';

/** Deterministic HMAC token: rotates automatically if the secret (or zine password) changes. */
const createZineAccessToken = (): string =>
  crypto.createHmac('sha256', getAccessSecret()).update('zine-access:v1').digest('hex');

const readCookie = (req: Request, name: string): string | null => {
  const header = req.headers.cookie;
  if (!header) return null;
  const prefix = name + '=';
  const parts = header.split(';');
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i].trim();
    if (part.startsWith(prefix)) return part.substring(prefix.length);
  }
  return null;
};

export const hasZineAccess = (req: Request): boolean => {
  const value = readCookie(req, ZINE_ACCESS_COOKIE);
  if (!value || value.length !== 64) return false;
  const expected = Buffer.from(createZineAccessToken());
  const actual = Buffer.from(value);
  return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
};

export const setZineAccessCookie = (res: Response): void => {
  res.cookie(ZINE_ACCESS_COOKIE, createZineAccessToken(), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: ZINE_ACCESS_MAX_AGE_MS,
    path: '/',
  });
};

const isAdminRequest = async (req: Request): Promise<boolean> => {
  const token = extractSessionToken(req);
  if (!token) return false;
  try {
    return await validateAdminSession(token, req.ip || 'unknown');
  } catch {
    return false;
  }
};

/** Normalises a request path to the bare filename used in MLTK_PHASES (e.g. "/foo" -> "foo"). */
const toModuleName = (reqPath: string): string => reqPath.replace(/^\/+/, '');

const isHeldBack = (moduleName: string, heldBack: string[]): boolean => {
  if (!moduleName) return false;
  for (let i = 0; i < heldBack.length; i++) {
    const entry = heldBack[i];
    if (entry === moduleName || entry === moduleName + '.html') return true;
  }
  return false;
};

export const createPhaseAccessMiddleware = (publicDir: string) => {
  const heldBackPage = path.join(publicDir, 'held-back.html');

  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      next();
      return;
    }

    let moduleName: string;
    try {
      moduleName = toModuleName(decodeURIComponent(req.path));
    } catch {
      next();
      return;
    }

    const isDownload = PROTECTED_DOWNLOADS.has(moduleName);

    let heldBack: string[];
    try {
      const activePhaseId = await getActivePhase();
      const phase = MLTK_PHASES.find((p) => p.id === activePhaseId);
      heldBack = phase ? phase.heldBackModules : [];
    } catch {
      heldBack = [];
    }

    const moduleHeldBack = isHeldBack(moduleName, heldBack);
    if (!moduleHeldBack && !isDownload) {
      next();
      return;
    }

    if (await isAdminRequest(req)) {
      next();
      return;
    }

    if (moduleHeldBack) {
      res.status(403).sendFile(heldBackPage);
      return;
    }

    if (!hasZineAccess(req)) {
      res.redirect(302, '/system-override');
      return;
    }

    next();
  };
};
