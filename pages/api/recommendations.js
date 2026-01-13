// pages/api/recommendations.js
import fs from 'fs';
import path from 'path';

export default function handler(req, res) {
  try {
    const filePath = path.join(process.cwd(), 'public', 'data', 'recommendations.json');
    
    // Verificar si existe el archivo
    if (!fs.existsSync(filePath)) {
      // Retornar recomendaciones por defecto si no existe el archivo
      return res.status(200).json({});
    }
    
    const fileContents = fs.readFileSync(filePath, 'utf8');
    const recommendations = JSON.parse(fileContents);
    
    res.status(200).json(recommendations);
  } catch (error) {
    console.error('Error al leer recomendaciones:', error);
    res.status(500).json({ error: 'Error al cargar recomendaciones' });
  }
}
