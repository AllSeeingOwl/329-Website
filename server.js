const express = require('express');
const path = require('path');
const crypto = require('crypto');
const app = express();
const port = process.env.PORT || 3000;

// 🛡️ Sentinel: Disable Express framework leakage
app.disable('x-powered-by');

// 🛡️ Sentinel: Add security headers to protect against common web vulnerabilities
app.use((req, res, next) => {
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains'); // Enforce HTTPS
  res.setHeader('X-Content-Type-Options', 'nosniff'); // Prevent MIME sniffing
  res.setHeader('X-Frame-Options', 'DENY'); // Prevent clickjacking
  res.setHeader('X-XSS-Protection', '1; mode=block'); // Enable browser XSS filtering
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate'); // Prevent caching of sensitive data
  res.setHeader('Pragma', 'no-cache'); // HTTP 1.0 backward compatibility
  res.setHeader('Expires', '0'); // Proxies
  // 🛡️ Sentinel: Add Referrer-Policy to prevent leaking sensitive URLs across origins
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  // Restrict resource loading to trusted sources
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; script-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self';"
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

// ⚡ Bolt: Pre-calculate static asset paths to avoid redundant path logic and allocations.
const MAINTENANCE_PATH = path.join(__dirname, 'public', 'maintenance.html');
const NOT_FOUND_PATH = path.join(__dirname, 'public', '404.html');

// Lists of files belonging to each portal
const studioFiles = new Set([
  '/Surface Home Page.html',
  '/Studio Manifesto Page.html',
  '/Store.html',
  '/Cart.html',
  '/Checkout.html',
  '/Releases.html',
  '/Studio Contact Us.html',
  '/Business Privacy Policy.html',
  '/Business Terms of Service.html',
  '/Procure Volume 1.html',
  '/Procure Physical Artefact.html',
]);

const mltkFiles = new Set([
  '/MLTK Login Gate.html',
  '/MLTK Surveillance Dashboard.html',
  '/MLTK Privacy Policy.html',
  '/MLTK Terms of Service.html',
  '/MLTK Boot Sequence.html',
  '/MLTK Customer Service.html',
  '/MLTK Classified Document.html',
  '/MLTK Timer.html',
  '/Velvet Rope Landing Page.html',
  '/NOVA Parent Directory.html',
  '/NOVA Classified Archive.html',
  '/Ollies Radio Scanner.html',
  '/Secure Data Drop Page.html',
  '/Developer Blog.html',
]);

// Maintenance Middleware
app.use((req, res, next) => {
  // Normalize path by stripping query strings and lowercasing encoded spaces if any
  // 🛡️ Sentinel: Wrap decodeURIComponent in a try-catch to prevent unhandled URIError DoS from malformed paths
  let reqPath;
  try {
    reqPath = decodeURIComponent(req.path);
  } catch {
    return res.status(400).json({ error: 'Bad Request: Malformed URI' });
  }

  // Global Maintenance Mode applies to everything except static assets if we want,
  // but originally it was fully blocking everything. Keeping the original behavior:
  if (MAINTENANCE_MODE) {
    return res.status(503).sendFile(MAINTENANCE_PATH);
  }

  // Check specific maintenance modes for HTML pages.
  // We only block specific paths to allow CSS/JS to pass through freely.
  if (STUDIO_MAINTENANCE_MODE && studioFiles.has(reqPath)) {
    return res.status(503).sendFile(MAINTENANCE_PATH);
  }

  if (MLTK_MAINTENANCE_MODE && mltkFiles.has(reqPath)) {
    return res.status(503).sendFile(MAINTENANCE_PATH);
  }

  next();
});

// Endpoint for frontend to check maintenance status dynamically
app.get('/api/maintenance-status', (req, res) => {
  res.json({
    global: MAINTENANCE_MODE,
    studio: STUDIO_MAINTENANCE_MODE,
    mltk: MLTK_MAINTENANCE_MODE,
  });
});

app.use(express.static(path.join(__dirname, 'public')));

// -----------------------------------------------------------------------------
// WARNING: DO NOT CHANGE THIS PASSWORD WITHOUT EXPLICIT PERMISSION FROM THE USER.
// The official password for this ARG gate is '0408-1998-XXXX'.
// Changing this will break the intended experience.
// -----------------------------------------------------------------------------
const AUTH_PASSWORD = process.env.AUTH_PASSWORD || '0408-1998-XXXX';

const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const MAX_ATTEMPTS = 5;
// ⚡ Bolt: Cache auth buffer to prevent recreation on every verification request
// This reduces allocation overhead and improves response times for the verification endpoint.
// We provide a fallback empty string if AUTH_PASSWORD is undefined during mocked test environments that mock process.exit.
const authBuffer = Buffer.from(AUTH_PASSWORD || '');

app.post('/api/verify', (req, res) => {
  const ip = req.ip || req.connection?.remoteAddress || 'unknown';
  const now = Date.now();
  const record = rateLimitMap.get(ip) || { count: 0, firstAttempt: now };

  // 🛡️ Sentinel: Enforce an O(1) eviction policy to prevent memory leaks and
  // algorithmic complexity DoS attacks (which occur when iterating over a large map).
  if (rateLimitMap.size >= 1000 && !rateLimitMap.has(ip)) {
    const oldestKey = rateLimitMap.keys().next().value;
    rateLimitMap.delete(oldestKey);
  }

  if (now - record.firstAttempt > RATE_LIMIT_WINDOW_MS) {
    record.count = 1;
    record.firstAttempt = now;
  } else {
    record.count++;
    if (record.count > MAX_ATTEMPTS) {
      return res
        .status(429)
        .json({ success: false, error: 'Too many attempts, please try again later.' });
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
app.use((req, res, next) => {
  res.status(404).sendFile(NOT_FOUND_PATH);
});

// 🛡️ Sentinel: Global error-handling middleware to prevent leaking stack traces
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);

  // Handle specific standard HTTP errors correctly
  if (err.status) {
    return res.status(err.status).json({ error: err.message || 'Error' });
  }

  res.status(500).json({ error: 'Internal Server Error' });
});

if (require.main === module) {
  app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
  });
}

module.exports = app;
