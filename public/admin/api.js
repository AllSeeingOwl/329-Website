/**
 * NEURAL LINK // ADMIN API MODULE
 *
 * Separate JavaScript module for the admin dashboard handling all API communication,
 * session state management, error handling, auto-refresh intervals, retry logic,
 * request queuing on session expiration, and debug logging.
 */

(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) {
    // CommonJS / Node / Jest environment
    module.exports = factory();
  } else {
    // Browser global scope
    const apiModule = factory();
    root.AdminAPI = apiModule;
    // Also assign individual functions to global scope if desired
    Object.assign(root, apiModule);
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // State Management
  let debugLogging = false;
  let authenticated = false;
  let queuedOperations = [];
  let phasesRefreshInterval = null;
  let emailsRefreshInterval = null;

  /**
   * Toggle or set debug logging.
   * @param {boolean} enabled
   */
  function setDebugLogging(enabled) {
    debugLogging = !!enabled;
    logDebug('Debug logging ' + (debugLogging ? 'enabled' : 'disabled'));
  }

  /**
   * Internal logger for debugging.
   */
  function logDebug(...args) {
    if (debugLogging) {
      console.log('[AdminAPI]', ...args);
    }
  }

  /**
   * Parse session token from document cookies.
   * @returns {string|null}
   */
  function getSessionTokenFromCookie() {
    if (typeof document === 'undefined' || !document.cookie) {
      return null;
    }
    const match = document.cookie.match(/(?:^|; )\s*admin_session=([^;]*)/);
    return match ? decodeURIComponent(match[1]) : null;
  }

  /**
   * Clear session cookie in browser environment.
   */
  function clearSessionCookie() {
    if (typeof document !== 'undefined') {
      document.cookie = 'admin_session=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    }
  }

  /**
   * Standardized error builder.
   * @param {number} statusCode
   * @param {string} message
   * @returns {{ error: boolean, statusCode: number, message: string }}
   */
  function createStandardError(statusCode, message) {
    return {
      error: true,
      statusCode: statusCode || 500,
      message: message || 'An unexpected error occurred',
    };
  }

  /**
   * Check if currently marked as authenticated.
   * @returns {boolean}
   */
  function isAuthenticated() {
    return authenticated || !!getSessionTokenFromCookie();
  }

  /**
   * Core HTTP fetch wrapper with retry logic, error standardization, and 401 session queueing.
   *
   * @param {string} url
   * @param {Object} [options={}]
   * @param {number} [retryCount=0]
   * @param {number} [maxRetries=3]
   * @returns {Promise<any>}
   */
  async function apiRequest(url, options = {}, retryCount = 0, maxRetries = 3) {
    const fetchOptions = {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
    };

    const token = getSessionTokenFromCookie();
    if (token && !fetchOptions.headers['Authorization'] && !fetchOptions.headers['X-Admin-Token']) {
      fetchOptions.headers['X-Admin-Session'] = token;
    }

    logDebug(`[API Request] ${fetchOptions.method || 'GET'} ${url} (Attempt ${retryCount + 1}/${maxRetries + 1})`);

    try {
      const response = await fetch(url, fetchOptions);

      // Handle 401 Unauthorized / Session Expired
      if (response.status === 401) {
        logDebug(`[API 401 Unauthorized] Session expired or invalid for ${url}`);
        authenticated = false;
        clearSessionCookie();
        stopAutoRefresh();

        // Queue operation if it's not the authenticate endpoint itself
        if (!url.includes('/api/admin/authenticate')) {
          return new Promise((resolve, reject) => {
            queuedOperations.push({
              execute: () => apiRequest(url, options, 0, maxRetries).then(resolve).catch(reject),
              reject: (err) => reject(err),
            });
            logDebug(`[Queue] Request queued (total queued: ${queuedOperations.length})`);
          });
        }

        const errObj = createStandardError(401, 'Unauthorized or session expired');
        return Promise.reject(errObj);
      }

      // Handle non-2xx response codes
      if (!response.ok) {
        let errorData = {};
        try {
          const contentType = response.headers.get('content-type') || '';
          if (contentType.includes('application/json')) {
            errorData = await response.json();
          } else {
            const text = await response.text();
            errorData = { message: text };
          }
        } catch (_) {
          errorData = { message: response.statusText };
        }

        const statusCode = response.status;
        const msg = errorData.message || errorData.error || `HTTP Error ${statusCode}`;

        // Retry on 5xx Server Errors up to maxRetries
        if (statusCode >= 500 && retryCount < maxRetries) {
          logDebug(`[API Retry] Server error ${statusCode}. Retrying in ${Math.pow(2, retryCount) * 200}ms...`);
          await new Promise((resolve) => setTimeout(resolve, Math.pow(2, retryCount) * 200));
          return apiRequest(url, options, retryCount + 1, maxRetries);
        }

        const errObj = createStandardError(statusCode, msg);
        return Promise.reject(errObj);
      }

      // Success - parse JSON or blob based on response header
      const contentType = response.headers.get('content-type') || '';
      let data;
      if (contentType.includes('application/json')) {
        data = await response.json();
      } else if (contentType.includes('text/csv') || contentType.includes('application/octet-stream')) {
        data = await response.blob();
      } else {
        data = await response.text();
      }

      authenticated = true;
      return data;
    } catch (networkError) {
      logDebug(`[Network Error] ${networkError.message}`);

      // Retry on network/fetch failure up to maxRetries
      if (retryCount < maxRetries) {
        logDebug(`[API Retry] Network failure. Retrying attempt ${retryCount + 1} of ${maxRetries}...`);
        await new Promise((resolve) => setTimeout(resolve, Math.pow(2, retryCount) * 200));
        return apiRequest(url, options, retryCount + 1, maxRetries);
      }

      const errObj = createStandardError(0, networkError.message || 'Network request failed');
      return Promise.reject(errObj);
    }
  }

  /**
   * Flush queued operations after successful re-authentication.
   */
  function flushQueue() {
    if (queuedOperations.length === 0) return;
    logDebug(`Flushing ${queuedOperations.length} queued operation(s)...`);
    const queueToProcess = [...queuedOperations];
    queuedOperations = [];
    queueToProcess.forEach((op) => {
      try {
        op.execute();
      } catch (err) {
        if (op.reject) op.reject(createStandardError(500, err.message));
      }
    });
  }

  /**
   * Clear queued operations with an error rejection.
   * @param {string} [reason='Session terminated']
   */
  function clearQueue(reason = 'Session terminated') {
    const queueToProcess = [...queuedOperations];
    queuedOperations = [];
    queueToProcess.forEach((op) => {
      if (op.reject) {
        op.reject(createStandardError(401, reason));
      }
    });
  }

  // =========================================================================
  // EXPORTED ADMIN API FUNCTIONS
  // =========================================================================

  /**
   * Authenticate admin with password.
   * Calls POST /api/admin/authenticate
   *
   * @param {string} password
   * @returns {Promise<Object>}
   */
  function authenticateAdmin(password) {
    if (!password || typeof password !== 'string') {
      return Promise.reject(createStandardError(400, 'Password is required'));
    }

    return apiRequest('/api/admin/authenticate', {
      method: 'POST',
      body: JSON.stringify({ password }),
    }).then((res) => {
      if (res && res.success) {
        authenticated = true;
        flushQueue();
      }
      return res;
    });
  }

  /**
   * Logout current admin session.
   * Calls POST /api/admin/logout
   *
   * @returns {Promise<Object>}
   */
  function logoutAdmin() {
    return apiRequest('/api/admin/logout', {
      method: 'POST',
    }).then((res) => {
      authenticated = false;
      clearSessionCookie();
      stopAutoRefresh();
      clearQueue('Logged out');
      return res;
    }).catch((err) => {
      authenticated = false;
      clearSessionCookie();
      stopAutoRefresh();
      clearQueue('Logged out');
      return { success: true, message: 'Logged out locally' };
    });
  }

  /**
   * Fetch all release phases/tiers.
   * Calls GET /api/admin/phases
   *
   * @returns {Promise<Object>}
   */
  function getPhases() {
    return apiRequest('/api/admin/phases', { method: 'GET' });
  }

  /**
   * Activate a specific release phase.
   * Calls POST /api/admin/phases/activate
   *
   * @param {string} phaseId
   * @returns {Promise<Object>}
   */
  function activatePhase(phaseId) {
    if (!phaseId) {
      return Promise.reject(createStandardError(400, 'phaseId is required'));
    }

    return apiRequest('/api/admin/phases/activate', {
      method: 'POST',
      body: JSON.stringify({ phaseId, adminUser: 'admin' }),
    });
  }

  /**
   * Deactivate a specific release phase.
   * Calls DELETE /api/admin/phases/:phaseId/deactivate
   *
   * @param {string} phaseId
   * @returns {Promise<Object>}
   */
  function deactivatePhase(phaseId) {
    if (!phaseId) {
      return Promise.reject(createStandardError(400, 'phaseId is required'));
    }

    return apiRequest(`/api/admin/phases/${encodeURIComponent(phaseId)}/deactivate`, {
      method: 'DELETE',
      body: JSON.stringify({ adminUser: 'admin' }),
    });
  }

  /**
   * Fetch all captured emails.
   * Calls GET /api/admin/emails
   *
   * @returns {Promise<Object>}
   */
  function getEmails() {
    return apiRequest('/api/admin/emails', { method: 'GET' });
  }

  /**
   * Export captured email data as a CSV file and trigger download in browser.
   * Calls GET /api/admin/emails/export
   *
   * @returns {Promise<Blob|Object>}
   */
  function exportEmailsCSV() {
    return apiRequest('/api/admin/emails/export', { method: 'GET' }).then((data) => {
      if (
        typeof window !== 'undefined' &&
        typeof document !== 'undefined' &&
        data instanceof Blob &&
        typeof window.URL !== 'undefined' &&
        typeof window.URL.createObjectURL === 'function'
      ) {
        const url = window.URL.createObjectURL(data);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'collected_emails.csv';
        document.body.appendChild(a);
        a.click();
        if (typeof window.URL.revokeObjectURL === 'function') {
          window.URL.revokeObjectURL(url);
        }
        a.remove();
      }
      return data;
    });
  }

  /**
   * Clear all captured emails.
   * Calls POST /api/admin/emails/clear
   *
   * @param {boolean} [confirmed=true]
   * @returns {Promise<Object>}
   */
  function clearEmails(confirmed = true) {
    if (!confirmed) {
      return Promise.reject(createStandardError(400, 'Confirmation required to clear emails'));
    }

    return apiRequest('/api/admin/emails/clear?confirm=true', {
      method: 'POST',
      body: JSON.stringify({ confirm: true, adminUser: 'admin' }),
    });
  }

  /**
   * Fetch email collection metrics/statistics.
   * Calls GET /api/admin/emails/stats
   *
   * @returns {Promise<Object>}
   */
  function getEmailStats() {
    return apiRequest('/api/admin/emails/stats', { method: 'GET' });
  }

  /**
   * Fetch system configuration.
   * Calls GET /api/admin/config
   *
   * @returns {Promise<Object>}
   */
  function getConfig() {
    return apiRequest('/api/admin/config', { method: 'GET' });
  }

  /**
   * Update system configuration.
   * Calls PUT /api/admin/config
   *
   * @param {Object} newConfig
   * @returns {Promise<Object>}
   */
  function updateConfig(newConfig) {
    if (!newConfig || typeof newConfig !== 'object') {
      return Promise.reject(createStandardError(400, 'Valid configuration object required'));
    }

    return apiRequest('/api/admin/config', {
      method: 'PUT',
      body: JSON.stringify({ ...newConfig, adminUser: 'admin' }),
    });
  }

  /**
   * Toggle maintenance mode.
   * Calls POST /api/admin/maintenance/toggle
   *
   * @param {boolean} [enabled]
   * @returns {Promise<Object>}
   */
  function toggleMaintenanceMode(enabled) {
    const payload = {};
    if (typeof enabled === 'boolean') {
      payload.enabled = enabled;
    }
    payload.adminUser = 'admin';

    return apiRequest('/api/admin/maintenance/toggle', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  /**
   * Fetch audit logs.
   * Calls GET /api/admin/audit-logs
   *
   * @returns {Promise<Object>}
   */
  function getAuditLog() {
    return apiRequest('/api/admin/audit-logs', { method: 'GET' }).catch((err) => {
      // Fallback to /api/admin/audit if /api/admin/audit-logs fails
      logDebug('GET /api/admin/audit-logs failed, attempting fallback to /api/admin/audit');
      return apiRequest('/api/admin/audit', { method: 'GET' });
    });
  }

  /**
   * Start auto-refreshing phases (every 30s) and emails/stats (every 60s).
   *
   * @param {Object} [callbacks={}]
   * @param {Function} [callbacks.onPhases]
   * @param {Function} [callbacks.onEmails]
   * @param {Function} [callbacks.onError]
   * @param {number} [phasesIntervalMs=30000]
   * @param {number} [emailsIntervalMs=60000]
   */
  function startAutoRefresh(callbacks = {}, phasesIntervalMs = 30000, emailsIntervalMs = 60000) {
    stopAutoRefresh();

    logDebug(`Starting auto-refresh timers (Phases: ${phasesIntervalMs}ms, Emails: ${emailsIntervalMs}ms)`);

    phasesRefreshInterval = setInterval(() => {
      if (!isAuthenticated()) return;
      getPhases()
        .then((data) => {
          if (callbacks.onPhases) callbacks.onPhases(data);
        })
        .catch((err) => {
          logDebug('Auto-refresh phases failed:', err);
          if (callbacks.onError) callbacks.onError(err);
        });
    }, phasesIntervalMs);

    emailsRefreshInterval = setInterval(() => {
      if (!isAuthenticated()) return;
      Promise.all([getEmails(), getEmailStats()])
        .then(([emailsData, statsData]) => {
          if (callbacks.onEmails) callbacks.onEmails({ emails: emailsData, stats: statsData });
        })
        .catch((err) => {
          logDebug('Auto-refresh emails failed:', err);
          if (callbacks.onError) callbacks.onError(err);
        });
    }, emailsIntervalMs);
  }

  /**
   * Stop auto-refresh intervals.
   */
  function stopAutoRefresh() {
    if (phasesRefreshInterval) {
      clearInterval(phasesRefreshInterval);
      phasesRefreshInterval = null;
    }
    if (emailsRefreshInterval) {
      clearInterval(emailsRefreshInterval);
      emailsRefreshInterval = null;
    }
    logDebug('Auto-refresh timers stopped');
  }

  /**
   * Get total count of currently queued operations waiting for re-authentication.
   * @returns {number}
   */
  function getQueuedOperationsCount() {
    return queuedOperations.length;
  }

  // Public Module API
  return {
    // Session & Configuration
    authenticateAdmin,
    logoutAdmin,
    isAuthenticated,
    setDebugLogging,
    startAutoRefresh,
    stopAutoRefresh,

    // Phase Management
    getPhases,
    activatePhase,
    deactivatePhase,

    // Email Management
    getEmails,
    exportEmailsCSV,
    clearEmails,
    getEmailStats,

    // System Configuration & Health
    getConfig,
    updateConfig,
    toggleMaintenanceMode,
    getAuditLog,

    // Internal Queue Helpers (exposed for testing / debug)
    getQueuedOperationsCount,
    clearQueue,
  };
});
