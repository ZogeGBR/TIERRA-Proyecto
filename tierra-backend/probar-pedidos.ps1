# Verifica los dos arreglos heredados de la tarea 4:
#  - el usuario del pedido sale de la sesion, no del cuerpo
#  - retirar en el local no cobra envio
# Correr con el backend levantado:  .\probar-pedidos.ps1

$base = "http://localhost:8080"
$sondeo = "$base/api/productos?categoriaId=c0000000-0000-0000-0000-000000000001"

# Variante con stock del seed (Campera Outdoor, talle M / Azul)
$variante = "e0000000-0000-0000-0000-000000000004"
# Direccion del usuario de prueba (test@tierra.esquel)
$dirPropia = "88000000-0000-0000-0000-000000000001"

function NuevaSesion {
    $s = New-Object Microsoft.PowerShell.Commands.WebRequestSession
    Invoke-WebRequest -Uri $sondeo -WebSession $s -UseBasicParsing | Out-Null
    return $s
}
function Token($s) {
    ($s.Cookies.GetCookies($base) | Where-Object { $_.Name -eq "XSRF-TOKEN" }).Value
}
function Llamar($s, $metodo, $ruta, $cuerpo) {
    if (-not (Token $s)) { Invoke-WebRequest -Uri $sondeo -WebSession $s -UseBasicParsing | Out-Null }
    $p = @{ Method = $metodo; Uri = "$base$ruta"; WebSession = $s; UseBasicParsing = $true
            Headers = @{ "X-XSRF-TOKEN" = (Token $s) } }
    if ($cuerpo) { $p.ContentType = "application/json"; $p.Body = $cuerpo }
    try {
        $r = Invoke-WebRequest @p
        Write-Host "  -> $($r.StatusCode)  $($r.Content)" -ForegroundColor Green
    } catch {
        $resp = $_.Exception.Response
        if (-not $resp) { Write-Host "  -> fallo del cliente: $($_.Exception.Message)" -ForegroundColor Red; return }
        $t = $_.ErrorDetails.Message
        if (-not $t) { $sr = New-Object System.IO.StreamReader($resp.GetResponseStream()); $t = $sr.ReadToEnd(); $sr.Close() }
        Write-Host "  -> $([int]$resp.StatusCode)  $t" -ForegroundColor Yellow
    }
}

$items = "[{""varianteId"":""$variante"",""cantidad"":1}]"

Write-Host "`n1. Crear pedido SIN sesion (esperado 401)" -ForegroundColor Cyan
$s = NuevaSesion
Llamar $s POST "/api/pedidos" "{""tipoEntrega"":""RETIRO_LOCAL"",""items"":$items}"

Write-Host "`n2. Login como test@tierra.esquel" -ForegroundColor Cyan
$s = NuevaSesion
Llamar $s POST "/api/auth/login" '{"email":"test@tierra.esquel","password":"tierra2026"}'

Write-Host "`n3. RETIRO_LOCAL sin direccion (esperado 201, costoEnvio 0)" -ForegroundColor Cyan
Llamar $s POST "/api/pedidos" "{""tipoEntrega"":""RETIRO_LOCAL"",""items"":$items}"

Write-Host "`n4. ENVIO_DOMICILIO sin direccion (esperado 400)" -ForegroundColor Cyan
Llamar $s POST "/api/pedidos" "{""tipoEntrega"":""ENVIO_DOMICILIO"",""items"":$items}"

Write-Host "`n5. ENVIO_DOMICILIO con direccion propia (esperado 201, costoEnvio 12000)" -ForegroundColor Cyan
Llamar $s POST "/api/pedidos" "{""tipoEntrega"":""ENVIO_DOMICILIO"",""direccionEnvioId"":""$dirPropia"",""items"":$items}"

Write-Host "`n6. Mandar usuarioId de OTRO usuario en el cuerpo (debe IGNORARSE)" -ForegroundColor Cyan
Write-Host "   El pedido tiene que crearse igual, a nombre de test@" -ForegroundColor DarkGray
Llamar $s POST "/api/pedidos" "{""usuarioId"":""99000000-0000-0000-0000-000000000003"",""tipoEntrega"":""RETIRO_LOCAL"",""items"":$items}"

Write-Host "`n7. Login como admin@ y pedir con la direccion de test@ (esperado 404)" -ForegroundColor Cyan
$s2 = NuevaSesion
Llamar $s2 POST "/api/auth/login" '{"email":"admin@tierra.esquel","password":"tierra2026"}'
Llamar $s2 POST "/api/pedidos" "{""tipoEntrega"":""ENVIO_DOMICILIO"",""direccionEnvioId"":""$dirPropia"",""items"":$items}"

Write-Host "`nVerificar a quien quedaron los pedidos:" -ForegroundColor Cyan
Write-Host '  docker exec -it tierra-postgres psql -U tierra_app -d tierra -c "SELECT p.tipo_entrega, p.costo_envio, p.total, u.email FROM pedidos p JOIN usuarios u ON u.id=p.usuario_id ORDER BY p.creado_en DESC LIMIT 5;"' -ForegroundColor DarkGray
Write-Host ""
