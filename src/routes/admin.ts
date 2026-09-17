import { Router, Request, Response } from 'express';
import adminAuth, {
  handleAdminLogin,
  extractSessionToken,
  destroyAdminSession,
} from '../middleware/adminAuth';
import { redis, isRedisAvailable } from '../redis';
import { getAllEmails, clearAllEmails } from '../../db';

const router = Router();

interface Phase {
  id: string;
  name: string;
  tier: number;
  active: boolean;
  relatedContent: string[];
  activatedAt?: string | null;
  lastModifiedBy?: string;
}

interface ActivatePhaseRequestBody {
  phaseId?: string;
  adminUser?: string;
}

interface UpdatePhaseRequestBody {
  name?: string;
  tier?: number;
  active?: boolean;
  relatedContent?: string[];
  lastModifiedBy?: string;
  adminUser?: string;
}

interface DeactivatePhaseRequestBody {
  adminUser?: string;
}

export interface SystemConfig {
  maintenanceMode: boolean;
  publicSiteEnabled: boolean;
  adminPanelEnabled: boolean;
  allowEmailCollection: boolean;
  emailNotificationEnabled: boolean;
  maxConcurrentSessions: number;
  sessionTimeout: number; // minutes
  emergencyLockdown: boolean;
}

const DEFAULT_SYSTEM_CONFIG: SystemConfig = {
  maintenanceMode: false,
  publicSiteEnabled: true,
  adminPanelEnabled: true,
  allowEmailCollection: true,
  emailNotificationEnabled: true,
  maxConcurrentSessions: 10,
  sessionTimeout: 15,
  emergencyLockdown: false,
};

export interface Announcement {
  id: string;
  title: string;
  content: string;
  active: boolean;
  scheduledAt: string | null;
  createdAt: string;
  updatedAt: string;
  author?: string;
}

let inMemoryAnnouncementsStore: Announcement[] = [
  {
    id: 'announcement-init-1',
    title: 'NEURAL LINK NETWORK ACTIVE',
    content: 'All surveillance nodes online. MLTK Phase 1 operational.',
    active: true,
    scheduledAt: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    author: 'SYSTEM',
  },
];

export const getAnnouncementsFromStore = async (): Promise<Announcement[]> => {
  if (isRedisAvailable()) {
    try {
      const stored = await redis.get<Announcement[] | string>('arg:announcements');
      if (stored) {
        const parsed = typeof stored === 'string' ? JSON.parse(stored) : stored;
        if (Array.isArray(parsed)) {
          return parsed;
        }
      }
    } catch (err) {
      console.error('Error reading announcements from Redis:', err);
    }
  }
  return [...inMemoryAnnouncementsStore];
};

export const saveAnnouncementsToStore = async (announcements: Announcement[]): Promise<void> => {
  inMemoryAnnouncementsStore = announcements;
  if (isRedisAvailable()) {
    try {
      await redis.set('arg:announcements', JSON.stringify(announcements));
    } catch (err) {
      console.error('Error saving announcements to Redis:', err);
    }
  }
};

const DEFAULT_PHASES: Phase[] = [
  {
    id: 'phase-1-zine-launch',
    name: 'Phase 1: Zine Launch',
    tier: 1,
    active: true,
    relatedContent: [
      'secure-data-drop-page.html',
      'mltk-classified-document.html',
      'UNCUT_PUZZLE.pdf',
      'VIRTUE_VILLAGE_LAYOUTS.pdf',
      'GRETCHEN_DOSSIER.txt',
    ],
    activatedAt: new Date().toISOString(),
    lastModifiedBy: 'system',
  },
  {
    id: 'phase-1-5-email-1',
    name: 'Phase 1.5: Email Drip #1',
    tier: 1,
    active: false,
    relatedContent: ['ollies-radio-scanner.html'],
    activatedAt: null,
    lastModifiedBy: 'system',
  },
  {
    id: 'phase-1-5-email-2',
    name: 'Phase 1.5: Email Drip #2',
    tier: 2,
    active: false,
    relatedContent: ['nova-classified-archive.html', 'nova-parent-directory.html'],
    activatedAt: null,
    lastModifiedBy: 'system',
  },
  {
    id: 'phase-2-ushers-handbook',
    name: "Phase 2: Usher's Handbook Pre-Launch",
    tier: 3,
    active: false,
    relatedContent: [
      'mltk-five-finger-wheel.html',
      'mltk-virtue-village-index.html',
      'mltk-customer-service.html',
      'SEEDLESS_GRAPES_MOTEL_BLUEPRINTS.zip',
    ],
    activatedAt: null,
    lastModifiedBy: 'system',
  },
];

let inMemoryPhasesStore: Phase[] = DEFAULT_PHASES.map((p) => ({
  ...p,
  relatedContent: [...p.relatedContent],
}));

let inMemoryConfigStore: SystemConfig = { ...DEFAULT_SYSTEM_CONFIG };
let inMemoryAuditLogs: Array<{
  timestamp: string;
  adminUser: string;
  action: string;
  phaseId: string;
  details: Record<string, unknown>;
}> = [];

export const resetInMemPhases = (): void => {
  inMemoryPhasesStore = DEFAULT_PHASES.map((p) => ({
    ...p,
    relatedContent: [...p.relatedContent],
  }));
};

export const resetInMemConfig = (): void => {
  inMemoryConfigStore = { ...DEFAULT_SYSTEM_CONFIG };
};

export const getConfigFromStore = async (): Promise<SystemConfig> => {
  if (isRedisAvailable()) {
    try {
      const stored = await redis.get<SystemConfig | string>('config:system');
      if (stored) {
        const parsed = typeof stored === 'string' ? JSON.parse(stored) : stored;
        inMemoryConfigStore = { ...DEFAULT_SYSTEM_CONFIG, ...parsed };
        return inMemoryConfigStore;
      }
    } catch (err) {
      console.error('Failed to fetch system config from Redis:', err);
    }
  }
  return inMemoryConfigStore;
};

const saveConfigToStore = async (config: SystemConfig): Promise<void> => {
  inMemoryConfigStore = { ...config };
  if (isRedisAvailable()) {
    try {
      await redis.set('config:system', JSON.stringify(config));
    } catch (err) {
      console.error('Failed to save system config to Redis:', err);
    }
  }
};

const getPhasesFromStore = async (): Promise<Phase[]> => {
  if (isRedisAvailable()) {
    try {
      const stored = await redis.get<Phase[] | string>('config:phases');
      if (stored) {
        const parsed = typeof stored === 'string' ? JSON.parse(stored) : stored;
        inMemoryPhasesStore = parsed;
        return parsed;
      }
    } catch (err) {
      console.error('Failed to fetch phases from Redis:', err);
    }
  }
  return inMemoryPhasesStore;
};

const savePhasesToStore = async (phases: Phase[]): Promise<void> => {
  inMemoryPhasesStore = phases;
  if (isRedisAvailable()) {
    try {
      await redis.set('config:phases', JSON.stringify(phases));
    } catch (err) {
      console.error('Failed to save phases to Redis:', err);
    }
  }
};

/**
 * Helper to extract admin user identifier from body or headers.
 */
const getAdminUser = (req: Request): string => {
  if (req.body && typeof req.body.adminUser === 'string' && req.body.adminUser.trim()) {
    return req.body.adminUser.trim();
  }
  const headerUser = req.headers['x-admin-user'];
  if (typeof headerUser === 'string' && headerUser.trim()) {
    return headerUser.trim();
  }
  return 'admin';
};

const logPhaseChange = async (
  adminUser: string,
  action: string,
  targetId: string,
  details: Record<string, unknown> = {}
): Promise<void> => {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    adminUser,
    action,
    phaseId: targetId,
    details,
  };
  console.log(
    `[AUDIT TRAIL] [${timestamp}] Admin '${adminUser}' ${action} on '${targetId}'`,
    details
  );

  inMemoryAuditLogs.unshift(logEntry);
  if (inMemoryAuditLogs.length > 100) {
    inMemoryAuditLogs = inMemoryAuditLogs.slice(0, 100);
  }

  if (isRedisAvailable()) {
    try {
      await redis.lpush('admin:audit_logs', JSON.stringify(logEntry));
      await redis.ltrim('admin:audit_logs', 0, 99);
    } catch (err) {
      console.error('Failed to log audit action to Redis:', err);
    }
  }
};

/**
 * POST /api/admin/authenticate
 * Canonical admin authentication endpoint.
 */
router.post('/authenticate', handleAdminLogin);

/**
 * GET /api/admin/phases
 * Returns all phases and their current lock status.
 */
router.get('/phases', adminAuth, async (_req: Request, res: Response): Promise<void> => {
  try {
    const phases = await getPhasesFromStore();
    const activePhase = phases.find((p) => p.active);
    res.json({
      success: true,
      phases,
      activePhaseId: activePhase ? activePhase.id : null,
    });
  } catch (error) {
    console.error('Error in GET /api/admin/phases:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch phase configuration' });
  }
});

/**
 * POST /api/admin/phases/activate
 * Activates a phase (unlocks related content).
 */
router.post('/phases/activate', adminAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const { phaseId, adminUser } = (req.body || {}) as ActivatePhaseRequestBody;

    if (!phaseId || typeof phaseId !== 'string' || !phaseId.trim()) {
      res.status(400).json({
        success: false,
        message: 'Invalid phase data: phaseId is required',
      });
      return;
    }

    const cleanPhaseId = phaseId.trim();
    const phases = await getPhasesFromStore();
    const targetIndex = phases.findIndex((p) => p.id === cleanPhaseId);

    if (targetIndex === -1) {
      res.status(400).json({
        success: false,
        message: `Invalid phase data: Phase with id '${cleanPhaseId}' not found`,
      });
      return;
    }

    const user = adminUser || 'admin';
    const timestamp = new Date().toISOString();

    phases[targetIndex] = {
      ...phases[targetIndex],
      active: true,
      activatedAt: timestamp,
      lastModifiedBy: user,
    };

    await savePhasesToStore(phases);
    await logPhaseChange(user, 'ACTIVATE_PHASE', cleanPhaseId, { activatedAt: timestamp });

    res.json({
      success: true,
      message: `Phase ${cleanPhaseId} activated successfully`,
      phase: phases[targetIndex],
    });
  } catch (error) {
    console.error('Error in POST /api/admin/phases/activate:', error);
    res.status(500).json({ success: false, message: 'Failed to activate phase' });
  }
});

/**
 * PUT /api/admin/phases/:phaseId
 * Updates phase configuration.
 */
router.put('/phases/:phaseId', adminAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const phaseIdParam = Array.isArray(req.params.phaseId)
      ? req.params.phaseId[0]
      : req.params.phaseId;
    const { name, tier, active, relatedContent, lastModifiedBy, adminUser } = (req.body ||
      {}) as UpdatePhaseRequestBody;

    const phases = await getPhasesFromStore();
    const targetIndex = phases.findIndex((p) => p.id === phaseIdParam);

    if (targetIndex === -1) {
      res.status(400).json({
        success: false,
        message: `Invalid phase data: Phase with id '${phaseIdParam}' not found`,
      });
      return;
    }

    // Validation
    if (name !== undefined && (typeof name !== 'string' || !name.trim())) {
      res.status(400).json({
        success: false,
        message: 'Invalid phase data: name must be a non-empty string',
      });
      return;
    }

    if (tier !== undefined && (typeof tier !== 'number' || ![1, 2, 3].includes(tier))) {
      res.status(400).json({
        success: false,
        message: 'Invalid phase data: tier must be a number between 1 and 3',
      });
      return;
    }

    if (active !== undefined && typeof active !== 'boolean') {
      res.status(400).json({
        success: false,
        message: 'Invalid phase data: active must be a boolean',
      });
      return;
    }

    if (
      relatedContent !== undefined &&
      (!Array.isArray(relatedContent) || !relatedContent.every((item) => typeof item === 'string'))
    ) {
      res.status(400).json({
        success: false,
        message: 'Invalid phase data: relatedContent must be an array of strings',
      });
      return;
    }

    const currentPhase = phases[targetIndex];
    const user =
      typeof adminUser === 'string' && adminUser.trim()
        ? adminUser.trim()
        : typeof lastModifiedBy === 'string' && lastModifiedBy.trim()
          ? lastModifiedBy.trim()
          : 'admin';
    const timestamp = new Date().toISOString();

    let newActivatedAt = currentPhase.activatedAt;
    if (active === true && !currentPhase.active) {
      newActivatedAt = timestamp;
    } else if (active === false) {
      newActivatedAt = null;
    }

    const updatedPhase: Phase = {
      ...currentPhase,
      name: name !== undefined ? name.trim() : currentPhase.name,
      tier: tier !== undefined ? tier : currentPhase.tier,
      active: active !== undefined ? active : currentPhase.active,
      relatedContent: relatedContent !== undefined ? relatedContent : currentPhase.relatedContent,
      activatedAt: newActivatedAt,
      lastModifiedBy: user,
    };

    phases[targetIndex] = updatedPhase;
    await savePhasesToStore(phases);
    await logPhaseChange(user, 'UPDATE_PHASE', phaseIdParam, { updates: req.body });

    res.json({
      success: true,
      message: `Phase ${phaseIdParam} updated successfully`,
      phase: updatedPhase,
    });
  } catch (error) {
    console.error(`Error in PUT /api/admin/phases/${req.params.phaseId}:`, error);
    res.status(500).json({ success: false, message: 'Failed to update phase' });
  }
});

/**
 * DELETE /api/admin/phases/:phaseId/deactivate
 * Deactivates/re-locks a phase.
 */
router.delete(
  '/phases/:phaseId/deactivate',
  adminAuth,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const phaseIdParam = Array.isArray(req.params.phaseId)
        ? req.params.phaseId[0]
        : req.params.phaseId;
      const { adminUser } = (req.body || {}) as DeactivatePhaseRequestBody;

      const phases = await getPhasesFromStore();
      const targetIndex = phases.findIndex((p) => p.id === phaseIdParam);

      if (targetIndex === -1) {
        res.status(400).json({
          success: false,
          message: `Invalid phase data: Phase with id '${phaseIdParam}' not found`,
        });
        return;
      }

      const user = typeof adminUser === 'string' && adminUser.trim() ? adminUser.trim() : 'admin';

      phases[targetIndex] = {
        ...phases[targetIndex],
        active: false,
        lastModifiedBy: user,
      };

      await savePhasesToStore(phases);
      await logPhaseChange(user, 'DEACTIVATE_PHASE', phaseIdParam, {});

      res.json({
        success: true,
        message: `Phase ${phaseIdParam} deactivated successfully`,
        phase: phases[targetIndex],
      });
    } catch (error) {
      console.error(`Error in DELETE /api/admin/phases/${req.params.phaseId}/deactivate:`, error);
      res.status(500).json({ success: false, message: 'Failed to deactivate phase' });
    }
  }
);

/**
 * GET /api/admin/emails
 * Returns all collected emails with metadata (timestamp, source, phase, status).
 */
router.get('/emails', adminAuth, async (_req: Request, res: Response): Promise<void> => {
  try {
    const rawEmails = await getAllEmails();
    const phases = await getPhasesFromStore();
    const activePhase = phases.find((p) => p.active);
    const activePhaseId = activePhase ? activePhase.id : 'unknown';

    const emails = rawEmails.map((e) => ({
      email: e.email,
      collectedAt: e.timestamp,
      source: e.source,
      phase: activePhaseId,
      status: e.status || 'pending',
    }));

    res.json({
      success: true,
      count: emails.length,
      emails,
    });
  } catch (error) {
    console.error('Error in GET /api/admin/emails:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch collected emails' });
  }
});

/**
 * GET /api/admin/emails/export
 * Returns CSV file download of all emails.
 */
router.get('/emails/export', adminAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const rawEmails = await getAllEmails();
    const phases = await getPhasesFromStore();
    const activePhase = phases.find((p) => p.active);
    const activePhaseId = activePhase ? activePhase.id : 'unknown';

    const header = ['Email', 'Collected At', 'Source Phase', 'Status'];
    const rows = rawEmails.map((e) => [
      e.email,
      e.timestamp,
      e.source || activePhaseId,
      e.status || 'pending',
    ]);

    const csvContent = [header, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const adminUser = (req.headers['x-admin-user'] as string) || 'admin';
    await logPhaseChange(adminUser, 'EXPORT_EMAILS', 'emails', {
      count: rawEmails.length,
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="collected_emails.csv"');
    res.status(200).send(csvContent);
  } catch (error) {
    console.error('Error in GET /api/admin/emails/export:', error);
    res.status(500).json({ success: false, message: 'Failed to export emails CSV' });
  }
});

/**
 * POST /api/admin/emails/clear
 * Clears all email data (requires confirm parameter, e.g. ?confirm=true or { confirm: true }).
 */
router.post('/emails/clear', adminAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const confirmQuery = req.query.confirm === 'true' || req.query.confirm === '1';
    const confirmBody = req.body && (req.body.confirm === true || req.body.confirm === 'true');

    if (!confirmQuery && !confirmBody) {
      res.status(400).json({
        success: false,
        message: 'Confirmation parameter required (e.g. ?confirm=true or { "confirm": true })',
      });
      return;
    }

    const previousEmails = await getAllEmails();
    const count = previousEmails.length;

    await clearAllEmails();

    const adminUser =
      (req.body && req.body.adminUser) || (req.headers['x-admin-user'] as string) || 'admin';
    await logPhaseChange(adminUser, 'CLEAR_EMAILS', 'emails', {
      clearedCount: count,
    });

    res.json({
      success: true,
      message: `Successfully cleared ${count} email record(s).`,
      clearedCount: count,
    });
  } catch (error) {
    console.error('Error in POST /api/admin/emails/clear:', error);
    res.status(500).json({ success: false, message: 'Failed to clear email data' });
  }
});

/**
 * GET /api/admin/emails/stats
 * Returns email collection statistics (total, by phase/source, by date).
 */
router.get('/emails/stats', adminAuth, async (_req: Request, res: Response): Promise<void> => {
  try {
    const rawEmails = await getAllEmails();

    const bySource: Record<string, number> = {};
    const byDate: Record<string, number> = {};
    const byStatus: Record<string, number> = {
      pending: 0,
      verified: 0,
      bounced: 0,
    };

    rawEmails.forEach((e) => {
      const sourceKey = e.source || 'unknown';
      bySource[sourceKey] = (bySource[sourceKey] || 0) + 1;

      const dateKey = e.timestamp ? e.timestamp.split('T')[0] : 'unknown';
      byDate[dateKey] = (byDate[dateKey] || 0) + 1;

      const statusKey = e.status || 'pending';
      byStatus[statusKey] = (byStatus[statusKey] || 0) + 1;
    });

    res.json({
      success: true,
      total: rawEmails.length,
      byPhase: bySource,
      bySource,
      byDate,
      byStatus,
    });
  } catch (error) {
    console.error('Error in GET /api/admin/emails/stats:', error);
    res.status(500).json({ success: false, message: 'Failed to calculate email stats' });
  }
});

/**
 * Validate SystemConfig object for PUT updates.
 */
const validateSystemConfig = (body: unknown): { isValid: boolean; error?: string } => {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { isValid: false, error: 'Configuration must be an object' };
  }

  const reqObj = body as Record<string, unknown>;
  if (typeof reqObj.emergencyLockdown !== 'boolean') {
    reqObj.emergencyLockdown = false;
  }
  const requiredBooleanKeys: (keyof SystemConfig)[] = [
    'maintenanceMode',
    'publicSiteEnabled',
    'adminPanelEnabled',
    'allowEmailCollection',
    'emailNotificationEnabled',
    'emergencyLockdown',
  ];

  for (const key of requiredBooleanKeys) {
    if (typeof reqObj[key] !== 'boolean') {
      return { isValid: false, error: `'${key}' must be a boolean` };
    }
  }

  if (
    typeof reqObj.maxConcurrentSessions !== 'number' ||
    !Number.isInteger(reqObj.maxConcurrentSessions) ||
    reqObj.maxConcurrentSessions <= 0
  ) {
    return {
      isValid: false,
      error: "'maxConcurrentSessions' must be a positive integer",
    };
  }

  if (
    typeof reqObj.sessionTimeout !== 'number' ||
    !Number.isInteger(reqObj.sessionTimeout) ||
    reqObj.sessionTimeout <= 0
  ) {
    return {
      isValid: false,
      error: "'sessionTimeout' must be a positive integer (minutes)",
    };
  }

  return { isValid: true };
};

/**
 * GET /api/admin/config
 * Returns current sanitized system configuration.
 */
router.get('/config', adminAuth, async (_req: Request, res: Response): Promise<void> => {
  try {
    const config = await getConfigFromStore();
    res.json({
      success: true,
      config,
    });
  } catch (error) {
    console.error('Error in GET /api/admin/config:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch system config' });
  }
});

/**
 * PUT /api/admin/config
 * Updates system configuration (requires full valid config object).
 */
router.put('/config', adminAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const validation = validateSystemConfig(req.body);
    if (!validation.isValid) {
      res.status(400).json({
        success: false,
        message: `Invalid configuration: ${validation.error}`,
      });
      return;
    }

    const newConfig: SystemConfig = {
      maintenanceMode: req.body.maintenanceMode,
      publicSiteEnabled: req.body.publicSiteEnabled,
      adminPanelEnabled: req.body.adminPanelEnabled,
      allowEmailCollection: req.body.allowEmailCollection,
      emailNotificationEnabled: req.body.emailNotificationEnabled,
      maxConcurrentSessions: req.body.maxConcurrentSessions,
      sessionTimeout: req.body.sessionTimeout,
      emergencyLockdown: req.body.emergencyLockdown,
    };

    const adminUser = getAdminUser(req);

    await saveConfigToStore(newConfig);
    await logPhaseChange(adminUser, 'UPDATE_SYSTEM_CONFIG', 'system_config', { config: newConfig });

    res.json({
      success: true,
      message: 'System configuration updated successfully',
      config: newConfig,
    });
  } catch (error) {
    console.error('Error in PUT /api/admin/config:', error);
    res.status(500).json({ success: false, message: 'Failed to update system config' });
  }
});

/**
 * GET /api/admin/maintenance
 * Returns system health status and maintenance mode status.
 */
router.get('/maintenance', adminAuth, async (_req: Request, res: Response): Promise<void> => {
  try {
    const config = await getConfigFromStore();
    const redisStatus = isRedisAvailable() ? 'connected' : 'fallback (in-memory)';

    res.json({
      success: true,
      status: 'healthy',
      maintenanceMode: config.maintenanceMode,
      publicSiteEnabled: config.publicSiteEnabled,
      adminPanelEnabled: config.adminPanelEnabled,
      storageBackend: redisStatus,
      uptimeSeconds: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error in GET /api/admin/maintenance:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch maintenance health status' });
  }
});

/**
 * POST /api/admin/maintenance/toggle
 * Enable or disable maintenance mode.
 */
router.post(
  '/maintenance/toggle',
  adminAuth,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const currentConfig = await getConfigFromStore();
      const nextState =
        typeof req.body?.enabled === 'boolean' ? req.body.enabled : !currentConfig.maintenanceMode;

      const updatedConfig: SystemConfig = {
        ...currentConfig,
        maintenanceMode: nextState,
      };

      const adminUser =
        (req.body && typeof req.body.adminUser === 'string' && req.body.adminUser.trim()) ||
        (req.headers['x-admin-user'] as string) ||
        'admin';

      await saveConfigToStore(updatedConfig);
      await logPhaseChange(adminUser, 'TOGGLE_MAINTENANCE', 'system_config', {
        maintenanceMode: nextState,
      });

      res.json({
        success: true,
        message: `Maintenance mode ${nextState ? 'enabled' : 'disabled'} successfully`,
        maintenanceMode: nextState,
        config: updatedConfig,
      });
    } catch (error) {
      console.error('Error in POST /api/admin/maintenance/toggle:', error);
      res.status(500).json({ success: false, message: 'Failed to toggle maintenance mode' });
    }
  }
);

/**
 * GET /api/admin/audit-logs
 * Returns the last 20 audit log entries.
 */
router.get('/audit-logs', adminAuth, async (_req: Request, res: Response): Promise<void> => {
  try {
    let logs: Array<{
      timestamp: string;
      adminUser: string;
      action: string;
      phaseId: string;
      details: Record<string, unknown>;
    }> = [];

    if (isRedisAvailable()) {
      try {
        const rawLogs = await redis.lrange('admin:audit_logs', 0, 19);
        if (rawLogs && rawLogs.length > 0) {
          logs = rawLogs.map((item) =>
            typeof item === 'string'
              ? JSON.parse(item)
              : (item as {
                  timestamp: string;
                  adminUser: string;
                  action: string;
                  phaseId: string;
                  details: Record<string, unknown>;
                })
          );
        }
      } catch (err) {
        console.error('Failed to fetch audit logs from Redis:', err);
      }
    }

    if (logs.length === 0) {
      logs = inMemoryAuditLogs.slice(0, 20);
    }

    res.json({
      success: true,
      count: logs.length,
      logs,
    });
  } catch (error) {
    console.error('Error in GET /api/admin/audit-logs:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch audit logs' });
  }
});

/**
 * Validate Announcement request body.
 */
const validateAnnouncementBody = (body: unknown): { isValid: boolean; error?: string } => {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { isValid: false, error: 'Request body must be an object' };
  }
  const obj = body as Record<string, unknown>;
  if (typeof obj.title !== 'string' || !obj.title.trim()) {
    return { isValid: false, error: "'title' is required and must be a non-empty string" };
  }
  if (typeof obj.content !== 'string' || !obj.content.trim()) {
    return { isValid: false, error: "'content' is required and must be a non-empty string" };
  }
  if (obj.active !== undefined && typeof obj.active !== 'boolean') {
    return { isValid: false, error: "'active' must be a boolean" };
  }
  if (
    obj.scheduledAt !== null &&
    obj.scheduledAt !== undefined &&
    typeof obj.scheduledAt !== 'string'
  ) {
    return { isValid: false, error: "'scheduledAt' must be an ISO date string or null" };
  }
  return { isValid: true };
};

/**
 * GET /api/admin/announcements
 * Returns all ARG announcements.
 */
router.get('/announcements', adminAuth, async (_req: Request, res: Response): Promise<void> => {
  try {
    const announcements = await getAnnouncementsFromStore();
    res.json({
      success: true,
      announcements,
    });
  } catch (error) {
    console.error('Error in GET /api/admin/announcements:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch announcements' });
  }
});

/**
 * POST /api/admin/announcements
 * Creates a new ARG narrative announcement.
 */
router.post('/announcements', adminAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const validation = validateAnnouncementBody(req.body);
    if (!validation.isValid) {
      res.status(400).json({ success: false, message: validation.error });
      return;
    }

    const announcements = await getAnnouncementsFromStore();
    const now = new Date().toISOString();
    const adminUser = getAdminUser(req);

    const newAnnouncement: Announcement = {
      id: `announcement-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      title: req.body.title.trim(),
      content: req.body.content.trim(),
      active: typeof req.body.active === 'boolean' ? req.body.active : true,
      scheduledAt: req.body.scheduledAt || null,
      createdAt: now,
      updatedAt: now,
      author: adminUser,
    };

    announcements.unshift(newAnnouncement);
    await saveAnnouncementsToStore(announcements);

    await logPhaseChange(adminUser, 'CREATE_ANNOUNCEMENT', newAnnouncement.id, {
      title: newAnnouncement.title,
      active: newAnnouncement.active,
      scheduledAt: newAnnouncement.scheduledAt,
    });

    res.status(201).json({
      success: true,
      message: 'Announcement created successfully',
      announcement: newAnnouncement,
    });
  } catch (error) {
    console.error('Error in POST /api/admin/announcements:', error);
    res.status(500).json({ success: false, message: 'Failed to create announcement' });
  }
});

/**
 * PUT /api/admin/announcements/:id
 * Updates an existing ARG announcement.
 */
router.put('/announcements/:id', adminAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const validation = validateAnnouncementBody(req.body);
    if (!validation.isValid) {
      res.status(400).json({ success: false, message: validation.error });
      return;
    }

    const announcements = await getAnnouncementsFromStore();
    const index = announcements.findIndex((a) => a.id === id);

    if (index === -1) {
      res.status(404).json({ success: false, message: 'Announcement not found' });
      return;
    }

    const adminUser = getAdminUser(req);

    const updatedAnnouncement: Announcement = {
      ...announcements[index],
      title: req.body.title.trim(),
      content: req.body.content.trim(),
      active: typeof req.body.active === 'boolean' ? req.body.active : announcements[index].active,
      scheduledAt:
        req.body.scheduledAt !== undefined
          ? req.body.scheduledAt
          : announcements[index].scheduledAt,
      updatedAt: new Date().toISOString(),
      author: adminUser,
    };

    announcements[index] = updatedAnnouncement;
    await saveAnnouncementsToStore(announcements);

    await logPhaseChange(adminUser, 'UPDATE_ANNOUNCEMENT', id, {
      title: updatedAnnouncement.title,
      active: updatedAnnouncement.active,
      scheduledAt: updatedAnnouncement.scheduledAt,
    });

    res.json({
      success: true,
      message: 'Announcement updated successfully',
      announcement: updatedAnnouncement,
    });
  } catch (error) {
    console.error('Error in PUT /api/admin/announcements/:id:', error);
    res.status(500).json({ success: false, message: 'Failed to update announcement' });
  }
});

/**
 * DELETE /api/admin/announcements/:id
 * Deletes an ARG announcement.
 */
router.delete(
  '/announcements/:id',
  adminAuth,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const id = req.params.id as string;
      const announcements = await getAnnouncementsFromStore();
      const filtered = announcements.filter((a) => a.id !== id);

      if (filtered.length === announcements.length) {
        res.status(404).json({ success: false, message: 'Announcement not found' });
        return;
      }

      const adminUser = getAdminUser(req);

      await saveAnnouncementsToStore(filtered);
      await logPhaseChange(adminUser, 'DELETE_ANNOUNCEMENT', id, {});

      res.json({
        success: true,
        message: 'Announcement deleted successfully',
        id,
      });
    } catch (error) {
      console.error('Error in DELETE /api/admin/announcements/:id:', error);
      res.status(500).json({ success: false, message: 'Failed to delete announcement' });
    }
  }
);

/**
 * POST /api/admin/announcements/:id/toggle
 * Toggles an announcement's active state.
 */
router.post(
  '/announcements/:id/toggle',
  adminAuth,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const id = req.params.id as string;
      const announcements = await getAnnouncementsFromStore();
      const item = announcements.find((a) => a.id === id);

      if (!item) {
        res.status(404).json({ success: false, message: 'Announcement not found' });
        return;
      }

      const nextState = typeof req.body?.active === 'boolean' ? req.body.active : !item.active;
      item.active = nextState;
      item.updatedAt = new Date().toISOString();

      const adminUser = getAdminUser(req);

      await saveAnnouncementsToStore(announcements);
      await logPhaseChange(adminUser, 'TOGGLE_ANNOUNCEMENT', id, { active: nextState });

      res.json({
        success: true,
        message: `Announcement ${nextState ? 'enabled' : 'disabled'} successfully`,
        announcement: item,
      });
    } catch (error) {
      console.error('Error in POST /api/admin/announcements/:id/toggle:', error);
      res.status(500).json({ success: false, message: 'Failed to toggle announcement' });
    }
  }
);

/**
 * POST /api/admin/lockdown/toggle
 * Enable or disable emergency lockdown state.
 */
router.post('/lockdown/toggle', adminAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const currentConfig = await getConfigFromStore();
    const nextState =
      typeof req.body?.enabled === 'boolean' ? req.body.enabled : !currentConfig.emergencyLockdown;

    const updatedConfig: SystemConfig = {
      ...currentConfig,
      emergencyLockdown: nextState,
    };

    const adminUser = getAdminUser(req);

    await saveConfigToStore(updatedConfig);
    await logPhaseChange(adminUser, 'TOGGLE_EMERGENCY_LOCKDOWN', 'system_config', {
      emergencyLockdown: nextState,
    });

    res.json({
      success: true,
      message: `Emergency lockdown ${nextState ? 'enabled' : 'disabled'} successfully`,
      emergencyLockdown: nextState,
      config: updatedConfig,
    });
  } catch (error) {
    console.error('Error in POST /api/admin/lockdown/toggle:', error);
    res.status(500).json({ success: false, message: 'Failed to toggle emergency lockdown' });
  }
});

/**
 * POST /api/admin/logout
 * Logs out the admin user and clears the session cookie.
 */
router.post('/logout', async (req: Request, res: Response): Promise<void> => {
  const token = extractSessionToken(req);
  if (token) {
    await destroyAdminSession(token);
  }
  res.clearCookie('admin_session', { path: '/' });
  res.json({
    success: true,
    message: 'Logged out successfully',
  });
});

export default router;
