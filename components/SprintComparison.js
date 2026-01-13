// SprintComparison.js - Refactorizado
// Comparación detallada entre sprints: bugs, test cases, velocidad, cambios
// Estructura normalizada SQL/CSV, cálculos validados, buenas prácticas
import React from 'react';
import { TrendingUp, TrendingDown, Minus, ArrowRight } from 'lucide-react';

export default function SprintComparison({ sprintData, selectedSprints }) {
  if (!sprintData || sprintData.length < 2) {
    return null; // No mostrar nada si no hay suficientes datos
  }

  // Refactor: normalizar nombres de campos con estructura SQL/CSV
  const sprints = sprintData.slice(-2);
  const [sprintA, sprintB] = sprints;

  // Función para extraer métricas con nombres SQL/CSV normalizados
  const calculateMetric = (sprint, metric) => {
    switch (metric) {
      case 'bugs':
        return sprint.bugs || sprint.bugs_encontrados || sprint.bugsFound || 0;
      case 'bugsResolved':
        return sprint.bugsResolved || sprint.bugs_resueltos || sprint.bugsClosed || 0;
      case 'testCases':
        return sprint.testCases || sprint.casosEjecutados || sprint.casos_ejecutados || sprint.testCasesExecuted || 0;
      case 'resolutionRate':
        const total = sprint.bugs || sprint.bugs_encontrados || 0;
        const resolved = sprint.bugsResolved || sprint.bugs_resueltos || 0;
        return total > 0 ? Math.round((resolved / total) * 100) : 0;
      case 'criticalBugs':
        const priorities = sprint.bugsByPriority || {};
        return (priorities['Más alta'] || priorities['Alta'] || 0);
      default:
        return 0;
    }
  };

  const metrics = [
    { key: 'bugs', label: 'Total Bugs', format: val => val, inverse: true },
    { key: 'bugsResolved', label: 'Bugs Resueltos', format: val => val, inverse: false },
    { key: 'testCases', label: 'Casos Ejecutados', format: val => val, inverse: false },
    { key: 'resolutionRate', label: 'Tasa Resolución', format: val => `${val}%`, inverse: false },
    { key: 'criticalBugs', label: 'Bugs Críticos', format: val => val, inverse: true }
  ];

  const ComparisonRow = ({ metric }) => {
    const valueA = calculateMetric(sprintA, metric.key);
    const valueB = calculateMetric(sprintB, metric.key);
    // calcular media sobre todos los sprints disponibles
    const meanValue = Math.round((sprintData.reduce((acc, s) => acc + calculateMetric(s, metric.key), 0) / sprintData.length) * 10) / 10;
    const delta = valueB - valueA;
    const deltaPercent = valueA !== 0 ? Math.round((delta / valueA) * 100) : 0;
    const isPositive = metric.inverse ? delta < 0 : delta > 0;
    const isNeutral = delta === 0;
    const deltaMean = Math.round((valueB - meanValue) * 10) / 10;
    const deltaMeanPercent = meanValue !== 0 ? Math.round((deltaMean / meanValue) * 100) : 0;
    const isPositiveMean = metric.inverse ? deltaMean < 0 : deltaMean > 0;
    const isNeutralMean = deltaMean === 0;

    return (
      <div className="grid grid-cols-6 gap-2 py-2 border-b border-gray-100 last:border-b-0 items-center">
        <div className="font-medium text-gray-700 text-sm">{metric.label}</div>

        <div className="text-center">
          <div className="text-lg font-semibold text-gray-900">{metric.format(valueA)}</div>
          <div className="text-xs text-gray-500">{sprintA.sprint || sprintA.name}</div>
        </div>

        <div className="flex justify-center">
          <ArrowRight className="w-4 h-4 text-gray-400" />
        </div>

        <div className="text-center">
          <div className="text-lg font-semibold text-gray-900">{metric.format(valueB)}</div>
          <div className="text-xs text-gray-500">{sprintB.sprint || sprintB.name}</div>
        </div>
        {/* Media column */}
        <div className="text-center">
          <div className="text-lg font-semibold text-gray-900">{metric.format(meanValue)}</div>
          <div className="text-xs text-gray-500">Media</div>
        </div>

        {/* Delta vs Media */}
        <div className="text-center">
          {isNeutralMean ? (
            <div className="flex items-center justify-center text-xs text-gray-500">
              <Minus className="w-4 h-4 text-gray-400" />
              <span className="ml-1">Sin cambio</span>
            </div>
          ) : (
            <div className={`flex items-center justify-center ${isPositiveMean ? 'text-success-600' : 'text-danger-600'}`}>
              {isPositiveMean ? (
                <TrendingUp className="w-4 h-4" />
              ) : (
                <TrendingDown className="w-4 h-4" />
              )}
              <div className="ml-2 text-right">
                <div className="text-sm font-semibold">
                  {deltaMean > 0 ? '+' : ''}{deltaMean}
                </div>
                <div className="text-xs">
                  {deltaMeanPercent > 0 ? '+' : ''}{deltaMeanPercent}%
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="executive-card">
      <div className="mb-3">
        <h3 className="text-lg font-semibold text-gray-900 mb-1">Comparativa Sprint a Sprint</h3>
        <p className="text-xs text-gray-600">Evolución entre {sprintA.sprint || sprintA.name} y {sprintB.sprint || sprintB.name}</p>
      </div>

        <div className="space-y-0">
        <div className="grid grid-cols-6 gap-2 pb-2 border-b border-executive-200 text-xs font-semibold text-gray-600">
          <div>Métrica</div>
          <div className="text-center">Sprint Anterior</div>
          <div className="text-center"></div>
          <div className="text-center">Sprint Actual</div>
          <div className="text-center">Media</div>
          <div className="text-center">Vs Media</div>
        </div>

        {metrics.map(metric => (
          <ComparisonRow key={metric.key} metric={metric} />
        ))}
      </div>

      <div className="mt-4 pt-4 border-t border-gray-200">
        <h4 className="font-semibold text-gray-800 mb-2 text-sm">Resumen Ejecutivo</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {(() => {
            const bugsA = calculateMetric(sprintA, 'bugs');
            const bugsB = calculateMetric(sprintB, 'bugs');
            const bugsDelta = bugsB - bugsA;
            
            const resolvedA = calculateMetric(sprintA, 'bugsResolved');
            const resolvedB = calculateMetric(sprintB, 'bugsResolved');
            const resolvedDelta = resolvedB - resolvedA;
            
            const rateA = calculateMetric(sprintA, 'resolutionRate');
            const rateB = calculateMetric(sprintB, 'resolutionRate');
            const rateDelta = rateB - rateA;

            return (
              <>
                {bugsDelta < 0 && (
                  <div className="flex items-start p-2 bg-success-50 rounded-lg border border-success-200">
                    <TrendingUp className="w-4 h-4 text-success-600 mt-0.5 mr-2 flex-shrink-0" />
                    <div>
                      <div className="font-medium text-success-900 text-sm">Reducción en Bugs Totales</div>
                      <div className="text-xs text-success-700">Se redujo en {Math.abs(bugsDelta)} bugs ({Math.abs(Math.round((bugsDelta / bugsA) * 100))}%)</div>
                    </div>
                  </div>
                )}

                {bugsDelta > 0 && (
                  <div className="flex items-start p-2 bg-warning-50 rounded-lg border border-warning-200">
                    <TrendingDown className="w-4 h-4 text-warning-600 mt-0.5 mr-2 flex-shrink-0" />
                    <div>
                      <div className="font-medium text-warning-900 text-sm">Incremento en Bugs</div>
                      <div className="text-xs text-warning-700">Aumentó en {bugsDelta} bugs ({Math.round((bugsDelta / bugsA) * 100)}%)</div>
                    </div>
                  </div>
                )}

                {resolvedDelta > 0 && (
                  <div className="flex items-start p-2 bg-blue-50 rounded-lg border border-blue-200">
                    <TrendingUp className="w-4 h-4 text-blue-600 mt-0.5 mr-2 flex-shrink-0" />
                    <div>
                      <div className="font-medium text-blue-900 text-sm">Mejora en Resolución</div>
                      <div className="text-xs text-blue-700">Se resolvieron {resolvedDelta} bugs más ({Math.round((resolvedDelta / resolvedA) * 100)}%)</div>
                    </div>
                  </div>
                )}

                {rateDelta > 0 && (
                  <div className="flex items-start p-2 bg-success-50 rounded-lg border border-success-200">
                    <TrendingUp className="w-4 h-4 text-success-600 mt-0.5 mr-2 flex-shrink-0" />
                    <div>
                      <div className="font-medium text-success-900 text-sm">Mejora en Tasa de Resolución</div>
                      <div className="text-xs text-success-700">La eficiencia subió {rateDelta} pp</div>
                    </div>
                  </div>
                )}

                {rateDelta < 0 && (
                  <div className="flex items-start p-2 bg-danger-50 rounded-lg border border-danger-200">
                    <TrendingDown className="w-4 h-4 text-danger-600 mt-0.5 mr-2 flex-shrink-0" />
                    <div>
                      <div className="font-medium text-danger-900 text-sm">Reducción en Tasa de Resolución</div>
                      <div className="text-xs text-danger-700">La eficiencia bajó {Math.abs(rateDelta)} pp</div>
                    </div>
                  </div>
                )}
              </>
            );
          })()}
        </div>
      </div>
    </div>
  );
}
