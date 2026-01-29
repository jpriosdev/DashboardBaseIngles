import fs from 'fs';
import path from 'path';
import { JSON_PATH, PUBLIC_JSON_PATH } from './config.js';

const CACHE_DURATION_MS = 5 * 60 * 1000; // Cache results for 5 minutes
const cache = { timestamp: 0, payload: null };

function getJsonPath() {
  // Intentar primero la ruta pública (generada en build)
  if (fs.existsSync(PUBLIC_JSON_PATH)) {
    return PUBLIC_JSON_PATH;
  }
  // Fallback a la ruta data/
  return JSON_PATH;
}

function getExcelPath() {
  // Ya no se usa Excel como fuente principal
  return null;
}

function createFallbackData() {
  // Fallback mínimo y seguro
  return {
    metadata: {
      version: 'fallback-minimal',
      source: 'none',
      lastUpdated: new Date().toISOString(),
    },
    summary: {
      totalBugs: 0,
      bugsClosed: 0,
      bugsPending: 0,
      testCasesTotal: 0,
      testCasesExecuted: 0,
      testCasesPassed: 0,
      testCasesFailed: 0,
    },
    bugsByPriority: {},
    bugsByModule: {},
    developerData: [],
    sprintData: [],
    bugsByCategory: {},
    qualityMetrics: {},
    _warning: 'Database not available; returning minimal safe payload.'
  };
}

function loadJsonFile(jsonPath) {
  if (!fs.existsSync(jsonPath)) {
    return null;
  }
  const payload = fs.readFileSync(jsonPath, 'utf-8');
  return JSON.parse(payload);
}

async function loadExcelFile(excelPath) {
  // Ya no se usa Excel como fuente principal
  throw new Error('Excel file loading is deprecated. Use SQLite as the data source.');
}

export async function getQAData({ forceReload = false } = {}) {
  const now = Date.now();
  if (!forceReload && cache.payload && now - cache.timestamp < CACHE_DURATION_MS) {
    return { ...cache.payload, _cached: true };
  }

  try {
    // Ruta actualizada para Vercel
    const dbPath = path.resolve(process.cwd(), 'public/data/qa-dashboard.db');
    const jsonPath = path.resolve(process.cwd(), 'public/data/qa-data.json');

    if (!fs.existsSync(dbPath)) {
      throw new Error(`SQLite database not found at ${dbPath}`);
    }

    if (!fs.existsSync(jsonPath)) {
      throw new Error(`JSON data file not found at ${jsonPath}`);
    }

    // Primary data source: load directly from SQLite via DAL
    const imported = await import('./database/dal.js');
    const DAL = imported.default || imported.DAL;
    if (!DAL) throw new Error('DAL not found');
    const qaData = await DAL.getFullQAData();
    cache.payload = {
      ...qaData,
      _dataSource: 'sqlite',
      _isRealData: true,
      _timestamp: now,
    };
    cache.timestamp = now;
    return cache.payload;
  } catch (error) {
    console.warn('⚠️ Falling back to minimal data. Error:', error.message);
    cache.payload = {
      ...createFallbackData(),
      _dataSource: 'fallback',
      _isRealData: false,
      _timestamp: now,
      _error: error.message,
    };
    cache.timestamp = now;
    return cache.payload;
  }
}

export function clearQADataCache() {
  cache.payload = null;
  cache.timestamp = 0;
}
