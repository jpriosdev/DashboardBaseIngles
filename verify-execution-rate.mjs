import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, './public/data/qa-dashboard.db');

const db = new (sqlite3.verbose().Database)(dbPath);

console.log('🔍 Verificando Execution Rate...\n');

// Query 1: Total casos diseñados
db.get('SELECT COUNT(DISTINCT clave_incidencia) as total FROM bugs_detail WHERE tipo_incidencia = ?', ['Test Case'], (err, row) => {
  if (err) console.error('Error:', err);
  console.log('📊 Q1 - Total casos diseñados:', row.total);
});

// Query 2: Casos con estado 'Not Executed'
db.get('SELECT COUNT(DISTINCT clave_incidencia) as total FROM bugs_detail WHERE tipo_incidencia = ? AND estado = ?', ['Test Case', 'Not Executed'], (err, row) => {
  if (err) console.error('Error:', err);
  console.log('📊 Q2 - Total con estado NOT EXECUTED:', row.total);
});

// Query 3: Casos con estado != 'Not Executed'  
db.all('SELECT COUNT(DISTINCT clave_incidencia) as total FROM bugs_detail WHERE tipo_incidencia = ? AND estado != ?', ['Test Case', 'Not Executed'], (err, rows) => {
  if (err) console.error('Error:', err);
  const row = rows[0] || {};
  console.log('📊 Q3 - Total con estado != NOT EXECUTED:', row.total);
});

// Query 4: Desglose por estado
db.all('SELECT estado, COUNT(DISTINCT clave_incidencia) as count FROM bugs_detail WHERE tipo_incidencia = ? GROUP BY estado ORDER BY count DESC', ['Test Case'], (err, rows) => {
  if (err) console.error('Error:', err);
  console.log('\n📊 Q4 - Desglose por estado (última ejecución):');
  let suma = 0;
  rows.forEach(r => {
    console.log('   ', r.estado + ':', r.count);
    suma += r.count;
  });
  console.log('   ───────────────');
  console.log('   TOTAL:', suma);
  
  // Calcular execution rate
  const diseñados = suma; // Total debería ser 3,291
  const ejecutados = suma - (rows.find(r => r.estado === 'Not Executed')?.count || 0);
  const rate = ((ejecutados / diseñados) * 100).toFixed(2);
  
  console.log('\n✅ Execution Rate: ' + ejecutados + ' / ' + diseñados + ' = ' + rate + '%');
  
  db.close();
});
