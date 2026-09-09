/**
 * @jest-environment jsdom
 */

const AdminAPI = require('./public/admin/api.js');

describe('Admin API Module (public/admin/api.js)', () => {
  let originalFetch;

  beforeEach(() => {
    originalFetch = global.fetch;
    jest.useFakeTimers();
    // Clear cookies
    document.cookie = 'admin_session=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    AdminAPI.stopAutoRefresh();
    AdminAPI.clearQueue();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    jest.useRealTimers();
  });

  test('authenticateAdmin successfully authenticates and returns promise data', async () => {
    const mockResponse = { success: true, message: 'Authenticated' };
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: { get: () => 'application/json' },
      json: async () => mockResponse,
    });

    const promise = AdminAPI.authenticateAdmin('adminpass');
    expect(promise).toBeInstanceOf(Promise);

    const data = await promise;
    expect(data).toEqual(mockResponse);
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/admin/authenticate',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ password: 'adminpass' }),
      })
    );
    expect(AdminAPI.isAuthenticated()).toBe(true);
  });

  test('authenticateAdmin rejects on empty password', async () => {
    await expect(AdminAPI.authenticateAdmin('')).rejects.toEqual({
      error: true,
      statusCode: 400,
      message: 'Password is required',
    });
  });

  test('getPhases calls GET /api/admin/phases', async () => {
    const mockPhases = { success: true, phases: [{ id: 'p1' }] };
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: { get: () => 'application/json' },
      json: async () => mockPhases,
    });

    const data = await AdminAPI.getPhases();
    expect(data).toEqual(mockPhases);
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/admin/phases',
      expect.objectContaining({
        method: 'GET',
      })
    );
  });

  test('activatePhase calls POST /api/admin/phases/activate', async () => {
    const mockRes = { success: true, message: 'Activated' };
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: { get: () => 'application/json' },
      json: async () => mockRes,
    });

    const data = await AdminAPI.activatePhase('phase-1');
    expect(data).toEqual(mockRes);
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/admin/phases/activate',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ phaseId: 'phase-1', adminUser: 'admin' }),
      })
    );
  });

  test('deactivatePhase calls DELETE /api/admin/phases/:phaseId/deactivate', async () => {
    const mockRes = { success: true, message: 'Deactivated' };
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: { get: () => 'application/json' },
      json: async () => mockRes,
    });

    const data = await AdminAPI.deactivatePhase('phase-1');
    expect(data).toEqual(mockRes);
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/admin/phases/phase-1/deactivate',
      expect.objectContaining({
        method: 'DELETE',
      })
    );
  });

  test('getEmails calls GET /api/admin/emails', async () => {
    const mockEmails = { success: true, emails: [] };
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: { get: () => 'application/json' },
      json: async () => mockEmails,
    });

    const data = await AdminAPI.getEmails();
    expect(data).toEqual(mockEmails);
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/admin/emails',
      expect.objectContaining({
        method: 'GET',
      })
    );
  });

  test('exportEmailsCSV calls GET /api/admin/emails/export', async () => {
    window.URL.createObjectURL = jest.fn().mockReturnValue('blob:mock-url');
    window.URL.revokeObjectURL = jest.fn();

    const mockBlob = new Blob(['Email,Collected At\ntest@example.com,2026'], { type: 'text/csv' });
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: { get: () => 'text/csv' },
      blob: async () => mockBlob,
    });

    const data = await AdminAPI.exportEmailsCSV();
    expect(data).toEqual(mockBlob);
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/admin/emails/export',
      expect.objectContaining({
        method: 'GET',
      })
    );
  });

  test('clearEmails calls POST /api/admin/emails/clear', async () => {
    const mockRes = { success: true, clearedCount: 5 };
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: { get: () => 'application/json' },
      json: async () => mockRes,
    });

    const data = await AdminAPI.clearEmails(true);
    expect(data).toEqual(mockRes);
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/admin/emails/clear?confirm=true',
      expect.objectContaining({
        method: 'POST',
      })
    );
  });

  test('clearEmails rejects when not confirmed', async () => {
    await expect(AdminAPI.clearEmails(false)).rejects.toEqual({
      error: true,
      statusCode: 400,
      message: 'Confirmation required to clear emails',
    });
  });

  test('getEmailStats calls GET /api/admin/emails/stats', async () => {
    const mockStats = { success: true, total: 10 };
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: { get: () => 'application/json' },
      json: async () => mockStats,
    });

    const data = await AdminAPI.getEmailStats();
    expect(data).toEqual(mockStats);
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/admin/emails/stats',
      expect.objectContaining({
        method: 'GET',
      })
    );
  });

  test('getConfig calls GET /api/admin/config', async () => {
    const mockConfig = { success: true, config: {} };
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: { get: () => 'application/json' },
      json: async () => mockConfig,
    });

    const data = await AdminAPI.getConfig();
    expect(data).toEqual(mockConfig);
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/admin/config',
      expect.objectContaining({
        method: 'GET',
      })
    );
  });

  test('updateConfig calls PUT /api/admin/config', async () => {
    const newCfg = { maintenanceMode: false };
    const mockRes = { success: true, config: newCfg };
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: { get: () => 'application/json' },
      json: async () => mockRes,
    });

    const data = await AdminAPI.updateConfig(newCfg);
    expect(data).toEqual(mockRes);
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/admin/config',
      expect.objectContaining({
        method: 'PUT',
        body: JSON.stringify({ ...newCfg, adminUser: 'admin' }),
      })
    );
  });

  test('toggleMaintenanceMode calls POST /api/admin/maintenance/toggle', async () => {
    const mockRes = { success: true, maintenanceMode: true };
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: { get: () => 'application/json' },
      json: async () => mockRes,
    });

    const data = await AdminAPI.toggleMaintenanceMode(true);
    expect(data).toEqual(mockRes);
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/admin/maintenance/toggle',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ enabled: true, adminUser: 'admin' }),
      })
    );
  });

  test('getAuditLog calls /api/admin/audit-logs', async () => {
    const mockLogs = { success: true, logs: [] };
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: { get: () => 'application/json' },
      json: async () => mockLogs,
    });

    const data = await AdminAPI.getAuditLog();
    expect(data).toEqual(mockLogs);
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/admin/audit-logs',
      expect.objectContaining({
        method: 'GET',
      })
    );
  });

  test('retries on 500 error up to 3 times before returning standardized error', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 500,
      headers: { get: () => 'application/json' },
      json: async () => ({ message: 'Internal Server Error' }),
    });

    const promise = AdminAPI.getPhases();

    // Fast-forward fake timers for retries
    jest.runAllTimersAsync();

    await expect(promise).rejects.toEqual({
      error: true,
      statusCode: 500,
      message: 'Internal Server Error',
    });

    // 1 initial attempt + 3 retries = 4 calls
    expect(global.fetch).toHaveBeenCalledTimes(4);
  });

  test('queues requests on 401 unauthorized and flushes on re-authentication', async () => {
    // 1. Initial call gets 401
    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: false,
      status: 401,
      headers: { get: () => 'application/json' },
      json: async () => ({ message: 'Unauthorized' }),
    });

    const queuedPromise = AdminAPI.getPhases();
    // Allow microtasks to execute so fetch resolves and 401 handler pushes to queue
    await Promise.resolve();
    expect(AdminAPI.getQueuedOperationsCount()).toBe(1);

    // 2. Re-authenticate
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: { get: () => 'application/json' },
        json: async () => ({ success: true, message: 'Authenticated' }),
      })
      // 3. Flushed queued request succeeds
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: { get: () => 'application/json' },
        json: async () => ({ success: true, phases: ['p1'] }),
      });

    await AdminAPI.authenticateAdmin('correctpass');

    const result = await queuedPromise;
    expect(result).toEqual({ success: true, phases: ['p1'] });
    expect(AdminAPI.getQueuedOperationsCount()).toBe(0);
  });

  test('startAutoRefresh executes timers and calls callbacks', async () => {
    const onPhases = jest.fn();
    const onEmails = jest.fn();

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: { get: () => 'application/json' },
      json: async () => ({ success: true }),
    });

    // Set authenticated state via cookie
    document.cookie = 'admin_session=testtoken; path=/;';

    AdminAPI.startAutoRefresh({ onPhases, onEmails }, 1000, 2000);

    // Advance by 1000ms
    await jest.advanceTimersByTimeAsync(1000);
    expect(onPhases).toHaveBeenCalledTimes(1);

    // Advance by another 1000ms (total 2000ms)
    await jest.advanceTimersByTimeAsync(1000);
    expect(onPhases).toHaveBeenCalledTimes(2);
    expect(onEmails).toHaveBeenCalledTimes(1);

    AdminAPI.stopAutoRefresh();
  });
});
