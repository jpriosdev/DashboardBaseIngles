#!/usr/bin/env node
import path from 'path';
import { fileURLToPath } from 'url';
import sqlite3 from 'sqlite3';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, '../public/data/qa-dashboard.db');

const db = new sqlite3.Database(dbPath);

async function main() {
  console.log('📊 Revisando KPI: Resolution Efficiency\n');
  console.log('═'.repeat(60) + '\n');
  
  // Query 1: Resumen general
  db.all(`
    SELECT 
      COUNT(*) as total_bugs,
      SUM(CASE WHEN estado IN ('Pass','Fail') THEN 1 ELSE 0 END) as bugs_closed,
      SUM(CASE WHEN estado NOT IN ('Not Executed', 'In Progress', 'Blocked') THEN 1 ELSE 0 END) as bugs_pending
    FROM bugs_detail
    WHERE tipo_incidencia = 'Test Case' and Estado = 'Fail'
  `, (err, rows) => {
    if (err) {
      console.error('❌ Error:', err);
      return;
    }
    
    const summary = rows[0];
    const efficiency = summary.total_bugs > 0 
      ? Math.round((summary.bugs_closed / summary.total_bugs) * 100) 
      : 0;
    
    console.log('📈 Resumen General (BUGS ONLY):');
    console.log(`   Total Bugs: ${summary.total_bugs}`);
    console.log(`   Bugs Closed: ${summary.bugs_closed}`);
    console.log(`   Bugs Pending: ${summary.bugs_pending}`);
    console.log(`   ✅ Resolution Efficiency: ${efficiency}%\n`);
    
    // Query 2: Por sprint
    console.log('═'.repeat(60));
    console.log('\n📋 Resolution Efficiency por Sprint:\n');
    
    db.all(`
      SELECT 
        sprint,
        COUNT(*) as total,
        SUM(CASE WHEN estado IN ('Pass','Fail') THEN 1 ELSE 0 END) as closed,
        SUM(CASE WHEN estado NOT IN ('Not Executed', 'In Progress', 'Blocked') THEN 1 ELSE 0 END) as pending,
        ROUND((SUM(CASE WHEN estado IN ('Pass','Fail') THEN 1 ELSE 0 END) * 100.0 / COUNT(*)), 2) as efficiency_pct
      FROM bugs_detail
      WHERE tipo_incidencia = 'Test Case' and Estado = 'Fail'
      GROUP BY sprint
      ORDER BY sprint
    `, (err, rows2) => {
      if (err) {
        console.error('❌ Error:', err);
        db.close();
        return;
      }
      
      console.table(rows2);
      
      // Query 3: Por prioridad
      console.log('\n' + '═'.repeat(60));
      console.log('\n🎯 Resolution Efficiency por Prioridad:\n');
      
      db.all(`
        SELECT 
          prioridad,
          COUNT(*) as total,
          SUM(CASE WHEN estado IN ('Pass','Fail') THEN 1 ELSE 0 END) as closed,
          SUM(CASE WHEN estado NOT IN ('Not Executed', 'In Progress', 'Blocked') THEN 1 ELSE 0 END) as pending,
          ROUND((SUM(CASE WHEN estado IN ('Pass','Fail') THEN 1 ELSE 0 END) * 100.0 / COUNT(*)), 2) as efficiency_pct
        FROM bugs_detail
        WHERE tipo_incidencia = 'Test Case'
        GROUP BY prioridad
        ORDER BY prioridad
      `, (err, rows3) => {
        if (err) {
          console.error('❌ Error:', err);
          db.close();
          return;
        }
        
        console.table(rows3);
        
        // Query 4: Estados
        console.log('\n' + '═'.repeat(60));
        console.log('\n📊 Distribución de Estados (BUGS):\n');
        
        db.all(`
          SELECT 
            estado,
            COUNT(*) as count,
            ROUND((COUNT(*) * 100.0 / (SELECT COUNT(*) FROM bugs_detail WHERE tipo_incidencia = 'Bug')), 2) as percentage
          FROM bugs_detail
          WHERE tipo_incidencia = ''
          GROUP BY estado
          ORDER BY count DESC
        `, (err, rows4) => {
          if (err) {
            console.error('❌ Error:', err);
            db.close();
            return;
          }
          
          console.table(rows4);
          
          console.log('\n' + '═'.repeat(60));
          console.log('\n✅ Análisis completo\n');
          
          db.close();
        });
      });
    });
  });
}

main();
