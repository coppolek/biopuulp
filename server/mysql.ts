import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';

let DB_CONFIG = {
  host: process.env.MYSQL_HOST || 'mysql-2033062c-paycoppolek-5765.l.aivencloud.com',
  port: Number(process.env.MYSQL_PORT) || 14625,
  user: process.env.MYSQL_USER || 'avnadmin',
  password: process.env.MYSQL_PASSWORD || '',
  database: process.env.MYSQL_DATABASE || 'defaultdb',
  ssl: { rejectUnauthorized: false },
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  connectTimeout: 10000,
};

let pool: mysql.Pool | null = null;
let isConnected = false;
let lastConnectionError: string | null = null;
let dbServerVersion: string | null = null;

// Fallback local file storage if MySQL is temporarily offline / starting up
const LOCAL_BACKUP_PATH = path.resolve(process.cwd(), 'data-storage.json');
let localStore: {
  pages: Record<string, any>;
  shortLinks: Record<string, any>;
  subscribers: Array<{ id: string; pageId: string; email: string; subscribedAt: string }>;
  banners: Record<string, any>;
  analytics: Record<string, any>;
  users: Record<string, any>;
} = {
  pages: {},
  shortLinks: {},
  subscribers: [],
  banners: {},
  analytics: {},
  users: {}
};

try {
  if (fs.existsSync(LOCAL_BACKUP_PATH)) {
    localStore = JSON.parse(fs.readFileSync(LOCAL_BACKUP_PATH, 'utf-8'));
  }
} catch (e) {
  console.warn('[MySQL] Failed to load local backup:', e);
}

function persistLocalStore() {
  try {
    fs.writeFileSync(LOCAL_BACKUP_PATH, JSON.stringify(localStore, null, 2));
  } catch (e) {
    console.warn('[MySQL] Failed to write local backup:', e);
  }
}

export async function getDbPool() {
  if (!pool) {
    try {
      pool = mysql.createPool(DB_CONFIG);
    } catch (e) {
      console.warn('[MySQL] Could not create pool:', e);
      return null;
    }
  }
  return pool;
}

export async function initMySQLDatabase() {
  try {
    const p = await getDbPool();
    if (!p) return false;

    // Test connection
    const conn = await p.getConnection();
    const [verRows]: any = await conn.query('SELECT VERSION() as ver');
    if (verRows && verRows[0]) {
      dbServerVersion = verRows[0].ver;
    }
    console.log('[MySQL] Successfully connected to MySQL database at', DB_CONFIG.host, '(Version:', dbServerVersion, ')');
    isConnected = true;
    lastConnectionError = null;

    // Create tables
    await conn.query(`
      CREATE TABLE IF NOT EXISTS pages (
        id VARCHAR(255) PRIMARY KEY,
        user_id VARCHAR(255) NOT NULL,
        slug VARCHAR(255) NOT NULL UNIQUE,
        data LONGTEXT NOT NULL,
        views INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_user_id (user_id),
        INDEX idx_slug (slug)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS short_links (
        id VARCHAR(255) PRIMARY KEY,
        user_id VARCHAR(255) NOT NULL,
        short_code VARCHAR(255) NOT NULL UNIQUE,
        title VARCHAR(255),
        original_url TEXT,
        clicks INT DEFAULT 0,
        data LONGTEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_user (user_id),
        INDEX idx_code (short_code)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS subscribers (
        id VARCHAR(255) PRIMARY KEY,
        page_id VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL,
        subscribed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_page (page_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS banners (
        id VARCHAR(255) PRIMARY KEY,
        data LONGTEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS analytics (
        page_id VARCHAR(255) PRIMARY KEY,
        data LONGTEXT NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(255) PRIMARY KEY,
        email VARCHAR(255) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    conn.release();
    console.log('[MySQL] Tables verified and ready in', DB_CONFIG.database);
    return true;
  } catch (err: any) {
    isConnected = false;
    lastConnectionError = err?.code || err?.message || 'Connection failed';
    console.warn('[MySQL] Notice: Aiven MySQL connection currently standby (' + lastConnectionError + '). Serving with active store until remote database finishes booting.');
    return false;
  }
}

// Background reconnect timer every 15s if initially unreachable
setInterval(async () => {
  if (!isConnected) {
    try {
      const success = await initMySQLDatabase();
      if (success) {
        console.log('[MySQL] Reconnection successful! Remote database is active.');
      }
    } catch (e) {}
  }
}, 15000);

export function getDatabaseStatus() {
  return {
    isConnected,
    lastError: lastConnectionError,
    version: dbServerVersion,
    config: {
      host: DB_CONFIG.host,
      port: DB_CONFIG.port,
      user: DB_CONFIG.user,
      database: DB_CONFIG.database,
      ssl: !!DB_CONFIG.ssl,
      hasPassword: !!DB_CONFIG.password
    },
    counts: {
      pages: Object.keys(localStore.pages).length,
      shortLinks: Object.keys(localStore.shortLinks).length,
      subscribers: localStore.subscribers.length,
      banners: Object.keys(localStore.banners).length,
      users: Object.keys(localStore.users).length
    }
  };
}

export async function testConnection(testConfig?: any) {
  const cfg = testConfig ? {
    host: testConfig.host || DB_CONFIG.host,
    port: Number(testConfig.port) || DB_CONFIG.port,
    user: testConfig.user || DB_CONFIG.user,
    password: testConfig.password !== undefined ? testConfig.password : DB_CONFIG.password,
    database: testConfig.database || DB_CONFIG.database,
    ssl: testConfig.ssl ? { rejectUnauthorized: false } : undefined,
    connectTimeout: 7000
  } : DB_CONFIG;

  const start = Date.now();
  let tempConn: mysql.Connection | null = null;
  try {
    tempConn = await mysql.createConnection(cfg);
    const [rows]: any = await tempConn.query('SELECT VERSION() as version, DATABASE() as db');
    const latency = Date.now() - start;
    const version = rows[0]?.version || 'Unknown';
    await tempConn.end();
    return {
      success: true,
      message: `Connessione riuscita a MySQL (${cfg.host}:${cfg.port})!`,
      version,
      database: rows[0]?.db || cfg.database,
      latencyMs: latency
    };
  } catch (err: any) {
    if (tempConn) {
      try { await tempConn.end(); } catch (e) {}
    }
    return {
      success: false,
      message: `Errore di connessione: ${err?.message || err?.code || 'Impossibile connettersi'}`,
      code: err?.code || 'UNKNOWN',
      latencyMs: Date.now() - start
    };
  }
}

export async function updateDatabaseConfig(newConfig: {
  host: string;
  port: number;
  user: string;
  password?: string;
  database: string;
  ssl?: boolean;
}) {
  DB_CONFIG = {
    ...DB_CONFIG,
    host: newConfig.host.trim(),
    port: Number(newConfig.port) || 3306,
    user: newConfig.user.trim(),
    password: newConfig.password !== undefined && newConfig.password !== '' ? newConfig.password : DB_CONFIG.password,
    database: newConfig.database.trim(),
    ssl: newConfig.ssl ? { rejectUnauthorized: false } : undefined as any,
  };

  // Update .env file
  try {
    const envLines = [
      `MYSQL_HOST=${DB_CONFIG.host}`,
      `MYSQL_PORT=${DB_CONFIG.port}`,
      `MYSQL_USER=${DB_CONFIG.user}`,
      `MYSQL_PASSWORD=${DB_CONFIG.password}`,
      `MYSQL_DATABASE=${DB_CONFIG.database}`,
      `MYSQL_SSL=${DB_CONFIG.ssl ? 'true' : 'false'}`
    ];
    fs.writeFileSync(path.resolve(process.cwd(), '.env'), envLines.join('\n') + '\n');
  } catch (e) {
    console.warn('[MySQL] Could not write .env:', e);
  }

  // Close old pool
  if (pool) {
    try {
      await pool.end();
    } catch (e) {}
    pool = null;
  }

  // Re-initialize
  const connected = await initMySQLDatabase();
  return {
    success: connected,
    status: getDatabaseStatus()
  };
}

// Full Export / Backup
export async function exportDatabaseBackup() {
  // Refresh data from MySQL if connected
  const p = await getDbPool();
  let exportPages = Object.values(localStore.pages);
  let exportShortLinks = Object.values(localStore.shortLinks);
  let exportSubscribers = [...localStore.subscribers];
  let exportBanners = Object.values(localStore.banners);
  let exportAnalytics = { ...localStore.analytics };
  let exportUsers = Object.values(localStore.users);

  if (isConnected && p) {
    try {
      const [pRows]: any = await p.query('SELECT data FROM pages');
      if (pRows.length > 0) exportPages = pRows.map((r: any) => JSON.parse(r.data));

      const [sRows]: any = await p.query('SELECT data FROM short_links');
      if (sRows.length > 0) exportShortLinks = sRows.map((r: any) => JSON.parse(r.data));

      const [subRows]: any = await p.query('SELECT id, page_id as pageId, email, subscribed_at as subscribedAt FROM subscribers');
      if (subRows.length > 0) exportSubscribers = subRows;

      const [bRows]: any = await p.query('SELECT data FROM banners');
      if (bRows.length > 0) exportBanners = bRows.map((r: any) => JSON.parse(r.data));

      const [aRows]: any = await p.query('SELECT page_id as pageId, data FROM analytics');
      if (aRows.length > 0) {
        exportAnalytics = {};
        aRows.forEach((r: any) => {
          try { exportAnalytics[r.pageId] = JSON.parse(r.data); } catch (e) {}
        });
      }

      const [uRows]: any = await p.query('SELECT id, email, password_hash FROM users');
      if (uRows.length > 0) exportUsers = uRows;
    } catch (e) {
      console.warn('[MySQL] Error querying for full backup:', e);
    }
  }

  return {
    appName: 'BioLink Pro',
    exportDate: new Date().toISOString(),
    version: '2.0.0',
    databaseEngine: 'MySQL',
    databaseName: DB_CONFIG.database,
    counts: {
      pages: exportPages.length,
      shortLinks: exportShortLinks.length,
      subscribers: exportSubscribers.length,
      banners: exportBanners.length,
      analytics: Object.keys(exportAnalytics).length,
      users: exportUsers.length
    },
    tables: {
      pages: exportPages,
      shortLinks: exportShortLinks,
      subscribers: exportSubscribers,
      banners: exportBanners,
      analytics: exportAnalytics,
      users: exportUsers
    }
  };
}

export async function generateSqlDump() {
  const backup = await exportDatabaseBackup();
  let sql = `-- BioLink Pro MySQL Database Backup
-- Data Generazione: ${new Date().toISOString()}
-- Database: ${DB_CONFIG.database}
-- Host: ${DB_CONFIG.host}
SET FOREIGN_KEY_CHECKS=0;
SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";

-- --------------------------------------------------------
-- Tabella: pages
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS \`pages\` (
  \`id\` VARCHAR(255) PRIMARY KEY,
  \`user_id\` VARCHAR(255) NOT NULL,
  \`slug\` VARCHAR(255) NOT NULL UNIQUE,
  \`data\` LONGTEXT NOT NULL,
  \`views\` INT DEFAULT 0,
  \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX \`idx_user_id\` (\`user_id\`),
  INDEX \`idx_slug\` (\`slug\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

`;

  const escapeSql = (val: string) => val.replace(/[\0\x08\x09\x1a\n\r"'\\\%]/g, (char) => {
    switch (char) {
      case "\0": return "\\0";
      case "\x08": return "\\b";
      case "\x09": return "\\t";
      case "\x1a": return "\\z";
      case "\n": return "\\n";
      case "\r": return "\\r";
      case "\"":
      case "'":
      case "\\":
      case "%":
        return "\\" + char;
      default:
        return char;
    }
  });

  for (const page of backup.tables.pages) {
    sql += `REPLACE INTO \`pages\` (\`id\`, \`user_id\`, \`slug\`, \`data\`, \`views\`) VALUES ('${escapeSql(page.id)}', '${escapeSql(page.userId || 'admin')}', '${escapeSql(page.slug)}', '${escapeSql(JSON.stringify(page))}', ${page.views || 0});\n`;
  }

  sql += `\n-- --------------------------------------------------------
-- Tabella: short_links
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS \`short_links\` (
  \`id\` VARCHAR(255) PRIMARY KEY,
  \`user_id\` VARCHAR(255) NOT NULL,
  \`short_code\` VARCHAR(255) NOT NULL UNIQUE,
  \`title\` VARCHAR(255),
  \`original_url\` TEXT,
  \`clicks\` INT DEFAULT 0,
  \`data\` LONGTEXT,
  \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX \`idx_user\` (\`user_id\`),
  INDEX \`idx_code\` (\`short_code\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

`;
  for (const link of backup.tables.shortLinks) {
    sql += `REPLACE INTO \`short_links\` (\`id\`, \`user_id\`, \`short_code\`, \`title\`, \`original_url\`, \`clicks\`, \`data\`) VALUES ('${escapeSql(link.id)}', '${escapeSql(link.userId || 'admin')}', '${escapeSql(link.shortCode)}', '${escapeSql(link.title || '')}', '${escapeSql(link.targetUrl || link.originalUrl || '')}', ${link.clicks || 0}, '${escapeSql(JSON.stringify(link))}');\n`;
  }

  sql += `\n-- --------------------------------------------------------
-- Tabella: subscribers
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS \`subscribers\` (
  \`id\` VARCHAR(255) PRIMARY KEY,
  \`page_id\` VARCHAR(255) NOT NULL,
  \`email\` VARCHAR(255) NOT NULL,
  \`subscribed_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX \`idx_page\` (\`page_id\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

`;
  for (const sub of backup.tables.subscribers) {
    sql += `REPLACE INTO \`subscribers\` (\`id\`, \`page_id\`, \`email\`, \`subscribed_at\`) VALUES ('${escapeSql(sub.id)}', '${escapeSql(sub.pageId)}', '${escapeSql(sub.email)}', '${sub.subscribedAt || new Date().toISOString()}');\n`;
  }

  sql += `\n-- --------------------------------------------------------
-- Tabella: banners
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS \`banners\` (
  \`id\` VARCHAR(255) PRIMARY KEY,
  \`data\` LONGTEXT NOT NULL,
  \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

`;
  for (const banner of backup.tables.banners) {
    sql += `REPLACE INTO \`banners\` (\`id\`, \`data\`) VALUES ('${escapeSql(banner.id)}', '${escapeSql(JSON.stringify(banner))}');\n`;
  }

  sql += `\nCOMMIT;\nSET FOREIGN_KEY_CHECKS=1;\n`;
  return sql;
}

// Full Import / Restore
export async function importDatabaseBackup(payload: any, mode: 'merge' | 'replace' = 'merge') {
  if (!payload || typeof payload !== 'object') {
    throw new Error('Formato backup non valido');
  }

  const tables = payload.tables || payload;
  const pages: any[] = Array.isArray(tables.pages) ? tables.pages : Object.values(tables.pages || {});
  const shortLinks: any[] = Array.isArray(tables.shortLinks) ? tables.shortLinks : Object.values(tables.shortLinks || {});
  const subscribers: any[] = Array.isArray(tables.subscribers) ? tables.subscribers : [];
  const banners: any[] = Array.isArray(tables.banners) ? tables.banners : Object.values(tables.banners || {});
  const analytics: any = tables.analytics || {};
  const users: any[] = Array.isArray(tables.users) ? tables.users : Object.values(tables.users || {});

  if (mode === 'replace') {
    localStore = {
      pages: {},
      shortLinks: {},
      subscribers: [],
      banners: {},
      analytics: {},
      users: {}
    };
  }

  // Populate local storage
  for (const p of pages) {
    if (p.id) localStore.pages[p.id] = p;
  }
  for (const s of shortLinks) {
    if (s.id) localStore.shortLinks[s.id] = s;
  }
  for (const sub of subscribers) {
    if (sub.id && !localStore.subscribers.some(x => x.id === sub.id)) {
      localStore.subscribers.push(sub);
    }
  }
  for (const b of banners) {
    if (b.id) localStore.banners[b.id] = b;
  }
  for (const pageId of Object.keys(analytics)) {
    localStore.analytics[pageId] = analytics[pageId];
  }
  for (const u of users) {
    if (u.id) localStore.users[u.id] = u;
  }
  persistLocalStore();

  // If MySQL is connected, insert/replace rows into remote database
  const p = await getDbPool();
  if (isConnected && p) {
    try {
      if (mode === 'replace') {
        await p.query('DELETE FROM pages');
        await p.query('DELETE FROM short_links');
        await p.query('DELETE FROM subscribers');
        await p.query('DELETE FROM banners');
        await p.query('DELETE FROM analytics');
      }

      for (const page of pages) {
        if (page.id && page.slug) {
          await p.query(
            'INSERT INTO pages (id, user_id, slug, data, views) VALUES (?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE user_id = VALUES(user_id), slug = VALUES(slug), data = VALUES(data), views = VALUES(views)',
            [page.id, page.userId || 'admin', page.slug, JSON.stringify(page), page.views || 0]
          );
        }
      }

      for (const link of shortLinks) {
        if (link.id && link.shortCode) {
          await p.query(
            'INSERT INTO short_links (id, user_id, short_code, title, original_url, clicks, data) VALUES (?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE title = VALUES(title), original_url = VALUES(original_url), data = VALUES(data), clicks = VALUES(clicks)',
            [link.id, link.userId || 'admin', link.shortCode, link.title || '', link.targetUrl || link.originalUrl || '', link.clicks || 0, JSON.stringify(link)]
          );
        }
      }

      for (const sub of subscribers) {
        if (sub.id && sub.pageId && sub.email) {
          await p.query(
            'INSERT INTO subscribers (id, page_id, email, subscribed_at) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE email = VALUES(email)',
            [sub.id, sub.pageId, sub.email, new Date(sub.subscribedAt || Date.now())]
          );
        }
      }

      for (const banner of banners) {
        if (banner.id) {
          await p.query(
            'INSERT INTO banners (id, data) VALUES (?, ?) ON DUPLICATE KEY UPDATE data = VALUES(data)',
            [banner.id, JSON.stringify(banner)]
          );
        }
      }

      for (const pageId of Object.keys(analytics)) {
        await p.query(
          'INSERT INTO analytics (page_id, data) VALUES (?, ?) ON DUPLICATE KEY UPDATE data = VALUES(data)',
          [pageId, JSON.stringify(analytics[pageId])]
        );
      }
    } catch (err) {
      console.warn('[MySQL] Error writing import to MySQL:', err);
    }
  }

  return {
    success: true,
    mode,
    counts: {
      pages: pages.length,
      shortLinks: shortLinks.length,
      subscribers: subscribers.length,
      banners: banners.length,
      users: users.length
    }
  };
}

export const DEFAULT_BANNERS = [
  {
    id: 'banner_sponsor_cloud',
    name: 'Oracle Cloud Free Tier',
    type: 'image',
    position: 'short_url',
    active: true,
    imageUrl: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1200&q=80',
    linkUrl: 'https://cloud.oracle.com',
    text: 'Sponsor Ufficiale: Fino a 300$ di crediti e Database Always Free su Oracle Cloud'
  },
  {
    id: 'banner_sponsor_tech',
    name: 'Tech & Lifestyle Gear',
    type: 'image',
    position: 'short_url',
    active: true,
    imageUrl: 'https://images.unsplash.com/photo-1526738549149-8e07eca6c147?auto=format&fit=crop&w=1200&q=80',
    linkUrl: 'https://amazon.it',
    text: 'Scopri le migliori offerte tecnologiche e accessori per creator'
  }
];

// Data Access Methods
export const mysqlDb = {
  // Users
  async findUserByEmail(email: string) {
    if (!email) return null;
    const cleanEmail = email.trim().toLowerCase();
    const p = await getDbPool();
    if (isConnected && p) {
      try {
        const [rows]: any = await p.query('SELECT * FROM users WHERE LOWER(email) = ? LIMIT 1', [cleanEmail]);
        if (rows.length > 0) return rows[0];
      } catch (e) {
        console.warn('[MySQL] findUserByEmail fallback:', e);
      }
    }
    return Object.values(localStore.users).find((u: any) => u.email && u.email.toLowerCase() === cleanEmail) || null;
  },

  async createUser(user: { id: string; email: string; password_hash: string }) {
    const cleanEmail = user.email.trim().toLowerCase();
    const normalizedUser = {
      id: user.id,
      email: cleanEmail,
      password_hash: user.password_hash
    };
    localStore.users[normalizedUser.id] = normalizedUser;
    persistLocalStore();

    const p = await getDbPool();
    if (isConnected && p) {
      try {
        await p.query(
          'INSERT INTO users (id, email, password_hash) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE password_hash = VALUES(password_hash)',
          [normalizedUser.id, normalizedUser.email, normalizedUser.password_hash]
        );
      } catch (e) {
        console.warn('[MySQL] createUser error:', e);
      }
    }
    return normalizedUser;
  },

  async updateUserPassword(email: string, password_hash: string) {
    const cleanEmail = email.trim().toLowerCase();
    const user = Object.values(localStore.users).find((u: any) => u.email && u.email.toLowerCase() === cleanEmail) as any;
    if (user) {
      user.password_hash = password_hash;
      persistLocalStore();
    }
    const p = await getDbPool();
    if (isConnected && p) {
      try {
        await p.query('UPDATE users SET password_hash = ? WHERE LOWER(email) = ?', [password_hash, cleanEmail]);
      } catch (e) {
        console.warn('[MySQL] updateUserPassword error:', e);
      }
    }
    return true;
  },

  // Pages
  async getUserPages(userId: string) {
    const p = await getDbPool();
    if (isConnected && p) {
      try {
        const [rows]: any = await p.query('SELECT data FROM pages WHERE user_id = ? ORDER BY updated_at DESC', [userId]);
        return rows.map((r: any) => JSON.parse(r.data));
      } catch (e) {
        console.warn('[MySQL] getUserPages fallback:', e);
      }
    }
    return Object.values(localStore.pages).filter((pg: any) => pg.userId === userId);
  },

  async getAllPages() {
    const p = await getDbPool();
    if (isConnected && p) {
      try {
        const [rows]: any = await p.query('SELECT data FROM pages ORDER BY updated_at DESC');
        return rows.map((r: any) => JSON.parse(r.data));
      } catch (e) {
        console.warn('[MySQL] getAllPages fallback:', e);
      }
    }
    return Object.values(localStore.pages);
  },

  async getPageBySlug(slug: string) {
    const p = await getDbPool();
    if (isConnected && p) {
      try {
        const [rows]: any = await p.query('SELECT data FROM pages WHERE slug = ? LIMIT 1', [slug]);
        if (rows.length > 0) return JSON.parse(rows[0].data);
      } catch (e) {
        console.warn('[MySQL] getPageBySlug fallback:', e);
      }
    }
    return Object.values(localStore.pages).find((pg: any) => pg.slug === slug) || null;
  },

  async savePage(page: any) {
    localStore.pages[page.id] = page;
    persistLocalStore();

    const p = await getDbPool();
    if (isConnected && p) {
      try {
        await p.query(
          'INSERT INTO pages (id, user_id, slug, data, views) VALUES (?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE user_id = VALUES(user_id), slug = VALUES(slug), data = VALUES(data)',
          [page.id, page.userId, page.slug, JSON.stringify(page), page.views || 0]
        );
      } catch (e) {
        console.warn('[MySQL] savePage error:', e);
      }
    }
  },

  async deletePage(pageId: string) {
    delete localStore.pages[pageId];
    persistLocalStore();

    const p = await getDbPool();
    if (isConnected && p) {
      try {
        await p.query('DELETE FROM pages WHERE id = ?', [pageId]);
      } catch (e) {
        console.warn('[MySQL] deletePage error:', e);
      }
    }
  },

  // Analytics
  async getPageAnalytics(pageId: string) {
    const p = await getDbPool();
    if (isConnected && p) {
      try {
        const [rows]: any = await p.query('SELECT data FROM analytics WHERE page_id = ? LIMIT 1', [pageId]);
        if (rows.length > 0) return JSON.parse(rows[0].data);
      } catch (e) {
        console.warn('[MySQL] getPageAnalytics fallback:', e);
      }
    }
    return localStore.analytics[pageId] || null;
  },

  async savePageAnalytics(pageId: string, analytics: any) {
    localStore.analytics[pageId] = analytics;
    persistLocalStore();

    const p = await getDbPool();
    if (isConnected && p) {
      try {
        await p.query(
          'INSERT INTO analytics (page_id, data) VALUES (?, ?) ON DUPLICATE KEY UPDATE data = VALUES(data)',
          [pageId, JSON.stringify(analytics)]
        );
      } catch (e) {
        console.warn('[MySQL] savePageAnalytics error:', e);
      }
    }
  },

  async incrementPageView(pageId: string) {
    const page = localStore.pages[pageId];
    if (page) {
      page.views = (page.views || 0) + 1;
      persistLocalStore();
    }

    const p = await getDbPool();
    if (isConnected && p) {
      try {
        await p.query('UPDATE pages SET views = views + 1 WHERE id = ?', [pageId]);
      } catch (e) {}
    }
  },

  // Short Links
  async getUserShortLinks(userId: string) {
    const p = await getDbPool();
    if (isConnected && p) {
      try {
        const [rows]: any = await p.query('SELECT data FROM short_links WHERE user_id = ? ORDER BY created_at DESC', [userId]);
        return rows.map((r: any) => JSON.parse(r.data));
      } catch (e) {
        console.warn('[MySQL] getUserShortLinks fallback:', e);
      }
    }
    return Object.values(localStore.shortLinks).filter((l: any) => l.userId === userId);
  },

  async getShortLinkByCode(shortCode: string) {
    const p = await getDbPool();
    if (isConnected && p) {
      try {
        const [rows]: any = await p.query('SELECT data FROM short_links WHERE short_code = ? LIMIT 1', [shortCode]);
        if (rows.length > 0) return JSON.parse(rows[0].data);
      } catch (e) {
        console.warn('[MySQL] getShortLinkByCode fallback:', e);
      }
    }
    return Object.values(localStore.shortLinks).find((l: any) => l.shortCode === shortCode) || null;
  },

  async saveShortLink(link: any) {
    localStore.shortLinks[link.id] = link;
    persistLocalStore();

    const p = await getDbPool();
    if (isConnected && p) {
      try {
        await p.query(
          'INSERT INTO short_links (id, user_id, short_code, title, original_url, clicks, data) VALUES (?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE title = VALUES(title), original_url = VALUES(original_url), data = VALUES(data), clicks = VALUES(clicks)',
          [link.id, link.userId, link.shortCode, link.title || '', link.targetUrl || link.originalUrl || '', link.clicks || 0, JSON.stringify(link)]
        );
      } catch (e) {
        console.warn('[MySQL] saveShortLink error:', e);
      }
    }
  },

  async deleteShortLink(id: string) {
    delete localStore.shortLinks[id];
    persistLocalStore();

    const p = await getDbPool();
    if (isConnected && p) {
      try {
        await p.query('DELETE FROM short_links WHERE id = ?', [id]);
      } catch (e) {
        console.warn('[MySQL] deleteShortLink error:', e);
      }
    }
  },

  async incrementShortLinkClick(id: string) {
    const link = localStore.shortLinks[id];
    if (link) {
      link.clicks = (link.clicks || 0) + 1;
      persistLocalStore();
    }

    const p = await getDbPool();
    if (isConnected && p) {
      try {
        await p.query('UPDATE short_links SET clicks = clicks + 1 WHERE id = ?', [id]);
      } catch (e) {}
    }
  },

  // Subscribers
  async getPageSubscribers(pageId: string) {
    const p = await getDbPool();
    if (isConnected && p) {
      try {
        const [rows]: any = await p.query('SELECT id, page_id as pageId, email, subscribed_at as subscribedAt FROM subscribers WHERE page_id = ? ORDER BY subscribed_at DESC', [pageId]);
        return rows;
      } catch (e) {
        console.warn('[MySQL] getPageSubscribers fallback:', e);
      }
    }
    return localStore.subscribers.filter(s => s.pageId === pageId);
  },

  async addSubscriber(sub: { id: string; pageId: string; email: string; subscribedAt: string }) {
    localStore.subscribers.push(sub);
    persistLocalStore();

    const p = await getDbPool();
    if (isConnected && p) {
      try {
        await p.query('INSERT INTO subscribers (id, page_id, email, subscribed_at) VALUES (?, ?, ?, ?)', [
          sub.id,
          sub.pageId,
          sub.email,
          new Date(sub.subscribedAt)
        ]);
      } catch (e) {
        console.warn('[MySQL] addSubscriber error:', e);
      }
    }
  },

  // Banners
  async getAllBanners() {
    const p = await getDbPool();
    if (isConnected && p) {
      try {
        const [rows]: any = await p.query('SELECT data FROM banners ORDER BY created_at DESC');
        const list = rows.map((r: any) => JSON.parse(r.data));
        if (list.length > 0) return list;
      } catch (e) {
        console.warn('[MySQL] getAllBanners fallback:', e);
      }
    }
    const localList = Object.values(localStore.banners);
    if (localList.length > 0) return localList;
    return DEFAULT_BANNERS;
  },

  async saveBanner(banner: any) {
    localStore.banners[banner.id] = banner;
    persistLocalStore();

    const p = await getDbPool();
    if (isConnected && p) {
      try {
        await p.query(
          'INSERT INTO banners (id, data) VALUES (?, ?) ON DUPLICATE KEY UPDATE data = VALUES(data)',
          [banner.id, JSON.stringify(banner)]
        );
      } catch (e) {
        console.warn('[MySQL] saveBanner error:', e);
      }
    }
  },

  async deleteBanner(id: string) {
    delete localStore.banners[id];
    persistLocalStore();

    const p = await getDbPool();
    if (isConnected && p) {
      try {
        await p.query('DELETE FROM banners WHERE id = ?', [id]);
      } catch (e) {
        console.warn('[MySQL] deleteBanner error:', e);
      }
    }
  }
};
