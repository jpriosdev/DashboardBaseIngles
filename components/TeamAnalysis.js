// TeamAnalysis.js - Now focused on Testers and Test Execution
import React, { useMemo, useState, useEffect } from 'react';
import ActionableRecommendations from './ActionableRecommendations';
import DetailModal from './DetailModal';
import { User, TrendingUp, TrendingDown, AlertCircle, CheckCircle2, XCircle, RefreshCw } from 'lucide-react';

function TeamKpiCard({ title, value, sub, children }) {
  return (
    <div className="bg-white p-4 rounded-lg shadow-sm border">
      <div className="text-sm text-gray-500">{title}</div>
      <div className="text-2xl font-bold text-gray-900">{value}</div>
      {sub && <div className="text-xs text-gray-400">{sub}</div>}
      {children}
    </div>
  );
}

export default function TeamAnalysis({ data, filteredSprintData }) {
  const [forceReload, setForceReload] = useState(0);
  const [testersData, setTestersData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState('totalExecutions');
  const [sortOrder, setSortOrder] = useState('desc');
  
  // Cargar datos de testers directamente de la API
  useEffect(() => {
    const loadTestersData = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/testers-data');
        if (response.ok) {
          const result = await response.json();
          setTestersData(result.testersData || []);
          console.log(`✅ Loaded ${result.testersData?.length || 0} testers from /api/testers-data`);
        } else {
          console.error('❌ Failed to load testers data:', response.status);
          setTestersData([]);
        }
      } catch (error) {
        console.error('❌ Error loading testers data:', error);
        setTestersData([]);
      } finally {
        setLoading(false);
      }
    };

    loadTestersData();
  }, [forceReload]);

  // Build tester summary - ya viene procesado del endpoint + ordenamiento
  const testerData = useMemo(() => {
    if (!testersData || testersData.length === 0) return [];
    
    // Datos ya vienen agrupados y procesados del endpoint
    let sorted = testersData
      .map(t => ({
        ...t,
        // Calcular rates - Finding Rate = bugs encontrados (failed)
        findingRate: t.totalExecutions > 0 ? Math.round((t.failed / t.totalExecutions) * 100) : 0,
        efficiency: t.totalExecutions > 0 ? Math.round((t.passed / t.totalExecutions) * 100) : 0
      }));
    
    // Aplicar ordenamiento
    sorted.sort((a, b) => {
      let aVal = a[sortBy] ?? 0;
      let bVal = b[sortBy] ?? 0;
      
      // Si es string, comparar alfabéticamente
      if (typeof aVal === 'string') {
        return sortOrder === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      
      // Si es número
      if (sortOrder === 'asc') {
        return aVal - bVal;
      } else {
        return bVal - aVal;
      }
    });
    
    return sorted;
  }, [testersData, sortBy, sortOrder]);
  
  // Función para manejar clics en encabezados
  const handleHeaderClick = (column) => {
    if (sortBy === column) {
      // Si ya está ordenado por esta columna, cambiar dirección
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      // Si es otra columna, ordenar descendente
      setSortBy(column);
      setSortOrder('desc');
    }
  };
  
  // Componente de encabezado clickeable
  const SortableHeader = ({ column, label }) => (
    <th 
      onClick={() => handleHeaderClick(column)}
      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition"
    >
      <div className="flex items-center gap-2">
        <span>{label}</span>
        {sortBy === column && (
          <span className="text-sm">
            {sortOrder === 'asc' ? '▲' : '▼'}
          </span>
        )}
      </div>
    </th>
  );

  if (loading || testerData.length === 0) {
    return (
      <div className="space-y-6">
        <div className="executive-card p-8 text-center bg-amber-50 border-2 border-amber-300">
          <AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-amber-900 mb-2">{loading ? 'Loading Testers Data' : 'No Testers Found'}</h3>
          <p className="text-amber-800 mb-6 text-base">
            {loading ? 'Loading test execution data from database...' : 'No tester data available at the moment.'}
          </p>
          
          {loading && (
            <div className="flex justify-center items-center gap-2">
              <RefreshCw className="w-5 h-5 animate-spin text-amber-600" />
              <span className="text-amber-700">Processing...</span>
            </div>
          )}
          
          {!loading && (
            <button 
              onClick={() => setForceReload(f => f + 1)}
              className="mt-4 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white font-semibold rounded transition"
            >
              🔄 Retry Load
            </button>
          )}
        </div>
      </div>
    );
  }

  const totalTestsExecuted = testerData.reduce((sum, t) => sum + t.totalExecutions, 0);
  const totalPassed = testerData.reduce((sum, t) => sum + t.passed, 0);
  const totalFailed = testerData.reduce((sum, t) => sum + t.failed, 0);
  const overallSuccessRate = totalTestsExecuted > 0 ? Math.round((totalFailed / totalTestsExecuted) * 100) : 0;

  const getFindingRateColor = (rate) => {
    // Mayor tasa de findings (bugs encontrados) = mejor tester
    if (rate >= 30) return { bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-200' };
    if (rate >= 10) return { bg: 'bg-yellow-100', text: 'text-yellow-800', border: 'border-yellow-200' };
    return { bg: 'bg-red-100', text: 'text-red-800', border: 'border-red-200' };
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="executive-card text-center">
          <User className="w-8 h-8 text-blue-600 mx-auto mb-2" />
          <div className="text-2xl font-bold text-gray-900">{testerData.length}</div>
          <div className="text-sm text-gray-600">Active Testers</div>
        </div>

        <div className="executive-card text-center">
          <CheckCircle2 className="w-8 h-8 text-green-600 mx-auto mb-2" />
          <div className="text-2xl font-bold text-gray-900">{totalTestsExecuted}</div>
          <div className="text-sm text-gray-600">Total Executions</div>
        </div>

        <div className="executive-card text-center">
          <TrendingUp className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
          <div className="text-2xl font-bold text-gray-900">{totalPassed}</div>
          <div className="text-sm text-gray-600">Passed</div>
        </div>

        <div className="executive-card text-center cursor-pointer hover:bg-blue-50 transition" onClick={() => setForceReload(f => f + 1)}>
          <RefreshCw className="w-8 h-8 text-blue-600 mx-auto mb-2" />
          <div className="text-2xl font-bold text-gray-900">{overallSuccessRate}%</div>
          <div className="text-sm text-gray-600">Finding Rate</div>
        </div>
      </div>

      {/* Detailed Tester Analysis Table - SHOW ALL ROWS NO LIMIT */}
      <div className="executive-card">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-semibold text-gray-900">Test Execution by Tester ({testerData.length}) - All Records</h3>
          <button 
            onClick={() => setForceReload(f => f + 1)}
            className="px-3 py-1 text-sm bg-blue-500 hover:bg-blue-600 text-white rounded transition"
            title="Reload all data"
          >
            <RefreshCw className="w-4 h-4 inline mr-1" /> Reload
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50 sticky top-0">
              <tr>
                <SortableHeader column="name" label="Tester" />
                <SortableHeader column="totalExecutions" label="Executed" />
                <SortableHeader column="passed" label="Passed" />
                <SortableHeader column="failed" label="Failed" />
                <SortableHeader column="notExecuted" label="Not Executed" />
                <SortableHeader column="inProgress" label="In Progress" />
                <SortableHeader column="blocked" label="Blocked" />
                <SortableHeader column="productsJoined" label="Product" />
                <SortableHeader column="testTypesCount" label="Test Type" />
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {testerData.map((tester, index) => {
                const findingColors = getFindingRateColor(tester.findingRate);
                return (
                  <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-8 w-8">
                          <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-xs">
                            <span className="font-medium text-blue-600">
                              {(tester.name || 'NA').toString().split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                            </span>
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{tester.name || 'Unassigned'}</div>
                          <div className="text-xs text-gray-500">{tester.totalTests} test cases</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <span className="font-bold text-lg">{tester.totalExecutions}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className="font-bold text-green-600 text-lg">{tester.passed}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className="font-bold text-red-600 text-lg">{tester.failed}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className="font-bold text-gray-600 text-lg">{tester.notExecuted}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className="font-bold text-yellow-600 text-lg">{tester.inProgress}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className="font-bold text-orange-600 text-lg">{tester.blocked}</span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700 max-w-xs">
                      {tester.productsJoined && tester.productsJoined.trim() ? (
                        <div className="flex flex-wrap gap-1">
                          {tester.products && tester.products.length > 0 ? (
                            tester.products.map((product, idx) => (
                              <span key={idx} className="px-2 py-1 bg-indigo-100 text-indigo-800 rounded text-xs font-semibold whitespace-nowrap">
                                {product}
                              </span>
                            ))
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700">
                      {tester.testTypesCount > 0 ? (
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded text-xs font-semibold">
                            {tester.testTypesCount}
                          </span>
                        </div>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="mt-4 p-3 bg-gray-50 rounded text-xs text-gray-600">
          📊 Showing ALL {testerData.length} testers with {totalTestsExecuted} total test executions
        </div>
      </div>

      {/* Test Coverage by Module */}
      <div className="executive-card">
        <h3 className="text-lg font-semibold text-gray-900 mb-6">Coverage Summary</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div className="text-2xl font-bold text-blue-900 mb-1">{testerData.reduce((sum, t) => sum + t.modulesTestedCount, 0)}</div>
            <div className="text-sm text-blue-700">Products Tested</div>
          </div>
          <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
            <div className="text-2xl font-bold text-purple-900 mb-1">{testerData.reduce((sum, t) => sum + t.testTypesCount, 0)}</div>
            <div className="text-sm text-purple-700">Test Types</div>
          </div>
          <div className="p-4 bg-green-50 rounded-lg border border-green-200">
            <div className="text-2xl font-bold text-green-900 mb-1">{totalPassed}</div>
            <div className="text-sm text-green-700">Total Passed Executions</div>
          </div>
        </div>
      </div>

      {/* Team Insights */}
      <div className="executive-card">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Team Insights</h3>
        <div className="space-y-3">
          {testerData.length > 0 && (
            <div className="flex items-start p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <CheckCircle2 className="w-5 h-5 text-blue-500 mr-3 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-blue-800">Data Loaded Successfully</p>
                <p className="text-sm text-blue-700">{testerData.length} testers executing {totalTestsExecuted} test cases across {Array.from(new Set(testerData.flatMap(t => t.modules))).length} products.</p>
              </div>
            </div>
          )}

          {overallSuccessRate < 10 && (
            <div className="flex items-start p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <AlertCircle className="w-5 h-5 text-yellow-600 mr-3 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-yellow-800">Quality Alert</p>
                <p className="text-sm text-yellow-700">Overall finding rate is {overallSuccessRate}%. Testers are detecting very few bugs - ensure adequate test coverage.</p>
              </div>
            </div>
          )}

          {testerData.length < 3 && (
            <div className="flex items-start p-3 bg-orange-50 border border-orange-200 rounded-lg">
              <AlertCircle className="w-5 h-5 text-orange-600 mr-3 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-orange-800">Resource Notice</p>
                <p className="text-sm text-orange-700">Only {testerData.length} testers active. Consider expanding team for better coverage.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
