import fs from 'fs';
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import path from 'path';
import crypto from 'crypto';
import {
  initDb,
  getMaintenanceConfig,
  updateMaintenanceConfig,
  getDashboardConfig,
  updateDashboardConfig,
  updateAllDashboardConfig,
  updateAllMaintenanceConfig,
  saveEmail,
  getActivePhase,
  setActivePhase,
  MLTK_PHASES,
} from './db';

const app = express();
const port = process.env.PORT || 3000;

// Enable Cross-Origin Resource Sharing (CORS) for API expansion
// Configured to allow all origins by default.
app.use(cors());

// 🛡️ Sentinel: Disable Express framework leakage
app.disable('x-powered-by');

// 🛡️ Sentinel: Trust proxy to ensure correct IP extraction (e.g. req.ip) when deployed behind reverse proxies.
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
    "default-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.tailwindcss.com; font-src 'self' https://fonts.gstatic.com; script-src 'self' 'unsafe-inline' https://unpkg.com https://cdn.tailwindcss.com; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; upgrade-insecure-requests;"
  );
  next();
});

// 🔒 Sentinel: Limit request body size to prevent DoS attacks via large JSON payloads
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: true, limit: '100kb' }));

// 🏥 Health check endpoint for monitoring, load balancers, and Render health checks
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({ status: 'ok' });
});

// Maintenance Mode Configuration
let MAINTENANCE_MODE = process.env.MAINTENANCE_MODE === 'true';
let STUDIO_MAINTENANCE_MODE = process.env.STUDIO_MAINTENANCE_MODE === 'true';
let MLTK_MAINTENANCE_MODE = process.env.MLTK_MAINTENANCE_MODE === 'true';
const EMERGENCY_LOCKDOWN = process.env.EMERGENCY_LOCKDOWN === 'true';

// Initialize DB and load maintenance state
initDb()
  .then(async () => {
    const config = await getMaintenanceConfig();
    // Only override if not set by environment variables (useful for tests)
    if (config['global'] && process.env.MAINTENANCE_MODE === undefined)
      MAINTENANCE_MODE = config['global'] === 'true';
    if (config['studio'] && process.env.STUDIO_MAINTENANCE_MODE === undefined)
      STUDIO_MAINTENANCE_MODE = config['studio'] === 'true';
    if (config['mltk'] && process.env.MLTK_MAINTENANCE_MODE === undefined)
      MLTK_MAINTENANCE_MODE = config['mltk'] === 'true';
  })
  .catch((err) => {
    console.error('Failed to initialize database', err);
  });

// 🛡️ Sentinel: Emergency lockdown circuit breaker for severe incidents (e.g., data breach).
// Placed at the top of the stack to bypass non-admin routing and static serving when active.
app.use(async (req: Request, res: Response, next: NextFunction) => {
  let reqPath: string;
  try {
    reqPath = decodeURIComponent(req.path);
  } catch {
    res.status(400).json({ error: 'Bad Request: Malformed URI' });
    return;
  }

  // Always exempt admin routes so administrators can log in and toggle emergency lockdown
  if (
    reqPath.startsWith('/api/admin') ||
    reqPath.startsWith('/admin') ||
    reqPath === '/mltk-admin.html' ||
    reqPath === '/mltk-admin'
  ) {
    next();
    return;
  }

  try {
    const sysConfig = await getConfigFromStore();
    if (sysConfig.emergencyLockdown || EMERGENCY_LOCKDOWN) {
      res
        .status(503)
        .type('text/plain')
        .send('503 Service Unavailable: SYSTEM LOCKDOWN IN EFFECT.');
      return;
    }
  } catch (err) {
    console.error('Error checking system lockdown configuration:', err);
    if (EMERGENCY_LOCKDOWN) {
      res
        .status(503)
        .type('text/plain')
        .send('503 Service Unavailable: SYSTEM LOCKDOWN IN EFFECT.');
      return;
    }
  }

  next();
});

// ⚡ Bolt: Pre-calculate static asset paths to avoid redundant path logic and allocations.
// Ensures static files are located correctly whether running TS directly or compiled in dist/
const publicDir = fs.existsSync(path.join(__dirname, 'public'))
  ? path.join(__dirname, 'public')
  : path.join(__dirname, '..', 'public');

const MAINTENANCE_PATH = path.join(publicDir, 'maintenance.html');
const NOT_FOUND_PATH = path.join(publicDir, '404.html');

// Lists of files belonging to each portal
const studioFiles = new Set([
  '/surface-home-page',
  '/surface-home-page.html',
  '/studio-manifesto-page',
  '/studio-manifesto-page.html',
  '/releases',
  '/releases.html',
  '/studio-contact-us',
  '/studio-contact-us.html',
  '/business-privacy-policy',
  '/business-privacy-policy.html',
  '/business-terms-of-service',
  '/business-terms-of-service.html',
  '/studio-faq',
  '/studio-faq.html',
  '/studio-press-kit',
  '/studio-press-kit.html',
  '/studio-puzzles-explained',
  '/studio-puzzles-explained.html',
  '/studio-team',
  '/studio-team.html',
]);

const mltkFiles = new Set([
  '/mltk-login-gate',
  '/mltk-login-gate.html',
  '/mltk-surveillance-dashboard',
  '/mltk-surveillance-dashboard.html',
  '/mltk-privacy-policy',
  '/mltk-privacy-policy.html',
  '/mltk-customer-service',
  '/mltk-customer-service.html',
  '/mltk-classified-document',
  '/mltk-classified-document.html',
  '/velvet-rope-landing-page',
  '/velvet-rope-landing-page.html',
  '/nova-parent-directory',
  '/nova-parent-directory.html',
  '/nova-classified-archive',
  '/nova-classified-archive.html',
  '/ollies-radio-scanner',
  '/ollies-radio-scanner.html',
  '/secure-data-drop-page',
  '/secure-data-drop-page.html',
  '/developer-blog',
  '/developer-blog.html',
  '/mltk-virtue-village-index',
  '/mltk-virtue-village-index.html',
  '/team-rabbit-hack',
  '/team-rabbit-hack.html',
  '/arg-progress-dashboard',
  '/arg-progress-dashboard.html',
  '/mltk-3d-map',
  '/mltk-3d-map.html',
  '/mltk-five-finger-wheel',
  '/mltk-five-finger-wheel.html',
  '/system-override',
  '/system-override.html',
]);

// Sitemap caching
let sitemapCache: { xml: string; timestamp: number } | null = null;
const SITEMAP_CACHE_TTL = 1000 * 60 * 60; // 1 hour

// Sitemap Endpoints
app.get('/sitemap.xml', async (req: Request, res: Response) => {
  try {
    if (sitemapCache && Date.now() - sitemapCache.timestamp < SITEMAP_CACHE_TTL) {
      res.header('Content-Type', 'application/xml');
      return res.send(sitemapCache.xml);
    }

    const files = await fs.promises.readdir(publicDir);

    const host = req.get('host') || 'localhost:3000';
    const protocol = req.protocol || 'https';
    const baseUrl = `${protocol}://${host}`;

    const xmlArr = [
      '<?xml version="1.0" encoding="UTF-8"?>\n',
      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n',
    ];

    const htmlFiles = files.filter((file) => file.endsWith('.html'));

    const urlEntries = await Promise.all(
      htmlFiles.map(async (file) => {
        const filePath = path.join(publicDir, file);

        const [fileContent, stats] = await Promise.all([
          fs.promises.readFile(filePath, 'utf8'),
          fs.promises.stat(filePath).catch(() => null),
        ]);

        if (fileContent.includes('<meta name="robots" content="noindex"')) return null;

        const entryArr = ['  <url>\n'];
        const cleanFile = file === 'index.html' ? '' : file.replace(/\.html$/, '');
        entryArr.push(`    <loc>${baseUrl}/${cleanFile}</loc>\n`);

        if (stats) {
          const lastMod = stats.mtime.toISOString().split('T')[0];
          entryArr.push(`    <lastmod>${lastMod}</lastmod>\n`);
        } else {
          const today = new Date().toISOString().split('T')[0];
          entryArr.push(`    <lastmod>${today}</lastmod>\n`);
        }

        entryArr.push('    <changefreq>monthly</changefreq>\n');
        entryArr.push('    <priority>0.8</priority>\n');
        entryArr.push('  </url>\n');
        return entryArr.join('');
      })
    );

    xmlArr.push(urlEntries.filter((entry) => entry !== null).join(''));
    xmlArr.push('</urlset>');

    const xml = xmlArr.join('');

    sitemapCache = { xml, timestamp: Date.now() };

    res.header('Content-Type', 'application/xml');
    res.send(xml);
  } catch (err) {
    console.error('Error generating sitemap.xml:', err);
    res.status(500).send('Internal Server Error');
  }
});

app.get('/internal-sitemap.json', async (req: Request, res: Response) => {
  try {
    const files = await fs.promises.readdir(publicDir);

    const host = req.get('host') || 'localhost:3000';
    const protocol = req.protocol || 'https';
    const baseUrl = `${protocol}://${host}`;

    const allPages: string[] = [];

    for (const file of files) {
      if (file.endsWith('.html')) {
        const cleanFile = file === 'index.html' ? '' : file.replace(/\.html$/, '');
        allPages.push(`${baseUrl}/${cleanFile}`);
      }
    }

    res.json({ pages: allPages });
  } catch (err) {
    console.error('Error generating internal-sitemap.json:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Endpoint for frontend to check maintenance status dynamically
app.get('/api/maintenance-status', (req: Request, res: Response) => {
  res.json({
    global: MAINTENANCE_MODE,
    studio: STUDIO_MAINTENANCE_MODE,
    mltk: MLTK_MAINTENANCE_MODE,
  });
});

import adminAuth, { handleAdminLogin } from './src/middleware/adminAuth';
import adminRouter, { getConfigFromStore, getAnnouncementsFromStore } from './src/routes/admin';

// ⚡ Bolt: Consolidated single maintenance middleware.
// Removed redundant earlier maintenance middleware that duplicated decodeURIComponent parsing
// and Set lookups on every HTTP request before reaching this comprehensive middleware.
app.use(async (req: Request, res: Response, next: NextFunction) => {
  // Normalize path by stripping query strings and lowercasing encoded spaces if any
  // 🛡️ Sentinel: Wrap decodeURIComponent in a try-catch to prevent unhandled URIError DoS from malformed paths
  let reqPath: string;
  try {
    reqPath = decodeURIComponent(req.path);
  } catch {
    res.status(400).json({ error: 'Bad Request: Malformed URI' });
    return;
  }

  // Exempt admin routes from maintenance mode so admins can always configure or login
  if (
    reqPath.startsWith('/api/admin') ||
    reqPath.startsWith('/admin') ||
    reqPath === '/mltk-admin.html' ||
    reqPath === '/mltk-admin'
  ) {
    next();
    return;
  }

  try {
    const sysConfig = await getConfigFromStore();
    if (sysConfig.maintenanceMode || !sysConfig.publicSiteEnabled) {
      res.status(503).sendFile(MAINTENANCE_PATH);
      return;
    }
  } catch (err) {
    console.error('Error fetching system configuration in maintenance middleware:', err);
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

app.use('/api/admin', adminRouter);

app.post('/api/admin/verify', handleAdminLogin);

// Legacy MLTK Admin redirect
app.get(['/mltk-admin.html', '/mltk-admin'], (req: Request, res: Response) => {
  res.redirect(301, '/admin/');
});

// Admin API routes
app.get('/api/admin/dashboard-config', adminAuth, async (req: Request, res: Response) => {
  try {
    const config = await getDashboardConfig();
    res.json(config);
  } catch {
    res.status(500).json({ error: 'Failed to fetch dashboard config' });
  }
});

app.post('/api/admin/dashboard-config', adminAuth, async (req: Request, res: Response) => {
  const { id, status } = req.body;
  try {
    await updateDashboardConfig(id, status);
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: 'Failed to update dashboard config' });
  }
});

app.post('/api/admin/dashboard-config/all', adminAuth, async (req: Request, res: Response) => {
  const { status } = req.body;
  try {
    await updateAllDashboardConfig(status);
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: 'Failed to update all dashboard configs' });
  }
});

app.get('/api/admin/maintenance-config', adminAuth, async (req: Request, res: Response) => {
  try {
    const config = await getMaintenanceConfig();
    res.json(config);
  } catch {
    res.status(500).json({ error: 'Failed to fetch maintenance config' });
  }
});

app.post('/api/admin/maintenance-config', adminAuth, async (req: Request, res: Response) => {
  const { key, value } = req.body;
  try {
    await updateMaintenanceConfig(key, value);
    if (key === 'global') MAINTENANCE_MODE = value;
    if (key === 'studio') STUDIO_MAINTENANCE_MODE = value;
    if (key === 'mltk') MLTK_MAINTENANCE_MODE = value;
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: 'Failed to update maintenance config' });
  }
});

app.post('/api/admin/maintenance-config/all', adminAuth, async (req: Request, res: Response) => {
  const { value } = req.body;
  try {
    await updateAllMaintenanceConfig(value);
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: 'Failed to update all maintenance configs' });
  }
});

// 🛡️ Sentinel: Rate limiting for public email collection to prevent DoS & spam floods
const emailRateLimitMap = new Map<string, RateLimitRecord>();
const EMAIL_RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const EMAIL_MAX_ATTEMPTS = 10;

const resetEmailRateLimitMap = (): void => {
  emailRateLimitMap.clear();
};
(app as unknown as { resetEmailRateLimitMap: () => void }).resetEmailRateLimitMap =
  resetEmailRateLimitMap;

app.post('/api/emails/collect', async (req: Request, res: Response) => {
  try {
    const ip: string = req.ip || req.socket.remoteAddress || 'unknown';
    const now = Date.now();
    const record = emailRateLimitMap.get(ip) || { count: 0, firstAttempt: now };

    // Bounded Map with O(1) eviction to prevent memory leaks from IP spoofing
    if (emailRateLimitMap.size >= 1000 && !emailRateLimitMap.has(ip)) {
      const oldestKey = emailRateLimitMap.keys().next().value;
      if (oldestKey !== undefined) {
        emailRateLimitMap.delete(oldestKey);
      }
    }

    if (now - record.firstAttempt > EMAIL_RATE_LIMIT_WINDOW_MS) {
      record.count = 1;
      record.firstAttempt = now;
    } else {
      record.count++;
      if (record.count > EMAIL_MAX_ATTEMPTS) {
        res
          .status(429)
          .json({ error: 'Too many email collection requests, please try again later.' });
        return;
      }
    }
    emailRateLimitMap.set(ip, record);

    const sysConfig = await getConfigFromStore();
    if (sysConfig && sysConfig.allowEmailCollection === false) {
      res.status(403).json({ error: 'Email collection is currently disabled.' });
      return;
    }

    const { email, source } = req.body || {};
    if (
      typeof email !== 'string' ||
      typeof source !== 'string' ||
      !email.trim() ||
      !source.trim()
    ) {
      res.status(400).json({ error: 'Email and source are required non-empty strings' });
      return;
    }

    const cleanEmail = email.trim();
    const cleanSource = source.trim();

    if (cleanEmail.length > 254 || cleanSource.length > 100) {
      res.status(400).json({ error: 'Input length exceeds allowable limit' });
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      res.status(400).json({ error: 'Invalid email format' });
      return;
    }

    await saveEmail(cleanEmail, cleanSource);
    res.json({ success: true });
  } catch (error) {
    console.error('Failed to save email:', error);
    res.status(500).json({ error: 'Failed to save email' });
  }
});

// Phase / Tier release endpoints
app.get('/api/phases', async (req: Request, res: Response) => {
  try {
    const activePhaseId = await getActivePhase();
    res.json({
      activePhaseId,
      phases: MLTK_PHASES,
    });
  } catch {
    res.status(500).json({ error: 'Failed to fetch phases' });
  }
});

app.get('/api/admin/phases', adminAuth, async (req: Request, res: Response) => {
  try {
    const activePhaseId = await getActivePhase();
    res.json({
      activePhaseId,
      phases: MLTK_PHASES,
    });
  } catch {
    res.status(500).json({ error: 'Failed to fetch phase configuration' });
  }
});

app.post('/api/admin/phases/set', adminAuth, async (req: Request, res: Response) => {
  const { phaseId } = req.body;
  if (!phaseId) {
    res.status(400).json({ error: 'phaseId is required' });
    return;
  }
  try {
    const success = await setActivePhase(phaseId);
    if (success) {
      res.json({ success: true, activePhaseId: phaseId });
    } else {
      res.status(400).json({ error: 'Invalid phaseId' });
    }
  } catch {
    res.status(500).json({ error: 'Failed to set active phase' });
  }
});

// Public dashboard config endpoint
app.get('/api/dashboard-config', async (req: Request, res: Response) => {
  try {
    const config = await getDashboardConfig();
    const activePhaseId = await getActivePhase();
    res.json({
      activePhaseId,
      config,
    });
  } catch {
    res.status(500).json({ error: 'Failed to fetch dashboard config' });
  }
});

app.get('/api/config/storefront', (req: Request, res: Response) => {
  const url = process.env.STOREFRONT_URL || '#';
  res.json({ url });
});

// Public endpoint to retrieve active and scheduled ARG announcements
app.get('/api/announcements', async (req: Request, res: Response) => {
  try {
    const announcements = await getAnnouncementsFromStore();
    const now = new Date().toISOString();
    const activeAnnouncements = announcements.filter((a) => {
      if (!a.active) return false;
      if (a.scheduledAt && a.scheduledAt > now) return false;
      return true;
    });
    res.json({ success: true, announcements: activeAnnouncements });
  } catch {
    res.status(500).json({ error: 'Failed to fetch announcements' });
  }
});

// 301 Redirect .html requests to clean URLs
app.use((req: Request, res: Response, next: NextFunction) => {
  if (req.method === 'GET' || req.method === 'HEAD') {
    let reqPath: string;
    try {
      reqPath = decodeURIComponent(req.path);
    } catch {
      reqPath = req.path;
    }
    if (
      reqPath === '/gretchen-dossier' ||
      reqPath === '/gretchen-dossier.html' ||
      reqPath === '/104-9-global-directives' ||
      reqPath === '/104-9-global-directives.html'
    ) {
      const query = req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : '';
      return res.redirect(301, '/104.9-global-directives' + query);
    }
    if (reqPath.endsWith('.html') && reqPath !== '/404.html' && reqPath !== '/maintenance.html') {
      if (reqPath === '/index.html') {
        const query = req.url.slice(reqPath.length);
        return res.redirect(301, '/' + query);
      } else {
        const cleanPath = reqPath.slice(0, -5);
        const query = req.url.slice(reqPath.length);
        return res.redirect(301, cleanPath + query);
      }
    }
  }
  next();
});

app.get('/104.9-global-directives', (req: Request, res: Response) => {
  res.sendFile(path.join(publicDir, '104.9-global-directives.html'));
});

app.use(express.static(publicDir, { extensions: ['html'] }));

interface RateLimitRecord {
  count: number;
  firstAttempt: number;
}
const rateLimitMap = new Map<string, RateLimitRecord>();
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const MAX_ATTEMPTS = 5;

const getEffectiveAuthPassword = (): string => {
  const isProduction = process.env.NODE_ENV === 'production';
  const envAuthPassword = process.env.AUTH_PASSWORD;

  if (isProduction && (!envAuthPassword || !envAuthPassword.trim())) {
    throw new Error(
      'Production verification error: AUTH_PASSWORD environment variable must be configured in production.'
    );
  }

  return envAuthPassword || ['0408', '1998', 'XXXX'].join('-');
};

app.post('/api/verify', (req: Request, res: Response) => {
  let effectiveAuthPassword: string;
  try {
    effectiveAuthPassword = getEffectiveAuthPassword();
  } catch (err) {
    if (err instanceof Error && err.message.includes('AUTH_PASSWORD')) {
      res.status(500).json({
        success: false,
        error: 'Server configuration error: AUTH_PASSWORD not configured',
      });
      return;
    }
    throw err;
  }

  const authBuffer = Buffer.from(effectiveAuthPassword);

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
    const puzzleOverride = 'TETROMINO_OVERRIDE_0408';
    const overrideBuffer = Buffer.from(puzzleOverride);
    const codeBuffer = Buffer.from(code);

    if (
      codeBuffer.length === authBuffer.length &&
      crypto.timingSafeEqual(new Uint8Array(codeBuffer), new Uint8Array(authBuffer))
    ) {
      success = true;
    } else if (
      codeBuffer.length === overrideBuffer.length &&
      crypto.timingSafeEqual(new Uint8Array(codeBuffer), new Uint8Array(overrideBuffer))
    ) {
      success = true;
    } else {
      // Prevent length leakage via timing by doing dummy comparisons
      crypto.timingSafeEqual(new Uint8Array(authBuffer), new Uint8Array(authBuffer));
      crypto.timingSafeEqual(new Uint8Array(overrideBuffer), new Uint8Array(overrideBuffer));
    }
  }

  res.json({ success });
});

// Catch-all route to serve the custom 404 page
app.use((req: Request, res: Response) => {
  res.status(404).sendFile(NOT_FOUND_PATH);
});

// 🛡️ Sentinel: Global error-handling middleware to prevent leaking stack traces
app.use((err: unknown, req: Request, res: Response, _next: NextFunction) => {
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
  const host = '0.0.0.0';
  app.listen(Number(port), host, () => {
    console.log(`Server listening on ${host}:${port}`);
  });
}

export = app;
