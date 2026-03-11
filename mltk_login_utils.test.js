/**
 * @jest-environment jsdom
 */

const { setupEventListeners, verifyCode } = require('./public/mltk_login_utils');

describe('MLTK Login Gate Tests', () => {
    let originalFetch;

    beforeEach(() => {
        // Setup DOM
        document.body.innerHTML = `
            <div id="lockdown-screen" style="display: block;">
                <div id="input-group" class="">
                    <input type="text" id="serial-input" value="">
                </div>
                <p id="error-msg" style="display: none;"></p>
            </div>
            <div id="success-screen" style="display: none;"></div>
        `;

        // Mock fetch
        originalFetch = global.fetch;
        global.fetch = jest.fn();

        jest.useFakeTimers();
    });

    afterEach(() => {
        global.fetch = originalFetch;
        jest.useRealTimers();
        jest.clearAllMocks();
    });

    test('setupEventListeners formats input with hyphens and uppercase', () => {
        setupEventListeners();
        const inputField = document.getElementById('serial-input');

        // Simulate typing lowercase characters
        inputField.value = 'abcd123';
        const event = new Event('input', { bubbles: true });
        inputField.dispatchEvent(event);

        expect(inputField.value).toBe('ABCD-123');

        // Simulate continuing typing
        inputField.value = 'ABCD-123456';
        inputField.dispatchEvent(event);

        expect(inputField.value).toBe('ABCD-1234-56');
    });

    test('setupEventListeners adds click listener that focuses input when lockdown screen is active', () => {
        setupEventListeners();
        const inputField = document.getElementById('serial-input');

        // Mock focus
        inputField.focus = jest.fn();

        document.dispatchEvent(new Event('click'));
        expect(inputField.focus).toHaveBeenCalledTimes(1);

        // Hide lockdown screen
        document.getElementById('lockdown-screen').style.display = 'none';
        document.dispatchEvent(new Event('click'));

        // Should not be called again
        expect(inputField.focus).toHaveBeenCalledTimes(1);
    });

    test('verifyCode success path - displays success screen and hides lockdown', async () => {
        global.fetch.mockResolvedValueOnce({
            json: async () => ({ success: true }),
        });

        const inputField = document.getElementById('serial-input');
        inputField.value = '0408-1998-XXXX';

        const event = { preventDefault: jest.fn() };
        await verifyCode(event);

        expect(event.preventDefault).toHaveBeenCalled();
        expect(global.fetch).toHaveBeenCalledWith('/api/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code: '0408-1998-XXXX' }),
        });

        expect(document.body.style.backgroundColor).toBe('rgb(5, 5, 5)'); // #050505
        expect(document.getElementById('lockdown-screen').style.display).toBe('none');
        expect(document.getElementById('success-screen').style.display).toBe('flex');
    });

    test('verifyCode error path - displays error, clears input, shakes, and hides error after timeout', async () => {
        global.fetch.mockResolvedValueOnce({
            json: async () => ({ success: false }),
        });

        const inputField = document.getElementById('serial-input');
        const errorMsg = document.getElementById('error-msg');
        const inputGroup = document.getElementById('input-group');

        inputField.value = 'INVALID-CODE';

        const event = { preventDefault: jest.fn() };
        await verifyCode(event);

        expect(global.fetch).toHaveBeenCalledWith('/api/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code: 'INVALID-CODE' }),
        });

        expect(errorMsg.style.display).toBe('block');
        expect(inputGroup.classList.contains('shake')).toBe(true);
        expect(inputField.value).toBe('');

        // Error message should disappear after 3 seconds
        jest.advanceTimersByTime(3000);
        expect(errorMsg.style.display).toBe('none');
    });
});
