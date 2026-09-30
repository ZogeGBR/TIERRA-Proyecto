# Verifica las reglas de autorizacion de la etapa C.
# Correr con el backend levantado:  .\probar-permisos.ps1

$base = "http://localhost:8080"
$sondeo = "$base/api/productos?categoriaId=c0000000-0000-0000-0000-000000000001"
$variante = "e0000000-0000-0000-0000-000000000004"

function NuevaSesion {
    $s = New-Object Microsoft.PowerShell.Commands.WebRequestSession
    Invoke-WebRequest -Uri $sondeo -WebSession $s -UseBasicParsing | Out-Null
    return $s
}
function Token($s) {
    ($s.Cookies.GetCookies($base) | Where-Object { $_.Name -eq "XSRF-TOKEN" }).Value
}
function Llamar($s, $metodo, $ruta, $cuerpo, $esperado) {
    if (-not (Token $s)) { Invoke-WebRequest -Uri $sondeo -WebSession $s -UseBasicParsing | Out-Null }
    $p = @{ Method = $metodo; Uri = "$base$ruta"; WebSession = $s; UseBasicParsing = $true
            Headers = @{ "X-XSRF-TOKEN" = (Token $s) } }
    if ($cuerpo) { $p.ContentType = "application/json"; $p.Body = $cuerpo }
    try   { $r = Invoke-WebRequest @p; $codigo = [int]$r.StatusCode; $texto = $r.Content }
    catch {
        $resp = $_.Exception.Response
        if (-not $resp) { Write-Host "  $metodo $ruta -> fallo del cliente" -ForegroundColor Red; return }
        $codigo = [int]$resp.StatusCode
        $texto = $_.ErrorDetails.Message
        if (-not $texto) { $sr = New-Object System.IO.StreamReader($resp.GetResponseStream()); $texto = $sr.ReadToEnd(); $sr.Close() }
    }
    $ok = ($codigo -eq $esperado)
    $color = if ($ok) { "Green" } else { "Red" }
    $marca = if ($ok) { "OK " } else { "MAL" }
    Write-Host "  $marca $metodo $ruta -> $codigo (esperado $esperado)" -ForegroundColor $color
    if (-not $ok) { Write-Host "       $texto" -ForegroundColor DarkGray }
}
function Login($s, $email) {
    Llamar $s POST "/api/auth/login" "{""email"":""$email"",""password"":""tierra2026""}" 200
}

$items = "[{""varianteId"":""$variante"",""cantidad"":1}]"
$pedido = "{""tipoEntrega"":""RETIRO_LOCAL"",""items"":$items}"

Write-Host "`n=== SIN SESION ===" -ForegroundColor Cyan
$s = NuevaSesion
Write-Host " El catalogo tiene que seguir siendo publico:"
Llamar $s GET  "/api/productos?categoriaId=c0000000-0000-0000-0000-000000000001" $null 200
Llamar $s GET  "/api/productos/d0000000-0000-0000-0000-000000000001" $null 200
Llamar $s GET  "/api/alquiler/disponibilidad?tipoId=a0000000-0000-0000-0000-000000000001&fechaInicio=2026-07-10&fechaFin=2026-07-15" $null 200
Write-Host " Lo demas, no:"
Llamar $s POST "/api/pedidos" $pedido 401
Llamar $s GET  "/api/admin/sesion" $null 401
Llamar $s GET  "/api/auth/yo" $null 401
Write-Host " El webhook de Mercado Pago sigue accesible:"
Llamar $s POST "/api/pagos/webhook" "{}" 200

Write-Host "`n=== COMO CLIENTE ===" -ForegroundColor Cyan
$s = NuevaSesion
Login $s "test@tierra.esquel"
Llamar $s GET  "/api/auth/yo" $null 200
Llamar $s POST "/api/pedidos" $pedido 201
Write-Host " Un cliente NO entra al panel:"
Llamar $s GET  "/api/admin/sesion" $null 403
Llamar $s GET  "/api/admin/reportes/verificacion" $null 403

Write-Host "`n=== COMO OPERADOR ===" -ForegroundColor Cyan
$s = NuevaSesion
Login $s "mostrador@tierra.esquel"
Write-Host " Entra al panel:"
Llamar $s GET  "/api/admin/sesion" $null 200
Write-Host " Pero NO a los reportes economicos (esto prueba que @PreAuthorize esta activo):"
Llamar $s GET  "/api/admin/reportes/verificacion" $null 403

Write-Host "`n=== COMO ADMINISTRADOR ===" -ForegroundColor Cyan
$s = NuevaSesion
Login $s "admin@tierra.esquel"
Llamar $s GET  "/api/admin/sesion" $null 200
Llamar $s GET  "/api/admin/reportes/verificacion" $null 200

Write-Host "`n=== CIERRE POR DENEGACION ===" -ForegroundColor Cyan
Write-Host " Una ruta que nadie declaro tiene que fallar, no quedar abierta:"
$s = NuevaSesion
Llamar $s GET "/api/ruta-inventada" $null 401

Write-Host ""
