import sqlite3 from 'sqlite3';

const db = new sqlite3.Database('public/data/qa-dashboard.db', (err) => {
  if (err) {
    console.error('Error opening database:', err);
    process.exit(1);
  }
});

console.log('=== Leak Rate Verification ===\n');

// Count all bugs
db.get(`
  SELECT COUNT(*) as count 
  FROM bugs_detail 
  WHERE tipo_incidencia = 'Bug'
`, (err, totalBugs) => {
  if (err) console.error('Error counting bugs:', err);
  
  // Count Production Support Defects
  db.get(`
    SELECT COUNT(*) as count 
    FROM bugs_detail 
    WHERE tipo_incidencia = 'Production Support Defect'
  `, (err, productionDefects) => {
    if (err) console.error('Error counting defects:', err);
    
    // Query the view directly
    db.get(`SELECT * FROM vw_bug_resolution_stats`, (err, viewData) => {
      if (err) console.error('Error querying view:', err);
      
      console.log(`Total Bugs: ${totalBugs.count}`);
      console.log(`Production Support Defects: ${productionDefects.count}`);
      console.log(`\nvw_bug_resolution_stats view:`);
      console.log(`  - bugs_closed: ${viewData.bugs_closed}`);
      console.log(`  - production_bugs: ${viewData.production_bugs}`);
      
      if (totalBugs.count > 0) {
        const leakRate = Math.round((productionDefects.count / totalBugs.count) * 100);
        console.log(`\n✅ Leak Rate: ${productionDefects.count}/${totalBugs.count} = ${leakRate}%`);
      } else {
        console.log('\n⚠️ No bugs found');
      }
      
      db.close();
    });
  });
});
