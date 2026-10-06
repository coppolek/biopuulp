import oracledb from 'oracledb';
import fs from 'fs';
import path from 'path';
import tls from 'tls';
import AdmZip from 'adm-zip';

// Configure oracledb thin mode defaults
oracledb.outFormat = oracledb.OUT_FORMAT_OBJECT;
oracledb.autoCommit = true;
try {
  oracledb.fetchAsString = [oracledb.CLOB];
} catch (e) {}

const WALLET_DIR = path.resolve(process.cwd(), 'oracle-wallet');
const ORACLE_SETTINGS_PATH = path.resolve(process.cwd(), 'oracle-settings.json');

export interface OracleConfig {
  user: string;
  password?: string;
  connectString?: string;
  host?: string;
  port?: number;
  serviceName?: string;
  protocol?: 'tcps' | 'tcp';
  walletLocation?: string;
  walletPassword?: string;
  useWallet?: boolean;
}

let activeConfig: OracleConfig = {
  user: process.env.ORACLE_USER || 'ADMIN',
  password: process.env.ORACLE_PASSWORD || '',
  host: process.env.ORACLE_HOST || 'adb.eu-turin-1.oraclecloud.com',
  port: Number(process.env.ORACLE_PORT) || 1522,
  serviceName: process.env.ORACLE_SERVICE_NAME || 'g4baf80d64d08cb_gshvtnzld55j0j8l_tp.adb.oraclecloud.com',
  connectString: process.env.ORACLE_CONNECT_STRING || '',
  protocol: 'tcps',
  walletLocation: fs.existsSync(WALLET_DIR) ? WALLET_DIR : '',
  walletPassword: process.env.ORACLE_WALLET_PASSWORD || '',
  useWallet: false
};

// Auto-load persisted Oracle settings
try {
  if (fs.existsSync(ORACLE_SETTINGS_PATH)) {
    const saved = JSON.parse(fs.readFileSync(ORACLE_SETTINGS_PATH, 'utf8'));
    activeConfig = {
      ...activeConfig,
      ...saved,
      walletLocation: fs.existsSync(WALLET_DIR) ? WALLET_DIR : (saved.walletLocation || '')
    };
  }
} catch (e) {
  console.warn('[Oracle] Could not read oracle-settings.json:', e);
}

function persistOracleConfig() {
  try {
    fs.writeFileSync(ORACLE_SETTINGS_PATH, JSON.stringify({
      user: activeConfig.user,
      password: activeConfig.password,
      host: activeConfig.host,
      port: activeConfig.port,
      serviceName: activeConfig.serviceName,
      connectString: activeConfig.connectString,
      walletPassword: activeConfig.walletPassword,
      useWallet: activeConfig.useWallet
    }, null, 2));
  } catch (e) {
    console.warn('[Oracle] Could not write oracle-settings.json:', e);
  }
}

// Perennial Local Sync Store for Oracle
const ORACLE_STORAGE_PATH = path.resolve(process.cwd(), 'oracle-storage.json');
const SHARED_STORAGE_PATH = path.resolve(process.cwd(), 'data-storage.json');

interface OracleLocalStore {
  pages: Record<string, any>;
  shortLinks: Record<string, any>;
  subscribers: any[];
  banners: Record<string, any>;
  analytics: Record<string, any>;
  users: Record<string, any>;
}

let oracleLocalStore: OracleLocalStore = {
  pages: {},
  shortLinks: {},
  subscribers: [],
  banners: {},
  analytics: {},
  users: {}
};

try {
  if (fs.existsSync(ORACLE_STORAGE_PATH)) {
    oracleLocalStore = JSON.parse(fs.readFileSync(ORACLE_STORAGE_PATH, 'utf8'));
  } else if (fs.existsSync(SHARED_STORAGE_PATH)) {
    oracleLocalStore = JSON.parse(fs.readFileSync(SHARED_STORAGE_PATH, 'utf8'));
    fs.writeFileSync(ORACLE_STORAGE_PATH, JSON.stringify(oracleLocalStore, null, 2));
  }
} catch (e) {
  console.warn('[Oracle] Local store load note:', e);
}

function persistOracleLocalStore() {
  try {
    fs.writeFileSync(ORACLE_STORAGE_PATH, JSON.stringify(oracleLocalStore, null, 2));
    // Also keep data-storage.json in sync
    fs.writeFileSync(SHARED_STORAGE_PATH, JSON.stringify(oracleLocalStore, null, 2));
  } catch (e) {}
}

let pool: oracledb.Pool | null = null;
let isConnected = false;
let lastError: string | null = null;
let serverBanner: string | null = null;
let availableServices: string[] = [];
let tnsEntries: Record<string, string> = {};

export function verifyWalletPassword(walletDir: string, password?: string): boolean {
  if (!password) return false;
  try {
    const p12Path = path.join(walletDir, 'ewallet.p12');
    if (!fs.existsSync(p12Path)) return false;
    const p12 = fs.readFileSync(p12Path);
    tls.createSecureContext({ pfx: p12, passphrase: password });
    return true;
  } catch (e) {
    return false;
  }
}

export function getEffectiveWallet(cfg: OracleConfig): { useWallet: boolean; password?: string; location?: string; error?: string } {
  const dir = cfg.walletLocation || WALLET_DIR;
  if (!cfg.useWallet || !fs.existsSync(dir)) {
    return { useWallet: false };
  }

  // 1. Try explicit wallet password
  if (cfg.walletPassword && verifyWalletPassword(dir, cfg.walletPassword)) {
    return { useWallet: true, location: dir, password: cfg.walletPassword };
  }

  // 2. Try database password as wallet password fallback
  if (cfg.password && verifyWalletPassword(dir, cfg.password)) {
    return { useWallet: true, location: dir, password: cfg.password };
  }

  // 3. Password invalid or missing
  return {
    useWallet: false,
    error: 'Password del Wallet non valida: inserisci la password impostata durante il download del file zip (Wallet_GSHVTNZLD55J0J8L.zip) da Oracle Cloud.'
  };
}

function formatOracleError(err: any): string {
  const msg = err?.message || String(err);
  if (msg.includes('bad decrypt') || msg.includes('1C800064') || msg.includes('mac verify failure')) {
    return 'Password del Wallet non corretta: la password per decifrare il file ewallet.p12 non corrisponde. Inserisci la password scelta su Oracle Cloud al momento del download del wallet.';
  }
  if (msg.includes('NJS-518') || msg.includes('ORA-12514')) {
    return 'Nome Servizio non trovato o errato su Oracle Cloud. Per risolvere: in Oracle Cloud clicca "Connessione al database", copia la "Stringa di connessione" completa (TNS) e incollala nell\'apposito campo, oppure scarica il Wallet .zip.';
  }
  if (msg.includes('ORA-01017')) {
    return 'Credenziali non valide (ORA-01017: invalid username/password). Inserisci la password impostata alla creazione del database su Oracle Cloud.';
  }
  if (msg.includes('NJS-511') || msg.includes('NJS-516') || msg.includes('NJS-517') || msg.includes('ORA-29007') || msg.includes('ORA-12506')) {
    return 'Autenticazione TLS/mTLS: Questo database richiede il Wallet. Clicca su "Carica Wallet Zip" e carica il file Wallet_GSHVTNZLD55J0J8L.zip scaricato da Oracle Cloud.';
  }
  return msg;
}

// Check if tnsnames.ora exists in wallet and read available services
function scanWalletServices() {
  if (fs.existsSync(WALLET_DIR)) {
    const tnsPath = path.join(WALLET_DIR, 'tnsnames.ora');
    if (fs.existsSync(tnsPath)) {
      try {
        const content = fs.readFileSync(tnsPath, 'utf8');
        const matches = content.match(/^([a-zA-Z0-9_-]+)\s*=/gm);
        if (matches) {
          availableServices = matches.map(m => m.replace('=', '').trim());
        }

        // Parse individual service descriptors
        tnsEntries = {};
        const blocks = content.split(/\n(?=[a-zA-Z0-9_-]+\s*=)/);
        for (const b of blocks) {
          const m = b.match(/^([a-zA-Z0-9_-]+)\s*=\s*([\s\S]+)$/);
          if (m) {
            tnsEntries[m[1].trim()] = m[2].trim();
          }
        }
      } catch (e) {
        console.warn('[Oracle] Could not parse tnsnames.ora:', e);
      }
    }
  }
}
scanWalletServices();

function buildConnectString(cfg: OracleConfig, isTest = false): string {
  if (cfg.connectString && cfg.connectString.trim()) {
    let cs = cfg.connectString.trim();
    if (isTest) {
      cs = cs.replace(/retry_count=\d+/g, 'retry_count=1').replace(/retry_delay=\d+/g, 'retry_delay=1');
    }
    return cs;
  }

  // If service matches one in tnsnames.ora
  if (cfg.serviceName && tnsEntries[cfg.serviceName]) {
    let cs = tnsEntries[cfg.serviceName];
    if (isTest) {
      cs = cs.replace(/retry_count=\d+/g, 'retry_count=1').replace(/retry_delay=\d+/g, 'retry_delay=1');
    }
    return cs;
  }

  const host = cfg.host || 'adb.eu-turin-1.oraclecloud.com';
  const port = cfg.port || 1522;
  let service = cfg.serviceName || 'g4baf80d64d08cb_gshvtnzld55j0j8l_tp.adb.oraclecloud.com';
  
  // Ensure the tenant prefix is always present for Autonomous Database in eu-turin-1
  if (service.includes('gshvtnzld55j0j8l') && !service.startsWith('g4baf80d64d08cb_')) {
    service = `g4baf80d64d08cb_${service}`;
  }

  const retries = isTest ? 1 : 2;

  // Easy Connect Plus with TCPS
  return `(description=(retry_count=${retries})(retry_delay=1)(address=(protocol=tcps)(port=${port})(host=${host}))(connect_data=(service_name=${service}))(security=(ssl_server_dn_match=yes)))`;
}

export async function getOraclePool(): Promise<oracledb.Pool | null> {
  if (!activeConfig.password || !activeConfig.password.trim() || !activeConfig.user) {
    return null;
  }

  if (!pool) {
    try {
      const connStr = buildConnectString(activeConfig);
      const poolAttrs: oracledb.PoolAttributes = {
        user: activeConfig.user,
        password: activeConfig.password,
        connectString: connStr,
        poolMin: 1,
        poolMax: 5,
        poolIncrement: 1,
        poolTimeout: 60
      };

      const walletInfo = getEffectiveWallet(activeConfig);
      if (walletInfo.useWallet && walletInfo.location) {
        poolAttrs.walletLocation = walletInfo.location;
        if (walletInfo.password) {
          poolAttrs.walletPassword = walletInfo.password;
        }
      }

      pool = await oracledb.createPool(poolAttrs);
    } catch (err: any) {
      console.warn('[Oracle] Could not create connection pool:', err?.message || err);
      return null;
    }
  }
  return pool;
}

async function createTableSafe(conn: oracledb.Connection, sql: string) {
  try {
    await conn.execute(sql);
  } catch (err: any) {
    // ORA-00955: name is already used by an existing object (benign)
    if (err?.errorNum === 955 || (err?.message && err.message.includes('ORA-00955'))) {
      return;
    }
    console.warn('[Oracle] Table creation note:', err?.message);
  }
}

export async function initOracleDatabase(): Promise<boolean> {
  try {
    if (!activeConfig.password) {
      lastError = 'Password Oracle non configurata';
      isConnected = false;
      return false;
    }

    const p = await getOraclePool();
    if (!p) return false;

    const conn = await p.getConnection();
    const result: any = await conn.execute(`SELECT banner FROM v$version WHERE ROWNUM = 1`);
    if (result.rows && result.rows[0]) {
      serverBanner = result.rows[0].BANNER || Object.values(result.rows[0])[0];
    }
    console.log('[Oracle] Successfully connected to Oracle Database! (Banner:', serverBanner, ')');
    isConnected = true;
    lastError = null;

    // Create Tables if not exist
    await createTableSafe(conn, `
      CREATE TABLE pages (
        id VARCHAR2(255) PRIMARY KEY,
        user_id VARCHAR2(255) NOT NULL,
        slug VARCHAR2(255) NOT NULL,
        data CLOB NOT NULL,
        views NUMBER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT uq_pages_slug UNIQUE (slug)
      )
    `);

    await createTableSafe(conn, `
      CREATE TABLE short_links (
        id VARCHAR2(255) PRIMARY KEY,
        user_id VARCHAR2(255) NOT NULL,
        short_code VARCHAR2(255) NOT NULL,
        title VARCHAR2(255),
        original_url CLOB,
        clicks NUMBER DEFAULT 0,
        data CLOB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT uq_short_code UNIQUE (short_code)
      )
    `);

    await createTableSafe(conn, `
      CREATE TABLE subscribers (
        id VARCHAR2(255) PRIMARY KEY,
        page_id VARCHAR2(255) NOT NULL,
        email VARCHAR2(255) NOT NULL,
        subscribed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await createTableSafe(conn, `
      CREATE TABLE banners (
        id VARCHAR2(255) PRIMARY KEY,
        data CLOB NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await createTableSafe(conn, `
      CREATE TABLE analytics (
        page_id VARCHAR2(255) PRIMARY KEY,
        data CLOB NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await createTableSafe(conn, `
      CREATE TABLE users (
        id VARCHAR2(255) PRIMARY KEY,
        email VARCHAR2(255) NOT NULL,
        password_hash VARCHAR2(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT uq_users_email UNIQUE (email)
      )
    `);

    await conn.close();
    console.log('[Oracle] Tables verified and ready in Oracle Autonomous Database');
    return true;
  } catch (err: any) {
    isConnected = false;
    lastError = formatOracleError(err);
    console.warn('[Oracle] Connection standby notice:', lastError);
    return false;
  }
}

export function getOracleStatus() {
  scanWalletServices();
  return {
    isConnected,
    lastError,
    banner: serverBanner,
    config: {
      user: activeConfig.user,
      host: activeConfig.host,
      port: activeConfig.port,
      serviceName: activeConfig.serviceName,
      connectString: activeConfig.connectString,
      hasPassword: !!activeConfig.password,
      useWallet: !!activeConfig.useWallet,
      hasWalletFiles: fs.existsSync(WALLET_DIR) && fs.readdirSync(WALLET_DIR).length > 0,
      availableServices
    }
  };
}

export async function testOracleConnection(config: OracleConfig) {
  const start = Date.now();
  let tempConn: oracledb.Connection | null = null;
  try {
    const connStr = buildConnectString(config, true);
    const connAttrs: oracledb.ConnectionAttributes = {
      user: config.user,
      password: config.password,
      connectString: connStr
    };

    if (config.useWallet) {
      const walletInfo = getEffectiveWallet(config);
      if (walletInfo.error) {
        return {
          success: false,
          message: walletInfo.error,
          code: 'WALLET_PASSWORD_INVALID',
          latencyMs: Date.now() - start
        };
      }
      if (walletInfo.useWallet && walletInfo.location) {
        connAttrs.walletLocation = walletInfo.location;
        if (walletInfo.password) {
          connAttrs.walletPassword = walletInfo.password;
        }
      }
    }

    const connectPromise = oracledb.getConnection(connAttrs);
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Timeout di connessione ad Oracle (8 secondi). Verifica che la porta 1522 o il nome servizio siano corretti.')), 8000)
    );

    tempConn = (await Promise.race([connectPromise, timeoutPromise])) as oracledb.Connection;
    const res: any = await tempConn.execute(`SELECT banner FROM v$version WHERE ROWNUM = 1`);
    const banner = res.rows?.[0]?.BANNER || (res.rows?.[0] ? Object.values(res.rows[0])[0] : 'Oracle Database 19c');
    const latency = Date.now() - start;

    await tempConn.close();
    return {
      success: true,
      message: `Connessione riuscita a Oracle Autonomous Database!`,
      version: banner,
      latencyMs: latency
    };
  } catch (err: any) {
    if (tempConn) {
      try { await tempConn.close(); } catch (e) {}
    }
    const friendlyMsg = formatOracleError(err);
    return {
      success: false,
      message: friendlyMsg,
      rawError: err?.message || String(err),
      code: err?.errorNum || err?.code || 'UNKNOWN',
      latencyMs: Date.now() - start
    };
  }
}

export async function updateOracleConfig(newConfig: OracleConfig) {
  activeConfig = {
    ...activeConfig,
    user: (newConfig.user || 'ADMIN').trim(),
    password: newConfig.password !== undefined && newConfig.password !== '' ? newConfig.password : activeConfig.password,
    host: (newConfig.host || 'adb.eu-turin-1.oraclecloud.com').trim(),
    port: Number(newConfig.port) || 1522,
    serviceName: (newConfig.serviceName || 'gshvtnzld55j0j8l_tp.adb.oraclecloud.com').trim(),
    connectString: (newConfig.connectString || '').trim(),
    walletLocation: newConfig.walletLocation || activeConfig.walletLocation,
    walletPassword: newConfig.walletPassword !== undefined ? newConfig.walletPassword : activeConfig.walletPassword,
    useWallet: newConfig.useWallet !== undefined ? newConfig.useWallet : activeConfig.useWallet
  };

  persistOracleConfig();

  // Close old pool
  if (pool) {
    try {
      await pool.close(10);
    } catch (e) {}
    pool = null;
  }

  const success = await initOracleDatabase();
  return {
    success,
    status: getOracleStatus()
  };
}

export async function extractWalletZip(zipBuffer: Buffer, walletPassword?: string) {
  try {
    if (!fs.existsSync(WALLET_DIR)) {
      fs.mkdirSync(WALLET_DIR, { recursive: true });
    }

    const zip = new AdmZip(zipBuffer);
    zip.extractAllTo(WALLET_DIR, true);

    activeConfig.walletLocation = WALLET_DIR;
    activeConfig.useWallet = true;
    if (walletPassword) {
      activeConfig.walletPassword = walletPassword;
    }

    scanWalletServices();
    return {
      success: true,
      extractedPath: WALLET_DIR,
      files: fs.readdirSync(WALLET_DIR),
      services: availableServices
    };
  } catch (err: any) {
    throw new Error('Impossibile estrarre il file zip del wallet: ' + err.message);
  }
}

const DEFAULT_BANNERS = [
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

if (Object.keys(oracleLocalStore.banners).length === 0) {
  for (const b of DEFAULT_BANNERS) {
    oracleLocalStore.banners[b.id] = b;
  }
  persistOracleLocalStore();
}

// Data Access Layer for Oracle Database
export const oracleDb = {
  async isAvailable() {
    return isConnected;
  },

  // Pages
  async getAllPages(): Promise<any[]> {
    const p = await getOraclePool();
    if (p) {
      try {
        const conn = await p.getConnection();
        try {
          const res: any = await conn.execute(`SELECT data FROM pages ORDER BY updated_at DESC`);
          const pages = (res.rows || []).map((row: any) => JSON.parse(row.DATA || row.data));
          pages.forEach((pg: any) => { oracleLocalStore.pages[pg.id] = pg; });
          persistOracleLocalStore();
          return pages;
        } finally {
          await conn.close();
        }
      } catch (err: any) {
        console.warn('[Oracle] getAllPages remote note:', err?.message || err);
      }
    }
    return Object.values(oracleLocalStore.pages).sort((a: any, b: any) => (b.updatedAt || 0) - (a.updatedAt || 0));
  },

  async getUserPages(userId: string): Promise<any[]> {
    const p = await getOraclePool();
    if (p) {
      try {
        const conn = await p.getConnection();
        try {
          const res: any = await conn.execute(
            `SELECT data FROM pages WHERE user_id = :userId ORDER BY updated_at DESC`,
            [userId]
          );
          const pages = (res.rows || []).map((row: any) => JSON.parse(row.DATA || row.data));
          pages.forEach((pg: any) => { oracleLocalStore.pages[pg.id] = pg; });
          persistOracleLocalStore();
          return pages;
        } finally {
          await conn.close();
        }
      } catch (err: any) {
        console.warn('[Oracle] getUserPages remote note:', err?.message || err);
      }
    }
    return Object.values(oracleLocalStore.pages).filter((pg: any) => pg.userId === userId || (!pg.userId && userId === 'admin'));
  },

  async getPageBySlug(slug: string): Promise<any | null> {
    const cleanSlug = (slug || '').trim().toLowerCase();
    const p = await getOraclePool();
    if (p) {
      try {
        const conn = await p.getConnection();
        try {
          const res: any = await conn.execute(
            `SELECT data FROM pages WHERE LOWER(slug) = LOWER(:slug) AND ROWNUM = 1`,
            [cleanSlug]
          );
          if (res.rows && res.rows.length > 0) {
            const page = JSON.parse(res.rows[0].DATA || res.rows[0].data);
            oracleLocalStore.pages[page.id] = page;
            persistOracleLocalStore();
            return page;
          }
        } finally {
          await conn.close();
        }
      } catch (err: any) {
        console.warn('[Oracle] getPageBySlug remote note:', err?.message || err);
      }
    }
    return Object.values(oracleLocalStore.pages).find((pg: any) => (pg.slug || '').toLowerCase() === cleanSlug) || null;
  },

  async savePage(page: any): Promise<void> {
    oracleLocalStore.pages[page.id] = page;
    persistOracleLocalStore();

    const p = await getOraclePool();
    if (p) {
      try {
        const conn = await p.getConnection();
        try {
          const sql = `
            MERGE INTO pages target
            USING (SELECT :id as id, :user_id as user_id, :slug as slug, :data as data, :views as views FROM DUAL) source
            ON (target.id = source.id)
            WHEN MATCHED THEN
              UPDATE SET target.user_id = source.user_id, target.slug = source.slug, target.data = source.data, target.views = source.views, target.updated_at = CURRENT_TIMESTAMP
            WHEN NOT MATCHED THEN
              INSERT (id, user_id, slug, data, views, created_at, updated_at)
              VALUES (source.id, source.user_id, source.slug, source.data, source.views, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
          `;
          await conn.execute(sql, {
            id: page.id,
            user_id: page.userId || 'admin',
            slug: page.slug,
            data: JSON.stringify(page),
            views: page.views || 0
          });
        } finally {
          await conn.close();
        }
      } catch (err: any) {
        console.warn('[Oracle] savePage remote note:', err?.message || err);
      }
    }
  },

  async deletePage(pageId: string): Promise<void> {
    delete oracleLocalStore.pages[pageId];
    persistOracleLocalStore();

    const p = await getOraclePool();
    if (p) {
      try {
        const conn = await p.getConnection();
        try {
          await conn.execute(`DELETE FROM pages WHERE id = :id`, [pageId]);
        } finally {
          await conn.close();
        }
      } catch (err: any) {
        console.warn('[Oracle] deletePage remote note:', err?.message || err);
      }
    }
  },

  async incrementPageView(pageId: string): Promise<void> {
    if (oracleLocalStore.pages[pageId]) {
      oracleLocalStore.pages[pageId].views = (oracleLocalStore.pages[pageId].views || 0) + 1;
      persistOracleLocalStore();
    }

    const p = await getOraclePool();
    if (p) {
      try {
        const conn = await p.getConnection();
        try {
          await conn.execute(`UPDATE pages SET views = NVL(views, 0) + 1 WHERE id = :id`, [pageId]);
        } finally {
          await conn.close();
        }
      } catch (e) {}
    }
  },

  // Short Links
  async getUserShortLinks(userId: string): Promise<any[]> {
    const p = await getOraclePool();
    if (p) {
      try {
        const conn = await p.getConnection();
        try {
          const res: any = await conn.execute(
            `SELECT data FROM short_links WHERE user_id = :userId ORDER BY created_at DESC`,
            [userId]
          );
          const links = (res.rows || []).map((row: any) => JSON.parse(row.DATA || row.data));
          links.forEach((l: any) => { oracleLocalStore.shortLinks[l.id] = l; });
          persistOracleLocalStore();
          return links;
        } finally {
          await conn.close();
        }
      } catch (err: any) {
        console.warn('[Oracle] getUserShortLinks remote note:', err?.message || err);
      }
    }
    return Object.values(oracleLocalStore.shortLinks).filter((l: any) => l.userId === userId || (!l.userId && userId === 'admin'));
  },

  async getShortLinkByCode(shortCode: string): Promise<any | null> {
    const cleanCode = (shortCode || '').trim();
    const p = await getOraclePool();
    if (p) {
      try {
        const conn = await p.getConnection();
        try {
          const res: any = await conn.execute(
            `SELECT data FROM short_links WHERE short_code = :shortCode AND ROWNUM = 1`,
            [cleanCode]
          );
          if (res.rows && res.rows.length > 0) {
            const link = JSON.parse(res.rows[0].DATA || res.rows[0].data);
            oracleLocalStore.shortLinks[link.id] = link;
            persistOracleLocalStore();
            return link;
          }
        } finally {
          await conn.close();
        }
      } catch (err: any) {
        console.warn('[Oracle] getShortLinkByCode remote note:', err?.message || err);
      }
    }
    return Object.values(oracleLocalStore.shortLinks).find((l: any) => (l.shortCode || '') === cleanCode) || null;
  },

  async saveShortLink(link: any): Promise<void> {
    oracleLocalStore.shortLinks[link.id] = link;
    persistOracleLocalStore();

    const p = await getOraclePool();
    if (p) {
      try {
        const conn = await p.getConnection();
        try {
          const sql = `
            MERGE INTO short_links target
            USING (SELECT :id as id, :user_id as user_id, :short_code as short_code, :title as title, :original_url as original_url, :clicks as clicks, :data as data FROM DUAL) source
            ON (target.id = source.id)
            WHEN MATCHED THEN
              UPDATE SET target.title = source.title, target.original_url = source.original_url, target.clicks = source.clicks, target.data = source.data
            WHEN NOT MATCHED THEN
              INSERT (id, user_id, short_code, title, original_url, clicks, data, created_at)
              VALUES (source.id, source.user_id, source.short_code, source.title, source.original_url, source.clicks, source.data, CURRENT_TIMESTAMP)
          `;
          await conn.execute(sql, {
            id: link.id,
            user_id: link.userId || 'admin',
            short_code: link.shortCode,
            title: link.title || '',
            original_url: link.targetUrl || link.originalUrl || '',
            clicks: link.clicks || 0,
            data: JSON.stringify(link)
          });
        } finally {
          await conn.close();
        }
      } catch (err: any) {
        console.warn('[Oracle] saveShortLink remote note:', err?.message || err);
      }
    }
  },

  async deleteShortLink(id: string): Promise<void> {
    delete oracleLocalStore.shortLinks[id];
    persistOracleLocalStore();

    const p = await getOraclePool();
    if (p) {
      try {
        const conn = await p.getConnection();
        try {
          await conn.execute(`DELETE FROM short_links WHERE id = :id`, [id]);
        } finally {
          await conn.close();
        }
      } catch (err: any) {
        console.warn('[Oracle] deleteShortLink remote note:', err?.message || err);
      }
    }
  },

  async incrementShortLinkClick(id: string): Promise<void> {
    if (oracleLocalStore.shortLinks[id]) {
      oracleLocalStore.shortLinks[id].clicks = (oracleLocalStore.shortLinks[id].clicks || 0) + 1;
      persistOracleLocalStore();
    }

    const p = await getOraclePool();
    if (p) {
      try {
        const conn = await p.getConnection();
        try {
          await conn.execute(`UPDATE short_links SET clicks = NVL(clicks, 0) + 1 WHERE id = :id`, [id]);
        } finally {
          await conn.close();
        }
      } catch (e) {}
    }
  },

  // Subscribers
  async getPageSubscribers(pageId: string): Promise<any[]> {
    const p = await getOraclePool();
    if (p) {
      try {
        const conn = await p.getConnection();
        try {
          const res: any = await conn.execute(
            `SELECT id, page_id as "pageId", email, TO_CHAR(subscribed_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as "subscribedAt" FROM subscribers WHERE page_id = :pageId ORDER BY subscribed_at DESC`,
            [pageId]
          );
          return res.rows || [];
        } finally {
          await conn.close();
        }
      } catch (err: any) {
        console.warn('[Oracle] getPageSubscribers remote note:', err?.message || err);
      }
    }
    return oracleLocalStore.subscribers.filter((s: any) => s.pageId === pageId);
  },

  async addSubscriber(sub: { id: string; pageId: string; email: string; subscribedAt: string }): Promise<void> {
    oracleLocalStore.subscribers.push(sub);
    persistOracleLocalStore();

    const p = await getOraclePool();
    if (p) {
      try {
        const conn = await p.getConnection();
        try {
          await conn.execute(
            `INSERT INTO subscribers (id, page_id, email, subscribed_at) VALUES (:id, :page_id, :email, CURRENT_TIMESTAMP)`,
            { id: sub.id, page_id: sub.pageId, email: sub.email }
          );
        } finally {
          await conn.close();
        }
      } catch (err: any) {
        console.warn('[Oracle] addSubscriber remote note:', err?.message || err);
      }
    }
  },

  // Banners
  async getAllBanners(): Promise<any[]> {
    const p = await getOraclePool();
    if (p) {
      try {
        const conn = await p.getConnection();
        try {
          const res: any = await conn.execute(`SELECT data FROM banners ORDER BY created_at DESC`);
          const list = (res.rows || []).map((row: any) => JSON.parse(row.DATA || row.data));
          if (list.length > 0) {
            list.forEach((b: any) => { oracleLocalStore.banners[b.id] = b; });
            persistOracleLocalStore();
            return list;
          }
        } finally {
          await conn.close();
        }
      } catch (err: any) {
        console.warn('[Oracle] getAllBanners remote note:', err?.message || err);
      }
    }
    const localList = Object.values(oracleLocalStore.banners);
    return localList.length > 0 ? localList : DEFAULT_BANNERS;
  },

  async saveBanner(banner: any): Promise<void> {
    oracleLocalStore.banners[banner.id] = banner;
    persistOracleLocalStore();

    const p = await getOraclePool();
    if (p) {
      try {
        const conn = await p.getConnection();
        try {
          const sql = `
            MERGE INTO banners target
            USING (SELECT :id as id, :data as data FROM DUAL) source
            ON (target.id = source.id)
            WHEN MATCHED THEN
              UPDATE SET target.data = source.data
            WHEN NOT MATCHED THEN
              INSERT (id, data, created_at)
              VALUES (source.id, source.data, CURRENT_TIMESTAMP)
          `;
          await conn.execute(sql, { id: banner.id, data: JSON.stringify(banner) });
        } finally {
          await conn.close();
        }
      } catch (err: any) {
        console.warn('[Oracle] saveBanner remote note:', err?.message || err);
      }
    }
  },

  async deleteBanner(id: string): Promise<void> {
    delete oracleLocalStore.banners[id];
    persistOracleLocalStore();

    const p = await getOraclePool();
    if (p) {
      try {
        const conn = await p.getConnection();
        try {
          await conn.execute(`DELETE FROM banners WHERE id = :id`, [id]);
        } finally {
          await conn.close();
        }
      } catch (err: any) {
        console.warn('[Oracle] deleteBanner remote note:', err?.message || err);
      }
    }
  },

  // Analytics
  async getPageAnalytics(pageId: string): Promise<any | null> {
    const p = await getOraclePool();
    if (p) {
      try {
        const conn = await p.getConnection();
        try {
          const res: any = await conn.execute(
            `SELECT data FROM analytics WHERE page_id = :pageId AND ROWNUM = 1`,
            [pageId]
          );
          if (res.rows && res.rows.length > 0) {
            const an = JSON.parse(res.rows[0].DATA || res.rows[0].data);
            oracleLocalStore.analytics[pageId] = an;
            persistOracleLocalStore();
            return an;
          }
        } finally {
          await conn.close();
        }
      } catch (err: any) {
        console.warn('[Oracle] getPageAnalytics remote note:', err?.message || err);
      }
    }
    return oracleLocalStore.analytics[pageId] || null;
  },

  async savePageAnalytics(pageId: string, analytics: any): Promise<void> {
    oracleLocalStore.analytics[pageId] = analytics;
    persistOracleLocalStore();

    const p = await getOraclePool();
    if (p) {
      try {
        const conn = await p.getConnection();
        try {
          const sql = `
            MERGE INTO analytics target
            USING (SELECT :page_id as page_id, :data as data FROM DUAL) source
            ON (target.page_id = source.page_id)
            WHEN MATCHED THEN
              UPDATE SET target.data = source.data, target.updated_at = CURRENT_TIMESTAMP
            WHEN NOT MATCHED THEN
              INSERT (page_id, data, updated_at)
              VALUES (source.page_id, source.data, CURRENT_TIMESTAMP)
          `;
          await conn.execute(sql, { page_id: pageId, data: JSON.stringify(analytics) });
        } finally {
          await conn.close();
        }
      } catch (err: any) {
        console.warn('[Oracle] savePageAnalytics remote note:', err?.message || err);
      }
    }
  },

  // Users
  async findUserByEmail(email: string): Promise<any | null> {
    if (!email) return null;
    const cleanEmail = email.trim().toLowerCase();

    // Check remote Oracle database if connected
    const p = await getOraclePool();
    if (p) {
      try {
        const conn = await p.getConnection();
        try {
          const res: any = await conn.execute(
            `SELECT id as "id", email as "email", password_hash as "password_hash" FROM users WHERE LOWER(email) = LOWER(:email) AND ROWNUM = 1`,
            [cleanEmail]
          );
          if (res.rows && res.rows.length > 0) {
            const row = res.rows[0];
            const u = {
              id: row.id || row.ID,
              email: (row.email || row.EMAIL || cleanEmail).toLowerCase(),
              password_hash: row.password_hash || row.PASSWORD_HASH
            };
            oracleLocalStore.users[u.id] = u;
            persistOracleLocalStore();
            return u;
          }
        } finally {
          await conn.close();
        }
      } catch (err: any) {
        // NJS-518 / Listener failure handling
        if (err?.message?.includes('NJS-518') || err?.message?.includes('ORA-12514')) {
          if (pool) {
            try { await pool.close(1); } catch (_) {}
            pool = null;
          }
        }
        console.warn('[Oracle] findUserByEmail remote query note:', err?.message || err);
      }
    }

    return Object.values(oracleLocalStore.users).find((u: any) => u.email && u.email.toLowerCase() === cleanEmail) || null;
  },

  async createUser(user: { id: string; email: string; password_hash: string }): Promise<any> {
    const cleanEmail = user.email.trim().toLowerCase();
    const normalizedUser = {
      id: user.id,
      email: cleanEmail,
      password_hash: user.password_hash
    };

    oracleLocalStore.users[normalizedUser.id] = normalizedUser;
    persistOracleLocalStore();

    const p = await getOraclePool();
    if (p) {
      try {
        const conn = await p.getConnection();
        try {
          const sql = `
            MERGE INTO users target
            USING (SELECT :id as id, :email as email, :password_hash as password_hash FROM DUAL) source
            ON (LOWER(target.email) = LOWER(source.email))
            WHEN MATCHED THEN
              UPDATE SET target.password_hash = source.password_hash
            WHEN NOT MATCHED THEN
              INSERT (id, email, password_hash, created_at)
              VALUES (source.id, source.email, source.password_hash, CURRENT_TIMESTAMP)
          `;
          await conn.execute(sql, {
            id: normalizedUser.id,
            email: normalizedUser.email,
            password_hash: normalizedUser.password_hash
          });
        } finally {
          await conn.close();
        }
      } catch (err: any) {
        if (err?.message?.includes('NJS-518') || err?.message?.includes('ORA-12514')) {
          if (pool) {
            try { await pool.close(1); } catch (_) {}
            pool = null;
          }
        }
        console.warn('[Oracle] createUser remote note:', err?.message || err);
      }
    }

    return normalizedUser;
  },

  async updateUserPassword(email: string, password_hash: string): Promise<boolean> {
    const cleanEmail = email.trim().toLowerCase();
    const existing = Object.values(oracleLocalStore.users).find((u: any) => u.email && u.email.toLowerCase() === cleanEmail) as any;
    if (existing) {
      existing.password_hash = password_hash;
      persistOracleLocalStore();
    }

    const p = await getOraclePool();
    if (p) {
      try {
        const conn = await p.getConnection();
        try {
          await conn.execute(
            `UPDATE users SET password_hash = :password_hash WHERE LOWER(email) = LOWER(:email)`,
            { password_hash, email: cleanEmail }
          );
          return true;
        } finally {
          await conn.close();
        }
      } catch (e: any) {
        if (e?.message?.includes('NJS-518') || e?.message?.includes('ORA-12514')) {
          if (pool) {
            try { await pool.close(1); } catch (_) {}
            pool = null;
          }
        }
        console.warn('[Oracle] updateUserPassword remote note:', e?.message || e);
      }
    }
    return true;
  }
};

// Auto-flush local data to Oracle Cloud when connection is active
export async function flushLocalStoreToOracle() {
  const p = await getOraclePool();
  if (!p) return;
  try {
    for (const user of Object.values(oracleLocalStore.users)) {
      try { await oracleDb.createUser(user); } catch (e) {}
    }
    for (const page of Object.values(oracleLocalStore.pages)) {
      try { await oracleDb.savePage(page); } catch (e) {}
    }
    for (const link of Object.values(oracleLocalStore.shortLinks)) {
      try { await oracleDb.saveShortLink(link); } catch (e) {}
    }
    for (const banner of Object.values(oracleLocalStore.banners)) {
      try { await oracleDb.saveBanner(banner); } catch (e) {}
    }
    console.log('[Oracle] Local data synchronized to Oracle Autonomous Database.');
  } catch (err) {
    console.warn('[Oracle] Data flush note:', err);
  }
}

// Background Perennial Connection Loop
let perennialStarted = false;
export function startPerennialOracleConnection() {
  if (perennialStarted) return;
  perennialStarted = true;

  console.log('[Oracle Perennial] Starting persistent connection loop for Oracle Autonomous Database...');

  const tryConnect = async () => {
    if (!activeConfig.password || !activeConfig.password.trim()) {
      return false;
    }
    try {
      const connected = await initOracleDatabase();
      if (connected) {
        console.log('[Oracle Perennial] Connected to Oracle Database. Flushing local records...');
        await flushLocalStoreToOracle();
        return true;
      }
    } catch (e: any) {}
    return false;
  };

  tryConnect().catch(() => {});

  // Continuous perennial heartbeat check
  setInterval(async () => {
    try {
      if (activeConfig.password && activeConfig.password.trim()) {
        const p = await getOraclePool();
        if (p) {
          const conn = await p.getConnection();
          try {
            await conn.execute('SELECT 1 FROM DUAL');
            if (!isConnected) {
              isConnected = true;
              lastError = null;
              console.log('[Oracle Perennial] Connection active & healthy!');
              flushLocalStoreToOracle().catch(() => {});
            }
          } finally {
            await conn.close();
          }
        } else {
          await tryConnect();
        }
      }
    } catch (e: any) {
      isConnected = false;
      if (pool) {
        try { await pool.close(1); } catch (_) {}
        pool = null;
      }
    }
  }, 15000);
}
