import { default as DAL } from './lib/database/dal.js';

(async () => {
  console.log('=== TEST: getTestCasesReuse() ===');
  const result = await DAL.getTestCasesReuse();
  console.log('Result:', JSON.stringify(result, null, 2));
  
  if (result) {
    const { total_cases, cases_reused, cases_used, cases_not_used } = result;
    console.log('\n=== DESGLOSE ===');
    console.log(`Total: ${total_cases}`);
    console.log(`Reused (>=2): ${cases_reused}`);
    console.log(`Used (=1): ${cases_used}`);
    console.log(`Not Used (=0): ${cases_not_used}`);
    console.log(`Suma: ${cases_reused + cases_used + cases_not_used} (debe ser ${total_cases})`);
  }
  process.exit(0);
})();
