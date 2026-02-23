import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, './public/data/qa-dashboard.db');

const db = new (sqlite3.verbose().Database)(dbPath);

console.log('🔍 Investigando datos de bugs por fecha...\n');

// Verificar qué tipos de incidencia hay
db.all('SELECT DISTINCT tipo_incidencia FROM bugs_detail LIMIT 20', (err, rows) => {
  if (!err && rows) {
    console.log('📊 Tipos de incidencia únicos:');
    rows.forEach(r => console.log('   -', r.tipo_incidencia));
  }
});

// Verificar fecha_reporte
db.all('SELECT COUNT(*) as total, COUNT(DISTINCT fecha_reporte) as unique_dates FROM bugs_detail', (err, rows) => {
  if (!err && rows[0]) {
    console.log('\n📅 Datos de fecha_reporte:');
    console.log('   Total registros:', rows[0].total);
    console.log('   Fechas únicas:', rows[0].unique_dates);
  }
});

// Muestra de valores fecha_reporte
db.all('SELECT fecha_reporte FROM bugs_detail WHERE fecha_reporte IS NOT NULL AND fecha_reporte != "" LIMIT 10', (err, rows) => {
  if (!err && rows) {
    console.log('\n📅 Muestra de valores fecha_reporte:');
    rows.forEach(r => console.log('   -', r.fecha_reporte));
  }
});

// Bugs por tipo
db.all('SELECT tipo_incidencia, COUNT(*) as count FROM bugs_detail GROUP BY tipo_incidencia', (err, rows) => {
  if (!err && rows) {
    console.log('\n📊 Conteo por tipo:');
    rows.forEach(r => console.log(`   ${r.tipo_incidencia}: ${r.count}`));
  }
});

// Ejecutar la consulta actual de getBugsByDate
db.all(`SELECT 
      substr('0' || substr(fecha_reporte, 1, instr(fecha_reporte, '/') - 1), -2) || '-' ||
      substr(fecha_reporte, instr(fecha_reporte, ' ') - 4, 4) as month_year,
      COUNT(*) as count
    FROM bugs_detail 
    WHERE tipo_incidencia = 'Bug' AND fecha_reporte IS NOT NULL AND fecha_reporte != ''
    GROUP BY month_year
    ORDER BY month_year ASC`, (err, rows) => {
  if (!err && rows) {
    console.log('\n📧 Resultado actual de getBugsByDate (Bug + fecha_reporte):');
    if (rows.length === 0) {
      console.log('   ⚠️ SIN RESULTADOS - La consulta no retorna nada');
    } else {
      rows.forEach(r => console.log(`   ${r.month_year}: ${r.count} bugs`));
    }
  } else if (err) {
    console.log('❌ Error:', err.message);
  }
  
  db.close();
});
