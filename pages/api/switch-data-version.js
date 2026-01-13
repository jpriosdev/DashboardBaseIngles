/**
 * API Endpoint: POST /api/switch-data-version
 * 
 * Permite cambiar entre versión actual y anterior de datos
 */

import fs from 'fs';
import path from 'path';

export default function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { versionId } = req.body;

    if (!versionId || (versionId !== 'current' && !versionId.startsWith('data-backup-'))) {
      return res.status(400).json({ error: 'ID de versión inválido' });
    }

    const VERSIONS_DIR = path.join(process.cwd(), 'data', 'versions');
    const DATA_DIR = path.join(process.cwd(), 'data');
    const currentJsonPath = path.join(DATA_DIR, 'qa-data.json');

    let sourceFile;

    if (versionId === 'current') {
      return res.status(200).json({
        success: true,
        message: 'Ya estás usando la versión actual',
        version: 'current'
      });
    } else {
      // Cargar versión anterior (backup)
      sourceFile = path.join(VERSIONS_DIR, versionId);
      
      if (!fs.existsSync(sourceFile)) {
        return res.status(404).json({ error: 'Versión no encontrada' });
      }

      // Hacer backup de la versión actual
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupName = `data-backup-${timestamp}.json`;
      const backupPath = path.join(VERSIONS_DIR, backupName);
      
      if (fs.existsSync(currentJsonPath)) {
        fs.copyFileSync(currentJsonPath, backupPath);
      }

      // Copiar versión anterior a la actual
      const versionData = fs.readFileSync(sourceFile, 'utf8');
      fs.writeFileSync(currentJsonPath, versionData);

      console.log(`✅ Cambiado a versión: ${versionId}`);

      return res.status(200).json({
        success: true,
        message: 'Versión cambiada exitosamente',
        version: versionId,
        timestamp: new Date().toISOString()
      });
    }
  } catch (error) {
    console.error('Error switching version:', error);
    return res.status(500).json({
      error: 'Error al cambiar versión',
      details: error.message
    });
  }
}
