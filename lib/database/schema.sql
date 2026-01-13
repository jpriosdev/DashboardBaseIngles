-- ============================================================================
-- SCHEMA SQLite - QA Dashboard
-- Basado en estructura de datos cargados (bugs y versiones)
-- 
-- 3 TABLAS REALES + VISTAS PARA AGREGACIONES
-- ============================================================================

-- ============================================================================
-- TABLAS REALES (3)
-- ============================================================================

-- Tabla 1: SPRINTS_VERSIONES (de hoja "Versiones")
-- Contiene información de cada versión/sprint
-- Una versión puede ser prelim o intermedia de un sprint
CREATE TABLE IF NOT EXISTS sprints_versions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  version TEXT NOT NULL,
  sprint INTEGER NOT NULL,
  fecha TEXT,
  environment TEXT,
  test_plan TEXT,
  etiquetas TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Tabla 2: BUGS_DETAIL (de hoja "Reporte_Gral")
-- Contiene detalles de cada bug/incidencia
-- Tabla maestra con 239 registros del Excel
CREATE TABLE IF NOT EXISTS bugs_detail (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tipo_incidencia TEXT,
  clave_incidencia TEXT,
  id_incidencia TEXT,
  resumen TEXT,
  principal TEXT,
  clave_principal TEXT,
  parent_summary TEXT,
  prioridad TEXT,
  estado TEXT,
  sprint TEXT,
  modulo TEXT,
  categoria TEXT,
  asignado_a TEXT,
    tipo_prueba TEXT,
    atributo TEXT,
    nivel_prueba TEXT,
    tag0 TEXT,
    tag1 TEXT,
    tag2 TEXT,
    etapa_prueba TEXT,
    ambiente TEXT,
    reportado_por TEXT,
    fecha_reporte TEXT,
    version_correccion_1 TEXT,
    sprint_ultima_regresion TEXT,
    version_corregido TEXT,
    estrategia_ejecucion TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Tabla 3: AUDIT_LOG
-- Registro de cambios y auditoría
CREATE TABLE IF NOT EXISTS audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_type TEXT,
  table_name TEXT,
  operation TEXT,
  details TEXT,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Tabla 4: DATA_SOURCE_METADATA
-- Metadatos sobre el origen y carga de datos
CREATE TABLE IF NOT EXISTS data_source_metadata (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source_file_name TEXT NOT NULL,
  source_file_path TEXT,
  source_file_size INTEGER,
  load_timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  total_bugs_loaded INTEGER,
  total_sprints_loaded INTEGER,
  status TEXT DEFAULT 'success',
  notes TEXT
);

-- Tabla 5: DEVELOPERS_SUMMARY
-- Resumen de desarrolladores y su carga de trabajo (desde "BUGS X DESARROLLADOR")
CREATE TABLE IF NOT EXISTS developers_summary (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  developer_name TEXT NOT NULL UNIQUE,
  cancelado INTEGER DEFAULT 0,
  tareas_por_hacer INTEGER DEFAULT 0,
  code_review INTEGER DEFAULT 0,
  in_sit INTEGER DEFAULT 0,
  ready_for_testing INTEGER DEFAULT 0,
  ready_for_uat INTEGER DEFAULT 0,
  blocked INTEGER DEFAULT 0,
  en_curso INTEGER DEFAULT 0,
  to_be_deployed_sit INTEGER DEFAULT 0,
  total_bugs INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- ÍNDICES PARA OPTIMIZAR QUERIES
-- ============================================================================

-- Índices en bugs_detail
CREATE INDEX IF NOT EXISTS idx_bugs_sprint ON bugs_detail(sprint);
CREATE INDEX IF NOT EXISTS idx_bugs_prioridad ON bugs_detail(prioridad);
CREATE INDEX IF NOT EXISTS idx_bugs_estado ON bugs_detail(estado);
CREATE INDEX IF NOT EXISTS idx_bugs_modulo ON bugs_detail(modulo);
CREATE INDEX IF NOT EXISTS idx_bugs_asignado ON bugs_detail(asignado_a);
CREATE INDEX IF NOT EXISTS idx_bugs_categoria ON bugs_detail(categoria);

-- Índices en sprints_versions
CREATE INDEX IF NOT EXISTS idx_sprints_version ON sprints_versions(version);
CREATE INDEX IF NOT EXISTS idx_sprints_sprint ON sprints_versions(sprint);

-- Índices en developers_summary
CREATE INDEX IF NOT EXISTS idx_dev_name ON developers_summary(developer_name);
CREATE INDEX IF NOT EXISTS idx_dev_total ON developers_summary(total_bugs);

-- ============================================================================
-- VISTAS ÚTILES PARA QUERIES COMUNES (Agregaciones dinámicas)
-- ============================================================================

-- Vista: Resumen general de bugs
CREATE VIEW IF NOT EXISTS vw_bugs_summary AS
SELECT 
  COUNT(*) as total_bugs,
  SUM(CASE WHEN estado = 'Tareas por hacer' THEN 1 ELSE 0 END) as pending,
  SUM(CASE WHEN prioridad IN ('Más alta', 'Alta') THEN 1 ELSE 0 END) as critical
FROM bugs_detail;

-- Vista: Bugs por sprint (desde datos de detalle)
CREATE VIEW IF NOT EXISTS vw_bugs_by_sprint AS
SELECT 
  CAST(SUBSTR(sprint, -2) AS INTEGER) as sprint_num,
  sprint,
  COUNT(*) as total,
  SUM(CASE WHEN prioridad IN ('Más alta', 'Alta') THEN 1 ELSE 0 END) as critical,
  SUM(CASE WHEN estado = 'Tareas por hacer' THEN 1 ELSE 0 END) as pending,
  SUM(CASE WHEN estado = 'Cancelado' THEN 1 ELSE 0 END) as canceled
FROM bugs_detail
WHERE tipo_incidencia != 'Sugerencia'
GROUP BY sprint;

-- Vista: Bugs por estado en cada sprint
CREATE VIEW IF NOT EXISTS vw_bugs_by_sprint_status AS
SELECT 
  sprint,
  estado,
  COUNT(*) as count
FROM bugs_detail
GROUP BY sprint, estado;

-- Vista: Bugs por desarrollador desde detalle
CREATE VIEW IF NOT EXISTS vw_bugs_by_developer AS
SELECT 
  asignado_a as developer_name,
  COUNT(*) as total_bugs,
  SUM(CASE WHEN estado = 'Tareas por hacer' THEN 1 ELSE 0 END) as pending,
  SUM(CASE WHEN prioridad IN ('Más alta', 'Alta') THEN 1 ELSE 0 END) as critical
FROM bugs_detail
WHERE asignado_a IS NOT NULL AND asignado_a != ''
GROUP BY asignado_a;

-- Vista: Bugs por prioridad
CREATE VIEW IF NOT EXISTS vw_bugs_by_priority AS
SELECT 
  prioridad,
  COUNT(*) as count,
  SUM(CASE WHEN estado IN ('Tareas por hacer', 'En progreso', 'Reabierto') THEN 1 ELSE 0 END) as pending,
  SUM(CASE WHEN estado = 'Cancelado' THEN 1 ELSE 0 END) as canceled,
  SUM(CASE WHEN estado NOT IN ('Tareas por hacer', 'En progreso', 'Reabierto', 'Cancelado') THEN 1 ELSE 0 END) as resolved
FROM bugs_detail
WHERE prioridad IS NOT NULL AND tipo_incidencia != 'Sugerencia'
GROUP BY prioridad;

-- Vista: Bugs por módulo
CREATE VIEW IF NOT EXISTS vw_bugs_by_module AS
SELECT 
  modulo,
  COUNT(*) as count,
  SUM(CASE WHEN prioridad IN ('Más alta', 'Alta') THEN 1 ELSE 0 END) as critical
FROM bugs_detail
WHERE modulo IS NOT NULL AND modulo != ''
GROUP BY modulo;

-- Vista: Bugs por categoría
CREATE VIEW IF NOT EXISTS vw_bugs_by_category AS
SELECT 
  categoria,
  COUNT(*) as count
FROM bugs_detail
WHERE categoria IS NOT NULL AND categoria != ''
GROUP BY categoria;

-- Vista: Análisis de desarrolladores (desde bugs_detail)
-- NOTA: El campo asignado_a está vacío en los datos actuales
-- Esta vista está lista para cuando se carguen datos con asignaciones
CREATE VIEW IF NOT EXISTS vw_developers_analysis AS
SELECT 
  asignado_a as developer_name,
  COUNT(*) as total_bugs,
  SUM(CASE WHEN estado = 'Tareas por hacer' THEN 1 ELSE 0 END) as pending,
  SUM(CASE WHEN estado = 'En Progreso' THEN 1 ELSE 0 END) as in_progress,
  SUM(CASE WHEN estado = 'Code Review' THEN 1 ELSE 0 END) as code_review,
  SUM(CASE WHEN estado = 'Cancelado' THEN 1 ELSE 0 END) as canceled,
  SUM(CASE WHEN prioridad IN ('Más alta', 'Alta') THEN 1 ELSE 0 END) as critical,
  ROUND(((COUNT(*) - SUM(CASE WHEN estado = 'Tareas por hacer' THEN 1 ELSE 0 END)) * 100.0 / NULLIF(COUNT(*), 0)), 2) as efficiency_percentage,
  CASE 
    WHEN SUM(CASE WHEN estado = 'Tareas por hacer' THEN 1 ELSE 0 END) > 15 THEN 'Alto'
    WHEN SUM(CASE WHEN estado = 'Tareas por hacer' THEN 1 ELSE 0 END) > 8 THEN 'Medio'
    ELSE 'Bajo'
  END as workload_level
FROM bugs_detail
WHERE asignado_a IS NOT NULL AND asignado_a != ''
GROUP BY asignado_a
ORDER BY total_bugs DESC;

-- Vista: Análisis de desarrolladores (desde developers_summary)
CREATE VIEW IF NOT EXISTS vw_developers_analysis AS
SELECT 
  developer_name,
  total_bugs,
  tareas_por_hacer as pending,
  en_curso as in_progress,
  code_review,
  ready_for_testing,
  ready_for_uat,
  blocked,
  cancelado as canceled,
  ROUND(((total_bugs - tareas_por_hacer) * 100.0 / NULLIF(total_bugs, 0)), 2) as efficiency_percentage,
  CASE 
    WHEN tareas_por_hacer > 15 THEN 'Alto'
    WHEN tareas_por_hacer > 8 THEN 'Medio'
    ELSE 'Bajo'
  END as workload_level
FROM developers_summary
WHERE total_bugs > 0
ORDER BY total_bugs DESC;
