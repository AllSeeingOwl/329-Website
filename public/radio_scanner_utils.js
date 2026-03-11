const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%&*!<>{}[]";

function generateStatic(length) {
    if (length < 0) return '';
    return Array.from({length}, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { chars, generateStatic };
}
