#!/usr/bin/env node
import sqlite3 from 'sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { parse } from 'csv-parse/sync';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.resolve(__dirname, '../public/data/qa-dashboard.db');
const CSV_PATH = path.resolve(__dirname, '../data/MockDataV0.csv');

console.log(`📂 CSV: ${CSV_PATH}`);
console.log(`💾 DB: ${DB_PATH}`);

if (!fs.existsSync(CSV_PATH) || !fs.existsSync(DB_PATH)) {
  console.error('❌ CSV o BD no encontrado');
  process.exit(1);
}

const csvContent = fs.readFileSync(CSV_PATH, 'utf8');
const records = parse(csvContent, {
  columns: true,
  skip_empty_lines: true,
  trim: true,
  relax_quotes: true,
  relax_column_count: true,
});

console.log(`📊 Registros leídos del CSV: ${records.length}`);

const db = new (sqlite3.verbose().Database)(DB_PATH, (err) => {
  if (err) {
    console.error(`❌ Error: ${err.message}`);
    process.exit(1);
  }

  db.run('DELETE FROM bugs_detail', (err) => {
    if (err) console.warn(`⚠️ Error limpiando: ${err.message}`);

    const stmt = db.prepare(`
      INSERT INTO bugs_detail (
        tipo_incidencia, clave_incidencia, id_incidencia, resumen, prioridad, 
        estado, sprint, modulo, categoria, asignado_a
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    records.forEach((row, idx) => {
      try {
        stmt.run([
          row['Tipo de Incidencia'] || '',
          row['Clave de incidencia'] || '',
          row['ID de la incidencia'] || idx,
          row['Resumen'] || '',
          row['Prioridad'] || 'Medium',
          row['Estado'] || 'To Do',
          row['Sprint de ejecución'] || '',
          row['Modulo'] || '',
          row['Categoría'] || '',
          row['Desarrollador'] || '',
        ]);
      } catch (e) {
        if (idx < 3) console.warn(`⚠️ Fila ${idx}: ${e.message}`);
      }
    });

    stmt.finalize(() => {
      db.all('SELECT COUNT(*) as total, tipo_incidencia FROM bugs_detail GROUP BY tipo_incidencia', (err, rows) => {
        if (err) {
          console.error(`❌ Error: ${err.message}`);
          db.close(() => process.exit(1));
          return;
        }

        console.log(`\n📊 Distribución por tipo:`);
        rows.forEach(row => console.log(`   ${row.tipo_incidencia}: ${row.total}`));

        db.get('SELECT COUNT(*) as total FROM bugs_detail WHERE tipo_incidencia = "Bug"', (err, result) => {
          console.log(`\n✅ Registros BUGS: ${result?.total || 0}`);
          db.close(() => {
            console.log('✅ Base de datos actualizada\n');
            process.exit(0);
          });
        });
      });
    });
  });
});
