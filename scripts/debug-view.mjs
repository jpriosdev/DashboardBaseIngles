import sqlite3 from 'sqlite3';

const db = new sqlite3.Database('public/data/qa-dashboard.db', (err) => {
  if (err) {
    console.error('Error:', err);
    process.exit(1);
  }
});

console.log('=== Debug vw_bug_resolution_stats ===\n');

// Query the view
db.get(`SELECT * FROM vw_bug_resolution_stats`, (err, viewData) => {
  if (err) {
    console.error('Error querying view:', err);
  } else {
    console.log('View data:', viewData);
  }
  
  // Count Production Support Defects directly
  db.get(`SELECT COUNT(*) as count FROM bugs_detail WHERE tipo_incidencia = 'Production Support Defect'`, (err, defects) => {
    if (err) console.error('Error:', err);
    console.log('\nDirect count of Production Support Defects:', defects.count);
    
    // Count from Bug type
    db.get(`SELECT COUNT(*) as count FROM bugs_detail WHERE tipo_incidencia = 'Bug'`, (err, bugs) => {
      if (err) console.error('Error:', err);
      console.log('Direct count of Bugs:', bugs.count);
      
      // Recreate the view manually
      db.get(`
        SELECT
          SUM(CASE WHEN tipo_incidencia = 'Bug' AND estado NOT IN ('To Do', 'In Development', 'Ready for Testing', 'Canceled') THEN 1 ELSE 0 END) as bugs_closed,
          SUM(CASE WHEN tipo_incidencia = 'Production Support Defect' THEN 1 ELSE 0 END) as production_bugs
        FROM bugs_detail
      `, (err, manualCalc) => {
        if (err) console.error('Error:', err);
        console.log('\nManual calculation:', manualCalc);
        
        db.close();
      });
    });
  });
});
