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
  
  db.get('SELECT COUNT(*) as count FROM bugs_detail WHERE estado = ?', ['Fail'], (err, row) => {
    if (err) {
      console.error('Error:', err.message);
      process.exit(1);
    }
    console.log(`Total records with estado='Fail': ${row.count}`);
    
    db.all('SELECT prioridad, COUNT(*) as count FROM bugs_detail WHERE estado = ? GROUP BY prioridad ORDER BY prioridad', ['Fail'], (err, rows) => {
      if (err) {
        console.error('Error:', err.message);
        process.exit(1);
      }
      console.log(`\nBy priority:`);
      rows.forEach(r => {
        console.log(`  ${r.prioridad || '(NULL)'}: ${r.count}`);
      });
      
      db.close();
      process.exit(0);
    });
  });
});
