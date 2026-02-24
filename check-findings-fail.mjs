import sqlite3 from 'sqlite3';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new sqlite3.Database(path.join(__dirname, 'public/data/qa-dashboard.db'));

console.log('=== FINDINGS (estado=Fail) POR PRIORIDAD ===\n');

db.all(`
  SELECT 
    prioridad,
    COUNT(*) as count
  FROM bugs_detail 
  WHERE estado = 'Fail'
  GROUP BY prioridad
  ORDER BY 
    CASE prioridad
      WHEN 'High' THEN 1
      WHEN 'Medium' THEN 2
      WHEN 'Low' THEN 3
      ELSE 4
    END
`, (err, rows) => {
  if(err) {
    console.log('Error:', err);
  } else {
    let total = 0;
    rows.forEach(r => {
      console.log(`  ${r.prioridad}: ${r.count}`);
      total += r.count;
    });
    console.log(`\n  TOTAL: ${total}`);
  }
  db.close();
});
