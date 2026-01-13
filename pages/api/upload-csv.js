/**
 * API Endpoint: POST /api/upload-csv
 * 
 * Permite al usuario cargar un nuevo archivo CSV y actualizar los datos del dashboard.
 * Automáticamente:
 * 1. Respalda la versión anterior de datos
 * 2. Carga nuevos datos en SQLite
 * 3. Regenera el JSON
 * 4. Actualiza el dashboard
 */

import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import formidable from 'formidable';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const execAsync = promisify(exec);

// Configuración de directorios
const UPLOADS_DIR = path.join(process.cwd(), 'data', 'uploads');
const VERSIONS_DIR = path.join(process.cwd(), 'data', 'versions');
const DATA_DIR = path.join(process.cwd(), 'data');
const DB_PATH = path.join(process.cwd(), 'public', 'data', 'qa-dashboard.db');

// Crear directorios si no existen
[UPLOADS_DIR, VERSIONS_DIR, DATA_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

export const config = {
  api: {
    bodyParser: false, // Desabilitar bodyParser para formidable
  },
};

async function backupCurrentVersion() {
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupName = `data-backup-${timestamp}.json`;
    const backupPath = path.join(VERSIONS_DIR, backupName);

    // Leer JSON actual
    const currentJsonPath = path.join(DATA_DIR, 'qa-data.json');
    if (fs.existsSync(currentJsonPath)) {
      const content = fs.readFileSync(currentJsonPath, 'utf8');
      fs.writeFileSync(backupPath, content);
      
      // Mantener solo 2 versiones: actual y anterior
      const backups = fs.readdirSync(VERSIONS_DIR)
        .filter(f => f.startsWith('data-backup-') && f.endsWith('.json'))
        .sort()
        .reverse();
      
      // Si hay más de 2, eliminar las antiguas
      if (backups.length > 2) {
        backups.slice(2).forEach(oldBackup => {
          fs.unlinkSync(path.join(VERSIONS_DIR, oldBackup));
        });
      }
      
      console.log(`✅ Backup creado: ${backupName}`);
      return backupPath;
    }
  } catch (error) {
    console.error('Error creando backup:', error);
    throw error;
  }
}

async function processCsvFile(filePath) {
  try {
    console.log(`\n📁 Procesando CSV: ${filePath}`);
    
    // 1. Hacer backup de versión anterior
    console.log('📝 Creando backup de versión anterior...');
    await backupCurrentVersion();
    
    // 2. Copiar nuevo CSV a carpeta de datos
    const newCsvPath = path.join(DATA_DIR, 'MockDataV0.csv');
    fs.copyFileSync(filePath, newCsvPath);
    console.log('✅ Archivo CSV actualizado');
    
    // 3. Ejecutar migración a SQLite
    console.log('🗄️ Migrando datos a SQLite...');
    const migrationScript = path.join(process.cwd(), 'scripts', 'migrateToSqliteCSV.mjs');
    const { stdout, stderr } = await execAsync(`node ${migrationScript}`, {
      cwd: process.cwd(),
      timeout: 60000
    });
    
    if (stderr && stderr.includes('Error')) {
      throw new Error(`Migration error: ${stderr}`);
    }
    console.log('✅ Datos migrados a SQLite');
    
    // 4. Regenerar JSON
    console.log('📊 Regenerando JSON...');
    const jsonScript = path.join(process.cwd(), 'scripts', 'generateJsonFromSqlite.mjs');
    const { stdout: jsonOut, stderr: jsonErr } = await execAsync(`node ${jsonScript}`, {
      cwd: process.cwd(),
      timeout: 60000
    });
    
    if (jsonErr && jsonErr.includes('Error')) {
      throw new Error(`JSON generation error: ${jsonErr}`);
    }
    console.log('✅ JSON regenerado');
    
    // 5. Limpiar archivo temporal
    fs.unlinkSync(filePath);
    
    return {
      success: true,
      message: 'Datos cargados y procesados exitosamente',
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('Error procesando CSV:', error);
    throw error;
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Parsear formulario
    const form = formidable({ 
      uploadDir: UPLOADS_DIR,
      keepExtensions: true,
      maxFileSize: 50 * 1024 * 1024 // 50MB máximo
    });

    const [fields, files] = await form.parse(req);
    const uploadedFile = files.file?.[0];

    if (!uploadedFile) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Validar que es CSV
    if (!uploadedFile.originalFilename?.toLowerCase().endsWith('.csv')) {
      fs.unlinkSync(uploadedFile.filepath);
      return res.status(400).json({ error: 'Solo se aceptan archivos CSV' });
    }

    // Procesar el archivo
    const result = await processCsvFile(uploadedFile.filepath);
    
    return res.status(200).json(result);
  } catch (error) {
    console.error('Upload error:', error);
    return res.status(500).json({
      error: 'Error al procesar el archivo',
      details: error.message
    });
  }
}
