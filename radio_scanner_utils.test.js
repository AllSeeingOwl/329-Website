const { generateStatic, chars } = require('./public/radio_scanner_utils');

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

    describe('boundary conditions with mocked Math.random', () => {
        let originalRandom;

        beforeEach(() => {
            originalRandom = Math.random;
        });

        afterEach(() => {
            Math.random = originalRandom;
        });

        test('uses the first character when Math.random returns 0', () => {
            Math.random = jest.fn(() => 0);
            const expectedChar = chars.charAt(0);
            expect(generateStatic(5)).toBe(expectedChar.repeat(5));
            expect(Math.random).toHaveBeenCalledTimes(5);
        });

        test('uses the last character when Math.random returns close to 1', () => {
            Math.random = jest.fn(() => 0.999999);
            const expectedChar = chars.charAt(chars.length - 1);
            expect(generateStatic(5)).toBe(expectedChar.repeat(5));
            expect(Math.random).toHaveBeenCalledTimes(5);
        });

        test('uses a character in the middle when Math.random returns 0.5', () => {
            Math.random = jest.fn(() => 0.5);
            const middleIndex = Math.floor(0.5 * chars.length);
            const expectedChar = chars.charAt(middleIndex);
            expect(generateStatic(5)).toBe(expectedChar.repeat(5));
            expect(Math.random).toHaveBeenCalledTimes(5);
        });
    });
});
