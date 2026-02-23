#!/usr/bin/env node
import sqlite3 from 'sqlite3';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const db = new sqlite3.Database(path.join(__dirname, '../public/data/qa-dashboard.db'));

console.log('📊 Prioridades en BD (para Bugs):\n');
db.all('SELECT DISTINCT prioridad, COUNT(*) as count FROM bugs_detail WHERE tipo_incidencia = "Bug" GROUP BY prioridad ORDER BY prioridad', (err, rows) => {
  if (err) {
    console.error('❌ Error:', err.message);
  } else {
    console.table(rows);
  }
  
  console.log('\n📊 Prioridades en BD (para Test Cases):\n');
  db.all('SELECT DISTINCT prioridad, COUNT(*) as count FROM bugs_detail WHERE tipo_incidencia = "Test Case" GROUP BY prioridad ORDER BY prioridad', (err, rows) => {
    if (err) {
      console.error('❌ Error:', err.message);
    } else {
      console.table(rows);
    }
    db.close();
  });
});
