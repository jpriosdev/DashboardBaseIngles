// pages/api/qa-data.js
import { getQAData } from '../../lib/qaDataLoader.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  try {
    const force = req.query?.force === '1' || req.query?.force === 'true';
    const qaData = await getQAData({ forceReload: force });
    
    // Agregar info de debugging
    const response = {
      ...qaData,
      _debug: {
        timestamp: new Date().toISOString(),
        dataSource: qaData._dataSource,
        isRealData: qaData._isRealData,
        sprintCount: qaData.sprintData?.length || 0,
      }
    };
    
    return res.status(200).json(response);
  } catch (error) {
    console.error('Error loading QA data:', error);
    return res.status(500).json({
      error: 'No QA data is available right now. Try again later.',
      errorMessage: error.message,
    });
  }
}
