#!/usr/bin/env node
import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, '..', 'public', 'data', 'qa-dashboard.db');

const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error('Error opening DB:', err.message);
    process.exit(1);
  }
  
  // Check all records by tipo_incidencia
  db.all('SELECT tipo_incidencia, COUNT(*) as count FROM bugs_detail GROUP BY tipo_incidencia ORDER BY count DESC', (err, rows) => {
    if (err) {
      console.error('Error:', err.message);
      process.exit(1);
    }
    console.log('All records in DB by tipo_incidencia:');
    rows.forEach(r => {
      console.log(`  "${r.tipo_incidencia || '(NULL)'}": ${r.count}`);
    });
    
    // Check only Test Cases
    db.all('SELECT COUNT(*) as count FROM bugs_detail WHERE tipo_incidencia = ?', ['Test Case'], (err, rowTC) => {
      console.log(`\nTest Cases in DB: ${rowTC[0]?.count || 0}`);
      
      // Check Fail records by tipo
      db.all('SELECT tipo_incidencia, COUNT(*) as count FROM bugs_detail WHERE estado = ? GROUP BY tipo_incidencia', ['Fail'], (err, failRows) => {
        console.log(`\nRecords with estado=Fail by tipo_incidencia:`);
        failRows.forEach(r => {
          console.log(`  "${r.tipo_incidencia || '(NULL)'}": ${r.count}`);
        });
        
        db.close();
        process.exit(0);
      });
    });
  });
});
