$csv = Import-Csv 'data/MockDataV0.csv'
$testCases = @()
$meses = @{}

foreach ($row in $csv) {
  if ($row.'Fecha Reporte') {
    $fecha = $row.'Fecha Reporte'
    # Extract month-year from format like "1/12/2026 12:17"
    $partes = $fecha.Split(' ')
    $date_part = $partes[0]
    $date_components = $date_part.Split('/')
    $month = $date_components[0]
    $year = $date_components[2]
    $mes = "$year-{0:D2}" -f [int]$month
    
    if ($row.'Tipo de Incidencia' -in @('test Case', 'Epic', 'Story')) {
      if ($row.'Resumen' -match '(?i)(qa|test)') {
        $testCases += @{
          fecha = $fecha
          mes = $mes
          resumen = $row.'Resumen'
          estado = $row.'Estado'
          tipo = $row.'Tipo de Incidencia'
        }
        
        if ($meses.ContainsKey($mes)) { $meses[$mes]++ } else { $meses[$mes] = 1 }
      }
    }
  }
}

Write-Host "Test Cases por Mes (con 'QA' o 'Test' en resumen):"
Write-Host "================================================"
$meses.GetEnumerator() | Sort-Object Name | ForEach-Object { 
  Write-Host "$($_.Name): $($_.Value) test cases"
}

Write-Host ""
Write-Host "Total test cases encontrados: $($testCases.Count)"
Write-Host ""
Write-Host "Primeros 10 test cases:"
$testCases | Select-Object -First 10 | ForEach-Object {
  Write-Host "  [$($_.mes)] $($_.tipo) - $($_.resumen) - Estado: $($_.estado)"
}
