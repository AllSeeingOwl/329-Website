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

app.post('/api/verify', (req, res) => {
  const { code } = req.body;
  let success = false;

  if (typeof code === 'string') {
    const codeBuffer = Buffer.from(code);
    const authBuffer = Buffer.from(AUTH_PASSWORD);

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
