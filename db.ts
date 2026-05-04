import { Redis } from '@upstash/redis';

// Initialize Upstash Redis client with the environment variables provided by the Vercel KV integration
const kv = new Redis({
  url: process.env.KV_REST_API_URL || '',
  token: process.env.KV_REST_API_TOKEN || '',
});

export interface DashboardConfig {
  id: string;
  title: string;
  status: string;
  link: string;
  type: string;
  isDownload: boolean;
}

export interface MaintenanceConfig {
  global: boolean;
  studio: boolean;
  mltk: boolean;
}

const DEFAULT_DASHBOARD_CONFIG: DashboardConfig[] = [
  {
    id: 'DOC: 001-VVL',
    title: 'Virtue Village Layouts',
    status: 'offline',
    link: 'VIRTUE_VILLAGE_LAYOUTS.pdf',
    type: 'DOWNLOAD',
    isDownload: true,
  },
  {
    id: 'DOC: 002-GD',
    title: 'Gretchen Dossier',
    status: 'offline',
    link: 'GRETCHEN_DOSSIER.txt',
    type: 'DOWNLOAD',
    isDownload: true,
  },
  {
    id: 'ARCHIVE: NOVA',
    title: 'NOVA Classified Archive',
    status: 'active',
    link: 'nova-classified-archive.html',
    type: 'ENTER',
    isDownload: false,
  },
  {
    id: 'PORTAL: CS',
    title: 'Customer Service Portal',
    status: 'active',
    link: 'mltk-customer-service.html',
    type: 'ENTER',
    isDownload: false,
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
    id: 'PORTAL: BOOT',
    title: 'MLTK Boot Sequence',
    status: 'active',
    link: 'mltk-boot-sequence.html',
    type: 'ENTER',
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
    id: 'PORTAL: TIMER',
    title: 'MLTK Timer',
    status: 'active',
    link: 'mltk-timer.html',
    type: 'ENTER',
    isDownload: false,
  },
  {
    id: 'ARCHIVE: PARENT',
    title: 'NOVA Parent Directory',
    status: 'offline',
    link: 'nova-parent-directory.html',
    type: 'ENTER',
    isDownload: false,
  },
  {
    id: 'PORTAL: RADIO',
    title: 'Ollies Radio Scanner',
    status: 'active',
    link: 'ollies-radio-scanner.html',
    type: 'ENTER',
    isDownload: false,
  },
  {
    id: 'PORTAL: DROP',
    title: 'Secure Data Drop Page',
    status: 'active',
    link: 'secure-data-drop-page.html',
    type: 'ENTER',
    isDownload: false,
  },
  {
    id: 'DOC: 003-SGM',
    title: 'Seedless Grapes Motel Blueprints',
    status: 'offline',
    link: 'SEEDLESS_GRAPES_MOTEL_BLUEPRINTS.zip',
    type: 'DOWNLOAD',
    isDownload: true,
  },
  {
    id: 'DOC: 004-UP',
    title: 'Uncut Puzzle',
    status: 'offline',
    link: 'UNCUT_PUZZLE.pdf',
    type: 'DOWNLOAD',
    isDownload: true,
  },
  {
    id: 'PORTAL: 5F-WHEEL',
    title: 'Five Finger Selection Wheel',
    status: 'active',
    link: 'mltk-five-finger-wheel.html',
    type: 'ENTER',
    isDownload: false,
  },
];

const inMemoryDashboardConfig = [...DEFAULT_DASHBOARD_CONFIG];
const inMemoryMaintenanceConfig = { global: false, studio: false, mltk: false };

const isKvAvailable = !!process.env.KV_REST_API_URL && !!process.env.KV_REST_API_TOKEN;

export async function initDb() {
  if (isKvAvailable) {
    const hasMaintenance = await kv.exists('config:maintenance');
    if (!hasMaintenance) {
      await kv.hset('config:maintenance', { global: 'false', studio: 'false', mltk: 'false' });
    }

    const hasDashboard = await kv.exists('config:dashboard');
    if (!hasDashboard) {
      await kv.set('config:dashboard', DEFAULT_DASHBOARD_CONFIG);
    }
  }
}

export async function getMaintenanceConfig(): Promise<Record<string, string>> {
  if (isKvAvailable) {
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
  if (isKvAvailable) {
    await kv.hset('config:maintenance', { [key]: String(value) });
  } else {
    if (key === 'global') inMemoryMaintenanceConfig.global = value;
    if (key === 'studio') inMemoryMaintenanceConfig.studio = value;
    if (key === 'mltk') inMemoryMaintenanceConfig.mltk = value;
  }
}

export async function getDashboardConfig(): Promise<DashboardConfig[]> {
  if (isKvAvailable) {
    const config = await kv.get<DashboardConfig[]>('config:dashboard');
    return config || DEFAULT_DASHBOARD_CONFIG;
  }
  return inMemoryDashboardConfig;
}

export async function updateDashboardConfig(id: string, status: string) {
  if (isKvAvailable) {
    const config = await getDashboardConfig();
    const item = config.find((d) => d.id === id);
    if (item) {
      item.status = status;
      await kv.set('config:dashboard', config);
    }
  } else {
    const item = inMemoryDashboardConfig.find((d) => d.id === id);
    if (item) {
      item.status = status;
    }
  }
}
