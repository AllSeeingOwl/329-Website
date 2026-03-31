/**
 * @jest-environment jsdom
 */

const { generateStatic, chars, setupRadioScanner } = require('./public/radio_scanner_utils');

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

  describe('boundary conditions with mocked crypto.getRandomValues', () => {
    let originalGetRandomValues;

    beforeEach(() => {
      originalGetRandomValues = globalThis.crypto.getRandomValues;
    });

    afterEach(() => {
      globalThis.crypto.getRandomValues = originalGetRandomValues;
    });

    test('uses the first character when crypto returns 0', () => {
      globalThis.crypto.getRandomValues = jest.fn((array) => {
        array.fill(0);
        return array;
      });
      const expectedChar = chars.charAt(0);
      expect(generateStatic(5)).toBe(expectedChar.repeat(5));
      expect(globalThis.crypto.getRandomValues).toHaveBeenCalled();
    });

    test('uses the last character when crypto returns multiple of chars.length - 1', () => {
      globalThis.crypto.getRandomValues = jest.fn((array) => {
        array.fill(chars.length - 1);
        return array;
      });
      const expectedChar = chars.charAt(chars.length - 1);
      expect(generateStatic(5)).toBe(expectedChar.repeat(5));
      expect(globalThis.crypto.getRandomValues).toHaveBeenCalled();
    });

    test('uses a character in the middle when crypto returns a specific index', () => {
      const middleIndex = Math.floor(chars.length / 2);
      globalThis.crypto.getRandomValues = jest.fn((array) => {
        array.fill(middleIndex);
        return array;
      });
      const expectedChar = chars.charAt(middleIndex);
      expect(generateStatic(5)).toBe(expectedChar.repeat(5));
      expect(globalThis.crypto.getRandomValues).toHaveBeenCalled();
    });
  });
});

describe('setupRadioScanner', () => {
  let slider;
  let display;
  let output;
  let radioBody;

  beforeEach(() => {
    document.body.innerHTML = `
            <div id="radio-body">
                <p id="freq-display"></p>
                <input type="range" id="freq-slider" min="880" max="1080" value="880">
                <div id="transmission-output"></div>
            </div>
        `;

    slider = document.getElementById('freq-slider');
    display = document.getElementById('freq-display');
    output = document.getElementById('transmission-output');
    radioBody = document.getElementById('radio-body');

    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  test('does nothing if elements are missing', () => {
    document.body.innerHTML = ''; // clear DOM
    setupRadioScanner();
    // Nothing should throw
  });

  test('displays static when far from frequency', () => {
    setupRadioScanner();

    slider.value = '880';
    slider.dispatchEvent(new Event('input'));

    expect(display.textContent).toBe('88.0');
    expect(radioBody.classList.contains('locked-in')).toBe(false);
    expect(output.classList.contains('anim-shake')).toBe(true);
    expect(output.textContent.length).toBeGreaterThan(0);
    expect(output.textContent).not.toContain('...TRANSMISSION S');
  });

  test('displays partial static when close to frequency', () => {
    setupRadioScanner();

    slider.value = '1046'; // distance is 3 (1049 - 1046)
    slider.dispatchEvent(new Event('input'));

    expect(display.textContent).toBe('104.6');
    expect(radioBody.classList.contains('locked-in')).toBe(false);
    expect(output.classList.contains('anim-shake')).toBe(true);
    expect(output.textContent).toContain('...TRANSMISSION S');
    expect(output.textContent).toContain('groovy c');
    expect(output.textContent).toContain('bolt cutters...');
  });

  test('locks in and types message when exactly on frequency', () => {
    setupRadioScanner();

    slider.value = '1049';
    slider.dispatchEvent(new Event('input'));

    expect(display.textContent).toBe('104.9');
    expect(radioBody.classList.contains('locked-in')).toBe(true);
    expect(output.classList.contains('anim-shake')).toBe(false);

    // Initially empty before typing animation
    expect(output.textContent).toBe('');

    // Advance timers to complete typing animation
    jest.advanceTimersByTime(30 * 300); // 30ms per char, approx 300 chars

    const decryptedMessage =
      "TRANSMISSION SECURED: What's up, groovy cats? Ollie here. If you're hearing this, you cracked the Dvorak disclaimer. The MLTK has eyes on the main routes. We are moving the operation. Meet us at the abandoned developer room under the Mini Rail. Bring bolt cutters. Stay wild.";
    expect(output.textContent).toBe(decryptedMessage);
  });
});
