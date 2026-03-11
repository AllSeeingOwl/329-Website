const { generateStatic, chars } = require('./radio_scanner_utils');

describe('generateStatic', () => {
    test('generates a string of the requested length', () => {
        expect(generateStatic(10)).toHaveLength(10);
        expect(generateStatic(0)).toHaveLength(0);
        expect(generateStatic(100)).toHaveLength(100);
    });

    test('only contains characters from the chars set', () => {
        const result = generateStatic(1000);
        for (let char of result) {
            expect(chars).toContain(char);
        }
    });

    test('returns empty string for negative length', () => {
        expect(generateStatic(-5)).toBe('');
    });

    test('is somewhat random (consecutive calls with same length produce different results)', () => {
        const result1 = generateStatic(50);
        const result2 = generateStatic(50);
        expect(result1).not.toBe(result2);
    });
});
