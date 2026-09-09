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
  getAllEmails,
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
    "default-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.tailwindcss.com; font-src 'self' https://fonts.gstatic.com; script-src 'self' 'unsafe-inline' https://unpkg.com https://cdn.tailwindcss.com; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; upgrade-insecure-requests;"
  );
  next();
});

// 🔒 Sentinel: Limit request body size to prevent DoS attacks via large JSON payloads
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: true, limit: '100kb' }));

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
  '/releases.html',
  '/studio-contact-us.html',
  '/business-privacy-policy.html',
  '/business-terms-of-service.html',
]);

const mltkFiles = new Set([
  '/mltk-login-gate.html',
  '/mltk-surveillance-dashboard.html',
  '/mltk-privacy-policy.html',
  '/mltk-customer-service.html',
  '/mltk-classified-document.html',
  '/velvet-rope-landing-page.html',
  '/nova-parent-directory.html',
  '/nova-classified-archive.html',
  '/ollies-radio-scanner.html',
  '/secure-data-drop-page.html',
  '/developer-blog.html',
  '/mltk-virtue-village-index.html',
  '/team-rabbit-hack.html',
  '/arg-progress-dashboard.html',
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

    const publicDir = path.join(__dirname, 'public');
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
        entryArr.push(`    <loc>${baseUrl}/${file}</loc>\n`);

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
    const publicDir = path.join(__dirname, 'public');
    const files = await fs.promises.readdir(publicDir);

    const host = req.get('host') || 'localhost:3000';
    const protocol = req.protocol || 'https';
    const baseUrl = `${protocol}://${host}`;

    const allPages: string[] = [];

    for (const file of files) {
      if (file.endsWith('.html')) {
        allPages.push(`${baseUrl}/${file}`);
      }
    }

    res.json({ pages: allPages });
  } catch (err) {
    console.error('Error generating internal-sitemap.json:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

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

import adminAuth, { handleAdminLogin } from './src/middleware/adminAuth';

app.post('/api/admin/verify', handleAdminLogin);

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

app.post('/api/emails/collect', async (req: Request, res: Response) => {
  const { email, source } = req.body;
  if (!email || !source) {
    res.status(400).json({ error: 'Email and source are required' });
    return;
  }
  try {
    await saveEmail(email, source);
    res.json({ success: true });
  } catch (error) {
    console.error('Failed to save email:', error);
    res.status(500).json({ error: 'Failed to save email' });
  }
});

app.get('/api/admin/emails/export', adminAuth, async (req: Request, res: Response) => {
  try {
    const emails = await getAllEmails();

    // Create CSV content
    const header = ['Name', 'Email', 'Source', 'Timestamp'];

    // Add dummy rows for template visibility as requested
    const dummyRows = [
      ['Jane Doe', 'dummy_studio@example.com', 'studio_newsletter', new Date().toISOString()],
      ['Unknown', 'dummy_player@example.com', 'mltk_access', new Date().toISOString()],
    ];

    const rows = [...dummyRows, ...emails.map((e) => ['Unknown', e.email, e.source, e.timestamp])];
    const csvContent = [header, ...rows]
      .map((row) => row.map((cell) => `"${cell}"`).join(','))
      .join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="collected_emails.csv"');
    res.send(csvContent);
  } catch (error) {
    console.error('Failed to export emails:', error);
    res.status(500).json({ error: 'Failed to export emails' });
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

app.use(express.static(path.join(__dirname, 'public')));

// -----------------------------------------------------------------------------
// WARNING: DO NOT CHANGE THIS PASSWORD WITHOUT EXPLICIT PERMISSION FROM THE USER.
// The official password for this ARG gate is hinted in mltk_login_utils.js.
// Changing this fallback will break the intended experience for local development.
// -----------------------------------------------------------------------------
// The throw was moved inside the route to prevent top-level crashes on Vercel.
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
  if (process.env.NODE_ENV === 'production' && !process.env.AUTH_PASSWORD) {
    console.warn('WARNING: AUTH_PASSWORD should be set in production. Using insecure fallback.');
  }

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
      success = crypto.timingSafeEqual(new Uint8Array(codeBuffer), new Uint8Array(authBuffer));
    } else {
      // Prevent length leakage via timing by doing a dummy comparison
      crypto.timingSafeEqual(new Uint8Array(authBuffer), new Uint8Array(authBuffer));
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
  app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
  });
}

export = app;
