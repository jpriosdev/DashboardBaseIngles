-- Tabla que replica la estructura de MockDataV0.csv / Datos_Sabana.csv
CREATE TABLE IF NOT EXISTS datamock (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    Sector TEXT,
    SubSector TEXT,
    Categoria TEXT,
    Tipo TEXT,
    Entidad TEXT,
    Ingresos TEXT,
    Empleados TEXT,
    SitioWeb TEXT,
    UbicacionPrincipal TEXT
);
