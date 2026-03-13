/**
 * @jest-environment jsdom
 */

const { initVelvetRope, breachMainframe, CONFIG } = require('./public/velvet_rope_utils');

describe('Velvet Rope Utilities Tests', () => {
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

        // Suppress navigation errors in tests temporarily
        jest.spyOn(console, 'error').mockImplementation((msg) => {
            if (msg && msg.toString().includes('Not implemented: navigation')) return;
            console.warn(msg);
        });

        // Initialize SHOULD_REDIRECT to false for isolation
        CONFIG.SHOULD_REDIRECT = false;

        jest.useFakeTimers();
    });

    afterEach(() => {
        jest.useRealTimers();
        jest.clearAllMocks();
        jest.restoreAllMocks();
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

        const mockWin = { location: { assign: jest.fn(), href: '' } };
        breachMainframe(event, mockWin);

        expect(event.preventDefault).toHaveBeenCalled();

        jest.advanceTimersByTime(800);

        // Find the newly appended modal (it should contain 'COMMUNICATION SECURED.')
        const modals = Array.from(document.querySelectorAll('div')).filter(el => el.textContent.includes('COMMUNICATION SECURED.'));
        const modal = modals.length > 0 ? modals[0] : null;
        expect(modal).toBeTruthy();
        // Ensure developer note is NOT present
        expect(modal.textContent).not.toContain('Developer Note');
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

        const assignMock = jest.fn();
        const mockWin = { location: { assign: assignMock, href: '' } };

        breachMainframe(event, mockWin);

        jest.advanceTimersByTime(800);

        expect(assignMock).toHaveBeenCalledWith('test-redirect.html');
        // Modal should not be created
        const modals = Array.from(document.querySelectorAll('div')).filter(el => el.textContent.includes('COMMUNICATION SECURED.'));
        expect(modals.length).toBe(0);
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

        const mockWin = { location: { assign: jest.fn(), href: '' } };
        // Should not throw
        breachMainframe(null, mockWin);
        jest.advanceTimersByTime(800);

        const modals = Array.from(document.querySelectorAll('div')).filter(el => el.textContent.includes('COMMUNICATION SECURED.'));
        const modal = modals.length > 0 ? modals[0] : null;
        expect(modal).toBeTruthy();
    });
});
