// utils/recommendationEngine.js

/**
 * Motor de recomendaciones que obtiene recomendaciones paramétricas desde los datos
 * o usa valores por defecto si no están disponibles en Excel
 */

const DEFAULT_RECOMMENDATIONS = {
  testCases: [
    { condition: 'avg >= 200', text: 'Excelente cobertura: El equipo mantiene un volumen robusto de testing', priority: 'baja' },
    { condition: 'avg >= 150 && avg < 200', text: 'Cobertura aceptable: Considerar incrementar casos para módulos críticos', priority: 'media' },
    { condition: 'avg < 150', text: 'Baja cobertura: Urgente aumentar volumen de casos de prueba', priority: 'alta' },
    { condition: 'default', text: 'Implementar métricas de cobertura de código para validar completitud', priority: 'media' },
    { condition: 'default', text: 'Automatizar casos repetitivos para aumentar eficiencia', priority: 'media' },
    { condition: 'default', text: 'Priorizar testing de funcionalidades críticas del negocio', priority: 'media' }
  ],
  resolutionEfficiency: [
    { condition: 'efficiency >= 80', text: 'Excelente eficiencia: Equipo altamente productivo en resolución', priority: 'baja' },
    { condition: 'efficiency >= 70 && efficiency < 80', text: 'Buena eficiencia: Mantener el ritmo actual de resolución', priority: 'baja' },
    { condition: 'efficiency < 70', text: 'Eficiencia baja: Analizar causas de bugs no resueltos', priority: 'alta' },
    { condition: 'efficiency < 70', text: 'Revisar backlog: Priorizar cierre de bugs antiguos', priority: 'alta' },
    { condition: 'default', text: 'Implementar dailies para desbloquear impedimentos rápidamente', priority: 'media' },
    { condition: 'default', text: 'Establecer SLAs por prioridad de bug', priority: 'media' },
    { condition: 'default', text: 'Considerar aumentar capacidad del equipo si backlog crece', priority: 'baja' }
  ],
  criticalBugs: [
    { condition: 'total > 30', text: 'Nivel crítico: Volumen muy alto de bugs graves - requiere atención inmediata', priority: 'alta' },
    { condition: 'total > 20 && total <= 30', text: 'Alta presión: Considerar asignación de recursos adicionales', priority: 'alta' },
    { condition: 'total <= 20', text: 'Bajo control: Volumen manejable de bugs críticos', priority: 'baja' },
    { condition: 'default', text: 'Establecer war room para bugs de prioridad "Más alta"', priority: 'media' },
    { condition: 'default', text: 'Implementar smoke tests automáticos para prevención', priority: 'media' },
    { condition: 'default', text: 'Revisar arquitectura de módulos con alta concentración de bugs críticos', priority: 'media' },
    { condition: 'default', text: 'Incrementar code reviews para funcionalidades core', priority: 'media' }
  ],
  criticalBugsStatus: [
    { condition: 'pending > 15', text: 'Urgente: Backlog crítico excesivo - convocar daily enfocado', priority: 'alta' },
    { condition: 'pending > 15', text: 'Escalar recursos: Reasignar desarrolladores senior a bugs críticos', priority: 'alta' },
    { condition: 'pending > 10 && pending <= 15', text: 'Alta prioridad: Acelerar cierre de bugs críticos pendientes', priority: 'alta' },
    { condition: 'pending <= 10 && pending > 0', text: 'Bajo control: Volumen manejable, mantener velocidad de cierre', priority: 'baja' },
    { condition: 'pending === 0', text: '¡Excelente: Todos los bugs críticos están resueltos!', priority: 'baja' },
    { condition: 'default', text: 'Establecer SLA de 48h máximo para bugs de prioridad "Más alta"', priority: 'media' },
    { condition: 'default', text: 'Implementar triage diario de bugs críticos', priority: 'media' },
    { condition: 'default', text: 'Automatizar notificaciones para bugs críticos sin actualización por 24h', priority: 'baja' }
  ],
  cycleTime: [
    { condition: 'avg > 10', text: 'Alto Cycle Time: Implementar daily stand-ups para acelerar resolución de bloqueadores', priority: 'alta' },
    { condition: 'byPriority.critical > 5', text: 'Críticos lentos: Establecer SLA de 48h para bugs críticos y asignar recursos dedicados', priority: 'alta' },
    { condition: 'avg <= 7', text: 'Excelente velocidad: El equipo mantiene un ritmo óptimo de resolución', priority: 'baja' },
    { condition: 'default', text: 'Considerar automatización de testing para detectar bugs más temprano', priority: 'media' },
    { condition: 'default', text: 'Revisar proceso de triage para priorizar efectivamente', priority: 'media' }
  ],
  defectDensity: [
    { condition: 'avg > 2.0', text: 'Urgente: Implementar code reviews obligatorios antes de cada commit', priority: 'alta' },
    { condition: 'avg > 2.0', text: 'Urgente: Aumentar cobertura de unit tests al 80% mínimo', priority: 'alta' },
    { condition: 'avg > 1.0 && avg <= 2.0', text: 'Establecer Definition of Done con criterios de calidad claros', priority: 'media' },
    { condition: 'avg > 1.0 && avg <= 2.0', text: 'Implementar pair programming para HUs complejas', priority: 'media' },
    { condition: 'default', text: 'Analizar módulos con alta concentración de bugs para refactorización', priority: 'media' },
    { condition: 'default', text: 'Capacitar al equipo en TDD (Test-Driven Development)', priority: 'media' },
    { condition: 'critical > 0.3', text: 'Crítico: Alta densidad de bugs críticos indica problemas en arquitectura o requerimientos', priority: 'alta' },
    { condition: 'avg <= 1.0', text: 'Mantener las prácticas actuales de calidad - están funcionando bien', priority: 'baja' }
  ]
};

export class RecommendationEngine {
  
  // Mapeo de nombres antiguos a nuevos
  static METRIC_NAME_MAP = {
    'testCases': 'mediaCasosEjecutados',
    'defectDensity': 'densidadDefectos',
    'cycleTime': 'tiempoPromedioResolucion',
    'criticalBugs': 'bugsCriticosDetectados',
    'criticalBugsStatus': 'estadoBugsCriticos',
    'resolutionEfficiency': 'eficienciaResolucion'
  };
  
  /**
   * Obtiene recomendaciones para una métrica específica
   * @param {string} metricType - Tipo de métrica (testCases, resolutionEfficiency, etc.)
   * @param {object} data - Datos de la métrica para evaluar condiciones
   * @param {object} excelRecommendations - Recomendaciones desde Excel (opcional)
   * @returns {array} Lista de recomendaciones aplicables
   */
  static getRecommendations(metricType, data, excelRecommendations = null) {
    // Mapear nombre antiguo a nuevo si existe
    const newMetricName = this.METRIC_NAME_MAP[metricType] || metricType;
    
    // Intentar obtener recomendaciones desde Excel con nombre nuevo o antiguo
    const recommendations = 
      excelRecommendations?.[newMetricName] || 
      excelRecommendations?.[metricType] || 
      DEFAULT_RECOMMENDATIONS[metricType] || [];
    
    // Filtrar recomendaciones aplicables según las condiciones
    return recommendations
      .filter(rec => this.evaluateCondition(rec.condition, data))
      .map(rec => ({
        text: rec.text,
        priority: rec.priority || 'media',
        icon: this.getPriorityIcon(rec.priority),
        parametros: rec.parametros // Incluir parámetros de rangos si existen
      }));
  }
  
  /**
   * Evalúa si una condición se cumple con los datos actuales
   */
  static evaluateCondition(condition, data) {
    if (condition === 'default') return true;
    
    try {
      // Crear función que evalúa la condición
      const conditionFn = new Function(...Object.keys(data), `return ${condition}`);
      return conditionFn(...Object.values(data));
    } catch (error) {
      console.warn('Error evaluating condition:', condition, error);
      return false;
    }
  }
  
  /**
   * Obtiene el icono correspondiente a la prioridad
   */
  static getPriorityIcon(priority) {
    switch (priority?.toLowerCase()) {
      case 'alta':
        return '🚨';
      case 'media':
        return '⚠️';
      case 'baja':
        return '✅';
      default:
        return '•';
    }
  }
  
  /**
   * Formatea recomendaciones para mostrar en el modal
   */
  static formatRecommendations(recommendations) {
    return recommendations.map(rec => {
      const icon = rec.icon || this.getPriorityIcon(rec.priority);
      const boldText = rec.text.includes(':') ? rec.text.split(':')[0] : '';
      
      if (boldText) {
        const restText = rec.text.substring(boldText.length + 1);
        return `${icon} <strong>${boldText}:</strong>${restText}`;
      }
      
      return `${icon} ${rec.text}`;
    });
  }
}

export default RecommendationEngine;
