import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, '../public/data/qa-dashboard.db');

const db = new sqlite3.Database(dbPath);

console.log('\n=== TABLE STRUCTURE ===\n');

// Obtener columnas de bugs_detail
db.all("PRAGMA table_info(bugs_detail);", (err, rows) => {
  if (rows) {
    console.log('bugs_detail columns:');
    rows.forEach(r => console.log(`  ${r.name}: ${r.type}`));
  }
  
  console.log('\n=== SAMPLE DATA ===\n');
  
  // Obtener muestra de datos
  db.all("SELECT DISTINCT clave_incidencia, COUNT(*) as execution_count FROM bugs_detail WHERE tipo_incidencia = 'Test Case' GROUP BY clave_incidencia ORDER BY execution_count DESC LIMIT 10;", (err, rows) => {
    if (rows) {
      console.log('Test Cases with execution count:');
      rows.forEach(r => console.log(`  ${r.clave_incidencia}: ${r.execution_count} executions`));
    }
    
    console.log('\n=== REUSE CALCULATION ===\n');
    
    // Calcular casos con >1 ejecución
    db.get("SELECT COUNT(DISTINCT clave_incidencia) as total_test_cases FROM bugs_detail WHERE tipo_incidencia = 'Test Case';", (err, row1) => {
      const total = row1?.total_test_cases || 0;
      
      db.get(`SELECT COUNT(DISTINCT clave_incidencia) as reuse_count FROM (
        SELECT clave_incidencia, COUNT(*) as exec_count FROM bugs_detail 
        WHERE tipo_incidencia = 'Test Case' 
        GROUP BY clave_incidencia 
        HAVING exec_count > 1
      );`, (err, row2) => {
        const reused = row2?.reuse_count || 0;
        const notReused = total - reused;
        const reuseRate = total > 0 ? Math.round((reused / total) * 100) : 0;
        
        console.log(`Total Test Cases: ${total}`);
        console.log(`With Reuse (>1 execution): ${reused} (${reuseRate}%)`);
        console.log(`Without Reuse (0-1 execution): ${notReused} (${100-reuseRate}%)`);
        
        db.close();
      });
    });
  });
});
