import sqlite3 from 'sqlite3';

const db = new sqlite3.Database('public/data/qa-dashboard.db', (err) => {
  if (err) {
    console.error('Error:', err);
    process.exit(1);
  }
});

console.log('=== Tipos de incidencia en la base de datos ===\n');

db.all(`
  SELECT DISTINCT tipo_incidencia, COUNT(*) as count
  FROM bugs_detail
  GROUP BY tipo_incidencia
`, (err, rows) => {
  if (err) {
    console.error('Error:', err);
  } else {
    rows.forEach(row => {
      console.log(`${row.tipo_incidencia}: ${row.count}`);
    });
    
    console.log('\n=== Bugs con estado y tipo ===\n');
    
    db.all(`
      SELECT tipo_incidencia, COUNT(*) as count
      FROM bugs_detail
      WHERE tipo_incidencia = 'Bug'
      GROUP BY tipo_incidencia
    `, (err, bugRows) => {
      if (err) console.error('Error:', err);
      console.log('Bugs: ', bugRows[0]?.count || 0);
      
      // Production Support Defects analysis
      db.all(`
        SELECT tipo_incidencia, COUNT(*) as count
        FROM bugs_detail
        WHERE tipo_incidencia = 'Production Support Defect'
        GROUP BY tipo_incidencia
      `, (err, prodRows) => {
        if (err) console.error('Error:', err);
        console.log('Production Support Defects: ', prodRows[0]?.count || 0);
        
        db.close();
      });
    });
  }
});
