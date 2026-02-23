import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, './public/data/qa-dashboard.db');

const db = new (sqlite3.verbose().Database)(dbPath);

console.log('🔍 Diagnóstico detallado de ejecución de casos...\n');

// Verificar si hay campos NULL
db.all('SELECT COUNT(*) as total, COUNT(DISTINCT clave_incidencia) as distinct FROM bugs_detail WHERE tipo_incidencia = ?', ['Test Case'], (err, rows) => {
  if (!err && rows[0]) {
    const { total, distinct } = rows[0];
    console.log('📊 Total registros vs DISTINCT clave_incidencia:');
    console.log('   Total registros:', total);
    console.log('   DISTINCT clave_incidencia:', distinct);
    console.log('   Promedio ejecuciones/caso:', (total / distinct).toFixed(2));
  }
});

// Verificar distribución de NULL en estado
db.all('SELECT COALESCE(estado, "NULL") as estado, COUNT(*) as count, COUNT(DISTINCT clave_incidencia) as distinct FROM bugs_detail WHERE tipo_incidencia = ? GROUP BY COALESCE(estado, "NULL") ORDER BY count DESC', ['Test Case'], (err, rows) => {
  if (!err) {
    console.log('\n📊 Distribución por estado (registros vs DISTINCT):');
    rows.forEach(r => {
      console.log(`   ${r.estado}: ${r.count} registros, ${r.distinct} casos únicos`);
    });
    
    const totalDistinct = rows.reduce((a, r) => a + r.distinct, 0);
    console.log(`   Total DISTINCT: ${totalDistinct}`);
  }
});

// Casos que aparecen en AMBAS categorías (son problematicos)
db.get(`
  SELECT COUNT(DISTINCT bd1.clave_incidencia) as conflicts
  FROM bugs_detail bd1
  WHERE bd1.tipo_incidencia = ? 
    AND bd1.clave_incidencia EXISTS (
      SELECT 1 FROM bugs_detail bd2 
      WHERE bd2.tipo_incidencia = ?
      AND bd2.clave_incidencia = bd1.clave_incidencia
      AND bd2.estado = ?
    )
  AND bd1.estado != ?
`, ['Test Case', 'Test Case', 'Not Executed', 'Not Executed'], (err, row) => {
  if (!err && row) {
    console.log(`\n⚠️  Casos que tienen ambos estados (conflictivos): ${row.conflicts}`);
  }
});

// Comparar metodologías
db.get(`
  SELECT 
    (SELECT COUNT(DISTINCT clave_incidencia) FROM bugs_detail WHERE tipo_incidencia = ?) as total_diseñados,
    (SELECT COUNT(DISTINCT clave_incidencia) FROM bugs_detail WHERE tipo_incidencia = ? AND estado = ?) as not_executed,
    (SELECT COUNT(DISTINCT clave_incidencia) FROM bugs_detail WHERE tipo_incidencia = ? AND estado != ?) as with_execution
`, ['Test Case', 'Test Case', 'Not Executed', 'Test Case', 'Not Executed'], (err, row) => {
  if (!err && row) {
    console.log('\n📊 Resumen metodologías:');
    console.log(`   Total diseñados (Q1): ${row.total_diseñados}`);
    console.log(`   Con estado NOT EXECUTED (Q2): ${row.not_executed}`);
    console.log(`   Con estado != NOT EXECUTED (Q3): ${row.with_execution}`);
    console.log(`   Q2 + Q3 = ${row.not_executed + row.with_execution}`);
    console.log(`   Discrepancia: ${(row.not_executed + row.with_execution) - row.total_diseñados}`);
    
    // Opción B correcta
    const opcionB = row.total_diseñados - row.not_executed;
    const rateB = ((opcionB / row.total_diseñados) * 100).toFixed(2);
    console.log(`\n✅ OPCIÓN B (última ejecución != NOT EXECUTED):`);
    console.log(`   Diseñados: ${row.total_diseñados}`);
    console.log(`   Ejecutados: ${opcionB}`);
    console.log(`   Execution Rate: ${rateB}%`);
  }
  
  db.close();
});
