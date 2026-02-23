import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, '../public/data/qa-dashboard.db');

async function debugBugsByModule() {
  const db = new sqlite3.Database(dbPath);

  // Check if modulo column has data for Fail status
  const moduloCheck = await new Promise((resolve, reject) => {
    db.all(
      `SELECT 
        modulo,
        COUNT(*) as count
      FROM bugs_detail 
      WHERE estado = 'Fail' AND modulo IS NOT NULL AND modulo != ''
      GROUP BY modulo
      ORDER BY count DESC`,
      (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      }
    );
  });

  console.log(`🎯 Bugs por módulo (solo Fail):`);
  if (moduloCheck.length === 0) {
    console.log(`   No hay módulos registrados para bugs con estado = 'Fail'`);
    
    // Check if there are modules at all
    const allModulos = await new Promise((resolve, reject) => {
      db.all(
        `SELECT DISTINCT modulo FROM bugs_detail WHERE estado = 'Fail' LIMIT 5`,
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows || []);
        }
      );
    });
    console.log(`\n   Muestras de modulo en Fail (primeras 5):`, allModulos);
  } else {
    moduloCheck.forEach(row => {
      console.log(`   ${row.modulo || '(NULL)'}: ${row.count}`);
    });
  }

  db.close();
}

debugBugsByModule().catch(console.error);
