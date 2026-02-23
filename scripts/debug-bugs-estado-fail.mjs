import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, '../public/data/qa-dashboard.db');

async function debugBugsByEstadoFail() {
  const db = new sqlite3.Database(dbPath);

  // Total records with estado = 'Fail'
  const failCount = await new Promise((resolve, reject) => {
    db.get(
      `SELECT COUNT(*) as count FROM bugs_detail WHERE estado = 'Fail'`,
      (err, row) => {
        if (err) reject(err);
        else resolve(row?.count || 0);
      }
    );
  });

  console.log(`📊 Total registros con estado = 'Fail': ${failCount}`);

  // Bugs by month (only estado = 'Fail')
  const bugsByMonth = await new Promise((resolve, reject) => {
    db.all(
      `SELECT 
        substr('0' || substr(fecha_reporte, 1, instr(fecha_reporte, '/') - 1), -2) || '-' ||
        substr(fecha_reporte, instr(fecha_reporte, ' ') - 4, 4) as month_year,
        COUNT(*) as count
      FROM bugs_detail 
      WHERE estado = 'Fail' AND fecha_reporte IS NOT NULL AND fecha_reporte != ''
      GROUP BY month_year
      ORDER BY month_year ASC`,
      (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      }
    );
  });

  console.log(`\n📅 Bugs por mes (solo Fail):`);
  let totalByMonth = 0;
  bugsByMonth.forEach(row => {
    console.log(`  ${row.month_year}: ${row.count}`);
    totalByMonth += row.count;
  });
  console.log(`\n📊 Total en bugsByMonth: ${totalByMonth}`);
  console.log(`📊 Período cubiertos: ${bugsByMonth.length}`);
  if (bugsByMonth.length > 0) {
    console.log(`📊 Promedio por mes: ${(totalByMonth / bugsByMonth.length).toFixed(1)}`);
  }

  // Bugs by priority (only estado = 'Fail')
  const bugsByPriority = await new Promise((resolve, reject) => {
    db.all(
      `SELECT 
        prioridad,
        COUNT(*) as count
      FROM bugs_detail 
      WHERE estado = 'Fail'
      GROUP BY prioridad
      ORDER BY count DESC`,
      (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      }
    );
  });

  console.log(`\n🎯 Bugs por prioridad (solo Fail):`);
  bugsByPriority.forEach(row => {
    console.log(`  ${row.prioridad}: ${row.count}`);
  });

  // Cierre promisificado
  db.close((err) => {
    if (err) console.error('Error cerrando BD:', err);
  });
}

debugBugsByEstadoFail().catch(console.error);
