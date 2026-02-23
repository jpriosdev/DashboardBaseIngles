import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, '../public/data/qa-dashboard.db');

async function debugSprintField() {
  const db = new sqlite3.Database(dbPath);

  // Check distinct sprint values
  const sprints = await new Promise((resolve, reject) => {
    db.all(
      `SELECT DISTINCT sprint FROM bugs_detail WHERE sprint IS NOT NULL AND sprint != '' LIMIT 15`,
      (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      }
    );
  });

  console.log(`📅 Valores únicos de sprint (primeros 15):`);
  sprints.forEach(row => {
    console.log(`   "${row.sprint}"`);
  });

  // Check what the view returns
  const viewResults = await new Promise((resolve, reject) => {
    db.all(
      `SELECT * FROM vw_bugs_by_sprint LIMIT 10`,
      (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      }
    );
  });

  console.log(`\n📊 Resultados de vw_bugs_by_sprint (primeros 10):`);
  console.log(JSON.stringify(viewResults, null, 2));

  db.close();
}

debugSprintField().catch(console.error);
