import { redis as kv, isRedisAvailable } from './src/redis';

export interface DashboardConfig {
  id: string;
  title: string;
  status: string;
  link: string;
  type: string;
  isDownload: boolean;
  lockPrompt?: string;
  isRogue?: boolean;
  phaseId?: string;
}

export interface ReleasePhase {
  id: string;
  name: string;
  description: string;
  activeModules: string[];
  heldBackModules: string[];
  narrativeReason: string;
}

export const MLTK_PHASES: ReleasePhase[] = [
  {
    id: 'phase1',
    name: 'Phase 1: Zine Launch',
    description: 'Password: 0408-1998-XXXX',
    activeModules: [
      'secure-data-drop-page.html',
      'mltk-classified-document.html',
      'mltk-privacy-policy.html',
      'UNCUT_PUZZLE.pdf',
      'VIRTUE_VILLAGE_LAYOUTS.pdf',
      '104.9-global-directives.html',
    ],
    heldBackModules: [
      'ollies-radio-scanner.html',
      'nova-classified-archive.html',
      'nova-parent-directory.html',
      'mltk-five-finger-wheel.html',
      'mltk-virtue-village-index.html',
      'mltk-customer-service.html',
      'SEEDLESS_GRAPES_MOTEL_BLUEPRINTS.zip',
    ],
    narrativeReason:
      'Focuses 100% of reader attention on downloading the lead magnets and joining the mailing list.',
  },
  {
    id: 'phase1_5_email1',
    name: 'Phase 1.5: Email Drip #1',
    description: 'Sent via automated MailerLite',
    activeModules: [
      'secure-data-drop-page.html',
      'mltk-classified-document.html',
      'mltk-privacy-policy.html',
      'UNCUT_PUZZLE.pdf',
      'VIRTUE_VILLAGE_LAYOUTS.pdf',
      '104.9-global-directives.html',
      'ollies-radio-scanner.html',
    ],
    heldBackModules: [
      'nova-classified-archive.html',
      'nova-parent-directory.html',
      'mltk-five-finger-wheel.html',
      'mltk-virtue-village-index.html',
      'mltk-customer-service.html',
      'SEEDLESS_GRAPES_MOTEL_BLUEPRINTS.zip',
    ],
    narrativeReason: 'Rewards subscribers with audio clips from Four Corners Radio ("Over-Oops").',
  },
  {
    id: 'phase1_5_email2',
    name: 'Phase 1.5: Email Drip #2',
    description: 'Classified memo from Avery',
    activeModules: [
      'secure-data-drop-page.html',
      'mltk-classified-document.html',
      'mltk-privacy-policy.html',
      'UNCUT_PUZZLE.pdf',
      'VIRTUE_VILLAGE_LAYOUTS.pdf',
      '104.9-global-directives.html',
      'ollies-radio-scanner.html',
      'nova-classified-archive.html',
      'nova-parent-directory.html',
    ],
    heldBackModules: [
      'mltk-five-finger-wheel.html',
      'mltk-virtue-village-index.html',
      'mltk-customer-service.html',
      'SEEDLESS_GRAPES_MOTEL_BLUEPRINTS.zip',
    ],
    narrativeReason:
      'Engages solvers with interactive trivia while introducing the corporate horrors of MLTK.',
  },
  {
    id: 'phase2',
    name: "Phase 2: Usher's Handbook Pre-Launch",
    description: 'Deploys high-stakes disciplinary wheel',
    activeModules: [
      'secure-data-drop-page.html',
      'mltk-classified-document.html',
      'mltk-privacy-policy.html',
      'UNCUT_PUZZLE.pdf',
      'VIRTUE_VILLAGE_LAYOUTS.pdf',
      '104.9-global-directives.html',
      'ollies-radio-scanner.html',
      'nova-classified-archive.html',
      'nova-parent-directory.html',
      'mltk-five-finger-wheel.html',
      'mltk-virtue-village-index.html',
      'mltk-customer-service.html',
      'SEEDLESS_GRAPES_MOTEL_BLUEPRINTS.zip',
    ],
    heldBackModules: [],
    narrativeReason:
      'Deploys the high-stakes disciplinary wheel right when readers are preparing for physical gamebook mechanics.',
  },
];

interface MaintenanceConfig {
  global: boolean;
  studio: boolean;
  mltk: boolean;
}

const DEFAULT_DASHBOARD_CONFIG: DashboardConfig[] = [
  {
    id: 'PORTAL: VVI',
    title: 'Virtue Village Index',
    status: 'locked',
    link: 'mltk-virtue-village-index.html',
    type: 'ENTER',
    isDownload: false,
    lockPrompt: 'ZONING CLEARANCE REQUIRED',
  },
  {
    id: 'DOC: 001-VVL',
    title: 'Virtue Village Layouts',
    status: 'active',
    link: 'VIRTUE_VILLAGE_LAYOUTS.pdf',
    type: 'DOWNLOAD',
    isDownload: true,
    lockPrompt: 'PHYSICAL ZINE CLEARANCE REQUIRED',
  },
  {
    id: 'DOC: 002-GD',
    title: '104.9 Global Directives',
    status: 'active',
    link: '104.9-global-directives.html',
    type: 'ENTER',
    isDownload: false,
    lockPrompt: 'PHYSICAL ZINE CLEARANCE REQUIRED',
  },
  {
    id: 'ARCHIVE: NOVA',
    title: 'NOVA Classified Archive',
    status: 'locked',
    link: 'nova-classified-archive.html',
    type: 'ENTER',
    isDownload: false,
    lockPrompt: 'ARCHIVE KEY DECRYPTION REQUIRED',
  },
  {
    id: 'PORTAL: CS',
    title: 'Customer Service Portal',
    status: 'locked',
    link: 'mltk-customer-service.html',
    type: 'ENTER',
    isDownload: false,
    lockPrompt: 'LEVEL-2 CLEARANCE REQUIRED',
  },
  {
    id: 'DOC: TETROMINO',
    title: 'Project Tetromino Initialization',
    status: 'active',
    link: 'mltk-classified-document.html',
    type: 'CLASSIFIED: EYES ONLY',
    isDownload: false,
  },
  {
    id: 'PORTAL: LEGAL',
    title: 'MLTK Privacy Policy & Terms',
    status: 'active',
    link: 'mltk-privacy-policy.html',
    type: 'ENTER',
    isDownload: false,
  },
  {
    id: 'ARCHIVE: PARENT',
    title: 'NOVA Parent Directory',
    status: 'locked',
    link: 'nova-parent-directory.html',
    type: 'ENTER',
    isDownload: false,
    lockPrompt: 'ROOT DIRECTORY RESTRICTED',
  },
  {
    id: 'PORTAL: RADIO',
    title: 'Ollies Radio Scanner',
    status: 'locked',
    link: 'ollies-radio-scanner.html',
    type: 'ENTER',
    isDownload: false,
    lockPrompt: 'REQUIRES FREQUENCY OVERRIDE (104.9 FM)',
    isRogue: true,
  },
  {
    id: 'PORTAL: DROP',
    title: 'Secure Data Drop Page',
    status: 'active',
    link: 'secure-data-drop-page.html',
    type: 'ENTER',
    isDownload: false,
    isRogue: true,
  },
  {
    id: 'DOC: 003-SGM',
    title: 'Seedless Grapes Motel Blueprints',
    status: 'locked',
    link: 'SEEDLESS_GRAPES_MOTEL_BLUEPRINTS.zip',
    type: 'DOWNLOAD',
    isDownload: true,
    lockPrompt: 'PHYSICAL ZINE CLEARANCE REQUIRED',
  },
  {
    id: 'DOC: 004-UP',
    title: 'Uncut Puzzle',
    status: 'active',
    link: 'UNCUT_PUZZLE.pdf',
    type: 'DOWNLOAD',
    isDownload: true,
    lockPrompt: 'PHYSICAL ZINE CLEARANCE REQUIRED',
  },
  {
    id: 'PORTAL: 5F-WHEEL',
    title: 'Five Finger Selection Wheel',
    status: 'locked',
    link: 'mltk-five-finger-wheel.html',
    type: 'ENTER',
    isDownload: false,
    lockPrompt: 'TIER-4 CLEARANCE REQUIRED',
  },
];

const inMemoryDashboardConfig = [...DEFAULT_DASHBOARD_CONFIG];
const inMemoryMaintenanceConfig = { global: false, studio: false, mltk: false };
let inMemoryActivePhase = 'phase1';

// ⚡ Bolt: Cache dashboard config and active phase in memory with a short TTL (2000ms) to prevent per-request Redis GET queries.
let dashboardConfigCacheStore: DashboardConfig[] | null = null;
let dashboardConfigCacheLastFetched = 0;
let activePhaseCacheStore: string | null = null;
let activePhaseCacheLastFetched = 0;
const DB_CACHE_TTL_MS = 2000;

export const resetInMemDbCache = (): void => {
  dashboardConfigCacheStore = null;
  dashboardConfigCacheLastFetched = 0;
  activePhaseCacheStore = null;
  activePhaseCacheLastFetched = 0;
};

const isKvAvailable = (): boolean => isRedisAvailable();

export async function initDb() {
  if (isKvAvailable()) {
    const hasMaintenance = await kv.exists('config:maintenance');
    if (!hasMaintenance) {
      await kv.hset('config:maintenance', { global: 'false', studio: 'false', mltk: 'false' });
    }

    const hasDashboard = await kv.exists('config:dashboard');
    if (!hasDashboard) {
      await kv.set('config:dashboard', DEFAULT_DASHBOARD_CONFIG);
    }

    const hasPhase = await kv.exists('config:active_phase');
    if (!hasPhase) {
      await kv.set('config:active_phase', 'phase1');
    }
  }
}

export async function getActivePhase(): Promise<string> {
  const now = Date.now();
  if (activePhaseCacheStore !== null && now - activePhaseCacheLastFetched < DB_CACHE_TTL_MS) {
    return activePhaseCacheStore;
  }

  let phase: string | null = null;
  if (isKvAvailable()) {
    try {
      phase = await kv.get<string>('config:active_phase');
    } catch (err) {
      console.error('Error fetching active phase from Redis:', err);
    }
  }

  activePhaseCacheStore = phase || inMemoryActivePhase;
  activePhaseCacheLastFetched = now;
  return activePhaseCacheStore;
}

export async function setActivePhase(phaseId: string): Promise<boolean> {
  const phase = MLTK_PHASES.find((p) => p.id === phaseId);
  if (!phase) return false;

  inMemoryActivePhase = phaseId;
  activePhaseCacheStore = phaseId;
  activePhaseCacheLastFetched = Date.now();

  if (isKvAvailable()) {
    try {
      await kv.set('config:active_phase', phaseId);
    } catch (err) {
      console.error('Error saving active phase to Redis:', err);
    }
  }

  // Update status of dashboard config items according to the selected phase
  const dashboard = await getDashboardConfig();
  dashboard.forEach((item) => {
    if (phase.activeModules.includes(item.link)) {
      item.status = 'active';
    } else if (phase.heldBackModules.includes(item.link)) {
      item.status = 'locked';
    }
  });

  dashboardConfigCacheStore = dashboard;
  dashboardConfigCacheLastFetched = Date.now();

  if (isKvAvailable()) {
    try {
      await kv.set('config:dashboard', dashboard);
    } catch (err) {
      console.error('Error saving dashboard config to Redis:', err);
    }
  }
  return true;
}

export interface CapturedEmail {
  email: string;
  source: string;
  timestamp: string;
  status?: 'pending' | 'verified' | 'bounced';
}

let inMemoryEmails: CapturedEmail[] = [];

export async function saveEmail(
  email: string,
  source: string,
  status: 'pending' | 'verified' | 'bounced' = 'pending'
) {
  const timestamp = new Date().toISOString();
  const record: CapturedEmail = { email, source, timestamp, status };

  if (isKvAvailable()) {
    await kv.lpush('emails:captured', JSON.stringify(record));
  } else {
    inMemoryEmails.push(record);
  }
}

export async function getAllEmails(): Promise<CapturedEmail[]> {
  if (isKvAvailable()) {
    const emails = await kv.lrange('emails:captured', 0, -1);
    return emails.map((e) => {
      const parsed = typeof e === 'string' ? JSON.parse(e) : e;
      return {
        ...parsed,
        status: parsed.status || 'pending',
      };
    }) as CapturedEmail[];
  }
  return inMemoryEmails.map((e) => ({
    ...e,
    status: e.status || 'pending',
  }));
}

export async function clearAllEmails(): Promise<void> {
  if (isKvAvailable()) {
    await kv.del('emails:captured');
  }
  inMemoryEmails = [];
}

export async function updateAllDashboardConfig(status: string) {
  const config = await getDashboardConfig();
  config.forEach((item) => {
    item.status = status;
  });
  dashboardConfigCacheStore = config;
  dashboardConfigCacheLastFetched = Date.now();

  if (isKvAvailable()) {
    try {
      await kv.set('config:dashboard', config);
    } catch (err) {
      console.error('Error saving all dashboard config to Redis:', err);
    }
  } else {
    inMemoryDashboardConfig.forEach((item) => {
      item.status = status;
    });
  }
}

export async function updateAllMaintenanceConfig(value: boolean) {
  if (isKvAvailable()) {
    await kv.hset('config:maintenance', {
      global: String(value),
      studio: String(value),
      mltk: String(value),
    });
  } else {
    inMemoryMaintenanceConfig.global = value;
    inMemoryMaintenanceConfig.studio = value;
    inMemoryMaintenanceConfig.mltk = value;
  }
}

export async function getMaintenanceConfig(): Promise<Record<string, string>> {
  if (isKvAvailable()) {
    const config = await kv.hgetall('config:maintenance');
    return (
      (config as Record<string, string>) || { global: 'false', studio: 'false', mltk: 'false' }
    );
  }
  return {
    global: String(inMemoryMaintenanceConfig.global),
    studio: String(inMemoryMaintenanceConfig.studio),
    mltk: String(inMemoryMaintenanceConfig.mltk),
  };
}

export async function updateMaintenanceConfig(key: string, value: boolean) {
  if (isKvAvailable()) {
    await kv.hset('config:maintenance', { [key]: String(value) });
  } else {
    if (key === 'global') inMemoryMaintenanceConfig.global = value;
    if (key === 'studio') inMemoryMaintenanceConfig.studio = value;
    if (key === 'mltk') inMemoryMaintenanceConfig.mltk = value;
  }
}

export async function getDashboardConfig(): Promise<DashboardConfig[]> {
  const now = Date.now();
  if (
    dashboardConfigCacheStore !== null &&
    now - dashboardConfigCacheLastFetched < DB_CACHE_TTL_MS
  ) {
    return dashboardConfigCacheStore.map((item) => ({ ...item }));
  }

  let config: DashboardConfig[] | null = null;
  if (isKvAvailable()) {
    try {
      config = await kv.get<DashboardConfig[]>('config:dashboard');
    } catch (err) {
      console.error('Error fetching dashboard config from Redis:', err);
    }
  }

  dashboardConfigCacheStore = config || inMemoryDashboardConfig;
  dashboardConfigCacheLastFetched = now;
  return dashboardConfigCacheStore.map((item) => ({ ...item }));
}

export async function updateDashboardConfig(id: string, status: string): Promise<boolean> {
  const config = await getDashboardConfig();
  const item = config.find((d) => d.id === id);
  if (item) {
    item.status = status;
    dashboardConfigCacheStore = config;
    dashboardConfigCacheLastFetched = Date.now();

    if (isKvAvailable()) {
      try {
        await kv.set('config:dashboard', config);
      } catch (err) {
        console.error('Error saving dashboard config to Redis:', err);
      }
    }
    return true;
  }
  return false;
}
