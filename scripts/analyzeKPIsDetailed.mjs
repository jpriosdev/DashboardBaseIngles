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
  console.log('\n🔍 ANÁLISIS DETALLADO DE KPIs - PASO A PASO\n');
  console.log('═'.repeat(80));

  try {
    // PASO 1: Entender los datos base
    console.log('\n\n📍 PASO 1: IDENTIFICAR CASOS ÚNICOS vs EJECUCIONES');
    console.log('═'.repeat(80));
    console.log('Lógica: clave_incidencia = caso único, id_incidencia = ejecución');
    
    await runQuery(
      `SELECT 
        COUNT(*) as total_registros,
        COUNT(DISTINCT clave_incidencia) as casos_unicos,
        COUNT(DISTINCT id_incidencia) as ejecuciones,
        ROUND(COUNT(*) * 1.0 / COUNT(DISTINCT clave_incidencia), 2) as promedio_ejecuciones_por_caso
      FROM bugs_detail
      WHERE tipo_incidencia = 'Test Case'`,
      'Q1.1: Resumen - Total de registros vs casos únicos'
    );

    // PASO 2: Última ejecución
    console.log('\n\n📍 PASO 2: IDENTIFICAR LA ÚLTIMA EJECUCIÓN DE CADA CASO');
    console.log('═'.repeat(80));
    console.log('Lógica: Ordenar por fecha en sprint (descendente) y tomar el primero');
    
    await runQuery(
      `SELECT 
        clave_incidencia,
        COUNT(*) as total_ejecuciones,
        MAX(SUBSTR(sprint, -10)) as fecha_ultima_ejecucion
      FROM bugs_detail
      WHERE tipo_incidencia = 'Test Case'
      GROUP BY clave_incidencia
      ORDER BY COUNT(*) DESC
      LIMIT 5`,
      'Q2.1: Top 5 casos con más ejecuciones'
    );

    await runQuery(
      `SELECT 
        bd.clave_incidencia,
        bd.id_incidencia,
        bd.estado as estado_ultima_ejecucion,
        bd.sprint,
        COUNT(DISTINCT bd2.id_incidencia) as total_ejecuciones_del_caso
      FROM bugs_detail bd
      LEFT JOIN bugs_detail bd2 ON bd2.clave_incidencia = bd.clave_incidencia 
        AND bd2.tipo_incidencia = 'Test Case'
      WHERE bd.tipo_incidencia = 'Test Case'
        AND bd.id_incidencia = (
          SELECT bd3.id_incidencia 
          FROM bugs_detail bd3 
          WHERE bd3.clave_incidencia = bd.clave_incidencia
            AND bd3.tipo_incidencia = 'Test Case'
          ORDER BY CAST(SUBSTR(bd3.sprint, -10) AS TEXT) DESC
          LIMIT 1
        )
      LIMIT 10`,
      'Q2.2: Muestra de 10 casos con su última ejecución'
    );

    // PASO 3: Clasificar estados
    console.log('\n\n📍 PASO 3: CLASIFICAR ESTADOS EN EJECUTADOS vs PENDIENTES');
    console.log('═'.repeat(80));
    console.log('Ejecutados = Pass OR Fail');
    console.log('Pendientes = Not Executed OR In Progress OR Blocked');
    
    await runQuery(
      `SELECT 
        estado,
        COUNT(*) as total_registros,
        CASE 
          WHEN estado IN ('Pass', 'Fail') THEN 'Ejecutado'
          WHEN estado IN ('Not Executed', 'In Progress', 'Blocked') THEN 'Pendiente'
          ELSE 'Otro'
        END as clasificacion,
        ROUND((COUNT(*) * 100.0 / (SELECT COUNT(*) FROM bugs_detail WHERE tipo_incidencia = 'Test Case')), 2) as porcentaje
      FROM bugs_detail
      WHERE tipo_incidencia = 'Test Case'
      GROUP BY estado
      ORDER BY total_registros DESC`,
      'Q3.1: Distribución de todos los estados en ejecuciones'
    );

    // PASO 4: Calcular KPI por caso (última ejecución)
    console.log('\n\n📍 PASO 4: CALCULAR KPI - EFICIENCIA GENERAL');
    console.log('═'.repeat(80));
    console.log('Fórmula: (Casos con última ejecución Pass/Fail) / Total de casos únicos * 100');
    
    await runQuery(
      `SELECT 
        COUNT(*) as total_casos_unicos,
        SUM(CASE WHEN estado_ultima = 'Pass' THEN 1 ELSE 0 END) as casos_pass,
        SUM(CASE WHEN estado_ultima = 'Fail' THEN 1 ELSE 0 END) as casos_fail,
        SUM(CASE WHEN estado_ultima IN ('Pass', 'Fail') THEN 1 ELSE 0 END) as casos_ejecutados,
        SUM(CASE WHEN estado_ultima IN ('Not Executed', 'In Progress', 'Blocked') THEN 1 ELSE 0 END) as casos_pendientes,
        ROUND((SUM(CASE WHEN estado_ultima IN ('Pass', 'Fail') THEN 1 ELSE 0 END) * 100.0 / COUNT(*)), 2) as eficiencia_pct
      FROM (
        SELECT 
          bd.clave_incidencia,
          bd.estado as estado_ultima
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
      )`,
      'Q4.1: Cálculo del KPI General - Eficiencia'
    );

    // PASO 5: KPI por Prioridad
    console.log('\n\n📍 PASO 5: CALCULAR KPI - EFICIENCIA POR PRIORIDAD');
    console.log('═'.repeat(80));
    console.log('Fórmula: Para cada prioridad, aplicar la misma lógica');
    
    await runQuery(
      `SELECT 
        prioridad,
        COUNT(*) as casos_con_prioridad,
        SUM(CASE WHEN estado_ultima = 'Pass' THEN 1 ELSE 0 END) as passed,
        SUM(CASE WHEN estado_ultima = 'Fail' THEN 1 ELSE 0 END) as failed,
        SUM(CASE WHEN estado_ultima IN ('Pass', 'Fail') THEN 1 ELSE 0 END) as ejecutados,
        SUM(CASE WHEN estado_ultima IN ('Not Executed', 'In Progress', 'Blocked') THEN 1 ELSE 0 END) as pendientes,
        ROUND((SUM(CASE WHEN estado_ultima IN ('Pass', 'Fail') THEN 1 ELSE 0 END) * 100.0 / COUNT(*)), 2) as eficiencia_pct
      FROM (
        SELECT 
          bd.clave_incidencia,
          bd.prioridad,
          bd.estado as estado_ultima
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
      WHERE prioridad IS NOT NULL
      GROUP BY prioridad
      ORDER BY eficiencia_pct DESC`,
      'Q5.1: Eficiencia por Prioridad (última ejecución)'
    );

    // PASO 6: KPI por Sprint
    console.log('\n\n📍 PASO 6: CALCULAR KPI - EFICIENCIA POR SPRINT');
    console.log('═'.repeat(80));
    console.log('Fórmula: Para cada sprint, contar casos únicos con última ejecución en ese sprint');
    
    await runQuery(
      `SELECT 
        sprint,
        COUNT(*) as casos_en_sprint,
        SUM(CASE WHEN estado_ultima = 'Pass' THEN 1 ELSE 0 END) as passed,
        SUM(CASE WHEN estado_ultima = 'Fail' THEN 1 ELSE 0 END) as failed,
        SUM(CASE WHEN estado_ultima IN ('Pass', 'Fail') THEN 1 ELSE 0 END) as ejecutados,
        SUM(CASE WHEN estado_ultima IN ('Not Executed', 'In Progress', 'Blocked') THEN 1 ELSE 0 END) as pendientes,
        ROUND((SUM(CASE WHEN estado_ultima IN ('Pass', 'Fail') THEN 1 ELSE 0 END) * 100.0 / COUNT(*)), 2) as eficiencia_pct
      FROM (
        SELECT 
          bd.clave_incidencia,
          bd.sprint,
          bd.estado as estado_ultima
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
      GROUP BY sprint
      ORDER BY COUNT(*) DESC
      LIMIT 10`,
      'Q6.1: Top 10 Sprints por cantidad de casos (eficiencia)'
    );

    // PASO 7: Desglose detallado de un caso ejemplo
    console.log('\n\n📍 PASO 7: EJEMPLO DETALLADO - SEGUIMIENTO DE UN CASO');
    console.log('═'.repeat(80));
    console.log('Mostramos todas las ejecuciones de UN CASO y cómo se identificó la última\n');
    
    const casosEjemplo = await runQuery(
      `SELECT DISTINCT clave_incidencia FROM bugs_detail 
       WHERE tipo_incidencia = 'Test Case' LIMIT 1`,
      'Q7.0: Seleccionar un caso ejemplo'
    );

    if (casosEjemplo.length > 0) {
      const caseId = casosEjemplo[0].clave_incidencia;
      
      await runQuery(
        `SELECT 
          clave_incidencia,
          id_incidencia,
          resumen,
          estado,
          sprint,
          CAST(SUBSTR(sprint, -10) AS TEXT) as fecha_sprint_ordenable
        FROM bugs_detail
        WHERE clave_incidencia = '${caseId}' AND tipo_incidencia = 'Test Case'
        ORDER BY CAST(SUBSTR(sprint, -10) AS TEXT) DESC`,
        `Q7.1: Todas las ejecuciones del caso "${caseId}"`
      );

      await runQuery(
        `SELECT 
          clave_incidencia,
          id_incidencia,
          estado as estado_ultima_ejecucion,
          sprint as sprint_ultima_ejecucion,
          CASE 
            WHEN estado IN ('Pass', 'Fail') THEN '✅ EJECUTADO'
            WHEN estado IN ('Not Executed', 'In Progress', 'Blocked') THEN '⏳ PENDIENTE'
            ELSE '❓ OTRO'
          END as estatus_final_caso
        FROM bugs_detail
        WHERE clave_incidencia = '${caseId}' AND tipo_incidencia = 'Test Case'
          AND id_incidencia = (
            SELECT id_incidencia FROM bugs_detail
            WHERE clave_incidencia = '${caseId}' AND tipo_incidencia = 'Test Case'
            ORDER BY CAST(SUBSTR(sprint, -10) AS TEXT) DESC
            LIMIT 1
          )`,
        `Q7.2: RESULTADO FINAL del caso "${caseId}" (considerando solo última ejecución)`
      );
    }

    // PASO 8: Validación de exactitud
    console.log('\n\n📍 PASO 8: VALIDACIÓN - COMPARAR TOTALES');
    console.log('═'.repeat(80));
    
    const totalRegistros = await runQuery(
      `SELECT COUNT(*) as total FROM bugs_detail WHERE tipo_incidencia = 'Test Case'`,
      'Q8.1: Total de registros en bugs_detail (ejecuciones)'
    );

    const totalCasos = await runQuery(
      `SELECT COUNT(DISTINCT clave_incidencia) as total FROM bugs_detail WHERE tipo_incidencia = 'Test Case'`,
      'Q8.2: Total de casos únicos (clave_incidencia)'
    );

    const totalEjecuciones = await runQuery(
      `SELECT COUNT(DISTINCT id_incidencia) as total FROM bugs_detail WHERE tipo_incidencia = 'Test Case'`,
      'Q8.3: Total de ejecuciones únicas (id_incidencia)'
    );

    console.log('\n📊 VERIFICACIÓN:');
    console.log(`   Registros = Ejecuciones: ${totalRegistros[0].total === totalEjecuciones[0].total ? '✅ OK' : '❌ ERROR'}`);
    console.log(`   Casos < Ejecuciones: ${totalCasos[0].total < totalRegistros[0].total ? '✅ OK (esperado)' : '❌ ERROR'}`);

    console.log('\n' + '═'.repeat(80));
    console.log('\n✅ ANÁLISIS COMPLETO\n');

    db.close();
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    db.close();
    process.exit(1);
  }
}

main();
