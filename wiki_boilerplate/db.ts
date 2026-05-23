import { Redis } from '@upstash/redis';

// Initialize Upstash Redis client with the environment variables provided by the Vercel KV integration
const kv = new Redis({
  url: process.env.KV_REST_API_URL || '',
  token: process.env.KV_REST_API_TOKEN || '',
});

interface MaintenanceConfig {
  global: boolean;
}

const inMemoryMaintenanceConfig = { global: false };

const isKvAvailable = !!process.env.KV_REST_API_URL && !!process.env.KV_REST_API_TOKEN;

export async function initDb() {
  if (isKvAvailable) {
    const hasMaintenance = await kv.exists('config:maintenance');
    if (!hasMaintenance) {
      await kv.hset('config:maintenance', { global: 'false' });
    }
  }
}

export async function updateAllMaintenanceConfig(value: boolean) {
  if (isKvAvailable) {
    await kv.hset('config:maintenance', {
      global: String(value),
    });
  } else {
    inMemoryMaintenanceConfig.global = value;
  }
}

export async function getMaintenanceConfig(): Promise<Record<string, string>> {
  if (isKvAvailable) {
    const config = await kv.hgetall('config:maintenance');
    return (config as Record<string, string>) || { global: 'false' };
  }
  return {
    global: String(inMemoryMaintenanceConfig.global),
  };
}

export async function updateMaintenanceConfig(key: string, value: boolean) {
  if (isKvAvailable) {
    await kv.hset('config:maintenance', { [key]: String(value) });
  } else {
    if (key === 'global') inMemoryMaintenanceConfig.global = value;
  }
}
