import sqlite3 from 'sqlite3';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new sqlite3.Database(path.join(__dirname, 'public/data/qa-dashboard.db'));

db.all("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name", (err, tables) => {
  if(err) {
    console.log('Error:', err);
  } else {
    console.log('=== TABLAS EN LA BD ===');
    tables.forEach(t => console.log('  -', t.name));
  }
  
  // Ahora verifiquemos la estructura de bugs_detail
  console.log('\n=== ESTRUCTURA DE bugs_detail ===');
  db.all("PRAGMA table_info(bugs_detail)", (err, cols) => {
    if(err) console.log('Error:', err);
    else cols.forEach(c => console.log(`  ${c.name}: ${c.type}`));
    
    // Contar casos diseñados con 0 ejecuciones
    console.log('\n=== ANÁLISIS DE EJECUCIONES ===');
    db.all(`
      SELECT 
        COUNT(DISTINCT clave_incidencia) as total_test_cases,
        (SELECT COUNT(DISTINCT clave_incidencia) FROM bugs_detail WHERE tipo_incidencia = 'Test Case') as cases_with_executions,
        COUNT(DISTINCT clave_incidencia) - (SELECT COUNT(DISTINCT clave_incidencia) FROM bugs_detail WHERE tipo_incidencia = 'Test Case') as cases_without_executions
      FROM bugs_detail
      WHERE tipo_incidencia = 'Test Case'
    `, (err, rows) => {
      if(err) console.log('Error:', err);
      else console.log(JSON.stringify(rows, null, 2));
      db.close();
    });
  });
});
