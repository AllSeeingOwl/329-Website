const express = require('express');
const path = require('path');
const crypto = require('crypto');
const app = express();
const port = 3000;

app.use(express.json());

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

  // Clean up expired entries to prevent memory leak
  if (rateLimitMap.size > 1000) {
    for (const [key, value] of rateLimitMap.entries()) {
      if (now - value.firstAttempt > RATE_LIMIT_WINDOW_MS) {
        rateLimitMap.delete(key);
      }
    }
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
