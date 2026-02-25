// pages/api/testers-data.js
import DAL from '../../lib/database/dal.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  try {
    // Obtener datos de testers desde la BD
    const testersSummary = await DAL.getTestersSummaryWithProducts();
    
    // Transformar para que sea compatible con TeamAnalysis
    const testersData = (testersSummary || []).map(tester => {
      // Extraer módulos y tipos del nombre del tester (simplificado)
      // En una versión futura, se podría hacer una query detallada por tester
      return {
        // Identificadores
        reportado: tester.tester,
        tester: tester.tester,
        name: tester.tester,
        
        // Productos/TAG0
        products: tester.products ? tester.products.split(', ').filter(p => p && p.trim()) : [],
        productsJoined: tester.products || '',
        
        // Métricas de ejecución
        totalTests: tester.total_bugs || 0,
        totalExecutions: tester.total_bugs || 0,
        passed: tester.passed || 0,
        failed: tester.failed || 0,
        notExecuted: tester.not_executed || 0,
        inProgress: tester.in_progress || 0,
        blocked: tester.blocked || 0,
        
        // Métricas adicionales
        sprintsInvolved: tester.sprints_involved || 0,
        modulesTestedCount: tester.modules_tested || 0,
        testTypesCount: tester.test_types || 0,
        
        // Arreglos vacíos (podrían llenarse con query detallada)
        modules: [],
        types: [],
        branches: []
      };
    });

    return res.status(200).json({
      testersData,
      totalTesters: testersData.length,
      timestamp: new Date().toISOString(),
      _dataSource: 'sqlite',
      _isRealData: true
    });
  } catch (error) {
    console.error('Error loading testers data:', error);
    return res.status(500).json({
      error: 'Error loading testers data',
      errorMessage: error.message,
      testersData: []
    });
  }
}
