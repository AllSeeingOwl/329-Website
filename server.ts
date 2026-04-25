import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import crypto from 'crypto';

const app = express();
const port = process.env.PORT || 3000;

// 🛡️ Sentinel: Disable Express framework leakage
app.disable('x-powered-by');

// 🛡️ Sentinel: Trust proxy to ensure correct IP extraction (e.g. req.ip) when deployed behind Vercel.
// Without this, the rate limiter would see the proxy's IP for all requests, causing a global DoS block.
app.set('trust proxy', 1);

// 🛡️ Sentinel: Add security headers to protect against common web vulnerabilities
app.use((req: Request, res: Response, next: NextFunction) => {
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains'); // Enforce HTTPS
  res.setHeader('X-Content-Type-Options', 'nosniff'); // Prevent MIME sniffing
  res.setHeader('X-XSS-Protection', '1; mode=block'); // Enable XSS filter in legacy browsers
  res.setHeader('X-Frame-Options', 'DENY'); // Prevent clickjacking
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate'); // Prevent caching of sensitive data
  res.setHeader('Pragma', 'no-cache'); // HTTP 1.0 backward compatibility
  res.setHeader('Expires', '0'); // Proxies
  // 🛡️ Sentinel: Add Referrer-Policy to prevent leaking sensitive URLs across origins
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  // 🛡️ Sentinel: Restrict powerful browser features to prevent abuse if XSS occurs
  res.setHeader('Permissions-Policy', 'geolocation=(), camera=(), microphone=()');
  // Restrict resource loading to trusted sources
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; script-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; upgrade-insecure-requests;"
  );
  next();
});

// 🔒 Sentinel: Limit request body size to prevent DoS attacks via large JSON payloads
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: true, limit: '100kb' }));

// Maintenance Mode Configuration
const MAINTENANCE_MODE = process.env.MAINTENANCE_MODE === 'true';
const STUDIO_MAINTENANCE_MODE = process.env.STUDIO_MAINTENANCE_MODE === 'true';
const MLTK_MAINTENANCE_MODE = process.env.MLTK_MAINTENANCE_MODE === 'true';
const EMERGENCY_LOCKDOWN = process.env.EMERGENCY_LOCKDOWN === 'true';

// 🛡️ Sentinel: Emergency lockdown circuit breaker for severe incidents (e.g., data breach).
// Placed at the very top of the stack to bypass all routing, file serving, and parsing.
app.use((req: Request, res: Response, next: NextFunction) => {
  if (EMERGENCY_LOCKDOWN) {
    res.status(503).type('text/plain').send('503 Service Unavailable: SYSTEM LOCKDOWN IN EFFECT.');
    return;
  }
  next();
});

// ⚡ Bolt: Pre-calculate static asset paths to avoid redundant path logic and allocations.
const MAINTENANCE_PATH = path.join(__dirname, 'public', 'maintenance.html');
const NOT_FOUND_PATH = path.join(__dirname, 'public', '404.html');

// Lists of files belonging to each portal
const studioFiles = new Set([
  '/surface-home-page.html',
  '/studio-manifesto-page.html',
  '/store.html',
  '/cart.html',
  '/checkout.html',
  '/releases.html',
  '/studio-contact-us.html',
  '/business-privacy-policy.html',
  '/business-terms-of-service.html',
  '/procure-volume-1.html',
  '/procure-physical-artefact.html',
]);

const mltkFiles = new Set([
  '/mltk-login-gate.html',
  '/mltk-surveillance-dashboard.html',
  '/mltk-privacy-policy.html',
  '/mltk-boot-sequence.html',
  '/mltk-customer-service.html',
  '/mltk-classified-document.html',
  '/mltk-timer.html',
  '/velvet-rope-landing-page.html',
  '/nova-parent-directory.html',
  '/nova-classified-archive.html',
  '/ollies-radio-scanner.html',
  '/secure-data-drop-page.html',
  '/developer-blog.html',
]);

// Maintenance Middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  // Normalize path by stripping query strings and lowercasing encoded spaces if any
  // 🛡️ Sentinel: Wrap decodeURIComponent in a try-catch to prevent unhandled URIError DoS from malformed paths
  let reqPath: string;
  try {
    reqPath = decodeURIComponent(req.path);
  } catch {
    res.status(400).json({ error: 'Bad Request: Malformed URI' });
    return;
  }

  // Global Maintenance Mode applies to everything except static assets if we want,
  // but originally it was fully blocking everything. Keeping the original behavior:
  if (MAINTENANCE_MODE) {
    res.status(503).sendFile(MAINTENANCE_PATH);
    return;
  }

  // Check specific maintenance modes for HTML pages.
  // We only block specific paths to allow CSS/JS to pass through freely.
  if (STUDIO_MAINTENANCE_MODE && studioFiles.has(reqPath)) {
    res.status(503).sendFile(MAINTENANCE_PATH);
    return;
  }

  if (MLTK_MAINTENANCE_MODE && mltkFiles.has(reqPath)) {
    res.status(503).sendFile(MAINTENANCE_PATH);
    return;
  }

  next();
});

// Endpoint for frontend to check maintenance status dynamically
app.get('/api/maintenance-status', (req: Request, res: Response) => {
  res.json({
    global: MAINTENANCE_MODE,
    studio: STUDIO_MAINTENANCE_MODE,
    mltk: MLTK_MAINTENANCE_MODE,
  });
});

app.use(express.static(path.join(__dirname, 'public')));

// -----------------------------------------------------------------------------
// WARNING: DO NOT CHANGE THIS PASSWORD WITHOUT EXPLICIT PERMISSION FROM THE USER.
// The official password for this ARG gate is hinted in mltk_login_utils.js.
// Changing this fallback will break the intended experience for local development.
// -----------------------------------------------------------------------------
const AUTH_PASSWORD = process.env.AUTH_PASSWORD || ['0408', '1998', 'XXXX'].join('-');
// ⚡ Bolt: Cache auth buffer to prevent recreation on every verification request
// This reduces allocation overhead and improves response times for the verification endpoint.
const authBuffer = Buffer.from(AUTH_PASSWORD);

interface RateLimitRecord {
  count: number;
  firstAttempt: number;
}
const rateLimitMap = new Map<string, RateLimitRecord>();
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const MAX_ATTEMPTS = 5;

app.post('/api/verify', (req: Request, res: Response) => {
  const ip: string = req.ip || req.socket.remoteAddress || 'unknown';
  const now = Date.now();
  const record = rateLimitMap.get(ip) || { count: 0, firstAttempt: now };

  // 🛡️ Sentinel: Enforce an O(1) eviction policy to prevent memory leaks and
  // algorithmic complexity DoS attacks (which occur when iterating over a large map).
  if (rateLimitMap.size >= 1000 && !rateLimitMap.has(ip)) {
    const oldestKey = rateLimitMap.keys().next().value;
    if (oldestKey !== undefined) {
      rateLimitMap.delete(oldestKey);
    }
  }

  if (now - record.firstAttempt > RATE_LIMIT_WINDOW_MS) {
    record.count = 1;
    record.firstAttempt = now;
  } else {
    record.count++;
    if (record.count > MAX_ATTEMPTS) {
      res.status(429).json({ success: false, error: 'Too many attempts, please try again later.' });
      return;
    }
  }
  rateLimitMap.set(ip, record);

  const { code } = req.body;
  let success = false;

  if (typeof code === 'string') {
    const codeBuffer = Buffer.from(code);

    if (codeBuffer.length === authBuffer.length) {
      success = crypto.timingSafeEqual(codeBuffer, authBuffer);
    } else {
      // Prevent length leakage via timing by doing a dummy comparison
      crypto.timingSafeEqual(authBuffer, authBuffer);
    }
  }

  res.json({ success });
});

// Catch-all route to serve the custom 404 page
app.use((req: Request, res: Response) => {
  res.status(404).sendFile(NOT_FOUND_PATH);
});

// 🛡️ Sentinel: Global error-handling middleware to prevent leaking stack traces
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: unknown, req: Request, res: Response, next: NextFunction) => {
  console.error('Unhandled error:', err);

  // Handle specific standard HTTP errors correctly
  if (err instanceof Error && 'status' in err) {
    const httpErr = err as Error & { status: number };
    res.status(httpErr.status).json({ error: httpErr.message || 'Error' });
    return;
  }

  res.status(500).json({ error: 'Internal Server Error' });
});

if (require.main === module) {
  app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
  });
}

export = app;
