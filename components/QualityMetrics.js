import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { 
    Target, 
    Clock, 
    TrendingUp, 
    Shield, 
    Zap, 
    CheckCircle,
    AlertTriangle,
    BarChart3
  } from 'lucide-react';
import UnderConstructionCard from './UnderConstructionCard';
import KPICard from './KPICard';

  export default function QualityMetrics({ data, visibleKeys, sprintData = [], onOpenDetail }) {
    // Sprint list and selection for filtering
    const sprintList = sprintData?.map(s => s.sprint || s.name || s.id) || [];
    const [selectedSprints, setSelectedSprints] = useState(['Todos']);

    const handleSprintToggle = (sprint) => {
      if (sprint === 'Todos') return setSelectedSprints(['Todos']);
      setSelectedSprints(prev => {
        if (prev.includes('Todos')) return [sprint];
        if (prev.includes(sprint)) {
          const filtered = prev.filter(s => s !== sprint);
          return filtered.length === 0 ? ['Todos'] : filtered;
        }
        return [...prev, sprint];
      });
    };

    const filteredSprintData = useMemo(() => {
      if (!sprintData || sprintData.length === 0) return sprintData;
      if (selectedSprints.includes('Todos')) return sprintData;
      return sprintData.filter(s => selectedSprints.includes(s.sprint || s.name || s.id));
    }, [sprintData, selectedSprints]);
    // Recompute metrics from provided merged data (kpis + qualityMetrics + summary)

    // Refactor: cálculos alineados con nueva estructura SQL/CSV
    const totalBugs = (filteredSprintData && filteredSprintData.length > 0)
      ? filteredSprintData.reduce((acc, s) => acc + (s.bugs || s.bugs_encontrados || 0), 0)
      : data?.summary?.totalBugs || 0;

    const testCasesExecuted = (filteredSprintData && filteredSprintData.length > 0)
      ? filteredSprintData.reduce((acc, s) => acc + (s.testCasesExecuted || s.casosEjecutados || s.testCases || 0), 0)
      : data?.summary?.testCasesExecuted || 0;

    const testCasesTotal = (filteredSprintData && filteredSprintData.length > 0)
      ? filteredSprintData.reduce((acc, s) => acc + (s.testCasesTotal || s.casosPlaneados || s.testCases || 0), 0)
      : data?.summary?.testCasesTotal || 1;

    const defectDensityValue = testCasesExecuted > 0 ? parseFloat((totalBugs / testCasesExecuted).toFixed(2)) : null;
    const testEfficiencyValue = data?.testExecutionRate ?? (testCasesTotal > 0 ? Math.round((testCasesExecuted / testCasesTotal) * 100) : null);
    const bugLeakageValue = data?.bugLeakage ?? data?.bugLeakageRate ?? (data?.productionBugs && totalBugs ? Math.round((data.productionBugs / totalBugs) * 100) : null);
    const testAutomationValue = data?.testAutomation ?? null;
    const codeCoverageValue = data?.codeCoverage ?? data?.testCoverage ?? null;
    const cycleTimeValue = data?.cycleTime ?? data?.averageResolutionTime ?? null;

    const metrics = [
      {
        key: 'defectDensity',
        title: 'Densidad de Defectos',
        value: defectDensityValue,
        unit: 'bugs/caso',
        icon: <Target className="w-6 h-6" />,
        target: 0.15,
        status: defectDensityValue == null ? 'unknown' : (defectDensityValue <= 0.15 ? 'success' : defectDensityValue <= 0.25 ? 'warning' : 'danger'),
        description: 'Número de bugs por caso de prueba ejecutado'
      },
      {
        key: 'testEfficiency',
        title: 'Tasa de Ejecución',
        // For now show this KPI as 'En desarrollo' (no datos reales)
        value: null,
        unit: '%',
        icon: <CheckCircle className="w-6 h-6" />,
        target: 85,
        status: testEfficiencyValue == null ? 'unknown' : (testEfficiencyValue >= 85 ? 'success' : testEfficiencyValue >= 70 ? 'warning' : 'danger'),
        description: 'Porcentaje de casos de prueba ejecutados vs planeados'
      },
      {
        key: 'bugLeakage',
        title: 'Tasa de Fuga',
        value: bugLeakageValue,
        unit: '%',
        icon: <Shield className="w-6 h-6" />,
        target: 5,
        status: bugLeakageValue == null ? 'unknown' : (bugLeakageValue <= 5 ? 'success' : bugLeakageValue <= 10 ? 'warning' : 'danger'),
        description: 'Porcentaje de bugs que escapan a producción'
      },
      {
        key: 'testAutomation',
        title: 'Automatización',
        // Mark automation as in development UI-wise
        value: null,
        unit: '%',
        icon: <Zap className="w-6 h-6" />,
        target: 60,
        status: testAutomationValue == null ? 'unknown' : (testAutomationValue >= 60 ? 'success' : testAutomationValue >= 40 ? 'warning' : 'danger'),
        description: 'Porcentaje de pruebas automatizadas'
      },
      {
        key: 'codeCoverage',
        title: 'Cobertura de Código',
        value: codeCoverageValue,
        unit: '%',
        icon: <BarChart3 className="w-6 h-6" />,
        target: 80,
        status: codeCoverageValue == null ? 'unknown' : (codeCoverageValue >= 80 ? 'success' : codeCoverageValue >= 65 ? 'warning' : 'danger'),
        description: 'Porcentaje de código cubierto por pruebas'
      },
      {
        key: 'cycleTime',
        title: 'Tiempo de Ciclo',
        value: cycleTimeValue,
        unit: 'días',
        icon: <Clock className="w-6 h-6" />,
        target: 2,
        status: cycleTimeValue == null ? 'unknown' : (cycleTimeValue <= 2 ? 'success' : cycleTimeValue <= 3 ? 'warning' : 'danger'),
        description: 'Tiempo promedio desde detección hasta resolución'
      }
    ];
  
    const getStatusColor = (status) => {
      switch (status) {
        case 'success':
          return {
            bg: 'bg-success-50',
            border: 'border-success-200',
            text: 'text-success-600',
            icon: 'text-success-600'
          };
        case 'warning':
          return {
            bg: 'bg-warning-50',
            border: 'border-warning-200',
            text: 'text-warning-600',
            icon: 'text-warning-600'
          };
        case 'danger':
          return {
            bg: 'bg-danger-50',
            border: 'border-danger-200',
            text: 'text-danger-600',
            icon: 'text-danger-600'
          };
        default:
          return {
            bg: 'bg-gray-50',
            border: 'border-gray-200',
            text: 'text-gray-600',
            icon: 'text-gray-600'
          };
      }
    };
  
    const getProgressPercentage = (value, target, isReverse = false) => {
      if (isReverse) {
        // Para métricas donde menor es mejor (como defectDensity, bugLeakage, cycleTime)
        return Math.max(0, Math.min(100, ((target / value) * 100)));
      } else {
        // Para métricas donde mayor es mejor
        return Math.max(0, Math.min(100, (value / target) * 100));
      }
    };
  
    const isReverseMetric = (key) => {
      return ['defectDensity', 'bugLeakage', 'cycleTime'].includes(key);
    };
  
    const metricsToShow = metrics.filter(m => !visibleKeys || visibleKeys.includes(m.key));

    // Tooltip state for metric cards (those with data)
    const [tooltip, setTooltip] = useState({ visible: false, content: null, pos: { top: 0, left: 0 } });

    const showMetricTooltip = (metric, e) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const content = helpByKey[metric.key] || (
        <div>
          <div className="font-semibold">Qué mide:</div>
          <div className="text-xs">Esta métrica resume un aspecto clave de la calidad.</div>
          <div className="font-semibold mt-2">Por qué es útil:</div>
          <div className="text-xs">Permite priorizar acciones y comunicar estado al negocio.</div>
        </div>
      );
      setTooltip({ visible: true, content, pos: { top: rect.bottom + 8, left: rect.left + rect.width / 2 } });
    };

    const hideMetricTooltip = () => setTooltip({ visible: false, content: null, pos: { top: 0, left: 0 } });

    // Map help text per metric (non-technical, two short sections)
    const helpByKey = {
      defectDensity: (
        <div>
          <div className="font-semibold">Qué mide:</div>
          <div className="text-xs">Promedio de hallazgos por caso de prueba ejecutado.</div>
          <div className="font-semibold mt-2">Por qué es útil:</div>
          <div className="text-xs">Ayuda a identificar si la calidad del producto está mejorando o empeorando entre sprints.</div>
        </div>
      ),
      testEfficiency: (
        <div>
          <div className="font-semibold">Qué mide:</div>
          <div className="text-xs">Porcentaje de casos de prueba ejecutados respecto a lo planeado.</div>
          <div className="font-semibold mt-2">Por qué es útil:</div>
          <div className="text-xs">Muestra si el equipo está completando las pruebas previstas y permite ajustar planificación.</div>
        </div>
      ),
      bugLeakage: (
        <div>
          <div className="font-semibold">Qué mide:</div>
          <div className="text-xs">Porcentaje de defectos que llegan a producción.</div>
          <div className="font-semibold mt-2">Por qué es útil:</div>
          <div className="text-xs">Indica el riesgo que enfrentan los usuarios y qué tan efectiva es la prevención de fallos.</div>
        </div>
      ),
      testAutomation: (
        <div>
          <div className="font-semibold">Qué mide:</div>
          <div className="text-xs">Porcentaje de pruebas que están automatizadas.</div>
          <div className="font-semibold mt-2">Por qué es útil:</div>
          <div className="text-xs">Acelera la ejecución de regresiones y libera tiempo para pruebas exploratorias.</div>
        </div>
      ),
      codeCoverage: (
        <div>
          <div className="font-semibold">Qué mide:</div>
          <div className="text-xs">Porcentaje de código cubierto por pruebas automatizadas.</div>
          <div className="font-semibold mt-2">Por qué es útil:</div>
          <div className="text-xs">Ayuda a entender la confianza en cambios de código y áreas que necesitan más pruebas.</div>
        </div>
      ),
      cycleTime: (
        <div>
          <div className="font-semibold">Qué mide:</div>
          <div className="text-xs">Tiempo promedio desde que se detecta un hallazgo hasta que se resuelve.</div>
          <div className="font-semibold mt-2">Por qué es útil:</div>
          <div className="text-xs">Mide la agilidad del equipo para solucionar problemas y reducir el tiempo de exposición a riesgos.</div>
        </div>
      )
    };

    // Build sparkline data from filteredSprintData for a given metric key
    function getSparklineData(key) {
      if (!filteredSprintData || filteredSprintData.length === 0) return [];
      try {
        return filteredSprintData.map(s => {
          switch (key) {
            case 'defectDensity': {
              const executed = s.testCasesExecuted || s.testCases || 0;
              const bugs = s.bugs || s.bugsFound || 0;
              return executed > 0 ? parseFloat((bugs / executed).toFixed(2)) : 0;
            }
            case 'testEfficiency': {
              const executed = s.testCasesExecuted || s.testCases || 0;
              const total = s.testCasesTotal || s.testCases || 0;
              return total > 0 ? Math.round((executed / total) * 100) : 0;
            }
            case 'bugLeakage': {
              const prod = s.productionBugs || 0;
              const total = (s.bugs || s.bugsFound || 0) || 1;
              return Math.round((prod / total) * 100);
            }
            case 'testAutomation':
              return s.testAutomation || 0;
            case 'codeCoverage':
              return s.codeCoverage || s.testCoverage || 0;
            case 'cycleTime':
              return s.cycleTime || s.averageResolutionTime || 0;
            default:
              return 0;
          }
        });
      } catch (e) {
        return [];
      }
    }

    // Helper to open detail modal with consistent payload
    const openMetricDetail = (metric) => {
      try {
        console.debug('QualityMetrics: opening detail for', metric.key);
      } catch (e) {
        // ignore in non-browser env
      }
      if (typeof onOpenDetail === 'function') {
        try {
          onOpenDetail({
            type: metric.key,
            title: metric.title,
            data: {
              value: metric.value,
              unit: metric.unit,
              target: metric.target,
              description: metric.description
            },
            sparklineData: getSparklineData(metric.key),
            sprints: filteredSprintData
          });
        } catch (err) {
          console.error('QualityMetrics: error calling onOpenDetail', err);
        }
      } else {
        try {
          console.warn('QualityMetrics: onOpenDetail is not a function');
        } catch (e) {}
      }
    };

    return (
      <div className="space-y-8">
        {/* Filtro por Sprint (compacto) */}
        {sprintList.length > 0 && (
          <div className="mb-4 bg-white p-3 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center">
                <label className="text-sm font-medium text-gray-700 mr-2">Filtrar por Sprint:</label>
                {!selectedSprints.includes('Todos') && selectedSprints.length > 0 && (
                  <span className="text-sm text-executive-600 font-medium">{selectedSprints.length} seleccionado{selectedSprints.length > 1 ? 's' : ''}</span>
                )}
              </div>
              <div className="text-sm text-gray-500">Seleccione uno o varios</div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              <label className="flex items-center p-2 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer">
                <input type="checkbox" checked={selectedSprints.includes('Todos')} onChange={() => handleSprintToggle('Todos')} className="w-4 h-4 text-executive-600" />
                <span className="ml-2 text-sm text-gray-700">Todos</span>
              </label>
              {sprintList.map(s => (
                <label key={s} className={`flex items-center p-2 rounded-lg border transition-colors cursor-pointer ${selectedSprints.includes(s) && !selectedSprints.includes('Todos') ? 'border-executive-500 bg-executive-50' : 'border-gray-200 hover:bg-gray-50'}`}>
                  <input type="checkbox" checked={selectedSprints.includes(s) && !selectedSprints.includes('Todos')} onChange={() => handleSprintToggle(s)} className="w-4 h-4 text-executive-600" />
                  <span className="ml-2 text-sm text-gray-700">{s}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        {/* Métricas principales */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {metricsToShow.map((metric) => {
            // If metric has no real data (value == null), render an UnderConstructionCard
            if (metric.value === null || metric.value === undefined) {
              const helpContent = helpByKey[metric.key] || (
                <div>
                  <div className="font-semibold">Qué mide:</div>
                  <div className="text-xs">Esta métrica resume un aspecto clave de la calidad.</div>
                  <div className="font-semibold mt-2">Por qué es útil:</div>
                  <div className="text-xs">Permite priorizar acciones y comunicar estado al negocio.</div>
                </div>
              );

              return (
                  <UnderConstructionCard
                    key={metric.key}
                    title={metric.title}
                    value={'--'}
                    icon={metric.icon}
                    subtitle="Datos no disponibles"
                    onClick={() => openMetricDetail(metric)}
                    help={helpContent}
                  />
                );
            }

            // Render KPICard for consistency with Executive summary
            const spark = getSparklineData(metric.key) || [];
            const trendValue = spark.length >= 2 ? Math.round(((spark[spark.length-1] - spark[0]) / (Math.abs(spark[0]) || 1)) * 100) : undefined;
            const tooltipContent = helpByKey[metric.key] || (
              <div>
                <div className="font-semibold">Qué mide:</div>
                <div className="text-xs">{metric.description}</div>
                <div className="font-semibold mt-2">Por qué es útil:</div>
                <div className="text-xs">Permite priorizar acciones y comunicar estado al negocio.</div>
              </div>
            );

            return (
              <KPICard
                key={metric.key}
                title={metric.title}
                value={`${metric.value}${metric.unit || ''}`}
                icon={metric.icon}
                trend={trendValue}
                status={metric.status}
                subtitle={metric.description}
                formula={metric.formula}
                tooltip={tooltipContent}
                onClick={() => openMetricDetail(metric)}
                detailData={{ value: metric.value, unit: metric.unit }}
                sparklineData={spark}
              />
            );
          })}
        </div>

        {/* Metric tooltip portal (for cards with data) */}
        {tooltip.visible && createPortal(
          <div
            className="fixed bg-white border border-gray-300 rounded-lg shadow-lg p-3 z-50 max-w-xs"
            style={{ top: `${tooltip.pos.top}px`, left: `${tooltip.pos.left}px`, transform: 'translateX(-50%)' }}
          >
            {tooltip.content}
          </div>,
          document.body
        )}
  
        {/* Resumen de calidad general */}
        <div className="executive-card">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">
            Índice de Calidad General
          </h3>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div>
              <h4 className="font-medium text-gray-900 mb-4">Estado Actual</h4>
              <div className="space-y-3">
                {metricsToShow.map((metric) => (
                  <div key={metric.key} className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">{metric.title}</span>
                    <div className="flex items-center space-x-2">
                      <div className={`w-3 h-3 rounded-full ${
                        metric.status === 'success' ? 'bg-success-500' :
                        metric.status === 'warning' ? 'bg-warning-500' : 'bg-danger-500'
                      }`} />
                      <span className="text-sm font-medium text-gray-900">
                        {metric.value}{metric.unit}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <div>
              <h4 className="font-medium text-gray-900 mb-4">Objetivos 2025</h4>
              <div className="space-y-3">
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <h5 className="font-medium text-blue-800 mb-2">Q1 2025</h5>
                  <ul className="text-sm text-blue-700 space-y-1">
                    <li>• Automatización: 45% → 60%</li>
                    <li>• Tiempo de ciclo: 2.3 → 2.0 días</li>
                    <li>• Cobertura código: 68% → 75%</li>
                  </ul>
                </div>
                
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <h5 className="font-medium text-green-800 mb-2">Meta Anual</h5>
                  <ul className="text-sm text-green-700 space-y-1">
                    <li>• Automatización: 80%</li>
                    <li>• Fuga de bugs: &lt; 3%</li>
                    <li>• Eficiencia pruebas: &gt; 90%</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
  