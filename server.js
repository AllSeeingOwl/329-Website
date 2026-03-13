const express = require('express');
const path = require('path');
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
  res.json({ success: code === AUTH_PASSWORD });
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
