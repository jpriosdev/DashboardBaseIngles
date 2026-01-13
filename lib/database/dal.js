/**
 * DAL - Data Access Layer
 * Funciones reutilizables para queries comunes contra SQLite
 */

import sqlite3 from 'sqlite3';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const dbPath = path.join(__dirname, '../../public/data/qa-dashboard.db');

// Crear directorio si no existe
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

// Pool simple de conexión
let db = null;

function getDatabase() {
  if (!db) {
    db = new (sqlite3.verbose().Database)(dbPath, (err) => {
      if (err) {
        console.error('❌ Error conectando a BD:', err);
      }
    });
  }
  return db;
}

// Promisificar queries
function runQuery(sql, params = []) {
  return new Promise((resolve, reject) => {
    getDatabase().all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows || []);
    });
  });
}

function runScalar(sql, params = []) {
  return new Promise((resolve, reject) => {
    getDatabase().get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

// ============================================================================
// QUERIES: RESUMEN GENERAL
// ============================================================================

async function getBugsSummary() {
  return runQuery('SELECT * FROM vw_bugs_summary');
}

async function getTotalBugs() {
  const result = await runScalar('SELECT COUNT(*) as total FROM bugs_detail');
  return result?.total || 0;
}

async function getTotalSprints() {
  const result = await runScalar('SELECT COUNT(*) as total FROM sprints_versions');
  return result?.total || 0;
}

// ============================================================================
// QUERIES: BUGS POR SPRINT
// ============================================================================

async function getBugsBySprint() {
  return runQuery('SELECT * FROM vw_bugs_by_sprint ORDER BY sprint_num');
}

async function getBugsBySprintIncludingSuggestions() {
  // Devolver todos los bugs por sprint SIN excluir sugerencias
  return runQuery(`
    SELECT 
      CAST(SUBSTR(sprint, -2) AS INTEGER) as sprint_num,
      sprint,
      COUNT(*) as total,
      SUM(CASE WHEN prioridad IN ('Más alta', 'Alta') THEN 1 ELSE 0 END) as critical,
      SUM(CASE WHEN estado = 'Tareas por hacer' THEN 1 ELSE 0 END) as pending,
      SUM(CASE WHEN estado = 'Cancelado' THEN 1 ELSE 0 END) as canceled
    FROM bugs_detail
    GROUP BY sprint
    ORDER BY sprint_num
  `);
}

async function getBugsBySprintAndStatus() {
  return runQuery('SELECT * FROM vw_bugs_by_sprint_status ORDER BY sprint');
}

async function getBugsBySprintNumber(sprintNum) {
  return runQuery(
    'SELECT * FROM vw_bugs_by_sprint WHERE sprint_num = ?',
    [sprintNum]
  );
}

async function getCriticalBugsPendingBySprint() {
  return runQuery(`
    SELECT 
      sprint,
      COUNT(*) as critical_pending
    FROM bugs_detail
    WHERE prioridad IN ('Más alta', 'Alta')
      AND estado IN ('Tareas por hacer', 'En progreso', 'Reabierto')
    GROUP BY sprint
    ORDER BY sprint
  `);
}

async function getCriticalBugsBySprintAndState() {
  return runQuery(`
    SELECT 
      sprint,
      SUM(CASE WHEN prioridad IN ('Más alta', 'Alta') AND estado = 'Tareas por hacer' THEN 1 ELSE 0 END) as tareasPorHacer,
      SUM(CASE WHEN prioridad IN ('Más alta', 'Alta') AND estado = 'En progreso' THEN 1 ELSE 0 END) as enProgreso,
      SUM(CASE WHEN prioridad IN ('Más alta', 'Alta') AND estado = 'Reabierto' THEN 1 ELSE 0 END) as reabierto
    FROM bugs_detail
    WHERE prioridad IN ('Más alta', 'Alta')
    GROUP BY sprint
    ORDER BY sprint
  `);
}

// ============================================================================
// QUERIES: DESGLOSE POR MÓDULO POR DESARROLLADOR
// ============================================================================

async function getDeveloperModulesSummary() {
  return runQuery(`
    SELECT 
      asignado_a as developer_name,
      COALESCE(modulo, 'Sin módulo') as modulo,
      COUNT(*) as count,
      SUM(CASE WHEN estado = 'Tareas por hacer' THEN 1 ELSE 0 END) as pending,
      SUM(CASE WHEN estado != 'Tareas por hacer' THEN 1 ELSE 0 END) as resolved
    FROM bugs_detail
    WHERE asignado_a IS NOT NULL AND asignado_a != ''
      AND modulo IS NOT NULL AND modulo != ''
    GROUP BY asignado_a, modulo
    ORDER BY asignado_a, count DESC
  `);
}

// ============================================================================
// QUERIES: BUGS POR DESARROLLADOR
// ============================================================================

async function getBugsByDeveloper() {
  return runQuery('SELECT * FROM vw_bugs_by_developer ORDER BY total_bugs DESC');
}

async function getBugsByDeveloperName(devName) {
  return runQuery(
    'SELECT * FROM vw_bugs_by_developer WHERE developer_name = ?',
    [devName]
  );
}

// ============================================================================
// QUERIES: BUGS POR PRIORIDAD
// ============================================================================

async function getCriticalBugs() {
  return runQuery(
    `SELECT COUNT(*) as count FROM bugs_detail 
     WHERE prioridad IN ('Más alta', 'Alta')`
  );
}

// ============================================================================
// QUERIES: BUGS POR MÓDULO
// ============================================================================

async function getBugsByModule() {
  return runQuery('SELECT * FROM vw_bugs_by_module ORDER BY count DESC');
}

// ============================================================================
// QUERIES: BUGS POR CATEGORÍA
// ============================================================================

async function getBugsByCategory() {
  return runQuery('SELECT * FROM vw_bugs_by_category ORDER BY count DESC');
}

// ============================================================================
// QUERIES: DETALLES ESPECÍFICOS
// ============================================================================

async function getBugDetail(clave) {
  return runScalar(
    'SELECT * FROM bugs_detail WHERE clave_incidencia = ?',
    [clave]
  );
}

async function getBugsByState(estado) {
  return runQuery(
    'SELECT * FROM bugs_detail WHERE estado = ? ORDER BY sprint',
    [estado]
  );
}

async function getBugsByPriority(prioridad) {
  if (prioridad) {
    // Si se pasa un parámetro, devolver detalles de esa prioridad
    return runQuery(
      'SELECT * FROM bugs_detail WHERE prioridad = ? ORDER BY sprint',
      [prioridad]
    );
  } else {
    // Si no se pasa parámetro, devolver resumen desde la vista (excluye sugerencias)
    return runQuery('SELECT * FROM vw_bugs_by_priority ORDER BY prioridad');
  }
}

// ============================================================================
// QUERIES: INFORMACIÓN DE SPRINTS
// ============================================================================

async function getSprintInfo(sprintNum) {
  return runScalar(
    'SELECT * FROM sprints_versions WHERE sprint = ?',
    [sprintNum]
  );
}

async function getAllSprints() {
  return runQuery('SELECT * FROM sprints_versions ORDER BY sprint');
}

// ============================================================================
// QUERIES FILTRADAS (combinación de criterios)
// ============================================================================

async function getBugsFiltered(filters = {}) {
  let sql = 'SELECT * FROM bugs_detail WHERE 1=1';
  const params = [];

  if (filters.sprint) {
    sql += ' AND sprint LIKE ?';
    params.push(`%${filters.sprint}%`);
  }

  if (filters.prioridad) {
    sql += ' AND prioridad = ?';
    params.push(filters.prioridad);
  }

  if (filters.estado) {
    sql += ' AND estado = ?';
    params.push(filters.estado);
  }

  if (filters.modulo) {
    sql += ' AND modulo = ?';
    params.push(filters.modulo);
  }

  if (filters.asignado_a) {
    sql += ' AND asignado_a = ?';
    params.push(filters.asignado_a);
  }

  if (filters.categoria) {
    sql += ' AND categoria = ?';
    params.push(filters.categoria);
  }

  sql += ' ORDER BY sprint';

  return runQuery(sql, params);
}

// ============================================================================
// QUERIES: ESTADÍSTICAS
// ============================================================================

async function getStatistics() {
  const [totalBugs, totalSprints, critical, pending, summary] = await Promise.all([
    getTotalBugs(),
    getTotalSprints(),
    getCriticalBugs(),
    runScalar('SELECT COUNT(*) as count FROM bugs_detail WHERE estado = "Tareas por hacer"'),
    getBugsSummary()
  ]);

  return {
    total_bugs: totalBugs,
    total_sprints: totalSprints,
    critical_bugs: critical[0]?.count || 0,
    pending_bugs: pending?.count || 0,
    testCasesTotal: totalBugs,        // Cada registro es un caso ejecutado
    testCasesExecuted: totalBugs,     // Todos los registros se ejecutaron
    ...summary[0]
  };
}

// ============================================================================
// QUERIES: METADATA DE ORIGEN DE DATOS
// ============================================================================

async function recordDataSourceMetadata(sourceFileName, sourceFilePath, fileSize, totalBugs, totalSprints, notes = '') {
  try {
    return new Promise((resolve, reject) => {
      const sql = `
        INSERT INTO data_source_metadata 
        (source_file_name, source_file_path, source_file_size, total_bugs_loaded, total_sprints_loaded, status, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `;
      getDatabase().run(
        sql,
        [sourceFileName, sourceFilePath, fileSize, totalBugs, totalSprints, 'success', notes],
        (err) => {
          if (err) reject(err);
          else resolve({ success: true });
        }
      );
    });
  } catch (error) {
    console.error('Error recording metadata:', error);
    throw error;
  }
}

async function getLatestDataSourceMetadata() {
  return runScalar(`
    SELECT * FROM data_source_metadata 
    ORDER BY load_timestamp DESC 
    LIMIT 1
  `);
}

async function getAllDataSourceMetadata() {
  return runQuery(`
    SELECT * FROM data_source_metadata 
    ORDER BY load_timestamp DESC
  `);
}

async function getDataSourceInfo() {
  const latest = await getLatestDataSourceMetadata();
  if (latest) {
    return {
      sourceFileName: latest.source_file_name,
      sourceFilePath: latest.source_file_path,
      fileSizeBytes: latest.source_file_size,
      fileSizeKB: latest.source_file_size ? (latest.source_file_size / 1024).toFixed(2) : null,
      loadedAt: latest.load_timestamp,
      totalBugsLoaded: latest.total_bugs_loaded,
      totalSprintsLoaded: latest.total_sprints_loaded,
      status: latest.status,
      notes: latest.notes
    };
  }
  return null;
}

// ============================================================================
// QUERIES: ANÁLISIS DE EQUIPO (desde bugs_detail)
// ============================================================================

async function getDevelopersAnalysis() {
  // Prefer developers_summary (sheet "BUGS X DESARROLLADOR") as source of truth
  return runQuery(`
    SELECT 
      developer_name,
      total_bugs,
      tareas_por_hacer as pending,
      en_curso as in_progress,
      code_review,
      ready_for_testing,
      ready_for_uat,
      blocked,
      cancelado as canceled,
      ROUND(((total_bugs - tareas_por_hacer) * 100.0 / NULLIF(total_bugs, 0)), 2) as efficiency_percentage,
      CASE 
        WHEN tareas_por_hacer > 15 THEN 'Alto'
        WHEN tareas_por_hacer > 8 THEN 'Medio'
        ELSE 'Bajo'
      END as workload_level
    FROM developers_summary
    WHERE total_bugs > 0
    ORDER BY total_bugs DESC
  `);
}

async function getDeveloperByName(devName) {
  return runScalar(
    `SELECT 
      developer_name,
      total_bugs,
      tareas_por_hacer as pending,
      en_curso as in_progress,
      code_review,
      ready_for_testing,
      ready_for_uat,
      blocked,
      cancelado as canceled,
      ROUND(((total_bugs - tareas_por_hacer) * 100.0 / NULLIF(total_bugs, 0)), 2) as efficiency_percentage,
      CASE WHEN tareas_por_hacer > 15 THEN 'Alto' WHEN tareas_por_hacer > 8 THEN 'Medio' ELSE 'Bajo' END as workload_level
    FROM developers_summary WHERE developer_name = ? LIMIT 1`,
    [devName]
  );
}

async function getTeamSummary() {
  return runScalar(`
    SELECT 
      COUNT(DISTINCT asignado_a) as total_developers,
      SUM(CASE WHEN asignado_a IS NOT NULL AND asignado_a != '' THEN 1 ELSE 0 END) as total_assigned_bugs,
      SUM(CASE WHEN asignado_a IS NOT NULL AND asignado_a != '' AND estado = 'Tareas por hacer' THEN 1 ELSE 0 END) as total_pending_assigned
    FROM bugs_detail
  `);
}

// ============================================================================
// EXPORTS
// ============================================================================

const DAL = {
    async getFullQAData() {
      // Resumen general
      const summary = await DAL.getStatistics();
      // Bugs por prioridad - convertir array a objeto indexado
      const bugsByPriorityArray = await DAL.getBugsByPriority();
      const bugsByPriority = {};
      bugsByPriorityArray.forEach(row => {
        bugsByPriority[row.prioridad] = {
          count: row.count,
          pending: row.pending,
          canceled: row.canceled,
          resolved: row.resolved
        };
      });
      // Bugs por módulo
      const bugsByModule = await DAL.getBugsByModule();
      // Bugs por categoría
      const bugsByCategory = await DAL.getBugsByCategory();
      // Datos de desarrolladores
      const developerData = await DAL.getDevelopersAnalysis();
      
      // Datos por sprint para densidad (excluye sugerencias)
      const sprintDataRaw = await DAL.getBugsBySprint();
      const sprintData = sprintDataRaw.map(sprint => ({
        ...sprint,
        bugs: sprint.total  // Para densidad de hallazgos
      }));
      
      // Datos por sprint para test cases (incluye todos)
      const sprintDataAllRaw = await DAL.getBugsBySprintIncludingSuggestions();
      const testCasesPerSprint = sprintDataAllRaw.map(sprint => ({
        ...sprint,
        testCases: sprint.total,  // Cada registro es un caso ejecutado
        testCasesExecuted: sprint.total
      }));
      
      // Bugs críticos pendientes por sprint
      const criticalBugsPendingRaw = await DAL.getCriticalBugsPendingBySprint();
      const criticalBugsPendingMap = {};
      criticalBugsPendingRaw.forEach(row => {
        criticalBugsPendingMap[row.sprint] = row.critical_pending || 0;
      });
      
      // Bugs críticos por sprint desglosados por estado
      const criticalBugsByStateRaw = await DAL.getCriticalBugsBySprintAndState();
      const criticalBugsByStateMap = {};
      criticalBugsByStateRaw.forEach(row => {
        criticalBugsByStateMap[row.sprint] = {
          tareasPorHacer: row.tareasPorHacer || 0,
          enProgreso: row.enProgreso || 0,
          reabierto: row.reabierto || 0
        };
      });
      
      // Enriquecer sprintData con testCases, criticalBugsPending y desglose por estado
      const enrichedSprintData = sprintData.map(sprint => {
        const testData = testCasesPerSprint.find(t => t.sprint === sprint.sprint);
        const stateData = criticalBugsByStateMap[sprint.sprint] || {
          tareasPorHacer: 0,
          enProgreso: 0,
          reabierto: 0
        };
        return {
          ...sprint,
          testCases: testData?.testCases || sprint.total,
          testCasesExecuted: testData?.testCasesExecuted || sprint.total,
          criticalBugsPending: criticalBugsPendingMap[sprint.sprint] || 0,
          criticalBugsByState: stateData
        };
      });
      
      // Metadata
      const metadata = await DAL.getDataSourceInfo();
      return {
        summary,
        bugsByPriority,
        bugsByModule,
        bugsByCategory,
        developerData,
        sprintData: enrichedSprintData,
        metadata
      };
    },
  getDatabase,
  runQuery,
  runScalar,
  
  // Resumen
  getBugsSummary,
  getTotalBugs,
  getTotalSprints,
  getStatistics,
  
  // Por Sprint
  getBugsBySprint,
  getBugsBySprintIncludingSuggestions,
  getBugsBySprintAndStatus,
  getBugsBySprintNumber,
  getCriticalBugsPendingBySprint,
  getCriticalBugsBySprintAndState,
  
  // Por Desarrollador
  getBugsByDeveloper,
  getBugsByDeveloperName,
  
  // Por Prioridad
  getBugsByPriority,
  getCriticalBugs,
  
  // Por Módulo
  getBugsByModule,
  getDeveloperModulesSummary,
  
  // Por Categoría
  getBugsByCategory,
  
  // Detalles
  getBugDetail,
  getBugsByState,
  
  // Sprints
  getSprintInfo,
  getAllSprints,
  
  // Filtrado
  getBugsFiltered,
  
  // Metadata de origen de datos
  recordDataSourceMetadata,
  getLatestDataSourceMetadata,
  getAllDataSourceMetadata,
  getDataSourceInfo,
  
  // Análisis de equipo
  getDevelopersAnalysis,
  getDeveloperByName,
  getTeamSummary
};

export default DAL;
