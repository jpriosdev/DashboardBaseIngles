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
    // Intentar cargar desde el JSON generado desde SQLite primero (más confiable)
    const jsonPath = getJsonPath();
    const jsonData = loadJsonFile(jsonPath);
    if (jsonData && jsonData.metadata && jsonData.sprintData) {
      // If bugs array is missing, try to extract tag lists from CSV source as a best-effort
      try {
        if ((!jsonData.bugs || jsonData.bugs.length === 0)) {
          const csvPath1 = path.join(process.cwd(), 'data', 'MockDataV0_translated.csv');
          const csvPath2 = path.join(process.cwd(), 'data', 'MockDataV0.csv');
          const csvPath = fs.existsSync(csvPath1) ? csvPath1 : (fs.existsSync(csvPath2) ? csvPath2 : null);
          if (csvPath) {
            const csvRaw = fs.readFileSync(csvPath, 'utf8');
            const lines = csvRaw.split(/\r?\n/).filter(Boolean);
            const header = lines[0].split(/,|;|\t/).map(h => h.trim());
            const tagCols = [];
            header.forEach((h, idx) => {
              const lower = h.toLowerCase();
              if (lower.startsWith('tag') || lower.includes('tag')) tagCols.push(idx);
            });
              const tagSet = new Set();
              const envSet = new Set();
              const strategySet = new Set();
              const fixVersionSet = new Set();
              const statusSet = new Set();
              if (tagCols.length > 0) {
                // also detect other useful columns by header names
                const envCols = [];
                const stratCols = [];
                const fixCols = [];
                const statusCols = [];
                header.forEach((h, idx) => {
                  const lower = h.toLowerCase();
                  if (lower.includes('ambiente') || lower.includes('environment')) envCols.push(idx);
                  if (lower.includes('estrateg') || lower.includes('strategy')) stratCols.push(idx);
                  if (lower.includes('version') || lower.includes('fix') || lower.includes('version de correccion') || lower.includes('version de corrección')) fixCols.push(idx);
                  if (lower.includes('estado') || lower.includes('status')) statusCols.push(idx);
                });

                for (let i = 1; i < lines.length; i++) {
                  const cols = lines[i].split(/,|;|\t/).map(c => c.trim());
                  tagCols.forEach(ci => {
                    const v = cols[ci];
                    if (v) v.split(/[;,|]/).map(x=>x.trim()).filter(Boolean).forEach(t=>tagSet.add(t));
                  });
                  envCols.forEach(ci => {
                    const v = cols[ci];
                    if (v) v.split(/[;,|]/).map(x=>x.trim()).filter(Boolean).forEach(t=>envSet.add(t));
                  });
                  stratCols.forEach(ci => {
                    const v = cols[ci];
                    if (v) v.split(/[;,|]/).map(x=>x.trim()).filter(Boolean).forEach(t=>strategySet.add(t));
                  });
                  fixCols.forEach(ci => {
                    const v = cols[ci];
                    if (v) v.split(/[;,|]/).map(x=>x.trim()).filter(Boolean).forEach(t=>fixVersionSet.add(t));
                  });
                  statusCols.forEach(ci => {
                    const v = cols[ci];
                    if (v) v.split(/[;,|]/).map(x=>x.trim()).filter(Boolean).forEach(t=>statusSet.add(t));
                  });
                }
              }
              if (tagSet.size > 0) jsonData._tagList = Array.from(tagSet).sort((a,b)=>a.localeCompare(b));
              if (envSet.size > 0) jsonData._environmentList = Array.from(envSet).sort((a,b)=>a.localeCompare(b));
              if (strategySet.size > 0) jsonData._strategyList = Array.from(strategySet).sort((a,b)=>a.localeCompare(b));
              if (fixVersionSet.size > 0) jsonData._fixVersionList = Array.from(fixVersionSet).sort((a,b)=>a.localeCompare(b));
              if (statusSet.size > 0) jsonData._statusList = Array.from(statusSet).sort((a,b)=>a.localeCompare(b));
          }
        }
      } catch (e) {
        // best-effort only
      }
      cache.payload = {
        ...jsonData,
        _dataSource: 'json-from-sqlite',
        _isRealData: true,
        _timestamp: now,
      };
      cache.timestamp = now;
      return cache.payload;
    }
    
    // Fallback: intentar cargar desde SQLite directamente si el JSON falla
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
