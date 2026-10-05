import { mysqlDb, getDatabaseStatus as getMySQLStatus, initMySQLDatabase, testConnection as testMySQLConnection, updateDatabaseConfig as updateMySQLConfig, exportDatabaseBackup, importDatabaseBackup } from './mysql.ts';
import { oracleDb, getOracleStatus, initOracleDatabase, testOracleConnection, updateOracleConfig, extractWalletZip, OracleConfig } from './oracle.ts';
import fs from 'fs';
import path from 'path';

export type DatabaseEngine = 'oracle' | 'mysql';

const SETTINGS_PATH = path.resolve(process.cwd(), 'database-settings.json');

let activeEngine: DatabaseEngine = 'mysql';

// Load persisted engine choice
try {
  if (fs.existsSync(SETTINGS_PATH)) {
    const s = JSON.parse(fs.readFileSync(SETTINGS_PATH, 'utf8'));
    if (s.activeEngine === 'oracle' || s.activeEngine === 'mysql') {
      activeEngine = s.activeEngine;
    }
  }
} catch (e) {}

function persistEngineChoice() {
  try {
    fs.writeFileSync(SETTINGS_PATH, JSON.stringify({ activeEngine }, null, 2));
  } catch (e) {}
}

export function getActiveEngine(): DatabaseEngine {
  return activeEngine;
}

export function setActiveEngine(engine: DatabaseEngine) {
  activeEngine = engine;
  persistEngineChoice();
  return activeEngine;
}

export async function initActiveDatabase() {
  console.log(`[DB Hub] Initializing active database engine: ${activeEngine.toUpperCase()}`);
  if (activeEngine === 'oracle') {
    const ok = await initOracleDatabase();
    if (!ok) {
      console.warn('[DB Hub] Oracle initialization in standby. Also initializing MySQL fallback.');
      await initMySQLDatabase();
    }
    return ok;
  } else {
    return await initMySQLDatabase();
  }
}

export async function getFullDatabaseStatus() {
  const mysqlStat = getMySQLStatus();
  const oracleStat = getOracleStatus();
  return {
    activeEngine,
    mysql: mysqlStat,
    oracle: oracleStat,
    isCurrentConnected: activeEngine === 'oracle' ? oracleStat.isConnected : mysqlStat.isConnected
  };
}

// Data synchronization from current store to Oracle
export async function syncDataToOracle() {
  const backup = await exportDatabaseBackup();
  const pages = backup.tables.pages || [];
  const shortLinks = backup.tables.shortLinks || [];
  const subscribers = backup.tables.subscribers || [];
  const banners = backup.tables.banners || [];
  const analytics = backup.tables.analytics || {};
  const users = backup.tables.users || [];

  let syncedPages = 0;
  let syncedLinks = 0;
  let syncedSubs = 0;
  let syncedBanners = 0;
  let syncedAnalytics = 0;
  let syncedUsers = 0;

  for (const page of pages) {
    try {
      await oracleDb.savePage(page);
      syncedPages++;
    } catch (e) {}
  }

  for (const link of shortLinks) {
    try {
      await oracleDb.saveShortLink(link);
      syncedLinks++;
    } catch (e) {}
  }

  for (const sub of subscribers) {
    try {
      await oracleDb.addSubscriber(sub);
      syncedSubs++;
    } catch (e) {}
  }

  for (const banner of banners) {
    try {
      await oracleDb.saveBanner(banner);
      syncedBanners++;
    } catch (e) {}
  }

  for (const pageId of Object.keys(analytics)) {
    try {
      await oracleDb.savePageAnalytics(pageId, analytics[pageId]);
      syncedAnalytics++;
    } catch (e) {}
  }

  for (const user of users) {
    try {
      await oracleDb.createUser(user);
      syncedUsers++;
    } catch (e) {}
  }

  return {
    success: true,
    syncedCounts: {
      pages: syncedPages,
      shortLinks: syncedLinks,
      subscribers: syncedSubs,
      banners: syncedBanners,
      analytics: syncedAnalytics,
      users: syncedUsers
    }
  };
}

// Unified Data Access Interface
export const unifiedDb = {
  // Users
  async findUserByEmail(email: string) {
    if (activeEngine === 'oracle') {
      try {
        const u = await oracleDb.findUserByEmail(email);
        if (u) return u;
      } catch (e) {}
    }
    return mysqlDb.findUserByEmail(email);
  },

  async createUser(user: { id: string; email: string; password_hash: string }) {
    if (activeEngine === 'oracle') {
      try {
        await oracleDb.createUser(user);
      } catch (e) {}
    }
    return mysqlDb.createUser(user);
  },

  // Pages
  async getUserPages(userId: string) {
    if (activeEngine === 'oracle') {
      try {
        const pgs = await oracleDb.getUserPages(userId);
        if (pgs && pgs.length > 0) return pgs;
      } catch (e) {}
    }
    return mysqlDb.getUserPages(userId);
  },

  async getAllPages() {
    if (activeEngine === 'oracle') {
      try {
        const pgs = await oracleDb.getAllPages();
        if (pgs && pgs.length > 0) return pgs;
      } catch (e) {}
    }
    return mysqlDb.getAllPages();
  },

  async getPageBySlug(slug: string) {
    if (activeEngine === 'oracle') {
      try {
        const pg = await oracleDb.getPageBySlug(slug);
        if (pg) return pg;
      } catch (e) {}
    }
    return mysqlDb.getPageBySlug(slug);
  },

  async savePage(page: any) {
    if (activeEngine === 'oracle') {
      try {
        await oracleDb.savePage(page);
      } catch (e) {}
    }
    return mysqlDb.savePage(page);
  },

  async deletePage(pageId: string) {
    if (activeEngine === 'oracle') {
      try {
        await oracleDb.deletePage(pageId);
      } catch (e) {}
    }
    return mysqlDb.deletePage(pageId);
  },

  // Analytics
  async getPageAnalytics(pageId: string) {
    if (activeEngine === 'oracle') {
      try {
        const an = await oracleDb.getPageAnalytics(pageId);
        if (an) return an;
      } catch (e) {}
    }
    return mysqlDb.getPageAnalytics(pageId);
  },

  async savePageAnalytics(pageId: string, analytics: any) {
    if (activeEngine === 'oracle') {
      try {
        await oracleDb.savePageAnalytics(pageId, analytics);
      } catch (e) {}
    }
    return mysqlDb.savePageAnalytics(pageId, analytics);
  },

  async incrementPageView(pageId: string) {
    if (activeEngine === 'oracle') {
      try {
        await oracleDb.incrementPageView(pageId);
      } catch (e) {}
    }
    return mysqlDb.incrementPageView(pageId);
  },

  // Short Links
  async getUserShortLinks(userId: string) {
    if (activeEngine === 'oracle') {
      try {
        const links = await oracleDb.getUserShortLinks(userId);
        if (links && links.length > 0) return links;
      } catch (e) {}
    }
    return mysqlDb.getUserShortLinks(userId);
  },

  async getShortLinkByCode(shortCode: string) {
    if (activeEngine === 'oracle') {
      try {
        const l = await oracleDb.getShortLinkByCode(shortCode);
        if (l) return l;
      } catch (e) {}
    }
    return mysqlDb.getShortLinkByCode(shortCode);
  },

  async saveShortLink(link: any) {
    if (activeEngine === 'oracle') {
      try {
        await oracleDb.saveShortLink(link);
      } catch (e) {}
    }
    return mysqlDb.saveShortLink(link);
  },

  async deleteShortLink(id: string) {
    if (activeEngine === 'oracle') {
      try {
        await oracleDb.deleteShortLink(id);
      } catch (e) {}
    }
    return mysqlDb.deleteShortLink(id);
  },

  async incrementShortLinkClick(id: string) {
    if (activeEngine === 'oracle') {
      try {
        await oracleDb.incrementShortLinkClick(id);
      } catch (e) {}
    }
    return mysqlDb.incrementShortLinkClick(id);
  },

  // Subscribers
  async getPageSubscribers(pageId: string) {
    if (activeEngine === 'oracle') {
      try {
        const subs = await oracleDb.getPageSubscribers(pageId);
        if (subs && subs.length > 0) return subs;
      } catch (e) {}
    }
    return mysqlDb.getPageSubscribers(pageId);
  },

  async addSubscriber(sub: { id: string; pageId: string; email: string; subscribedAt: string }) {
    if (activeEngine === 'oracle') {
      try {
        await oracleDb.addSubscriber(sub);
      } catch (e) {}
    }
    return mysqlDb.addSubscriber(sub);
  },

  // Banners
  async getAllBanners() {
    if (activeEngine === 'oracle') {
      try {
        const b = await oracleDb.getAllBanners();
        if (b && b.length > 0) return b;
      } catch (e) {}
    }
    return mysqlDb.getAllBanners();
  },

  async saveBanner(banner: any) {
    if (activeEngine === 'oracle') {
      try {
        await oracleDb.saveBanner(banner);
      } catch (e) {}
    }
    return mysqlDb.saveBanner(banner);
  },

  async deleteBanner(id: string) {
    if (activeEngine === 'oracle') {
      try {
        await oracleDb.deleteBanner(id);
      } catch (e) {}
    }
    return mysqlDb.deleteBanner(id);
  }
};
