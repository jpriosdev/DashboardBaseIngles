#!/usr/bin/env node
import path from 'path';
import { fileURLToPath } from 'url';
import sqlite3 from 'sqlite3';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, '../public/data/qa-dashboard.db');

const db = new sqlite3.Database(dbPath);

async function main() {
  console.log('🔍 Inspeccionando valores de ESTADO en BD\n');
  
  // Query 1: Estados únicos
  db.all(`
    SELECT DISTINCT estado, COUNT(*) as count
    FROM bugs_detail
    WHERE tipo_incidencia = 'Bug'
    GROUP BY estado
    ORDER BY count DESC
  `, (err, rows) => {
    if (err) {
      console.error('❌ Error:', err);
      return;
    }
    
    console.log('📊 Estados únicos en bugs_detail:');
    console.table(rows);
    
    // Query 2: Prioridades únicas
    db.all(`
      SELECT DISTINCT prioridad, COUNT(*) as count
      FROM bugs_detail
      WHERE tipo_incidencia = 'Bug'
      GROUP BY prioridad
      ORDER BY count DESC
    `, (err, rows2) => {
      if (err) {
        console.error('❌ Error:', err);
        return;
      }
      
      console.log('\n🎯 Prioridades únicas en bugs_detail:');
      console.table(rows2);
      
      // Query 3: Total de bugs por tipo
      db.all(`
        SELECT tipo_incidencia, COUNT(*) as count
        FROM bugs_detail
        GROUP BY tipo_incidencia
      `, (err, rows3) => {
        if (err) {
          console.error('❌ Error:', err);
          return;
        }
        
        console.log('\n📋 Total por tipo de incidencia:');
        console.table(rows3);
        
        db.close();
      });
    });
  });
}

main();
