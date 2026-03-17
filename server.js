const express = require('express');
const path = require('path');
const crypto = require('crypto');
const app = express();
const port = 3000;

// 🛡️ Sentinel: Add security headers to protect against common web vulnerabilities
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff'); // Prevent MIME sniffing
  res.setHeader('X-Frame-Options', 'DENY'); // Prevent clickjacking
  res.setHeader('X-XSS-Protection', '1; mode=block'); // Enable browser XSS filtering
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

// Check if maintenance mode is enabled
const MAINTENANCE_MODE = process.env.MAINTENANCE_MODE === 'true';

if (MAINTENANCE_MODE) {
  app.use((req, res, next) => {
    // Exclude certain assets like CSS/JS if needed, but for a simple maintenance page we just serve the maintenance HTML
    res.status(503).sendFile(path.join(__dirname, 'public', 'maintenance.html'));
  });
}

app.use(express.static(path.join(__dirname, 'public')));

const AUTH_PASSWORD = process.env.AUTH_PASSWORD;

if (!AUTH_PASSWORD) {
  console.error('FATAL: AUTH_PASSWORD environment variable is not set.');
  process.exit(1);
}

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
  res.status(404).sendFile(path.join(__dirname, 'public', '404.html'));
});

if (require.main === module) {
  app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
  });
}

module.exports = app;
