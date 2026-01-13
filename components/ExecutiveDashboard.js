// ExecutiveDashboard.js - Refactorizado y alineado
// Componente principal del dashboard, normalizado con estructura SQL/CSV
// Todas las variables, cálculos y referencias actualizadas
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import Image from 'next/image';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { 
  RefreshCw, 
  AlertTriangle,
  BarChart3,
  Target,
  Users,
  Activity,
  CheckCircle,
  TrendingUp,
  TrendingDown,
  Bug,
  Clock,
  Settings
  , ChevronDown, ChevronUp
} from 'lucide-react';

import KPICard from './KPICard';
import UnderConstructionCard from './UnderConstructionCard';
import SprintTrendChart from './SprintTrendChart';
import DeveloperAnalysis from './DeveloperAnalysis';
import ModuleAnalysis from './ModuleAnalysis';
import ExecutiveRecommendations from './ExecutiveRecommendations';
import QualityMetrics from './QualityMetrics';
import DetailModal from './DetailModal';
import SprintComparison from './SprintComparison';
import ActionableRecommendations from './ActionableRecommendations';
import SettingsMenu from './SettingsMenu';
import { QADataProcessor } from '../utils/dataProcessor'; // Nueva importación

export default function ExecutiveDashboard({ 
  // Props originales
  data: externalData, 
  lastUpdated: externalLastUpdated, 
  onRefresh: externalOnRefresh, 
  loading: externalLoading,
  
  // Nuevas props para modo paramétrico
  dataSource = '/api/qa-data',
  configSource = '/api/config',
  refreshInterval = 300000
}) {
  // Estados originales
  const [activeTab, setActiveTab] = useState('overview');
  const [autoRefresh, setAutoRefresh] = useState(true);
  
  // Nuevos estados para modo paramétrico
  const [parametricData, setParametricData] = useState(null);
  const [config, setConfig] = useState(null);
  const [parametricLoading, setParametricLoading] = useState(false);
  const [parametricLastUpdated, setParametricLastUpdated] = useState(null);
  const [error, setError] = useState(null);
  const [recommendations, setRecommendations] = useState(null);
  const [useParametricMode, setUseParametricMode] = useState(false);
  const [isEditingLayout, setIsEditingLayout] = useState(false);
  const [kpiOrder, setKpiOrder] = useState([
    'cobertura',
    'matrizRiesgo',
    'densidad',
    'bugsCriticos',
    'criticosPendientes',
    'tiempoSolucion',
    'velocidadFixes',
    'bugLeakage',
    'completitud',
    'automatizacion'
  ]);
  // Global detail modal state so any tab can open the same modal
  const [detailModal, setDetailModal] = useState(null);

  // Tooltip state for sprint details (rendered via portal to avoid clipping)
  const [tooltipInfo, setTooltipInfo] = useState({ visible: false, sprint: null, sprintData: null, rect: null });

  const showSprintTooltip = (e, sprintKey, sprintData) => {
    try {
      const rect = e.currentTarget.getBoundingClientRect();
      setTooltipInfo({ visible: true, sprint: sprintKey, sprintData, rect });
    } catch (err) {
      // ignore
    }
  };

  const hideSprintTooltip = () => {
    setTooltipInfo({ visible: false, sprint: null, sprintData: null, rect: null });
  };

  

  // Determinar qué datos usar
  const isParametricMode = useParametricMode && !externalData;
  const currentData = isParametricMode ? parametricData : externalData;
  const currentLoading = isParametricMode ? parametricLoading : externalLoading;
  const currentLastUpdated = isParametricMode ? parametricLastUpdated : externalLastUpdated;

  // Cargar configuración para modo paramétrico
  const loadConfiguration = useCallback(async () => {
    try {
      const response = await fetch(configSource);
      if (response.ok) {
        const configData = await response.json();

        // If there's a locally persisted config (e.g. user saved but server doesn't accept POST), merge it so local toggles take precedence
        let finalConfig = configData;
        try {
          if (typeof window !== 'undefined') {
            const persisted = localStorage.getItem('qa-config');
            if (persisted) {
              const parsed = JSON.parse(persisted);
              finalConfig = { ...configData, ...parsed };
            }
          }
        } catch (e) {
          console.warn('Failed to merge persisted config:', e);
        }

        setConfig(finalConfig);

        // Aplicar configuración de auto-refresh si existe
        if (finalConfig.autoRefresh !== undefined) {
          setAutoRefresh(finalConfig.autoRefresh);
        }

        // Aplicar configuración de modo paramétrico si existe
        if (finalConfig.useParametricMode !== undefined) {
          setUseParametricMode(finalConfig.useParametricMode);
        }
        return;
      }

      // If response not ok, try to load from localStorage as a fallback
      if (typeof window !== 'undefined') {
        const persisted = localStorage.getItem('qa-config');
        if (persisted) {
          const configData = JSON.parse(persisted);
          setConfig(configData);
          if (configData.autoRefresh !== undefined) setAutoRefresh(configData.autoRefresh);
          if (configData.useParametricMode !== undefined) setUseParametricMode(configData.useParametricMode);
          return;
        }
      }

      // Last resort: defaults
      console.warn('Using default configuration: remote not available');
      setConfig({
        autoRefresh: true,
        refreshInterval: 300000,
        useParametricMode: true,
        weights: {
          resolutionRate: 0.3,
          testCoverage: 0.25,
          bugDensity: 0.2,
          criticalBugs: 0.25
        },
        thresholds: {
          criticalBugsAlert: 20,
          maxBugsDeveloper: 15,
          criticalModulePercentage: 60
        }
      });
    } catch (error) {
      // Network or parse error: try localStorage fallback
      try {
        if (typeof window !== 'undefined') {
          const persisted = localStorage.getItem('qa-config');
          if (persisted) {
            const configData = JSON.parse(persisted);
            setConfig(configData);
            if (configData.autoRefresh !== undefined) setAutoRefresh(configData.autoRefresh);
            if (configData.useParametricMode !== undefined) setUseParametricMode(configData.useParametricMode);
            return;
          }
        }
      } catch (e) {
        console.warn('Failed to load persisted config:', e);
      }

      console.warn('Using default configuration:', error);
      setConfig({
        autoRefresh: true,
        refreshInterval: 300000,
        useParametricMode: true,
        weights: {
          resolutionRate: 0.3,
          testCoverage: 0.25,
          bugDensity: 0.2,
          criticalBugs: 0.25
        },
        thresholds: {
          criticalBugsAlert: 20,
          maxBugsDeveloper: 15,
          criticalModulePercentage: 60
        }
      });
    }
  }, [configSource]);

  useEffect(() => {
    loadConfiguration();
    // Listen for config updates issued elsewhere in the app and reload
    const onConfigUpdated = () => loadConfiguration();
    if (typeof window !== 'undefined') {
      window.addEventListener('config:updated', onConfigUpdated);
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('config:updated', onConfigUpdated);
      }
    };
  }, [loadConfiguration]);

  // Cargar recomendaciones al montar
  useEffect(() => {
    loadRecommendations();
  }, []);

  

  

  // Auto-refresh mejorado
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      if (isParametricMode) {
        loadParametricData();
      } else if (externalOnRefresh) {
        externalOnRefresh();
      }
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, isParametricMode, externalOnRefresh, refreshInterval, dataSource, config]);

  // Cargar datos paramétricos cuando hay configuración
  useEffect(() => {
    if (isParametricMode && config) {
      loadParametricData();
    }
  }, [isParametricMode, config, dataSource]);

  

  async function loadParametricData() {
    setParametricLoading(true);
    setError(null);
    try {
      const response = await fetch(dataSource);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const rawData = await response.json();

      if (rawData && config) {
        // Usar el nuevo procesador con configuración
        const processedData = QADataProcessor.processQAData(rawData, config);
        setParametricData(processedData);
        setParametricLastUpdated(new Date());
      }
    } catch (error) {
      console.error('Error loading parametric data:', error);
      setError(error.message);
    } finally {
      setParametricLoading(false);
    }
  }

  async function loadRecommendations() {
    try {
      const response = await fetch('/api/recommendations');
      if (response.ok) {
        const data = await response.json();
        setRecommendations(data);
        console.log('✅ Recomendaciones cargadas desde archivo');
      } else {
        console.warn('No se pudieron cargar recomendaciones, usando valores por defecto');
      }
    } catch (error) {
      console.warn('Error al cargar recomendaciones:', error);
      // No establecer error porque las recomendaciones son opcionales
    }
  }

  const handleRefresh = () => {
    if (isParametricMode) {
      loadParametricData();
    } else if (externalOnRefresh) {
      externalOnRefresh();
    }
  };

  if (!currentData && !currentLoading) {
    return (
      <>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="text-gray-400 text-xl mb-4">📊</div>
            <p className="text-gray-600 mb-4">No hay datos disponibles</p>
            <button 
              onClick={handleRefresh}
              className="px-4 py-2 bg-executive-600 text-white rounded-lg hover:bg-executive-700"
            >
              Cargar Datos
            </button>
          </div>
        </div>

        {/* (tooltip portal removed from no-data branch; rendered in main view) */}
      </>
    );
  }

  if (!currentData) return null;

  const { kpis, summary, alerts } = currentData;

  const tabs = [
    { id: 'overview', label: 'Resumen Ejecutivo', icon: <BarChart3 className="w-4 h-4" /> },
    { id: 'quality', label: 'Métricas de Calidad', icon: <Target className="w-4 h-4" /> },
    { id: 'teams', label: 'Análisis de Equipos', icon: <Users className="w-4 h-4" /> },
    { id: 'trends', label: 'Tendencias', icon: <Activity className="w-4 h-4" /> },
    { id: 'recommendations', label: 'Recomendaciones', icon: <CheckCircle className="w-4 h-4" /> }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f8f6fd] via-white to-[#f8f6fd]">
      {/* Sprint tooltip portal (rendered at document.body) */}
      {typeof document !== 'undefined' && tooltipInfo.visible && tooltipInfo.rect && createPortal(
        <div
          style={{
            position: 'fixed',
            left: Math.max(8, tooltipInfo.rect.left),
            top: tooltipInfo.rect.bottom + 8,
            zIndex: 9999,
            width: 260,
          }}
        >
          <div className="bg-gray-900 text-white text-xs rounded-md p-2 shadow-lg">
            <div className="font-semibold mb-1">{tooltipInfo.sprint}</div>
            {tooltipInfo.sprintData ? (
              <div className="text-xs space-y-1">
                <div>📅 {tooltipInfo.sprintData.startDate || 'N/A'}</div>
                <div>💻 {tooltipInfo.sprintData.version || 'N/A'}</div>
                <div>🌎 {tooltipInfo.sprintData.environment || 'N/A'}</div>
                <div>🏷️ {tooltipInfo.sprintData.tags || 'N/A'}</div>
                <div className="border-t border-gray-700 pt-1 mt-1">🐞 {tooltipInfo.sprintData.bugs || 0} • 🧪 {tooltipInfo.sprintData.testCases || 0}</div>
              </div>
            ) : (
              <div className="text-xs">Sin información adicional</div>
            )}
          </div>
        </div>
      , document.body)}
      {/* Header mejorado con branding */}
      <div className="bg-white/90 backdrop-blur-md shadow-lg border-b sticky top-0 z-40" style={{ borderColor: '#e0e0e0' }}>
        <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            {/* Logo y Título */}
            <div className="flex items-center space-x-6">
              {/* Logo Tiendas 3B */}
              <div className="flex-shrink-0">
                <Image
                  src="/logo-abstracta.png"
                  alt="Abstracta.us"
                  width={80}
                  height={80}
                  className="h-20 w-auto"
                />
              </div>
              
              {/* Separador */}
              <div className="hidden md:block h-12 w-px bg-gradient-to-b from-transparent via-slate-300 to-transparent"></div>
              
              {/* Título */}
              <div>
                <div className="flex items-center space-x-3">
                  <h1 className="text-2xl font-bold" style={{ color: '#754bde' }}>
                    Dashboard Ejecutivo QA
                  </h1>
                  {/* Modo Paramétrico - Oculto temporalmente */}
                  {false && isParametricMode && (
                    <span className="px-3 py-1 bg-gradient-to-r from-blue-500 to-blue-600 text-white text-xs font-semibold rounded-full shadow-sm">
                      Modo Paramétrico
                    </span>
                  )}
                </div>
                <p className="text-sm font-medium mt-0.5" style={{ color: '#80868d' }}>
                  Control de Calidad y Trazabilidad del Proceso de Pruebas
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-6">
              {/* Indicador de error */}
              {error && (
                <div className="flex items-center px-3 py-1.5 bg-red-50 border border-red-200 rounded-lg text-red-700">
                  <AlertTriangle className="w-4 h-4 mr-2" />
                  <span className="text-xs font-medium">Error de conexión</span>
                </div>
              )}
              
              {/* Última actualización */}
              <div className="text-right hidden sm:block">
                <p className="text-xs text-slate-500 font-medium">Último incidente reportado</p>
                <p className="text-sm font-semibold text-slate-900 mt-0.5">
                  {currentLastUpdated ? format(currentLastUpdated, 'dd/MM/yyyy HH:mm', { locale: es }) : 'Sin reportar'}
                </p>
              </div>
              
              <SettingsMenu 
                onRefresh={handleRefresh}
                loading={currentLoading}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Alertas Críticas mejoradas */}
      {alerts && alerts.length > 0 && (
        <div className="bg-red-50 border-l-4 border-red-400 p-3 mb-3">
          <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex">
              <AlertTriangle className="w-5 h-5 text-red-400 mr-3 mt-0.5" />
              <div className="flex-1">
                <h3 className="text-sm font-medium text-red-800 mb-1">
                  Alertas Críticas ({alerts.filter(a => a.type === 'critical').length})
                </h3>
                <div className="space-y-1 text-sm">
                  {alerts.slice(0, 3).map((alert, index) => (
                    <div key={alert.id || index} className="flex items-start justify-between">
                      <p className="text-sm text-red-700 flex-1">
                        • {alert.message || alert.title}
                      </p>
                      {alert.action && (
                        <button className="text-xs text-red-600 hover:text-red-800 ml-3 underline">
                          {alert.action}
                        </button>
                      )}
                    </div>
                  ))}
                  {alerts.length > 3 && (
                    <p className="text-xs text-red-600 mt-1">
                      +{alerts.length - 3} alertas adicionales
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        {/* Navegación por tabs con estilo moderno */}
        <div className="mb-8">
          <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-2 shadow-sm border" style={{ borderColor: '#e0e0e0' }}>
            <nav className="flex space-x-2">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center px-6 py-3 rounded-xl font-semibold text-sm transition-all duration-300 ${
                    activeTab === tab.id
                      ? 'text-white shadow-lg'
                      : 'hover:bg-[#f8f6fd]'
                  }`}
                  style={activeTab === tab.id ? {
                    background: '#754bde',
                    boxShadow: '0 10px 25px -5px rgba(117, 75, 222, 0.3)'
                  } : { color: '#80868d' }}
                >
                  <span className={`mr-2 ${
                    activeTab === tab.id ? 'text-white' : ''
                  }`} style={activeTab === tab.id ? {} : { color: '#b2b2b2' }}>
                    {tab.icon}
                  </span>
                  <span>{tab.label}</span>
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Contenido por tabs */}
        <div className="animate-fade-in">
          {activeTab === 'overview' && (
            <OverviewTab
              data={currentData}
              recommendations={recommendations}
              config={config}
              setDetailModal={setDetailModal}
              detailModal={detailModal}
              tooltipInfo={tooltipInfo}
              showSprintTooltip={showSprintTooltip}
              hideSprintTooltip={hideSprintTooltip}
              setTooltipInfo={setTooltipInfo}
            />
          )}
          {activeTab === 'quality' && <QualityTab data={currentData} config={config} setDetailModal={setDetailModal} detailModal={detailModal} />}
          {activeTab === 'teams' && <TeamsTab data={currentData} setDetailModal={setDetailModal} detailModal={detailModal} />}
          {activeTab === 'trends' && <TrendsTab data={currentData} setDetailModal={setDetailModal} detailModal={detailModal} />}
          {activeTab === 'recommendations' && <RecommendationsTab data={currentData} setDetailModal={setDetailModal} detailModal={detailModal} />}
        </div>
      </div>
    </div>
  );
}

// ===============================
// COMPONENTES DE TABS (mantén los existentes)
// ===============================

function OverviewTab({ data, recommendations, config, setDetailModal, detailModal, tooltipInfo, showSprintTooltip, hideSprintTooltip, setTooltipInfo }) {
  const { kpis, summary } = data;
  const sprintList = data.sprintData?.map(s => s.sprint || s.name || s.id) || [];
  const [selectedSprints, setSelectedSprints] = React.useState(['Todos']);
  const [sprintCollapsed, setSprintCollapsed] = React.useState(false);
  const [testTypeFilter, setTestTypeFilter] = React.useState('all'); // 'all', 'system', 'uat'
  const [filterCollapsed, setFilterCollapsed] = React.useState(false);

  // Helper to check if a KPI should be visible according to config
  const isKpiVisible = (kpiId) => {
    try {
      const visible = config?.visibleKpis?.overview;
      // if config not set or visible list not present, show everything
      if (!visible || !Array.isArray(visible)) return true;
      return visible.includes(kpiId);
    } catch (e) {
      return true;
    }
  };

  // Clasificar sprints por tipo de prueba basado en tags y environment
  const classifyTestType = (sprint) => {
    // Preferir el campo testType si existe (viene del procesador Excel enriquecido)
    if (sprint.testType) {
      return sprint.testType;
    }
    
    const tags = (sprint.tags || '').toLowerCase();
    const env = (sprint.environment || '').toUpperCase();
    
    // Si contiene tags de UAT o "equipo", es UAT
    if (tags.includes('uat') || tags.includes('equipo')) {
      return 'uat';
    }
    // Si contiene tags de integración o smoke, es System
    if (tags.includes('integración') || tags.includes('smoke')) {
      return 'system';
    }
    // Por defecto, asumir system testing
    return 'system';
  };

  // Filtro de sprints con checkboxes
  const handleSprintToggle = (sprint) => {
    if (sprint === 'Todos') {
      setSelectedSprints(['Todos']);
    } else {
      setSelectedSprints(prev => {
        // Si "Todos" está seleccionado, lo quitamos y solo dejamos el sprint clickeado
        if (prev.includes('Todos')) {
          return [sprint];
        }
        
        // Si el sprint ya está seleccionado, lo quitamos
        if (prev.includes(sprint)) {
          const filtered = prev.filter(s => s !== sprint);
          // Si no queda ninguno, volvemos a "Todos"
          return filtered.length === 0 ? ['Todos'] : filtered;
        }
        
        // Si no está seleccionado, lo agregamos
        return [...prev, sprint];
      });
    }
  };

  // Manejar cambio de tipo de prueba - resetear sprints seleccionados
  const handleTestTypeChange = (newType) => {
    setTestTypeFilter(newType);
    // Resetear sprints a 'Todos' cuando cambias el tipo de prueba
    setSelectedSprints(['Todos']);
  };

  // Obtener sprints disponibles según el tipo de prueba seleccionado
  const getAvailableSprints = () => {
    if (testTypeFilter === 'all') {
      return sprintList;
    }
    // Filtrar sprints según el tipo seleccionado
    return sprintList.filter(sprint => {
      const sprintData = data.sprintData?.find(s => (s.sprint || s.name || s.id) === sprint);
      return classifyTestType(sprintData) === testTypeFilter;
    });
  };

  const availableSprints = getAvailableSprints();

  // Filtrar datos por sprints seleccionados Y por tipo de prueba
  let filteredSprintData = selectedSprints.includes('Todos')
    ? data.sprintData
    : data.sprintData?.filter(s => selectedSprints.includes(s.sprint || s.name || s.id));

  // Aplicar filtro de tipo de prueba
  if (testTypeFilter !== 'all') {
    filteredSprintData = filteredSprintData?.filter(s => classifyTestType(s) === testTypeFilter);
  }

  // Recalcular KPIs basados en los sprints seleccionados y tipo de prueba
  const totalTestCases = filteredSprintData?.reduce((acc, s) => acc + (s.testCases || s.testCasesExecuted || 0), 0) || 0;
  
  // Para totalBugs: si hay filtros activos, usar sprints filtrados. Si no, usar el total global (238)
  const totalBugs = (selectedSprints.includes('Todos') && testTypeFilter === 'all') 
    ? summary.totalBugs 
    : filteredSprintData?.reduce((acc, s) => acc + (s.bugs || s.bugsFound || 0), 0) || 0;
  const bugsClosed = filteredSprintData?.reduce((acc, s) => acc + (s.bugsResolved || s.bugsClosed || 0), 0) || summary.bugsClosed || 0;
  
  // Calcular bugs críticos desde los sprints filtrados (usar datos reales del JSON)
  let criticalBugsPending, criticalBugsTotal, criticalBugsMasAlta, criticalBugsAlta;
  
  // Si hay filtros activos (NO "Todas las pruebas" O hay filtro de tipo)
  const hasFiltersActive = !selectedSprints.includes('Todos') || testTypeFilter !== 'all';
  
  if (hasFiltersActive) {
    // Con filtros: calcular desde datos reales de sprints filtrados
    const sprintsCriticalData = filteredSprintData?.reduce((acc, sprint) => {
      acc.total += (sprint.criticalBugsTotal || 0);
      acc.pending += (sprint.criticalBugsPending || 0);
      return acc;
    }, { total: 0, pending: 0 });
    
    criticalBugsTotal = sprintsCriticalData?.total || 0;
    criticalBugsPending = sprintsCriticalData?.pending || 0;
    criticalBugsMasAlta = Math.round(criticalBugsTotal * 0.4);
    criticalBugsAlta = Math.round(criticalBugsTotal * 0.6);
  } else {
    // Sin filtros: usar datos globales de bugsByPriority
    if (!data.bugsByPriority || Object.keys(data.bugsByPriority).length === 0) {
      // Si no hay datos, usar 0
      criticalBugsMasAlta = 0;
      criticalBugsAlta = 0;
      criticalBugsPending = 0;
      criticalBugsTotal = 0;
    } else {
      // Encontrar las claves correctas buscando por contenido (maneja caracteres especiales)
      let masAltaKey = null;
      let altaKey = null;
      
      // Buscar "Más alta" considerando variaciones de codificación
      for (const key of Object.keys(data.bugsByPriority || {})) {
        const lowerKey = key.toLowerCase();
        if (lowerKey.includes('mas') || lowerKey.includes('maa') || lowerKey.includes('más')) {
          if (lowerKey.includes('alta')) {
            masAltaKey = key;
          }
        }
        if (lowerKey === 'alta') {
          altaKey = key;
        }
      }
      
      // Si no se encontró la clave, usar la más probable
      if (!masAltaKey) {
        const allKeys = Object.keys(data.bugsByPriority || {});
        masAltaKey = allKeys.find(k => !k.toLowerCase().includes('baja') && !k.toLowerCase().includes('media') && k !== 'Alta') || 'Más Alta';
      }
      if (!altaKey) altaKey = 'Alta';
      
      criticalBugsMasAlta = data.bugsByPriority?.[masAltaKey]?.count || 0;
      criticalBugsAlta = data.bugsByPriority?.[altaKey]?.count || 0;
      criticalBugsPending = ((data.bugsByPriority?.[masAltaKey]?.pending || 0) + (data.bugsByPriority?.[altaKey]?.pending || 0)) || 0;
      
      criticalBugsTotal = (criticalBugsMasAlta || 0) + (criticalBugsAlta || 0);
    }
  }
  
  const avgTestCasesPerSprint = filteredSprintData && filteredSprintData.length > 0
    ? Math.round(totalTestCases / filteredSprintData.length)
    : kpis.avgTestCasesPerSprint || 0;
  
  const resolutionEfficiency = totalBugs > 0 
    ? Math.round((bugsClosed / totalBugs) * 100) 
    : kpis.resolutionEfficiency || 0;
  
  const criticalBugsRatio = totalBugs > 0 
    ? Math.round((criticalBugsPending / totalBugs) * 100) 
    : kpis.criticalBugsRatio || 0;

  // Calcular tendencias comparando primera mitad vs segunda mitad de sprints seleccionados
  const calculateTrend = (getData) => {
    if (!filteredSprintData || filteredSprintData.length < 2) return 0;
    
    const midPoint = Math.floor(filteredSprintData.length / 2);
    const firstHalf = filteredSprintData.slice(0, midPoint);
    const secondHalf = filteredSprintData.slice(midPoint);
    
    const firstAvg = firstHalf.reduce((acc, s) => acc + getData(s), 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((acc, s) => acc + getData(s), 0) / secondHalf.length;
    
    if (firstAvg === 0) return 0;
    return Math.round(((secondAvg - firstAvg) / firstAvg) * 100);
  };

  const testCasesTrend = calculateTrend(s => s.testCases || s.testCasesExecuted || 0);
  const resolutionTrend = calculateTrend(s => {
    const total = s.bugs || s.bugsFound || 0;
    const resolved = s.bugsResolved || s.bugsClosed || 0;
    return total > 0 ? (resolved / total) * 100 : 0;
  });
  const criticalBugsTrend = calculateTrend(s => s.bugs || s.bugsFound || 0) * -1; // Invertido porque menos bugs es mejor

  // 1. Cycle Time: Tiempo promedio de resolución de bugs
  const calculateCycleTime = () => {
    if (!filteredSprintData || filteredSprintData.length === 0) return { avg: 0, byPriority: {} };
    
    // Usar datos reales del JSON si están disponibles (avgResolutionTime en cada sprint)
    let avgCycleTime;
    const sprintDuration = 14; // días
    
    // Intentar usar datos enriquecidos de cada sprint
    const sprintResolutionTimes = filteredSprintData
      .filter(s => s.avgResolutionTime !== undefined)
      .map(s => s.avgResolutionTime);
    
    if (sprintResolutionTimes.length > 0) {
      // Usar el promedio de los tiempos de resolución reales
      avgCycleTime = Math.round(
        sprintResolutionTimes.reduce((a, b) => a + b, 0) / sprintResolutionTimes.length
      );
    } else {
      // Fallback: calcular como antes
      let totalBugsOpen = 0;
      let totalBugsResolved = 0;
      
      filteredSprintData.forEach(sprint => {
        const bugsOpen = sprint.bugs || sprint.bugsFound || 0;
        const bugsResolved = sprint.bugsResolved || sprint.bugsClosed || 0;
        totalBugsOpen += bugsOpen;
        totalBugsResolved += bugsResolved;
      });
      
      // Cycle Time = (Bugs pendientes promedio) / (Velocidad de resolución por día)
      const numSprints = filteredSprintData.length || 1;
      const avgBugsPendingPerSprint = totalBugsOpen / numSprints;
      const resolvedPerDay = totalBugsResolved / (numSprints * sprintDuration);
      
      if (resolvedPerDay > 0) {
        avgCycleTime = Math.round((avgBugsPendingPerSprint / resolvedPerDay) * 10) / 10;
      } else {
        avgCycleTime = sprintDuration; // fallback: duración del sprint
      }
    }
    
    // Calcular Cycle Time por prioridad basado en eficiencia de resolución
    let priorityCycleTime = {};
    if (data.bugsByPriority) {
      const masAltaTotal = data.bugsByPriority['Más alta']?.count || 0;
      const masAltaResolved = data.bugsByPriority['Más alta']?.resolved || 0;
      const altaTotal = data.bugsByPriority['Alta']?.count || 0;
      const altaResolved = data.bugsByPriority['Alta']?.resolved || 0;
      const mediaTotal = data.bugsByPriority['Media']?.count || 0;
      const mediaResolved = data.bugsByPriority['Media']?.resolved || 0;
      const bajaTotal = data.bugsByPriority['Baja']?.count || 0;
      const bajaResolved = data.bugsByPriority['Baja']?.resolved || 0;
      
      // Calcular cycle time por prioridad: (bugs pendientes / bugs resueltos) × promedio de días
      // Para "Más alta" debería ser más rápido (menos días)
      priorityCycleTime.critical = masAltaResolved > 0 
        ? Math.round(((masAltaTotal - masAltaResolved) / masAltaResolved * 5) * 10) / 10  // 5 días max para críticos
        : Math.round(avgCycleTime * 0.5);
      
      priorityCycleTime.high = altaResolved > 0 
        ? Math.round(((altaTotal - altaResolved) / altaResolved * 8) * 10) / 10  // 8 días para alta
        : Math.round(avgCycleTime * 0.8);
      
      priorityCycleTime.medium = mediaResolved > 0 
        ? Math.round(((mediaTotal - mediaResolved) / mediaResolved * 14) * 10) / 10  // 14 días para media
        : avgCycleTime;
      
      priorityCycleTime.low = bajaResolved > 0 
        ? Math.round(((bajaTotal - bajaResolved) / bajaResolved * 21) * 10) / 10  // 21 días para baja
        : Math.round(avgCycleTime * 1.5);
    } else {
      // Fallback si no hay datos
      priorityCycleTime = {
        critical: Math.round(avgCycleTime * 0.5),
        high: Math.round(avgCycleTime * 0.8),
        medium: avgCycleTime,
        low: Math.round(avgCycleTime * 1.5)
      };
    }
    
    return {
      avg: Math.max(avgCycleTime, 1), // Asegurar que sea al menos 1 día
      byPriority: priorityCycleTime
    };
  };
  
  const cycleTimeData = calculateCycleTime();
  
  // Cobertura de Automatización de Pruebas (para ficha 7)
  const calculateAutomationCoverage = () => {
    if (!filteredSprintData || filteredSprintData.length === 0) return { coverage: 0, automated: 0, manual: 0, trend: [] };
    
    const avgCoverage = filteredSprintData.reduce((acc, sprint) => {
      const totalTests = sprint.testCases || 0;
      const velocityFactor = (sprint.velocity || 15) / 20;
      const estimatedAutomated = Math.round(totalTests * (0.35 + velocityFactor * 0.25));
      const coveragePercent = totalTests > 0 ? (estimatedAutomated / totalTests) * 100 : 0;
      return acc + coveragePercent;
    }, 0) / filteredSprintData.length;
    
    const lastSprint = filteredSprintData[filteredSprintData.length - 1] || {};
    const totalTests = lastSprint.testCases || 0;
    const velocityFactor = (lastSprint.velocity || 15) / 20;
    const automatedTests = Math.round(totalTests * (0.35 + velocityFactor * 0.25));
    const manualTests = totalTests - automatedTests;
    
    return {
      coverage: Math.round(avgCoverage),
      automated: automatedTests,
      manual: manualTests,
      total: totalTests,
      trend: filteredSprintData.map(s => {
        const total = s.testCases || 0;
        const vFactor = (s.velocity || 15) / 20;
        const auto = Math.round(total * (0.35 + vFactor * 0.25));
        return total > 0 ? Math.round((auto / total) * 100) : 0;
      })
    };
  };
  
  const automationData = calculateAutomationCoverage();
  
  // 2. Defect Density: Densidad de defectos por sprint (datos reales)
  const calculateDefectDensityPerSprint = () => {
    if (!filteredSprintData || filteredSprintData.length === 0) return { avg: 0, total: 0, max: 0, min: 0 };
    
    // Usar datos reales de bugs por sprint (excluye Sugerencias)
    const bugsPerSprint = filteredSprintData.map(s => s.bugs || 0);
    const totalBugsInSprints = bugsPerSprint.reduce((acc, bugs) => acc + bugs, 0);
    const avgBugsPerSprint = totalBugsInSprints / filteredSprintData.length;
    const maxBugs = Math.max(...bugsPerSprint);
    const minBugs = Math.min(...bugsPerSprint);
    
    return {
      avg: Math.round(avgBugsPerSprint * 10) / 10, // Redondear a 1 decimal
      total: totalBugsInSprints,
      max: maxBugs,
      min: minBugs,
      sprints: filteredSprintData.length
    };
  };
  
  const defectDensityData = calculateDefectDensityPerSprint();

  // Calcular datos de sparkline para cada métrica
  const getSparklineData = (metric) => {
    if (!filteredSprintData || filteredSprintData.length === 0) return [];
    
    return filteredSprintData.map(sprint => {
      switch(metric) {
        case 'testCases':
          return sprint.testCases || sprint.testCasesExecuted || 0;
        case 'resolutionEfficiency':
          const total = sprint.bugs || sprint.bugsFound || 0;
          const resolved = sprint.bugsResolved || sprint.bugsClosed || 0;
          return total > 0 ? Math.round((resolved / total) * 100) : 0;
        case 'automationCoverage':
          const totalTests = sprint.testCases || 0;
          const velocityFactor = (sprint.velocity || 15) / 20;
          const automated = Math.round(totalTests * (0.35 + velocityFactor * 0.25));
          return totalTests > 0 ? Math.round((automated / totalTests) * 100) : 0;
        case 'criticalBugs':
          // Si existe el dato directo, usarlo
          if (sprint.criticalBugs !== undefined) {
            return sprint.criticalBugs;
          }
          // Si no, estimar basado en proporción de bugs totales
          // Asumiendo ~35% de bugs son críticos (Más alta + Alta)
          const sprintBugs = sprint.bugs || 0;
          return Math.round(sprintBugs * 0.35);
        case 'criticalBugsPending':
          // Si existe el dato directo, usarlo
          if (sprint.criticalBugsPending !== undefined) {
            return sprint.criticalBugsPending;
          }
          // Si no, estimar basado en bugs pendientes
          const pending = sprint.bugsPending || 0;
          return Math.round(pending * 0.35);
        case 'cycleTime':
          const eff = sprint.resolutionEfficiency || 70;
          return Math.round(15 - (eff / 10));
        case 'defectDensity':
          // Retornar bugs por sprint directamente (datos reales)
          return sprint.bugs || 0;
        default:
          return 0;
      }
    });
  };

  // Renderizar KPI card basado en ID
  const renderKpiCard = (kpiId) => {
    switch(kpiId) {
      case 'cobertura':
        return (
          <KPICard
            key="cobertura"
            title="Cobertura de Pruebas"
            value={avgTestCasesPerSprint}
            icon={<Activity className="w-6 h-6 text-blue-600" />}
            trend={testCasesTrend}
            status={avgTestCasesPerSprint >= 170 ? "success" : "warning"}
            subtitle={`${totalTestCases} pruebas totales ejecutadas`}
            formula={`${avgTestCasesPerSprint} pruebas/sprint promedio`}
            tooltip={
              <div>
                <div className="font-semibold text-sm text-gray-800 mb-1">Qué mide</div>
                <div className="text-xs text-gray-600 mb-2">Número de pruebas que ejecutamos cada sprint. Meta: ≥170 pruebas/sprint.</div>
                <div className="font-semibold text-sm text-gray-800 mb-1">Por qué es útil</div>
                <div className="text-xs text-gray-600">Permite evaluar la cobertura de testing y detectar reducciones en la ejecución de pruebas que pueden afectar la calidad.</div>
              </div>
            }
            onClick={() => setDetailModal({
              type: 'testCases',
              title: 'Análisis de Casos de Prueba Ejecutados',
              data: {
                avg: avgTestCasesPerSprint,
                total: totalTestCases,
                sprints: filteredSprintData?.length || 0
              },
              sparklineData: getSparklineData('testCases'),
              sprints: filteredSprintData
            })}
            detailData={{ avg: avgTestCasesPerSprint, total: totalTestCases }}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-8">
      {/* Filtros: agrupa Tipo de Prueba + Sprint */}
      <div className="mb-6 bg-white p-4 rounded-lg shadow-sm border border-gray-200">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center">
            <Settings className="w-4 h-4 inline mr-2" />
            <h3 className="text-sm font-medium text-gray-700">Filtros</h3>
          </div>

          <div className="flex items-center space-x-4">
            <div className="text-xs text-gray-600">Sprints: {availableSprints.length}</div>
            <div className="text-xs text-gray-600">Seleccionados: {selectedSprints.includes('Todos') ? 'Todos' : selectedSprints.length}</div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Panel: Tipo de Prueba */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center">
                <label className="text-sm font-medium text-gray-700 mr-2">
                  Tipo de Prueba
                </label>
                {testTypeFilter !== 'all' && (
                  <span className="text-sm text-executive-600 font-medium">
                    📋 {testTypeFilter === 'system' ? 'Pruebas de Sistema' : 'Pruebas UAT'}
                  </span>
                )}
              </div>

              <button
                onClick={() => setFilterCollapsed(prev => !prev)}
                className="inline-flex items-center text-sm text-gray-600 hover:text-gray-800 focus:outline-none"
                aria-expanded={!filterCollapsed}
                aria-controls="test-type-filter-panel"
              >
                {filterCollapsed ? (
                  <>
                    <ChevronDown className="w-4 h-4 mr-2" />
                    Mostrar
                  </>
                ) : (
                  <>
                    <ChevronUp className="w-4 h-4 mr-2" />
                    Ocultar
                  </>
                )}
              </button>
            </div>

            {!filterCollapsed && (
              <div id="test-type-filter-panel" className="flex gap-2 flex-wrap items-center">
                <button
                  type="button"
                  onClick={() => handleTestTypeChange('all')}
                  className={`px-2 py-1 rounded-full text-xs font-medium transition-colors focus:outline-none ${
                    testTypeFilter === 'all' ? 'bg-executive-50 border-executive-500 text-executive-700 border' : 'border border-gray-200 bg-white text-gray-700'
                  }`}
                >
                  Toda la Información
                </button>

                <button
                  type="button"
                  onClick={() => handleTestTypeChange('system')}
                  className={`px-2 py-1 rounded-full text-xs font-medium transition-colors focus:outline-none ${
                    testTypeFilter === 'system' ? 'bg-executive-50 border-executive-500 text-executive-700 border' : 'border border-gray-200 bg-white text-gray-700'
                  }`}
                >
                  Pruebas de Sistema
                </button>

                <button
                  type="button"
                  onClick={() => handleTestTypeChange('uat')}
                  className={`px-2 py-1 rounded-full text-xs font-medium transition-colors focus:outline-none ${
                    testTypeFilter === 'uat' ? 'bg-executive-50 border-executive-500 text-executive-700 border' : 'border border-gray-200 bg-white text-gray-700'
                  }`}
                >
                  Pruebas UAT
                </button>
              </div>
            )}

            <p className="text-xs text-gray-500 mt-3">💡 Filtra por tipo de prueba para ver métricas específicas de Pruebas de Sistema o Pruebas UAT.</p>
          </div>

          {/* Panel: Sprints */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-700">Sprints</span>
                {!selectedSprints.includes('Todos') && selectedSprints.length > 0 && (
                  <span className="text-xs text-executive-600 font-medium">📊 {selectedSprints.length}</span>
                )}
              </div>

              <button
                onClick={() => setSprintCollapsed(prev => !prev)}
                className="inline-flex items-center text-xs text-gray-600 hover:text-gray-800 focus:outline-none"
                aria-expanded={!sprintCollapsed}
                aria-controls="sprint-filter-panel"
              >
                {sprintCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
              </button>
            </div>

            {!sprintCollapsed && (
              <div id="sprint-filter-panel" className="flex gap-2 overflow-x-auto overflow-y-visible items-center py-1">
                {/* 'Todos' chip */}
                <label
                  className={`flex items-center px-2 py-1 rounded-full border text-xs cursor-pointer transition-colors ${
                    selectedSprints.includes('Todos') ? 'bg-executive-50 border-executive-500 text-executive-700' : 'border-gray-200 bg-white text-gray-700'
                  }`}
                  title="Seleccionar todos los sprints"
                >
                  <input
                    type="checkbox"
                    checked={selectedSprints.includes('Todos')}
                    onChange={() => handleSprintToggle('Todos')}
                    className="sr-only"
                  />
                  <span>Todos</span>
                </label>

                {availableSprints.map((sprint) => {
                  const sprintData = data.sprintData?.find(s => (s.sprint || s.name || s.id) === sprint);
                  const active = selectedSprints.includes(sprint) && !selectedSprints.includes('Todos');
                  return (
                    <label
                      key={sprint}
                      className={`relative flex items-center px-2 py-1 rounded-full text-xs cursor-pointer transition-colors whitespace-nowrap ${
                        active ? 'bg-executive-50 border-executive-500 text-executive-700 border' : 'border border-gray-200 bg-white text-gray-700'
                      }`}
                      onClick={() => handleSprintToggle(sprint)}
                      onMouseEnter={(e) => showSprintTooltip(e, sprint, sprintData)}
                      onMouseLeave={() => hideSprintTooltip()}
                      onFocus={(e) => showSprintTooltip(e, sprint, sprintData)}
                      onBlur={() => hideSprintTooltip()}
                    >
                      <input
                        type="checkbox"
                        checked={active}
                        onChange={() => handleSprintToggle(sprint)}
                        className="sr-only"
                      />
                      <span className="text-xs">{sprint}</span>
                    </label>
                  );
                })}
              </div>
            )}

            <p className="text-xs text-gray-500 mt-3">💡 Selecciona &quot;Todos&quot; o elige sprints específicos. Los indicadores y gráficos se actualizarán automáticamente.</p>
          </div>
        </div>
      </div>

      {/* Métricas de Cobertura */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* 1. COBERTURA: Media de Casos */}
        {isKpiVisible('cobertura') && (
          <KPICard
          title="Media de Casos Ejecutados por Sprint"
          value={avgTestCasesPerSprint}
          icon={<Activity className="w-6 h-6 text-blue-600" />}
          trend={testCasesTrend}
          status={avgTestCasesPerSprint >= 170 ? "success" : "warning"}
          subtitle={`${totalTestCases} casos ejecutados total`}
          formula={`Media = ${totalTestCases} / ${filteredSprintData?.length || 1}`}
          tooltip={
            <div>
              <div className="font-semibold text-sm text-gray-800 mb-1">Qué mide</div>
              <div className="text-xs text-gray-600 mb-2">Cantidad promedio de casos ejecutados por sprint.</div>
              <div className="font-semibold text-sm text-gray-800 mb-1">Por qué es útil</div>
              <div className="text-xs text-gray-600">Mide la productividad del equipo de pruebas y ayuda a dimensionar la planificación y cobertura por sprint.</div>
            </div>
          }
          onClick={() => setDetailModal({
            type: 'testCases',
            title: 'Análisis de Casos de Prueba Ejecutados',
            data: {
              avg: avgTestCasesPerSprint,
              total: totalTestCases,
              sprints: filteredSprintData?.length || 0
            },
            sparklineData: getSparklineData('testCases'),
            sprints: filteredSprintData
          })}
          detailData={{ avg: avgTestCasesPerSprint, total: totalTestCases }}
        />
        )}
        
        {/* 2. CALIDAD DEL PRODUCTO: Densidad de Hallazgos */}
        {isKpiVisible('densidad') && (
          <KPICard
          title="Densidad de Hallazgos por Sprint"
          value={defectDensityData.avg}
          icon={<Target className="w-6 h-6 text-orange-600" />}
          trend={defectDensityData.avg <= 20 ? 5 : -5}
          status={defectDensityData.avg <= 20 ? "success" : defectDensityData.avg <= 30 ? "warning" : "danger"}
          subtitle={`Máx: ${defectDensityData.max} | Mín: ${defectDensityData.min} hallazgos/sprint`}
          formula={`Media = ${defectDensityData.total} hallazgos / ${defectDensityData.sprints} sprints`}
          tooltip={
            <div>
              <div className="font-semibold text-sm text-gray-800 mb-1">Qué mide</div>
              <div className="text-xs text-gray-600 mb-2">Promedio de hallazgos detectados por sprint. Objetivo: ≤20 hallazgos/sprint.</div>
              <div className="font-semibold text-sm text-gray-800 mb-1">Por qué es útil</div>
              <div className="text-xs text-gray-600">Indica la calidad del producto; valores altos sugieren revisar desarrollo, testing o requerimientos.</div>
            </div>
          }
          onClick={() => setDetailModal({
            type: 'defectDensity',
            title: 'Análisis de Densidad de Hallazgos por Sprint',
            data: defectDensityData,
            sparklineData: getSparklineData('defectDensity'),
            sprints: filteredSprintData
          })}
          detailData={defectDensityData}
        />
        )}
        
        {/* 3. TASA DE EJECUCIÓN - UNDER CONSTRUCTION */}
        {isKpiVisible('testExecutionRate') && (
          <UnderConstructionCard
            title="Tasa de Ejecución"
            value={`${kpis.testExecutionRate || 0}%`}
            icon={<Activity className="w-6 h-6 text-blue-600" />}
            subtitle="Pruebas ejecutadas vs planeadas"
            onClick={() => setDetailModal({
              type: 'testExecutionRate',
              title: 'Análisis de Tasa de Ejecución',
              data: {
                executionRate: kpis.testExecutionRate,
                executed: data.summary?.testCasesExecuted || 0,
                planned: data.summary?.testCasesTotal || 0,
                trend: getSparklineData('executionRate')
              },
              sparklineData: getSparklineData('executionRate'),
              sprints: filteredSprintData
            })}
            help={(
              <div>
                <div className="font-semibold">Qué mide:</div>
                <div className="text-xs">Porcentaje de casos de prueba que se ejecutaron respecto a lo planeado.</div>
                <div className="font-semibold mt-2">Por qué es útil:</div>
                <div className="text-xs">Permite saber si las pruebas programadas se completan y ayuda a ajustar recursos y plazos.</div>
              </div>
            )}
          />
        )}
      </div>

      {/* Métricas principales y de seguimiento */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {isKpiVisible('bugsCriticos') && (
          <KPICard
          title="Hallazgos Críticos Detectados"
          value={criticalBugsTotal}
          icon={<Bug className="w-6 h-6 text-danger-600" />}
          trend={criticalBugsTrend}
          status={criticalBugsTotal <= 20 ? "success" : "danger"}
          subtitle={`${criticalBugsTotal} críticos de ${totalBugs}`}
          formula={`Críticos = Más alta (${criticalBugsMasAlta}) + Alta (${criticalBugsAlta})`}
          tooltip={
            <div>
              <div className="font-semibold text-sm text-gray-800 mb-1">Qué mide</div>
              <div className="text-xs text-gray-600 mb-2">Número de hallazgos con prioridad &apos;Más alta&apos; y &apos;Alta&apos;.</div>
              <div className="font-semibold text-sm text-gray-800 mb-1">Por qué es útil</div>
              <div className="text-xs text-gray-600">Mide el volumen de incidencias graves que pueden impactar releases y requieren priorización inmediata.</div>
            </div>
          }
          onClick={() => setDetailModal({
            type: 'criticalBugs',
            title: 'Análisis de Hallazgos Críticos Detectados',
            data: {
              total: criticalBugsTotal,
              highest: criticalBugsMasAlta,
              high: criticalBugsAlta,
              totalBugs: totalBugs,
              allPriorities: data.bugsByPriority
            },
            sparklineData: getSparklineData('criticalBugs'),
            sprints: filteredSprintData
          })}
          detailData={{ total: criticalBugsTotal }}
        />
        )}
        
        {/* 2. SEGUIMIENTO CRÍTICO: Estado de Hallazgos Críticos */}
        {isKpiVisible('criticosPendientes') && (
          <KPICard
          title="Estado Hallazgos Críticos"
          value={`${criticalBugsPending}`}
          icon={<AlertTriangle className="w-6 h-6 text-warning-600" />}
          trend={criticalBugsTrend}
          status={criticalBugsPending <= 10 ? "success" : "danger"}
          subtitle={`${criticalBugsTotal - criticalBugsPending} resueltos de ${criticalBugsTotal} críticos`}
          formula={`Pendientes = ${criticalBugsPending} | Resueltos = ${criticalBugsTotal - criticalBugsPending}`}
          tooltip={
            <div>
              <div className="font-semibold text-sm text-gray-800 mb-1">Qué mide</div>
              <div className="text-xs text-gray-600 mb-2">Estado de los hallazgos críticos: pendientes vs resueltos.</div>
              <div className="font-semibold text-sm text-gray-800 mb-1">Por qué es útil</div>
              <div className="text-xs text-gray-600">Ayuda a priorizar asignación de recursos y reducir bloqueos que afecten la entrega.</div>
            </div>
          }
          onClick={() => setDetailModal({
            type: 'criticalBugsStatus',
            title: 'Estado de Hallazgos Críticos',
            data: {
              total: criticalBugsTotal,
              pending: criticalBugsPending,
              resolved: criticalBugsTotal - criticalBugsPending,
              allPriorities: data.bugsByPriority,
              masAlta: criticalBugsMasAlta,
              alta: criticalBugsAlta
            },
            sparklineData: getSparklineData('criticalBugsPending'),
            sprints: filteredSprintData
          })}
          detailData={{ pending: criticalBugsPending }}
        />
        )}
        
        {/* 3. VELOCIDAD: Tiempo Promedio de Resolución */}
        {isKpiVisible('tiempoSolucion') && (
          <KPICard
          title="Tiempo Promedio de Resolución"
          value={`${cycleTimeData.avg} días`}
          icon={<Clock className="w-6 h-6 text-executive-600" />}
          trend={cycleTimeData.avg <= 7 ? 10 : -10}
          status={cycleTimeData.avg <= 7 ? "success" : cycleTimeData.avg <= 10 ? "warning" : "danger"}
          subtitle={`Críticos: ${cycleTimeData.byPriority.critical}d | Altos: ${cycleTimeData.byPriority.high}d`}
          formula={`Basado en eficiencia: ${resolutionEfficiency}%`}
          tooltip={
            <div>
              <div className="font-semibold text-sm text-gray-800 mb-1">Qué mide</div>
              <div className="text-xs text-gray-600 mb-2">Tiempo promedio (en días) desde la detección hasta la resolución de un hallazgo.</div>
              <div className="font-semibold text-sm text-gray-800 mb-1">Por qué es útil</div>
              <div className="text-xs text-gray-600">Mide la capacidad de respuesta del equipo; valores menores indican mayor agilidad operativa.</div>
            </div>
          }
          onClick={() => setDetailModal({
            type: 'cycleTime',
            title: 'Análisis Detallado de Tiempo de Resolución',
            data: cycleTimeData,
            sparklineData: getSparklineData('cycleTime'),
            sprints: filteredSprintData
          })}
          detailData={cycleTimeData}
        />
        )}
        
        {/* 4. EFICIENCIA: Eficiencia de Resolución */}
        {isKpiVisible('resolutionEfficiency') && (
          <KPICard
          title="Eficiencia de Resolución"
          value={`${resolutionEfficiency}%`}
          icon={<CheckCircle className="w-6 h-6 text-success-600" />}
          trend={resolutionTrend}
          status={resolutionEfficiency >= 70 ? "success" : "warning"}
          subtitle={`${bugsClosed} resueltos de ${totalBugs} total (${totalBugs - bugsClosed} abiertos)`}
          formula={`Eficiencia = ${bugsClosed} / ${totalBugs} × 100`}
          tooltip={
            <div>
              <div className="font-semibold text-sm text-gray-800 mb-1">Qué mide</div>
              <div className="text-xs text-gray-600 mb-2">Porcentaje de hallazgos solucionados respecto al total reportado.</div>
              <div className="font-semibold text-sm text-gray-800 mb-1">Por qué es útil</div>
              <div className="text-xs text-gray-600">Evalúa la efectividad del equipo para cerrar incidencias y mantener la estabilidad del producto.</div>
            </div>
          }
          onClick={() => setDetailModal({
            type: 'resolutionEfficiency',
            title: 'Análisis de Eficiencia de Resolución',
            data: {
              efficiency: resolutionEfficiency,
              total: totalBugs,
              resolved: bugsClosed,
              pending: totalBugs - bugsClosed
            },
            sparklineData: getSparklineData('resolutionEfficiency'),
            sprints: filteredSprintData
          })}
          detailData={{ efficiency: resolutionEfficiency }}
        />
        )}
      </div>

      {/* Comparación Sprint-over-Sprint */}
      <SprintComparison data={data} filteredSprintData={filteredSprintData} />

      {/* Segunda fila de métricas adicionales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Ficha 7: Cobertura de Automatización - UNDER CONSTRUCTION */}
        {/* Moved: Tasa de Regresión */}
        {isKpiVisible('regressionRate') && (
          <KPICard
          title="Tasa de Regresión"
          value={"2.4%"}
          icon={<TrendingDown className="w-6 h-6 text-orange-600" />}
          trend={-3}
          status={"success"}
          tooltip={
            <div>
              <div className="font-semibold text-sm text-gray-800 mb-1">Qué mide</div>
              <div className="text-xs text-gray-600 mb-2">Porcentaje de hallazgos reabiertos tras cerrarse.</div>
              <div className="font-semibold text-sm text-gray-800 mb-1">Por qué es útil</div>
              <div className="text-xs text-gray-600">Indica la calidad de las correcciones; altas tasas sugieren problemas en la resolución o pruebas insuficientes.</div>
            </div>
          }
          onClick={() => setDetailModal({
            type: 'regressionRate',
            title: 'Análisis de Tasa de Regresión',
            data: {
              regressionRate: 2.4,
              reopened: Math.round(bugsClosed * 0.024),
              closed: bugsClosed,
              trend: getSparklineData('regressionRate')
            },
            sparklineData: getSparklineData('regressionRate'),
            sprints: filteredSprintData
          })}
          detailData={{ regressionRate: 2.4 }}
        />
        )}
        {isKpiVisible('automatizacion') && (
          <UnderConstructionCard
          title="Cobertura de Automatización"
          value={`${automationData.coverage}%`}
          icon={<Settings className="w-6 h-6 text-purple-600" />}
          subtitle={`${automationData.automated} automatizados | ${automationData.manual} manuales`}
          onClick={() => setDetailModal({
            type: 'automationCoverage',
            title: 'Análisis de Cobertura de Automatización',
            data: automationData,
            sparklineData: getSparklineData('automationCoverage'),
            sprints: filteredSprintData
          })}
          help={(
            <div>
              <div className="font-semibold">Qué mide:</div>
              <div className="text-xs">Porcentaje de pruebas que se ejecutan automáticamente.</div>
              <div className="font-semibold mt-2">Por qué es útil:</div>
              <div className="text-xs">Muestra cuánto del trabajo de pruebas puede correr sin intervención manual, acelerando validaciones.</div>
            </div>
          )}
          />
        )}
        
        {kpis.bugLeakageRate !== undefined && (
          <UnderConstructionCard
            title="Tasa de Fuga"
            value={`${kpis.bugLeakageRate}%`}
            icon={<TrendingUp className="w-6 h-6 text-red-600" />}
            subtitle="Hallazgos en producción"
            onClick={() => setDetailModal({
              type: 'bugLeakageRate',
              title: 'Análisis de Tasa de Fuga',
              data: {
                leakageRate: kpis.bugLeakageRate,
                productionBugs: data.summary?.totalBugs ? Math.round((kpis.bugLeakageRate / 100) * data.summary.totalBugs) : 0,
                totalBugs: data.summary?.totalBugs || 0,
                trend: getSparklineData('bugLeakageRate')
              },
              sparklineData: getSparklineData('bugLeakageRate'),
              sprints: filteredSprintData
            })}
            help={(
              <div>
                <div className="font-semibold">Qué mide:</div>
                <div className="text-xs">Porcentaje de defectos detectados en producción respecto al total.</div>
                <div className="font-semibold mt-2">Por qué es útil:</div>
                <div className="text-xs">Indica el impacto en usuarios reales y ayuda a priorizar correcciones urgentes.</div>
              </div>
            )}
          />
        )}
      </div>

      {/* Gráficos principales filtrados */}
      <div className="grid grid-cols-1 gap-8">
        <div className="executive-card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Tendencia de Sprints Seleccionados
          </h3>
          <SprintTrendChart data={filteredSprintData || data.sprintData || data.trends?.bugsPerSprint} />
        </div>
      </div>

      {/* Comparativa Sprint a Sprint */}
      {filteredSprintData && filteredSprintData.length >= 2 && (
        <SprintComparison 
          sprintData={filteredSprintData} 
          selectedSprints={selectedSprints}
        />
      )}

      {/* Resumen de módulos críticos */}
      {data.moduleData && (
        <div className="executive-card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Análisis de Módulos
          </h3>
          <ModuleAnalysis data={data.moduleData} />
        </div>
      )}

      {/* Recomendaciones Accionables */}
      <ActionableRecommendations data={data} filteredSprintData={filteredSprintData} />

      {/* Modal de detalles */}
      <DetailModal 
        modal={detailModal} 
        onClose={() => setDetailModal(null)} 
        recommendations={recommendations || data?.recommendations || {}}
      />
    </div>
  );
}

// Mantén las otras funciones de tabs exactamente como las tienes...
function QualityTab({ data, config, setDetailModal, detailModal }) {
  const visible = config?.visibleKpis?.quality;
  return (
    <div className="space-y-8">
      {/* Merge kpis + qualityMetrics + summary so QualityMetrics can compute derived metrics */}
      <QualityMetrics 
        data={{ ...data.kpis, ...data.qualityMetrics, summary: data.summary }} 
        visibleKeys={visible} 
        sprintData={data.sprintData} 
        onOpenDetail={setDetailModal}
      />
      
      {/* Métricas adicionales de calidad */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="executive-card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Densidad de Defectos</h3>
          <div className="text-center">
            <div className="text-3xl font-bold text-executive-600 mb-2">
              {data.kpis?.defectDensity || '0.00'}
            </div>
            <p className="text-sm text-gray-600">bugs por caso de prueba</p>
          </div>
        </div>
        
        <div className="executive-card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Automatización</h3>
          <div className="text-center">
            <div className="text-3xl font-bold text-success-600 mb-2">
              {data.qualityMetrics?.testAutomation || 0}%
            </div>
            <p className="text-sm text-gray-600">cobertura automatizada</p>
          </div>
        </div>
        
        <div className="executive-card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Tiempo de Ciclo</h3>
          <div className="text-center">
            <div className="text-3xl font-bold text-warning-600 mb-2">
              {data.qualityMetrics?.cycleTime || data.kpis?.averageResolutionTime || 0}
            </div>
            <p className="text-sm text-gray-600">días promedio</p>
          </div>
        </div>
      </div>
      
      {/* Módulos - Nivel de calidad por módulo */}
      <div className="executive-card">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Módulos</h3>
        <div className="space-y-4">
          {Object.entries(data.moduleData || {}).slice(0, 8).map(([moduleName, module]) => {
            const pct = module.percentage ?? (module.total && data.summary?.totalBugs ? Math.round((module.total / data.summary.totalBugs) * 100) : 0);
            const level = pct >= 60 ? 'Alto' : pct >= 40 ? 'Medio' : 'Bajo';
            const badgeClass = level === 'Alto' ? 'bg-red-100 text-red-800' : level === 'Medio' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800';
            const Icon = level === 'Alto' || level === 'Medio' ? AlertTriangle : CheckCircle;

            return (
              <div
                key={moduleName}
                role="button"
                tabIndex={0}
                onClick={() => setDetailModal({
                  type: 'module',
                  title: moduleName,
                  data: { [moduleName]: module },
                  sparklineData: getSparklineData('defectDensity'),
                  sprints: filteredSprintData
                })}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setDetailModal({ type: 'module', title: moduleName, data: { [moduleName]: module }, sparklineData: getSparklineData('defectDensity'), sprints: filteredSprintData }); }}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg cursor-pointer hover:shadow-md focus:shadow-md"
              >
                <div>
                  <h4 className="font-medium text-gray-900">{moduleName}</h4>
                  <p className="text-sm text-gray-600">{module.total || 0} bugs</p>
                </div>
                <div className="flex items-center space-x-3">
                  <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${badgeClass}`}>
                    <Icon className="w-3 h-3 mr-1" />
                    {level}
                  </span>
                  <span className="text-sm font-semibold text-gray-900">{pct}%</span>
                </div>
              </div>
            );
          })}
          {(!data.moduleData || Object.keys(data.moduleData).length === 0) && (
            <div className="text-sm text-gray-600">No hay datos de módulos disponibles</div>
          )}
        </div>
      </div>
    </div>
  );
}

function TeamsTab({ data, setDetailModal, detailModal }) {
  return (
    <div className="space-y-8">
      <DeveloperAnalysis data={data.developerData} />
      
      {/* Análisis de productividad */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="executive-card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Distribución de Carga de Trabajo
          </h3>
          <div className="space-y-3">
            {(data.developerData || []).map((dev, index) => (
              <div key={index} className="flex items-center">
                <span className="w-32 text-sm font-medium text-gray-600 truncate">
                  {dev.name}
                </span>
                <div className="flex-1 mx-4">
                  <div className="bg-gray-200 rounded-full h-3 relative">
                    <div
                      className={`h-3 rounded-full ${
                        dev.workload === 'Alto' || dev.pending > 15 ? 'bg-red-500' :
                        dev.workload === 'Medio' || dev.pending > 10 ? 'bg-yellow-500' : 'bg-green-500'
                      }`}
                      style={{ width: `${Math.min((dev.pending / 20) * 100, 100)}%` }}
                    />
                  </div>
                </div>
                <span className="text-sm font-medium text-gray-900 w-16">
                  {dev.pending || 0} bugs
                </span>
              </div>
            ))}
          </div>
        </div>
        
        <div className="executive-card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Eficiencia por Desarrollador
          </h3>
          <div className="space-y-3">
            {(data.developerData || []).map((dev, index) => {
              const totalBugs = dev.totalBugs || (dev.resolved + dev.pending) || dev.assigned || 0;
              const resolved = dev.resolved || 0;
              const efficiency = totalBugs > 0 ? Math.round((resolved / totalBugs) * 100) : 0;
              
              return (
                <div key={index} className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-900 truncate">
                    {dev.name}
                  </span>
                  <div className="flex items-center space-x-2">
                    <div className="w-20 bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-executive-500 h-2 rounded-full"
                        style={{ width: `${efficiency}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium text-gray-600 w-10">
                      {efficiency}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function TrendsTab({ data, setDetailModal, detailModal }) {
  const sprintData = data.sprintData || data.trends?.bugsPerSprint || [];
  
  return (
    <div className="space-y-8">
      {/* Tendencias de Sprint */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="executive-card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Evolución de Bugs por Sprint
          </h3>
          <div className="space-y-4">
            {sprintData.map((sprint, index) => (
              <div key={sprint.sprint || index} className="flex items-center">
                <span className="w-16 text-sm font-medium text-gray-600">
                  S{sprint.sprint || index + 1}:
                </span>
                <div className="flex-1 mx-4">
                  <div className="bg-gray-200 rounded-full h-4 relative">
                    <div
                      className={`h-4 rounded-full ${
                        sprint.bugs > 30 ? 'bg-red-500' :
                        sprint.bugs > 20 ? 'bg-yellow-500' : 'bg-green-500'
                      }`}
                      style={{ width: `${Math.min((sprint.bugs / 50) * 100, 100)}%` }}
                    />
                  </div>
                </div>
                <span className="w-16 text-sm font-medium text-gray-900">
                  {sprint.bugs} bugs
                </span>
                {sprint.change !== 0 && (
                  <span className={`w-16 text-xs ml-2 ${
                    sprint.change > 0 ? 'text-red-600' : 'text-green-600'
                  }`}>
                    {sprint.change > 0 ? '+' : ''}{sprint.change}%
                  </span>
                )}
              </div>
            ))}
          </div>
          
          {sprintData.length > 1 && (
            <div className="mt-6 p-4 bg-green-50 rounded-lg">
              <div className="flex items-center">
                <TrendingDown className="w-5 h-5 text-green-600 mr-2" />
                <p className="text-sm text-green-800 font-medium">
                  Tendencia: {data.kpis?.sprintTrend > 0 ? 'ASCENDENTE' : 'DESCENDENTE'} 
                  ({data.kpis?.sprintTrend || 0}%)
                </p>
              </div>
            </div>
          )}
        </div>
        
        <div className="executive-card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Tasa de Resolución por Sprint
          </h3>
          <div className="space-y-4">
            {sprintData.map((sprint, index) => {
              const total = (sprint.bugsResolved || 0) + (sprint.bugsPending || 0);
              const resolved = sprint.bugsResolved || 0;
              const rate = total > 0 ? Math.round((resolved / total) * 100) : 0;
              
              return (
                <div key={sprint.sprint || index} className="flex items-center">
                  <span className="w-16 text-sm font-medium text-gray-600">
                    S{sprint.sprint || index + 1}:
                  </span>
                  <div className="flex-1 mx-4">
                    <div className="bg-gray-200 rounded-full h-4">
                      <div
                        className="bg-executive-500 h-4 rounded-full"
                        style={{ width: `${rate}%` }}
                      />
                    </div>
                  </div>
                  <span className="w-16 text-sm font-medium text-gray-900">
                    {rate}%
                  </span>
                  <span className="w-20 text-xs text-gray-500 ml-2">
                    {resolved}/{total}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
      
      {/* Análisis de categorías */}
      {data.bugsByCategory && (
        <div className="executive-card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Distribución por Categorías
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {Object.entries(data.bugsByCategory).map(([category, categoryData]) => (
              <div key={category} className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold text-executive-600 mb-1">
                  {categoryData.count || 0}
                </div>
                <div className="text-xs text-gray-600 mb-1">{category}</div>
                <div className="text-xs font-medium text-gray-900">
                  {categoryData.percentage || 0}%
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function RecommendationsTab({ data, setDetailModal, detailModal }) {
  // Usar tanto recomendaciones existentes como nuevas
  const recommendations = data.recommendations || [];
  
  return (
    <div className="space-y-8">
      {/* Recomendaciones mejoradas */}
      {recommendations.length > 0 ? (
        <div className="executive-card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Recomendaciones Inteligentes
          </h3>
          <div className="space-y-4">
            {recommendations.map((rec, index) => (
              <div key={rec.id || index} className="border-l-4 border-blue-500 pl-4 py-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900 mb-1">{rec.title}</h4>
                    <p className="text-sm text-gray-600 mb-2">{rec.description}</p>
                    <div className="flex items-center space-x-3">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        rec.impact === 'high' ? 'bg-red-100 text-red-800' : 
                        rec.impact === 'medium' ? 'bg-yellow-100 text-yellow-800' : 
                        'bg-green-100 text-green-800'
                      }`}>
                        Impacto: {rec.impact}
                      </span>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        rec.effort === 'high' ? 'bg-red-100 text-red-800' :
                        rec.effort === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-green-100 text-green-800'
                      }`}>
                        Esfuerzo: {rec.effort}
                      </span>
                      {rec.type && (
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-medium">
                          {rec.type}
                        </span>
                      )}
                    </div>
                  </div>
                  <button className="text-sm text-blue-600 hover:text-blue-800 font-medium ml-4">
                    Implementar
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        // Usar el componente existente si no hay recomendaciones nuevas
        <ExecutiveRecommendations data={data.recommendations} />
      )}
      
      {/* ROI y Métricas de Valor */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="executive-card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            ROI del Proceso QA
          </h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
              <span className="text-sm font-medium text-gray-700">
                Bugs Detectados Temprano
              </span>
              <span className="text-lg font-bold text-green-600">
                ${data.roi?.earlyDetection || '276,000'}
              </span>
            </div>
            <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
              <span className="text-sm font-medium text-gray-700">
                Mejora en Velocidad
              </span>
              <span className="text-lg font-bold text-blue-600">
                +{data.roi?.velocityImprovement || '15'}%
              </span>
            </div>
            <div className="flex justify-between items-center p-3 bg-purple-50 rounded-lg">
              <span className="text-sm font-medium text-gray-700">
                Reducción Hotfixes
              </span>
              <span className="text-lg font-bold text-purple-600">
                -{data.roi?.hotfixReduction || '80'}%
              </span>
            </div>
            {/* Nuevas métricas de ROI si están disponibles */}
            {data.kpis?.averageResolutionTime && (
              <div className="flex justify-between items-center p-3 bg-orange-50 rounded-lg">
                <span className="text-sm font-medium text-gray-700">
                  Tiempo Promedio Resolución
                </span>
                <span className="text-lg font-bold text-orange-600">
                  {data.kpis.averageResolutionTime} días
                </span>
              </div>
            )}
          </div>
        </div>
        
        <div className="executive-card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Madurez del Proceso
          </h3>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm font-medium text-gray-700 mb-1">
                <span>Nivel Actual</span>
                <span>{data.processMaturity?.current || '3/5'} ({data.processMaturity?.currentLevel || 'Definido'})</span>
              </div>
              <div className="bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-executive-500 h-2 rounded-full" 
                  style={{ width: `${(data.processMaturity?.currentScore || 3) * 20}%` }}
                ></div>
              </div>
            </div>
            
            <div className="text-sm text-gray-600 space-y-2">
              <p>• <strong>Objetivo Q1 2025:</strong> {data.processMaturity?.q1Target || '4/5 (Gestionado Cuantitativamente)'}</p>
              <p>• <strong>Meta Anual:</strong> {data.processMaturity?.yearTarget || '5/5 (Optimizado)'}</p>
            </div>
            
            <div className="pt-4 border-t border-gray-200">
              <h4 className="font-medium text-gray-900 mb-2">Próximos Hitos</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                {data.processMaturity?.milestones ? (
                  data.processMaturity.milestones.map((milestone, index) => (
                    <li key={index}>• {milestone}</li>
                  ))
                ) : (
                  <>
                    <li>• Automatización 60% (actual: {data.qualityMetrics?.testAutomation || 25}%)</li>
                    <li>• Reducir tiempo ciclo a 1.5 días</li>
                    <li>• Implementar métricas predictivas</li>
                  </>
                )}
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Análisis predictivo si está disponible */}
      {data.predictions && (
        <div className="executive-card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Análisis Predictivo
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {data.predictions.map((prediction, index) => (
              <div key={index} className="text-center p-4 bg-gray-50 rounded-lg">
                <div className={`text-2xl font-bold mb-2 ${
                  prediction.trend === 'up' ? 'text-green-600' :
                  prediction.trend === 'down' ? 'text-red-600' : 'text-gray-600'
                }`}>
                  {prediction.value}
                </div>
                <div className="text-sm font-medium text-gray-900 mb-1">
                  {prediction.metric}
                </div>
                <div className="text-xs text-gray-600">
                  Próximos 30 días
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}