import { 
  oracleDb, 
  getOracleStatus, 
  initOracleDatabase, 
  testOracleConnection, 
  updateOracleConfig, 
  extractWalletZip, 
  startPerennialOracleConnection,
  flushLocalStoreToOracle,
  OracleConfig 
} from './oracle.ts';
import fs from 'fs';
import path from 'path';

export type DatabaseEngine = 'oracle';

const SETTINGS_PATH = path.resolve(process.cwd(), 'database-settings.json');

// Ensure database-settings.json always marks oracle as the sole engine
try {
  fs.writeFileSync(SETTINGS_PATH, JSON.stringify({ activeEngine: 'oracle', exclusive: true }, null, 2));
} catch (e) {}

export function getActiveEngine(): DatabaseEngine {
  return 'oracle';
}

export function setActiveEngine(_engine?: string): DatabaseEngine {
  return 'oracle';
}

export async function initActiveDatabase() {
  console.log('[DB Hub] Oracle Autonomous Database is the sole active database engine with perennial connection.');
  startPerennialOracleConnection();
  return await initOracleDatabase();
}

export async function getFullDatabaseStatus() {
  const oracleStat = getOracleStatus();
  return {
    activeEngine: 'oracle' as const,
    isSingleEngine: true,
    engineName: 'Oracle Autonomous Database',
    oracle: oracleStat,
    isCurrentConnected: oracleStat.isConnected
  };
}

export async function syncDataToOracle() {
  await flushLocalStoreToOracle();
  return { success: true, message: 'Dati sincronizzati con successo su Oracle Autonomous Database.' };
}

// Unified Data Access Interface — directly powered by Oracle Database
export const unifiedDb = oracleDb;

