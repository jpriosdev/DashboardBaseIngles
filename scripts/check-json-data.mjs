import fs from 'fs';

const jsonPath = 'public/data/qa-data.json';
const data = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));

console.log('=== Verificación de datos en JSON ===\n');
console.log('summary:', JSON.stringify(data.summary, null, 2));
console.log('\nproductionBugs:', data.summary?.productionBugs);
console.log('totalBugs:', data.summary?.totalBugs);

if (data.summary?.productionBugs && data.summary?.totalBugs) {
  const leakRate = Math.round((data.summary.productionBugs / data.summary.totalBugs) * 100);
  console.log(`\n✅ Leak Rate debería ser: ${leakRate}%`);
} else {
  console.log('\n❌ productionBugs no está en el JSON o está en cero');
}
