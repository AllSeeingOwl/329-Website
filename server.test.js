const request = require('supertest');
const express = require('express');

describe('Server Authentication Security', () => {
    let app;
    let originalEnv;
    let originalExit;
    let originalConsoleError;

    beforeEach(() => {
        originalEnv = { ...process.env };
        originalExit = process.exit;
        originalConsoleError = console.error;
        process.exit = jest.fn();
        console.error = jest.fn();
        jest.resetModules();
    });

    afterEach(() => {
        process.env = originalEnv;
        process.exit = originalExit;
        console.error = originalConsoleError;
    });

    test('should exit if AUTH_PASSWORD is not set', () => {
        delete process.env.AUTH_PASSWORD;
        require('./server');
        expect(process.exit).toHaveBeenCalledWith(1);
        expect(console.error).toHaveBeenCalledWith("FATAL: AUTH_PASSWORD environment variable is not set.");
    });

    test('should allow access if AUTH_PASSWORD is set and correct', async () => {
        process.env.AUTH_PASSWORD = 'test_password';
        app = require('./server');
        const res = await request(app)
            .post('/api/verify')
            .send({ code: 'test_password' });
        expect(res.body).toEqual({ success: true });
    });

    test('should deny access if AUTH_PASSWORD is set and incorrect', async () => {
        process.env.AUTH_PASSWORD = 'test_password';
        app = require('./server');
        const res = await request(app)
            .post('/api/verify')
            .send({ code: 'wrong_password' });
        expect(res.body).toEqual({ success: false });
    });
});
