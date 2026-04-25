import { Pool } from 'pg';

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

const connectionString = process.env.POSTGRES_URL || process.env.DATABASE_URL;
let pool: Pool | null = null;

if (connectionString) {
  pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false },
  });
}

export async function initDb() {
  if (pool) {
    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS config (
          key VARCHAR(255) PRIMARY KEY,
          value VARCHAR(255)
        );
      `);

      await pool.query(`
        CREATE TABLE IF NOT EXISTS dashboard (
          id VARCHAR(255) PRIMARY KEY,
          title VARCHAR(255),
          status VARCHAR(255),
          link VARCHAR(255),
          type VARCHAR(255),
          isDownload BOOLEAN
        );
      `);

      // Initialize maintenance config if empty
      const configRes = await pool.query('SELECT key FROM config WHERE key = $1', ['global']);
      if (configRes.rowCount === 0) {
        await pool.query('INSERT INTO config (key, value) VALUES ($1, $2)', ['global', 'false']);
        await pool.query('INSERT INTO config (key, value) VALUES ($1, $2)', ['studio', 'false']);
        await pool.query('INSERT INTO config (key, value) VALUES ($1, $2)', ['mltk', 'false']);
      }

      // Initialize dashboard config if empty
      const dashboardRes = await pool.query('SELECT id FROM dashboard LIMIT 1');
      if (dashboardRes.rowCount === 0) {
        for (const item of DEFAULT_DASHBOARD_CONFIG) {
          await pool.query(
            'INSERT INTO dashboard (id, title, status, link, type, "isDownload") VALUES ($1, $2, $3, $4, $5, $6)',
            [item.id, item.title, item.status, item.link, item.type, item.isDownload]
          );
        }
      }
      console.log('Database initialized successfully using Postgres.');
    } catch (e) {
      console.error('Failed to initialize Postgres DB, falling back to in-memory.', e);
      pool = null;
    }
  } else {
    console.log('No DATABASE_URL provided. Using in-memory store for admin configuration.');
  }
}

export async function getMaintenanceConfig(): Promise<Record<string, string>> {
  if (pool) {
    const res = await pool.query('SELECT key, value FROM config');
    return res.rows.reduce(
      (acc, row) => {
        acc[row.key] = row.value;
        return acc;
      },
      {} as Record<string, string>
    );
  }
  return {
    global: String(inMemoryMaintenanceConfig.global),
    studio: String(inMemoryMaintenanceConfig.studio),
    mltk: String(inMemoryMaintenanceConfig.mltk),
  };
}

export async function updateMaintenanceConfig(key: string, value: boolean) {
  if (pool) {
    await pool.query('UPDATE config SET value = $1 WHERE key = $2', [String(value), key]);
  } else {
    if (key === 'global') inMemoryMaintenanceConfig.global = value;
    if (key === 'studio') inMemoryMaintenanceConfig.studio = value;
    if (key === 'mltk') inMemoryMaintenanceConfig.mltk = value;
  }
}

export async function getDashboardConfig(): Promise<DashboardConfig[]> {
  if (pool) {
    const res = await pool.query(
      'SELECT id, title, status, link, type, "isDownload" as "isDownload" FROM dashboard'
    );
    return res.rows;
  }
  return inMemoryDashboardConfig;
}

export async function updateDashboardConfig(id: string, status: string) {
  if (pool) {
    await pool.query('UPDATE dashboard SET status = $1 WHERE id = $2', [status, id]);
  } else {
    const item = inMemoryDashboardConfig.find((d) => d.id === id);
    if (item) {
      item.status = status;
    }
  }
import sqlite3 from 'sqlite3';
import { open, Database } from 'sqlite';
import path from 'path';

// If VERCEL is true (or NODE_ENV is production), we can't write to __dirname because the file system is read-only.
// In a real Vercel production setup, you would typically use Vercel Postgres or an external DB.
// As a fallback for this specific task, if running in Vercel, we can try to use /tmp/admin.db
// which is writable but ephemeral, or an in-memory DB, since the prompt instructed to "write the code so that it expects a database connection in production, but you will have to set up the actual database on Vercel later" OR "Attempt option 2, since there's a string".
// Since we don't have the string, we'll implement option 3. We'll use /tmp/admin.db for Vercel to avoid the read-only crash,
// and fallback to an in-memory or throw an error if no DB is provided but we need to support the dashboard load.

const isVercel = process.env.VERCEL === '1';
const dbPath =
  process.env.DATABASE_URL || (isVercel ? '/tmp/admin.db' : path.join(__dirname, 'admin.db'));

export async function initDb(): Promise<Database<sqlite3.Database, sqlite3.Statement>> {
  // If we had a real Postgres connection string in DATABASE_URL, we'd use pg or another driver.
  // Since we only have SQLite installed, we'll just use the SQLite path logic.

  const db = await open({
    filename: dbPath,
    driver: sqlite3.Database,
  });

  await db.exec(`
    CREATE TABLE IF NOT EXISTS config (
      key TEXT PRIMARY KEY,
      value TEXT
    );
    CREATE TABLE IF NOT EXISTS dashboard (
      id TEXT PRIMARY KEY,
      title TEXT,
      status TEXT,
      link TEXT,
      type TEXT,
      isDownload INTEGER
    );
  `);

  // Initialize maintenance config if empty
  const hasGlobal = await db.get('SELECT key FROM config WHERE key = "global"');
  if (!hasGlobal) {
    await db.run('INSERT INTO config (key, value) VALUES ("global", "false")');
    await db.run('INSERT INTO config (key, value) VALUES ("studio", "false")');
    await db.run('INSERT INTO config (key, value) VALUES ("mltk", "false")');
  }

  // Initialize dashboard config if empty
  const hasDashboard = await db.get('SELECT id FROM dashboard LIMIT 1');
  if (!hasDashboard) {
    const DEFAULT_DASHBOARD_CONFIG = [
      {
        id: 'DOC: 001-VVL',
        title: 'Virtue Village Layouts',
        status: 'offline',
        link: 'VIRTUE_VILLAGE_LAYOUTS.pdf',
        type: 'DOWNLOAD',
        isDownload: 1,
      },
      {
        id: 'DOC: 002-GD',
        title: 'Gretchen Dossier',
        status: 'offline',
        link: 'GRETCHEN_DOSSIER.txt',
        type: 'DOWNLOAD',
        isDownload: 1,
      },
      {
        id: 'ARCHIVE: NOVA',
        title: 'NOVA Classified Archive',
        status: 'active',
        link: 'nova-classified-archive.html',
        type: 'ENTER',
        isDownload: 0,
      },
      {
        id: 'PORTAL: CS',
        title: 'Customer Service Portal',
        status: 'active',
        link: 'mltk-customer-service.html',
        type: 'ENTER',
        isDownload: 0,
      },
      {
        id: 'DOC: TETROMINO',
        title: 'Project Tetromino Initialization',
        status: 'active',
        link: 'mltk-classified-document.html',
        type: 'CLASSIFIED: EYES ONLY',
        isDownload: 0,
      },
      {
        id: 'PORTAL: BOOT',
        title: 'MLTK Boot Sequence',
        status: 'active',
        link: 'mltk-boot-sequence.html',
        type: 'ENTER',
        isDownload: 0,
      },
      {
        id: 'PORTAL: LEGAL',
        title: 'MLTK Privacy Policy & Terms',
        status: 'active',
        link: 'mltk-privacy-policy.html',
        type: 'ENTER',
        isDownload: 0,
      },
      {
        id: 'PORTAL: TIMER',
        title: 'MLTK Timer',
        status: 'active',
        link: 'mltk-timer.html',
        type: 'ENTER',
        isDownload: 0,
      },
      {
        id: 'ARCHIVE: PARENT',
        title: 'NOVA Parent Directory',
        status: 'offline',
        link: 'nova-parent-directory.html',
        type: 'ENTER',
        isDownload: 0,
      },
      {
        id: 'PORTAL: RADIO',
        title: 'Ollies Radio Scanner',
        status: 'active',
        link: 'ollies-radio-scanner.html',
        type: 'ENTER',
        isDownload: 0,
      },
      {
        id: 'PORTAL: DROP',
        title: 'Secure Data Drop Page',
        status: 'active',
        link: 'secure-data-drop-page.html',
        type: 'ENTER',
        isDownload: 0,
      },
      {
        id: 'DOC: 003-SGM',
        title: 'Seedless Grapes Motel Blueprints',
        status: 'offline',
        link: 'SEEDLESS_GRAPES_MOTEL_BLUEPRINTS.zip',
        type: 'DOWNLOAD',
        isDownload: 1,
      },
      {
        id: 'DOC: 004-UP',
        title: 'Uncut Puzzle',
        status: 'offline',
        link: 'UNCUT_PUZZLE.pdf',
        type: 'DOWNLOAD',
        isDownload: 1,
      },
      {
        id: 'PORTAL: 5F-WHEEL',
        title: 'Five Finger Selection Wheel',
        status: 'active',
        link: 'mltk-five-finger-wheel.html',
        type: 'ENTER',
        isDownload: 0,
      },
    ];

    for (const item of DEFAULT_DASHBOARD_CONFIG) {
      await db.run(
        'INSERT INTO dashboard (id, title, status, link, type, isDownload) VALUES (?, ?, ?, ?, ?, ?)',
        [item.id, item.title, item.status, item.link, item.type, item.isDownload]
      );
    }
  }

  return db;
}
