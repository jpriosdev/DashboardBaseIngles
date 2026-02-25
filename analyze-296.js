const fs = require('fs');
const csvText = fs.readFileSync('data/MockDataV0.csv', 'utf-8');

// Estrategia: buscar todas las líneas que contienen ",Fail," y agruparlas por Clave
const lines = csvText.split('\n');

// Mapeo para rastrear qué registros pertenecen a qué clave
const byKey = {};
let totalFail = 0;
let totalPass = 0;

// La primera línea es el header, saltarla y procesar el resto
for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  
  // Buscar la clave (segunda columna después de "Test Case")
  if (line.includes(',Fail,') || line.includes(',Pass,')) {
    // Reconstruir la fila completa juntando líneas si es necesario
    let fullRow = line;
    // Buscar si la próxima línea completa la actual
    while (fullRow.split(',').length < 19 && i + 1 < lines.length) {
      i++;
      fullRow += '\n' + lines[i];
    }
    
    // Ahora extraer clave y estado
    const parts = fullRow.split(',');
    if (parts.length > 1) {
      const clave = parts[1]?.trim();
      let estado = '';
      
      if (fullRow.includes(',Fail,')) {
        estado = 'Fail';
        totalFail++;
      } else if (fullRow.includes(',Pass,')) {
        estado = 'Pass';
        totalPass++;
      }
      
      if (clave && estado) {
        if (!byKey[clave]) {
          byKey[clave] = { fail: 0, pass: 0 };
        }
        if (estado === 'Fail') byKey[clave].fail++;
        else byKey[clave].pass++;
      }
    }
  }
}

console.log('╔══════════════════════════════════════════════════╗');
console.log('║   ANÁLISIS COMPLETO: CLASIFICACIÓN DE 296        ║');
console.log('╚══════════════════════════════════════════════════╝');
console.log('');
console.log('📊 CONTEOS TOTALES EN CSV:');
console.log('   Registros Fail: ' + totalFail);
console.log('   Registros Pass: ' + totalPass);
console.log('');

// Clasificar por estado
let abiertos = 0;
let resueltos = 0;
let abiertosRecords = 0;
let resueltosRecords = 0;

Object.entries(byKey).forEach(([clave, data]) => {
  if (data.fail === 0) return;
  
  if (data.pass > 0) {
    // Caso resuelto: tiene tanto Fail como Pass
    resueltos++;
    resueltosRecords += data.fail;
  } else {
    // Caso abierto: solo tiene Fail
    abiertos++;
    abiertosRecords += data.fail;
  }
});

console.log('🎯 CLASIFICACIÓN POR ESTADO:');
console.log('');
console.log('1️⃣  RESUELTOS (Fail → Pass):');
console.log('   Casos: ' + resueltos);
console.log('   Registros Fail en estos casos: ' + resueltosRecords);
console.log('   Porcentaje: ' + Math.round((resueltosRecords / totalFail) * 100) + '%');
console.log('');
console.log('2️⃣  ABIERTOS (Solo Fail, sin pasar a Pass):');
console.log('   Casos: ' + abiertos);
console.log('   Registros Fail en estos casos: ' + abiertosRecords);
console.log('   Porcentaje: ' + Math.round((abiertosRecords / totalFail) * 100) + '%');
console.log('');
console.log('╔══════════════════════════════════════════════════╗');
console.log('║  RESUMEN DE 296 REGISTROS FAIL:                  ║');
console.log('╠══════════════════════════════════════════════════╣');
console.log('║  Resueltos: ' + resueltosRecords + ' (' + Math.round((resueltosRecords/totalFail)*100) + '%)' + ' '.repeat(Math.max(0, 20-String(resueltosRecords).length)) + '║');
console.log('║  Abiertos: ' + abiertosRecords + ' (' + Math.round((abiertosRecords/totalFail)*100) + '%)' + ' '.repeat(Math.max(0, 21-String(abiertosRecords).length)) + '║');
console.log('║  TOTAL: ' + totalFail + ' registros' + ' '.repeat(Math.max(0, 28-String(totalFail).length)) + '║');
console.log('╚══════════════════════════════════════════════════╝');
console.log('');
console.log('📈 DISTRIBUCIÓN DE CASOS (Cuántos casos tienen X registros Fail):');
const failDist = {};
Object.entries(byKey).forEach(([clave, data]) => {
  if (data.fail === 0) return;
  if (!failDist[data.fail]) failDist[data.fail] = 0;
  failDist[data.fail]++;
});

const sortedKeys = Object.keys(failDist).sort((a, b) => parseInt(b) - parseInt(a));
let totalCasos = 0;
sortedKeys.forEach(k => {
  const casos = failDist[k];
  totalCasos += casos;
  console.log('   ' + k + ' registros Fail: ' + casos + ' casos (' + Math.round((parseInt(k) * casos / totalFail)*100) + '% de registros)');
});
console.log('');
console.log('   TOTAL CASOS CON FAIL: ' + totalCasos);
