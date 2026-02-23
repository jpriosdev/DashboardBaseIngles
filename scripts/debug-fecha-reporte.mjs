import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, '../public/data/qa-dashboard.db');

async function debugFechaReporte() {
  const db = new sqlite3.Database(dbPath);

  // Check fecha_reporte values
  const fechaCheck = await new Promise((resolve, reject) => {
    db.all(
      `SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN fecha_reporte IS NULL OR fecha_reporte = '' THEN 1 ELSE 0 END) as null_count,
        SUM(CASE WHEN estado = 'Fail' THEN 1 ELSE 0 END) as fail_count,
        SUM(CASE WHEN estado = 'Fail' AND (fecha_reporte IS NULL OR fecha_reporte = '') THEN 1 ELSE 0 END) as fail_null_count,
        SUM(CASE WHEN estado = 'Fail' AND fecha_reporte IS NOT NULL AND fecha_reporte != '' THEN 1 ELSE 0 END) as fail_with_fecha
      FROM bugs_detail`,
      (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      }
    );
  });

  console.log(`📊 Análisis de fecha_reporte:`, fechaCheck[0]);

  // Sample values of fecha_reporte for Fail status
  const samples = await new Promise((resolve, reject) => {
    db.all(
      `SELECT DISTINCT fecha_reporte 
       FROM bugs_detail 
       WHERE estado = 'Fail' AND fecha_reporte IS NOT NULL AND fecha_reporte != ''
       LIMIT 10`,
      (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      }
    );
  });

  console.log(`\n📅 Muestras de fecha_reporte (Fail):`,  samples);

  db.close();
}

debugFechaReporte().catch(console.error);
