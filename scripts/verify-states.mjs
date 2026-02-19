#!/usr/bin/env node
import sqlite3 from 'sqlite3';

const db = new sqlite3.Database('public/data/qa-dashboard.db');

console.log('\n=== Distribución de ESTADOS ===\n');
db.all('SELECT estado, COUNT(*) as cnt FROM bugs_detail GROUP BY estado ORDER BY cnt DESC', (e, rows) => {
  if (e) console.error(e);
  else console.table(rows);
  
  console.log('\n=== Verificación de Clasificación ===\n');
  
  const query = `
    SELECT 
      SUM(CASE WHEN estado IN ('To Do', 'In Development', 'In Testing', 'Ready for Testing') THEN 1 ELSE 0 END) as pending,
      SUM(CASE WHEN estado IN ('Done', 'Testing Completed') THEN 1 ELSE 0 END) as resolved,
      SUM(CASE WHEN estado = 'Canceled' THEN 1 ELSE 0 END) as canceled,
      COUNT(*) as total
    FROM bugs_detail
  `;
  
  db.get(query, (e, row) => {
    if (e) console.error(e);
    else console.table([row]);
    
    db.close();
  });
});
