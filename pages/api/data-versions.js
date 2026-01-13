/**
 * API Endpoint: GET /api/data-versions
 * 
 * Devuelve lista de versiones disponibles (actual y anterior)
 */

import fs from 'fs';
import path from 'path';

export default function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const VERSIONS_DIR = path.join(process.cwd(), 'data', 'versions');
    const DATA_DIR = path.join(process.cwd(), 'data');
    const currentJsonPath = path.join(DATA_DIR, 'qa-data.json');

    const versions = [];

    // Versión actual
    if (fs.existsSync(currentJsonPath)) {
      const stats = fs.statSync(currentJsonPath);
      const data = JSON.parse(fs.readFileSync(currentJsonPath, 'utf8'));
      
      versions.push({
        id: 'current',
        label: 'Versión Actual',
        timestamp: stats.mtime.toISOString(),
        totalBugs: data.summary?.totalBugs || 0,
        sprints: data.sprintData?.length || 0,
        developers: data.developerData?.length || 0,
        active: true
      });
    }

    // Versión anterior (backup más reciente)
    if (fs.existsSync(VERSIONS_DIR)) {
      const backups = fs.readdirSync(VERSIONS_DIR)
        .filter(f => f.startsWith('data-backup-') && f.endsWith('.json'))
        .sort()
        .reverse();

      if (backups.length > 0) {
        const backupPath = path.join(VERSIONS_DIR, backups[0]);
        const stats = fs.statSync(backupPath);
        const data = JSON.parse(fs.readFileSync(backupPath, 'utf8'));
        
        versions.push({
          id: backups[0],
          label: 'Versión Anterior',
          timestamp: stats.mtime.toISOString(),
          totalBugs: data.summary?.totalBugs || 0,
          sprints: data.sprintData?.length || 0,
          developers: data.developerData?.length || 0,
          active: false
        });
      }
    }

    return res.status(200).json({
      versions,
      count: versions.length
    });
  } catch (error) {
    console.error('Error fetching versions:', error);
    return res.status(500).json({
      error: 'Error al obtener versiones',
      details: error.message
    });
  }
}
