/**
 * @jest-environment jsdom
 */

const { initVelvetRope, breachMainframe, CONFIG } = require('./public/velvet_rope_utils');

describe('Velvet Rope Utilities Tests', () => {
  let originalLocation;

  beforeEach(() => {
    // Setup DOM
    document.body.innerHTML = `
            <div id="facade" style="display: block;"></div>
            <div id="underground" style="display: none;">
                <div id="beatrix-intrusion" style="display: none;"></div>
                <div id="bea-trigger-point"></div>
                <div id="merrick-stamp" style="display: none;"></div>
            </div>
        `;

        // Mock window.location properly
        originalLocation = window.location;
        delete window.location;
        window.location = {
            href: '',
            assign: jest.fn(),
            replace: jest.fn()
        };

        jest.useFakeTimers();
    });

    afterEach(() => {
        window.location = originalLocation;
        jest.useRealTimers();
        jest.clearAllMocks();
        document.body.innerHTML = '';
    });

    test('initVelvetRope handles transition to underground', () => {
        initVelvetRope();

        // Initial delay
        jest.advanceTimersByTime(2000);

        const facade = document.getElementById('facade');
        expect(facade.classList.contains('screen-tear')).toBe(true);

        // Transition delay
        jest.advanceTimersByTime(400);

        expect(facade.style.display).toBe('none');
        expect(document.getElementById('underground').style.display).toBe('block');
        expect(document.body.style.backgroundColor).toBe('rgb(5, 5, 5)');
        expect(document.title).toBe("SYSTEM OVERRIDE // TEAM RABBIT");
    });

    test('breachMainframe creates modal when SHOULD_REDIRECT is false', () => {
        CONFIG.SHOULD_REDIRECT = false;
        document.body.innerHTML = '<div id="test"></div>';

        const event = {
            preventDefault: jest.fn(),
            target: {
                querySelector: jest.fn().mockReturnValue(document.createElement('button'))
            }
        };

        breachMainframe(event);

        expect(event.preventDefault).toHaveBeenCalled();

        jest.advanceTimersByTime(800);

        const modal = document.querySelector('div[style*="position:fixed"]');
        expect(modal).toBeTruthy();
        expect(modal.innerHTML).toContain('COMMUNICATION SECURED.');
        // Ensure developer note is NOT present
        expect(modal.innerHTML).not.toContain('Developer Note');
    });

    test('breachMainframe redirects when SHOULD_REDIRECT is true', () => {
        CONFIG.SHOULD_REDIRECT = true;
        CONFIG.REDIRECT_TARGET = 'test-redirect.html';

        const event = {
            preventDefault: jest.fn(),
            target: {
                querySelector: jest.fn().mockReturnValue(document.createElement('button'))
            }
        };

        breachMainframe(event);

        jest.advanceTimersByTime(800);

        expect(window.location.href).toBe('test-redirect.html');
        // Modal should not be created
        const modal = document.querySelector('div[style*="position:fixed"]');
        expect(modal).toBeNull();
    });

    test('gracefully handles missing elements in initVelvetRope', () => {
        document.body.innerHTML = '';
        // Should not throw
        initVelvetRope();
        jest.advanceTimersByTime(2400);
    });

    test('gracefully handles missing elements in breachMainframe', () => {
        CONFIG.SHOULD_REDIRECT = false;
        document.body.innerHTML = '<div id="test"></div>';

        // Should not throw
        breachMainframe(null);
        jest.advanceTimersByTime(800);

        const modal = document.querySelector('div[style*="position:fixed"]');
        expect(modal).toBeTruthy();
    });
});
