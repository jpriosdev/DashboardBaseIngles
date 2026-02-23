#!/usr/bin/env node

import path from 'path';
import { fileURLToPath } from 'url';
import sqlite3 from 'sqlite3';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, '../public/data/qa-dashboard.db');

const db = new sqlite3.Database(dbPath);

function runQuery(sql, description) {
  return new Promise((resolve, reject) => {
    db.all(sql, (err, rows) => {
      if (err) {
        console.error(`❌ Error: ${err.message}`);
        reject(err);
      } else {
        console.log(`\n✅ ${description}`);
        console.log('─'.repeat(80));
        console.table(rows);
        resolve(rows);
      }
    });
  });
}

async function main() {
  console.log('\n🎯 ANÁLISIS: TEST CASES DESIGNED\n');
  console.log('═'.repeat(80));

  try {
    // Paso 1: ¿Qué significa "Test Cases Designed"?
    console.log('\n\n📍 PASO 1: DEFINICIÓN DE "TEST CASES DESIGNED"');
    console.log('═'.repeat(80));
    console.log(`
"Test Cases Designed" = Total de casos de prueba ÚNICOS que existen en el sistema
(independientemente de cuántas veces se han ejecutado)

Cálculo: COUNT(DISTINCT clave_incidencia) WHERE tipo_incidencia = 'Test Case'
    `);

    // Paso 2: Contar casos diseñados
    const designed = await runQuery(
      `SELECT 
        COUNT(DISTINCT clave_incidencia) as test_cases_designed
      FROM bugs_detail
      WHERE tipo_incidencia = 'Test Case'`,
      'PASO 2: Total de casos diseñados'
    );

    // Paso 3: Desglose por atributo
    console.log('\n\n📍 PASO 3: CASOS DISEÑADOS POR ATRIBUTO');
    console.log('═'.repeat(80));
    console.log('Muestra qué módulos/atributos tienen casos diseñados\n');

    await runQuery(
      `SELECT 
        atributo,
        COUNT(DISTINCT clave_incidencia) as casos_diseñados,
        COUNT(DISTINCT id_incidencia) as total_ejecuciones,
        ROUND(COUNT(DISTINCT id_incidencia) * 1.0 / COUNT(DISTINCT clave_incidencia), 2) as promedio_ejecuciones
      FROM bugs_detail
      WHERE tipo_incidencia = 'Test Case' AND atributo IS NOT NULL AND atributo != ''
      GROUP BY atributo
      ORDER BY casos_diseñados DESC
      LIMIT 15`,
      'Q3.1: Casos diseñados por atributo'
    );

    // Paso 4: Casos diseñados por nivel de prueba
    console.log('\n\n📍 PASO 4: CASOS DISEÑADOS POR NIVEL DE PRUEBA');
    console.log('═'.repeat(80));
    
    await runQuery(
      `SELECT 
        nivel_prueba,
        COUNT(DISTINCT clave_incidencia) as casos_diseñados,
        COUNT(*) as total_ejecuciones
      FROM bugs_detail
      WHERE tipo_incidencia = 'Test Case' AND nivel_prueba IS NOT NULL AND nivel_prueba != ''
      GROUP BY nivel_prueba
      ORDER BY casos_diseñados DESC`,
      'Q4.1: Casos diseñados por nivel de prueba'
    );

    // Paso 5: Casos diseñados por tipo de prueba
    console.log('\n\n📍 PASO 5: CASOS DISEÑADOS POR TIPO DE PRUEBA');
    console.log('═'.repeat(80));
    
    await runQuery(
      `SELECT 
        tipo_prueba,
        COUNT(DISTINCT clave_incidencia) as casos_diseñados,
        COUNT(*) as total_ejecuciones
      FROM bugs_detail
      WHERE tipo_incidencia = 'Test Case' AND tipo_prueba IS NOT NULL AND tipo_prueba != ''
      GROUP BY tipo_prueba
      ORDER BY casos_diseñados DESC`,
      'Q5.1: Casos diseñados por tipo de prueba'
    );

    // Paso 6: Casos diseñados por prioridad
    console.log('\n\n📍 PASO 6: CASOS DISEÑADOS POR PRIORIDAD');
    console.log('═'.repeat(80));
    
    await runQuery(
      `SELECT 
        prioridad,
        COUNT(DISTINCT clave_incidencia) as casos_diseñados,
        COUNT(*) as total_ejecuciones,
        ROUND(COUNT(*) * 1.0 / COUNT(DISTINCT clave_incidencia), 2) as promedio_ejecuciones
      FROM bugs_detail
      WHERE tipo_incidencia = 'Test Case'
      GROUP BY prioridad
      ORDER BY casos_diseñados DESC`,
      'Q6.1: Casos diseñados por prioridad'
    );

    // Paso 7: Casos diseñados por sprint
    console.log('\n\n📍 PASO 7: CASOS DISEÑADOS POR SPRINT (PRIMERA EJECUCIÓN)');
    console.log('═'.repeat(80));
    console.log('Muestra en qué sprint se diseñaron/crearon los casos inicialmente\n');
    
    await runQuery(
      `SELECT 
        sprint,
        COUNT(DISTINCT clave_incidencia) as casos_nuevos_diseñados,
        min(fecha_reporte) as fecha_primer_diseño
      FROM (
        SELECT 
          bd.clave_incidencia,
          bd.sprint,
          bd.fecha_reporte,
          ROW_NUMBER() OVER (PARTITION BY bd.clave_incidencia ORDER BY CAST(SUBSTR(bd.sprint, -10) AS TEXT) ASC) as rn
        FROM bugs_detail bd
        WHERE bd.tipo_incidencia = 'Test Case'
      )
      WHERE rn = 1
      GROUP BY sprint
      ORDER BY COUNT(DISTINCT clave_incidencia) DESC
      LIMIT 10`,
      'Q7.1: Top 10 sprints donde se diseñaron más casos'
    );

    // Paso 8: Estado de casos diseñados
    console.log('\n\n📍 PASO 8: ESTADO DE LOS CASOS DISEÑADOS');
    console.log('═'.repeat(80));
    console.log('Considerando solo la ÚLTIMA EJECUCIÓN de cada caso\n');
    
    await runQuery(
      `SELECT 
        estado as estado_ultima_ejecucion,
        COUNT(*) as casos_en_este_estado,
        ROUND((COUNT(*) * 100.0 / (SELECT COUNT(DISTINCT clave_incidencia) FROM bugs_detail WHERE tipo_incidencia = 'Test Case')), 2) as porcentaje
      FROM (
        SELECT 
          bd.clave_incidencia,
          bd.estado
        FROM bugs_detail bd
        WHERE bd.tipo_incidencia = 'Test Case'
          AND bd.id_incidencia = (
            SELECT bd2.id_incidencia 
            FROM bugs_detail bd2 
            WHERE bd2.clave_incidencia = bd.clave_incidencia
              AND bd2.tipo_incidencia = 'Test Case'
            ORDER BY CAST(SUBSTR(bd2.sprint, -10) AS TEXT) DESC
            LIMIT 1
          )
      )
      GROUP BY estado
      ORDER BY casos_en_este_estado DESC`,
      'Q8.1: Distribución de estados (última ejecución)'
    );

    // Paso 9: Casos diseñados sin ejecutar
    console.log('\n\n📍 PASO 9: CASOS DISEÑADOS QUE NO HAN SIDO EJECUTADOS');
    console.log('═'.repeat(80));
    console.log('Casos cuya única ejecución está en estado "Not Executed"\n');
    
    const neverExecuted = await runQuery(
      `SELECT 
        COUNT(*) as casos_nunca_ejecutados
      FROM (
        SELECT 
          bd.clave_incidencia,
          bd.estado
        FROM bugs_detail bd
        WHERE bd.tipo_incidencia = 'Test Case'
          AND bd.id_incidencia = (
            SELECT bd2.id_incidencia 
            FROM bugs_detail bd2 
            WHERE bd2.clave_incidencia = bd.clave_incidencia
              AND bd2.tipo_incidencia = 'Test Case'
            ORDER BY CAST(SUBSTR(bd2.sprint, -10) AS TEXT) DESC
            LIMIT 1
          )
      )
      WHERE estado = 'Not Executed'`,
      'Q9.1: Total de casos nunca ejecutados'
    );

    // Paso 10: Cobertura de ejecución
    console.log('\n\n📍 PASO 10: COBERTURA DE EJECUCIÓN');
    console.log('═'.repeat(80));
    console.log('Qué porcentaje de casos diseñados han sido ejecutados al menos una vez\n');
    
    const executed = await runQuery(
      `SELECT 
        COUNT(DISTINCT clave_incidencia) as casos_ejecutados_alguna_vez
      FROM bugs_detail
      WHERE tipo_incidencia = 'Test Case'
        AND estado IN ('Pass', 'Fail', 'In Progress', 'Blocked')`,
      'Q10.1: Casos que han sido ejecutados (algún estado no "Not Executed")'
    );

    // Resumen final
    console.log('\n\n📊 RESUMEN FINAL - TEST CASES DESIGNED');
    console.log('═'.repeat(80));
    console.log(`
Total de casos diseñados:          ${designed[0].test_cases_designed}
  ├─ Ejecutados alguna vez:        ${executed[0].casos_ejecutados_alguna_vez}
  └─ Nunca ejecutados:             ${neverExecuted[0].casos_nunca_ejecutados}

Cobertura de ejecución: ${(executed[0].casos_ejecutados_alguna_vez * 100 / designed[0].test_cases_designed).toFixed(2)}%
    `);

    console.log('═'.repeat(80));
    console.log('\n✅ ANÁLISIS COMPLETADO\n');

    db.close();
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    db.close();
    process.exit(1);
  }
}

main();
