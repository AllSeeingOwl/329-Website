const express = require('express');
const path = require('path');
const app = express();
const port = 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const AUTH_PASSWORD = process.env.AUTH_PASSWORD;

if (!AUTH_PASSWORD) {
    console.error("FATAL: AUTH_PASSWORD environment variable is not set.");
    process.exit(1);
}

app.post('/api/verify', (req, res) => {
    const { code } = req.body;
    if (code === AUTH_PASSWORD) {
        res.json({ success: true });
    } else {
        res.json({ success: false });
    }
});

if (require.main === module) {
    app.listen(port, () => {
        console.log(`Server listening on port ${port}`);
    });
}

module.exports = app;
