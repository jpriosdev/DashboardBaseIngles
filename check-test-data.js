const fs = require('fs');
const data = JSON.parse(fs.readFileSync('public/data/qa-data.json', 'utf8'));
console.log('📊 Summary:');
console.log(`  Total Bugs: ${data.summary.totalBugs}`);
console.log(`  Test Cases Total: ${data.summary.testCasesTotal}`);
console.log(`  Test Cases Executed: ${data.summary.testCasesExecuted}`);
console.log(`  Test Cases Planned: ${data.summary.testCasesPlanned}`);
console.log('');
console.log('📊 Sprint Data Sample (first 3):');
data.sprintData.slice(0, 3).forEach(sprint => {
  console.log(`\n  Sprint: ${sprint.sprint || '(empty)'}`);
  console.log(`    Total: ${sprint.total}, Bugs: ${sprint.bugs}`);
  console.log(`    Test Cases: ${sprint.testCases}, Executed: ${sprint.testCasesExecuted}, Planned: ${sprint.testCasesPlanned}`);
});
