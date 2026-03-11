const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%&*!<>{}[]";

function generateStatic(length) {
    if (length < 0) return '';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { chars, generateStatic };
}
