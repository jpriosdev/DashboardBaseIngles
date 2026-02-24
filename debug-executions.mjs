import sqlite3 from 'sqlite3';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new sqlite3.Database(path.join(__dirname, 'public/data/qa-dashboard.db'));

console.log('=== ESTADOS ÚNICOS EN bugs_detail (Test Cases) ===');
db.all(`
  SELECT DISTINCT estado, COUNT(*) as count
  FROM bugs_detail 
  WHERE tipo_incidencia = 'Test Case'
  GROUP BY estado
  ORDER BY count DESC
`, (err, rows) => {
  if(err) console.log('Error:', err);
  else {
    rows.forEach(r => console.log(`  ${r.estado}: ${r.count}`));
    console.log(`  Total: ${rows.reduce((sum, r) => sum + r.count, 0)}`);
  }
  
  // Ver la distribución de ejecuciones
  console.log('\n=== ANÁLISIS DE EJECUCIONES POR ESTADO ===');
  db.all(`
    SELECT 
      estado,
      COUNT(DISTINCT clave_incidencia) as total_cases
    FROM bugs_detail 
    WHERE tipo_incidencia = 'Test Case'
    GROUP BY estado
  `, (err, rows) => {
    if(err) console.log('Error:', err);
    else rows.forEach(r => console.log(`  ${r.estado}: ${r.total_cases} casos`));
    
    // Contar ejecuciones por caso
    console.log('\n=== CONTEO DE EJECUCIONES POR CASO (primeros 20) ===');
    db.all(`
      SELECT 
        clave_incidencia,
        COUNT(*) as execution_count,
        MAX(estado) as last_state
      FROM bugs_detail 
      WHERE tipo_incidencia = 'Test Case'
      GROUP BY clave_incidencia
      LIMIT 20
    `, (err, rows) => {
      if(err) console.log('Error:', err);
      else {
        rows.forEach(r => console.log(`  ${r.clave_incidencia}: ${r.execution_count} ejecutiones, último estado: ${r.last_state}`));
        
        // Resumen final
        console.log('\n=== RESUMEN FINAL ===');
        db.all(`
          SELECT 
            COUNT(DISTINCT clave_incidencia) as total_cases,
            SUM(CASE WHEN execution_count >= 2 THEN 1 ELSE 0 END) as reused,
            SUM(CASE WHEN execution_count = 1 THEN 1 ELSE 0 END) as used,
            SUM(CASE WHEN execution_count = 0 THEN 1 ELSE 0 END) as not_used
          FROM (
            SELECT 
              clave_incidencia,
              COUNT(*) as execution_count
            FROM bugs_detail 
            WHERE tipo_incidencia = 'Test Case'
            GROUP BY clave_incidencia
          )
        `, (err, rows) => {
          if(err) console.log('Error:', err);
          else {
            const r = rows[0];
            console.log(`  Total casos: ${r.total_cases}`);
            console.log(`  Reused (>=2): ${r.reused}`);
            console.log(`  Used (=1): ${r.used}`);
            console.log(`  Not used (=0): ${r.not_used}`);
          }
          db.close();
        });
      }
    });
  });
});
