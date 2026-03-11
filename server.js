const express = require('express');
const path = require('path');
const app = express();
const port = 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.post('/api/verify', (req, res) => {
    const { code } = req.body;
    const expectedCode = process.env.AUTH_PASSWORD || "0408-1998-XXXX";
    if (code === expectedCode) {
        res.json({ success: true });
    } else {
        res.json({ success: false });
    }
});

app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
});
