import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, '../public/data/qa-dashboard.db');

async function debugTestCaseQueries() {
  const db = new sqlite3.Database(dbPath);

  // Check what getTestCasesBySprint returns
  const result1 = await new Promise((resolve, reject) => {
    db.all(
      `SELECT
        substr('0' || substr(fecha_reporte, 1, instr(fecha_reporte, '/') - 1), -2) || '-' ||
        substr(fecha_reporte, instr(fecha_reporte, ' ') - 4, 4) as month_year,
        SUM(CASE WHEN 
          tipo_incidencia IN ('test Case', 'Epic', 'Story')
          AND (LOWER(COALESCE(resumen,'')) LIKE '%qa%' OR LOWER(COALESCE(resumen,'')) LIKE '%test%')
          THEN 1 ELSE 0 
        END) as total_tests,
        SUM(CASE 
          WHEN tipo_incidencia IN ('test Case', 'Epic', 'Story')
          AND (LOWER(COALESCE(resumen,'')) LIKE '%qa%' OR LOWER(COALESCE(resumen,'')) LIKE '%test%')
          AND estado IN ('Closed', 'Released', 'Ready For Release')
          THEN 1 
          ELSE 0 
        END) as executed_tests
      FROM bugs_detail
      GROUP BY month_year
      ORDER BY month_year
      LIMIT 10`,
      (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      }
    );
  });

  console.log(`\n📊 getTestCasesBySprint (primeros 10):`);
  console.log(JSON.stringify(result1, null, 2));

  // Check getPlannedTestCasesBySprint
  const result2 = await new Promise((resolve, reject) => {
    db.all(
      `SELECT
        sprint,
        CAST(SUBSTR(sprint, -2) AS INTEGER) as sprint_num,
        SUM(CASE WHEN 
          tipo_incidencia IN ('test Case', 'Epic', 'Story')
          AND (LOWER(COALESCE(resumen,'')) LIKE '%qa%' OR LOWER(COALESCE(resumen,'')) LIKE '%test%')
          THEN 1 ELSE 0 
        END) as total_tests
      FROM bugs_detail
      WHERE sprint IS NOT NULL AND sprint != ''
      GROUP BY sprint
      ORDER BY sprint
      LIMIT 10`,
      (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      }
    );
  });

  console.log(`\n📊 Query por sprint field (primeros 10):`);
  console.log(JSON.stringify(result2, null, 2));

  db.close();
}

debugTestCaseQueries().catch(console.error);
