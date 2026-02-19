const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'public', 'data', 'qa-dashboard.db');
const db = new Database(dbPath, { readonly: true });

console.log('\n📊 Verificación de Test Cases\n');

// Test cases totales (con 'test' en resumen, cualquier estado)
const totalQuery = `
  SELECT 
    COUNT(*) as total,
    COUNT(DISTINCT sprint) as sprints
  FROM bugs_detail
  WHERE LOWER(COALESCE(resumen,'')) LIKE '%test%'
`;
const totalResult = db.prepare(totalQuery).get();
console.log('✅ Test cases TOTALES (con "test" en resumen):');
console.log(`   Total: ${totalResult.total}`);
console.log(`   Sprints: ${totalResult.sprints}\n`);

// Test cases ejecutados (con estados específicos)
const executedQuery = `
  SELECT 
    COUNT(*) as executed,
    COUNT(DISTINCT sprint) as sprints
  FROM bugs_detail
  WHERE LOWER(COALESCE(resumen,'')) LIKE '%test%'
    AND estado IN ('Done', 'Reviewed', 'Testing Complete', 'Approved for Release')
`;
const executedResult = db.prepare(executedQuery).get();
console.log('✅ Test cases EJECUTADOS (estados: Done, Reviewed, Testing Complete, Approved for Release):');
console.log(`   Total: ${executedResult.executed}`);
console.log(`   Sprints: ${executedResult.sprints}\n`);

// Distribución por estado
const statesQuery = `
  SELECT 
    estado,
    COUNT(*) as count
  FROM bugs_detail
  WHERE LOWER(COALESCE(resumen,'')) LIKE '%test%'
  GROUP BY estado
  ORDER BY count DESC
`;
const statesResult = db.prepare(statesQuery).all();
console.log('📈 Distribución por estado (test cases):');
statesResult.forEach(row => {
  const isExecuted = ['Done', 'Reviewed', 'Testing Complete', 'Approved for Release'].includes(row.estado);
  console.log(`   ${row.estado}: ${row.count} ${isExecuted ? '✓' : ''}`);
});

// Por sprint (top 5)
const sprintQuery = `
  SELECT 
    sprint,
    COUNT(*) as total_tests,
    SUM(CASE 
      WHEN estado IN ('Done', 'Reviewed', 'Testing Complete', 'Approved for Release')
      THEN 1 ELSE 0 
    END) as executed_tests
  FROM bugs_detail
  WHERE LOWER(COALESCE(resumen,'')) LIKE '%test%'
  GROUP BY sprint
  ORDER BY total_tests DESC
  LIMIT 5
`;
const sprintResult = db.prepare(sprintQuery).all();
console.log('\n📊 Top 5 Sprints (test cases):');
sprintResult.forEach(row => {
  const percentage = row.total_tests > 0 
    ? Math.round((row.executed_tests / row.total_tests) * 100) 
    : 0;
  console.log(`   ${row.sprint || '(sin sprint)'}: ${row.executed_tests}/${row.total_tests} ejecutados (${percentage}%)`);
});

db.close();
console.log('\n✅ Verificación completada\n');
