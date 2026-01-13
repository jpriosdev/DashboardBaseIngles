#!/usr/bin/env node

/**
 * Script de verificación de la configuración
 * Comprueba que la BD existe y tiene datos
 */

import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.resolve(__dirname, '../public/data/qa-dashboard.db');

console.log('🔍 Verificando configuración de SQLite...\n');

// Verificar que el archivo BD existe
if (!fs.existsSync(dbPath)) {
  console.error('❌ Base de datos no encontrada:', dbPath);
  console.log('\n💡 Ejecuta: npm run db:setup\n');
  process.exit(1);
}

console.log('✅ Archivo de BD encontrado:', dbPath);

// Conectar y verificar tablas
const db = new (sqlite3.verbose().Database)(dbPath);

db.all(
  "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name",
  (err, tables) => {
    if (err) {
      console.error('❌ Error al conectar a BD:', err.message);
      process.exit(1);
    }

    console.log('\n📊 Tablas encontradas:');
    tables.forEach(t => console.log(`   ✅ ${t.name}`));

    // Verificar datos
    db.get('SELECT COUNT(*) as count FROM bugs_detail', (err, result) => {
      if (err) {
        console.error('\n❌ Error al contar bugs:', err.message);
        process.exit(1);
      }

      console.log(`\n📈 Bugs cargados: ${result.count}`);

      db.get('SELECT COUNT(*) as count FROM sprints_versions', (err, result) => {
        if (err) {
          console.error('❌ Error al contar sprints:', err.message);
          process.exit(1);
        }

        console.log(`📈 Sprints cargados: ${result.count}`);

        // Cerrar y finalizar
        db.close();

        if (result.count > 0) {
          console.log('\n✅ CONFIGURACIÓN CORRECTA - Todo listo para usar\n');
          process.exit(0);
        } else {
          console.log('\n⚠️ Datos no cargados. Ejecuta: npm run db:migrate\n');
          process.exit(1);
        }
      });
    });
  }
);
