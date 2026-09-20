# Arranca el backend en desarrollo leyendo las variables del .env de la raíz.
#
# Existe porque Maven, a diferencia de VS Code, no lee el .env: hay que
# exportar las variables a mano en cada terminal nueva, y olvidarse de una
# produce errores que no dicen cuál es la causa real (una password vacía
# aparece como "authentication failed", y sin el perfil la base queda sin datos).
#
#   Uso:  .\run-dev.ps1

$ErrorActionPreference = "Stop"
$envPath = Join-Path $PSScriptRoot "..\.env"

if (-not (Test-Path $envPath)) {
    Write-Host "No existe $envPath. Copiá .env.example a .env y completalo." -ForegroundColor Red
    exit 1
}

Get-Content $envPath | ForEach-Object {
    $linea = $_.Trim()
    if ($linea -and -not $linea.StartsWith("#") -and $linea.Contains("=")) {
        $i = $linea.IndexOf("=")
        $nombre = $linea.Substring(0, $i).Trim()
        $valor  = $linea.Substring($i + 1).Trim()
        [Environment]::SetEnvironmentVariable($nombre, $valor, "Process")
        if ($nombre -match "PASSWORD|TOKEN|SECRET") {
            Write-Host "  $nombre = (oculto)" -ForegroundColor DarkGray
        } else {
            Write-Host "  $nombre = $valor" -ForegroundColor DarkGray
        }
    }
}

Write-Host ""
& "$PSScriptRoot\mvnw.cmd" spring-boot:run
