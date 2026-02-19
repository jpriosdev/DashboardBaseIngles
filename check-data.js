const fs = require('fs');
const data = JSON.parse(fs.readFileSync('public/data/qa-data.json', 'utf8'));
console.log('📊 Bugs by Priority:\n');
Object.entries(data.bugsByPriority).forEach(([priority, counts]) => {
  const total = (counts.pending || 0) + (counts.resolved || 0) + (counts.canceled || 0);
  console.log(`  ${priority}:`);
  console.log(`    Pending: ${counts.pending}, Resolved: ${counts.resolved}, Canceled: ${counts.canceled}, Total: ${total}`);
});
