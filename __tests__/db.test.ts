/// <reference types="jest" />
/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/ban-ts-comment, @typescript-eslint/no-unused-vars */
import { Redis } from '@upstash/redis';
import {
  initDb,
  updateAllDashboardConfig,
  updateAllMaintenanceConfig,
  getMaintenanceConfig,
  updateMaintenanceConfig,
  getDashboardConfig,
  updateDashboardConfig,
} from '../db';

// Mock @upstash/redis
jest.mock('@upstash/redis', () => {
  return {
    Redis: jest.fn().mockImplementation(() => {
      return {
        exists: jest.fn(),
        hset: jest.fn(),
        set: jest.fn(),
        hgetall: jest.fn(),
        get: jest.fn(),
      };
    }),
  };
});

describe('db.ts tests', () => {
  let originalEnv: NodeJS.ProcessEnv;
  let kvMock: any;

  beforeEach(() => {
    originalEnv = { ...process.env };
    // Need to use isolate modules to reset variables in db.ts
    jest.resetModules();

    // Clear mocks
    jest.clearAllMocks();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('when isKvAvailable is false', () => {
    let dbModule: any;

    beforeEach(async () => {
      delete process.env.KV_REST_API_URL;
      delete process.env.KV_REST_API_TOKEN;
      dbModule = await import('../db');
    });

    it('getDashboardConfig should return default inMemory config', async () => {
      const config = await dbModule.getDashboardConfig();
      (expect as any)(config).toBeDefined();
      (expect as any)(config.length).toBeGreaterThan(0);
      (expect as any)(config[0].id).toBe('PORTAL: VVI');
    });

    it('updateDashboardConfig should update a specific item', async () => {
      await dbModule.updateDashboardConfig('PORTAL: VVI', 'offline');
      const config = await dbModule.getDashboardConfig();
      const item = config.find((d: any) => d.id === 'PORTAL: VVI');
      (expect as any)(item.status).toBe('offline');
    });

    it('updateAllDashboardConfig should update all items', async () => {
      await dbModule.updateAllDashboardConfig('offline');
      const config = await dbModule.getDashboardConfig();
      for (const item of config) {
        (expect as any)(item.status).toBe('offline');
      }
    });

    it('getMaintenanceConfig should return default inMemory config', async () => {
      const config = await dbModule.getMaintenanceConfig();
      (expect as any)(config).toEqual({ global: 'false', studio: 'false', mltk: 'false' });
    });

    it('updateMaintenanceConfig should update specific items', async () => {
      await dbModule.updateMaintenanceConfig('global', true);
      let config = await dbModule.getMaintenanceConfig();
      (expect as any)(config.global).toBe('true');

      await dbModule.updateMaintenanceConfig('studio', true);
      config = await dbModule.getMaintenanceConfig();
      (expect as any)(config.studio).toBe('true');

      await dbModule.updateMaintenanceConfig('mltk', true);
      config = await dbModule.getMaintenanceConfig();
      (expect as any)(config.mltk).toBe('true');
    });

    it('updateAllMaintenanceConfig should update all items', async () => {
      await dbModule.updateAllMaintenanceConfig(true);
      const config = await dbModule.getMaintenanceConfig();
      (expect as any)(config).toEqual({ global: 'true', studio: 'true', mltk: 'true' });
    });

    it('initDb should do nothing', async () => {
      await dbModule.initDb();
      // Expect no exception and no interaction with Redis since we mock Redis internally if KV is false it skips
    });
  });

  describe('when isKvAvailable is true', () => {
    let dbModule: any;

    beforeEach(async () => {
      process.env.KV_REST_API_URL = 'http://mock-url';
      process.env.KV_REST_API_TOKEN = 'mock-token';
      dbModule = await import('../db');
      // @ts-ignore - reaching into the mock
      kvMock = require('@upstash/redis').Redis.mock.results[0].value;
    });

    it('initDb should initialize if missing in KV', async () => {
      kvMock.exists.mockResolvedValue(0); // 0 means not exists
      await dbModule.initDb();
      (expect as any)(kvMock.exists).toHaveBeenCalledWith('config:maintenance');
      (expect as any)(kvMock.hset).toHaveBeenCalledWith('config:maintenance', {
        global: 'false',
        studio: 'false',
        mltk: 'false',
      });
      (expect as any)(kvMock.exists).toHaveBeenCalledWith('config:dashboard');
      (expect as any)(kvMock.set).toHaveBeenCalled(); // Should be called with DEFAULT_DASHBOARD_CONFIG
    });

    it('initDb should not initialize if exists in KV', async () => {
      kvMock.exists.mockResolvedValue(1); // 1 means exists
      await dbModule.initDb();
      (expect as any)(kvMock.exists).toHaveBeenCalledWith('config:maintenance');
      (expect as any)(kvMock.hset).not.toHaveBeenCalled();
      (expect as any)(kvMock.exists).toHaveBeenCalledWith('config:dashboard');
      (expect as any)(kvMock.set).not.toHaveBeenCalled();
    });

    it('getDashboardConfig should return from KV', async () => {
      const mockData = [{ id: 'TEST', title: 'Test Title' }];
      kvMock.get.mockResolvedValue(mockData);

      const config = await dbModule.getDashboardConfig();
      (expect as any)(kvMock.get).toHaveBeenCalledWith('config:dashboard');
      (expect as any)(config).toEqual(mockData);
    });

    it('getDashboardConfig should return default if KV returns null', async () => {
      kvMock.get.mockResolvedValue(null);
      const config = await dbModule.getDashboardConfig();
      (expect as any)(config[0].id).toBe('PORTAL: VVI');
    });

    it('updateDashboardConfig should update a specific item in KV', async () => {
      const mockData = [{ id: 'PORTAL: VVI', status: 'active' }];
      kvMock.get.mockResolvedValue(mockData);

      await dbModule.updateDashboardConfig('PORTAL: VVI', 'offline');
      (expect as any)(kvMock.get).toHaveBeenCalledWith('config:dashboard');
      (expect as any)(kvMock.set).toHaveBeenCalledWith('config:dashboard', [
        { id: 'PORTAL: VVI', status: 'offline' },
      ]);
    });

    it('updateDashboardConfig should not update if item not found in KV', async () => {
      const mockData = [{ id: 'PORTAL: VVI', status: 'active' }];
      kvMock.get.mockResolvedValue(mockData);

      await dbModule.updateDashboardConfig('NON_EXISTENT', 'offline');
      (expect as any)(kvMock.set).not.toHaveBeenCalled();
    });

    it('updateAllDashboardConfig should update all items in KV', async () => {
      const mockData = [
        { id: 'PORTAL: VVI', status: 'active' },
        { id: 'PORTAL: RADIO', status: 'active' },
      ];
      kvMock.get.mockResolvedValue(mockData);

      await dbModule.updateAllDashboardConfig('offline');
      (expect as any)(kvMock.get).toHaveBeenCalledWith('config:dashboard');
      (expect as any)(kvMock.set).toHaveBeenCalledWith('config:dashboard', [
        { id: 'PORTAL: VVI', status: 'offline' },
        { id: 'PORTAL: RADIO', status: 'offline' },
      ]);
    });

    it('getMaintenanceConfig should return from KV', async () => {
      const mockData = { global: 'true', studio: 'false', mltk: 'true' };
      kvMock.hgetall.mockResolvedValue(mockData);

      const config = await dbModule.getMaintenanceConfig();
      (expect as any)(kvMock.hgetall).toHaveBeenCalledWith('config:maintenance');
      (expect as any)(config).toEqual(mockData);
    });

    it('getMaintenanceConfig should return default if KV returns null', async () => {
      kvMock.hgetall.mockResolvedValue(null);
      const config = await dbModule.getMaintenanceConfig();
      (expect as any)(config).toEqual({ global: 'false', studio: 'false', mltk: 'false' });
    });

    it('updateMaintenanceConfig should update a specific key in KV', async () => {
      await dbModule.updateMaintenanceConfig('global', true);
      (expect as any)(kvMock.hset).toHaveBeenCalledWith('config:maintenance', { global: 'true' });
    });

    it('updateAllMaintenanceConfig should update all items in KV', async () => {
      await dbModule.updateAllMaintenanceConfig(true);
      (expect as any)(kvMock.hset).toHaveBeenCalledWith('config:maintenance', {
        global: 'true',
        studio: 'true',
        mltk: 'true',
      });
    });
  });
});
