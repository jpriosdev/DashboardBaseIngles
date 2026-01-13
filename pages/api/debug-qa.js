// pages/api/debug-qa.js
import path from 'path';
import fs from 'fs';

export default async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      // Ruta al archivo JSON procesado (no público)
      const jsonPath = path.join(process.cwd(), 'data', 'qa-data.json');
      
      // Verificar si el archivo existe
      if (fs.existsSync(jsonPath)) {
        const rawData = fs.readFileSync(jsonPath, 'utf-8');
        const qaData = JSON.parse(rawData);
        
        res.status(200).json({
          status: 'success',
          source: 'qa-data.json',
          dataAvailable: true,
          summary: qaData.summary || null,
          developerCount: qaData.developerData?.length || 0,
          sprintCount: qaData.sprintData?.length || 0,
          fullData: qaData
        });
      } else {
        // Si no existe el JSON, intentar procesar el Excel directamente
        const excelPath = path.join(process.cwd(), 'data', 'Reporte_QA_V1.xlsx');
        
        if (fs.existsSync(excelPath)) {
          res.status(200).json({
            status: 'warning',
            message: 'JSON file not found, but Excel file exists',
            excelPath,
            suggestion: 'Run: node scripts/update-excel-data.js',
            dataAvailable: false
          });
        } else {
          res.status(404).json({
            status: 'error',
            message: 'No data sources found',
            jsonPath,
            excelPath,
            dataAvailable: false
          });
        }
      }
      
    } catch (error) {
      console.error('Debug API Error:', error);
      res.status(500).json({
        status: 'error',
        message: error.message,
        stack: error.stack
      });
    }
  } else {
    res.setHeader('Allow', ['GET']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
