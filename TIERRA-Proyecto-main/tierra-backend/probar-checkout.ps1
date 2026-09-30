# Prueba el checkout con cuenta implicita (docs/decisiones/0005).
# Correr con el backend levantado:  .\probar-checkout.ps1

$base = "http://localhost:8080"
$sondeo = "$base/api/productos?categoriaId=c0000000-0000-0000-0000-000000000001"

# Variante con stock del seed (Campera Outdoor, talle M / Azul)
$variante = "e0000000-0000-0000-0000-000000000004"
$items = "[{""varianteId"":""$variante"",""cantidad"":1}]"

# Email unico por corrida: si quedara fijo, la segunda vez que se corre el
# script el email "nuevo" del escenario 1 ya existiria del run anterior.
$sufijo = Get-Date -Format "yyyyMMddHHmmss"
$emailNuevo = "checkout-test-$sufijo@example.com"

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

Write-Host "`n1. Checkout SIN sesion, RETIRO_LOCAL, email nuevo ($emailNuevo)" -ForegroundColor Cyan
Write-Host "   Esperado: 200, crea la cuenta y deja sesion iniciada" -ForegroundColor DarkGray
$s1 = NuevaSesion
Llamar $s1 POST "/api/checkout" "{""nombre"":""Cliente Prueba"",""email"":""$emailNuevo"",""dni"":""30111222"",""tipoEntrega"":""RETIRO_LOCAL"",""items"":$items}"

Write-Host "`n2. Confirmar que quedo logueado (esperado 200, no 401)" -ForegroundColor Cyan
Llamar $s1 GET "/api/auth/yo" $null

Write-Host "`n3. Checkout SIN sesion, mismo email de nuevo (esperado 409)" -ForegroundColor Cyan
Write-Host "   No tiene que crear un pedido a nombre de esa cuenta sin la contrasena" -ForegroundColor DarkGray
$s2 = NuevaSesion
Llamar $s2 POST "/api/checkout" "{""nombre"":""Otra Persona"",""email"":""$emailNuevo"",""dni"":""30999888"",""tipoEntrega"":""RETIRO_LOCAL"",""items"":$items}"

Write-Host "`n4. Checkout SIN sesion, ENVIO_DOMICILIO sin direccion (esperado 400)" -ForegroundColor Cyan
$s3 = NuevaSesion
$emailSinDireccion = "checkout-test-$sufijo-b@example.com"
Llamar $s3 POST "/api/checkout" "{""nombre"":""Cliente Prueba"",""email"":""$emailSinDireccion"",""dni"":""30111333"",""tipoEntrega"":""ENVIO_DOMICILIO"",""items"":$items}"

Write-Host "`n5. Checkout SIN sesion, ENVIO_DOMICILIO con direccion completa (esperado 200, costoEnvio > 0)" -ForegroundColor Cyan
$s4 = NuevaSesion
$emailConDireccion = "checkout-test-$sufijo-c@example.com"
$direccion = "{""calle"":""Av. Fontana"",""numero"":""482"",""ciudad"":""Esquel"",""provincia"":""Chubut"",""codigoPostal"":""9200""}"
Llamar $s4 POST "/api/checkout" "{""nombre"":""Cliente Prueba"",""email"":""$emailConDireccion"",""dni"":""30111444"",""tipoEntrega"":""ENVIO_DOMICILIO"",""direccion"":$direccion,""items"":$items}"

Write-Host "`n6. Login como test@tierra.esquel y checkout CON sesion, sin nombre/email/dni" -ForegroundColor Cyan
Write-Host "   Esperado: 200, compra a nombre de test@ sin pedirle esos datos de nuevo" -ForegroundColor DarkGray
$s5 = NuevaSesion
Llamar $s5 POST "/api/auth/login" '{"email":"test@tierra.esquel","password":"tierra2026"}'
Llamar $s5 POST "/api/checkout" "{""tipoEntrega"":""RETIRO_LOCAL"",""items"":$items}"

Write-Host "`nVerificar las cuentas y pedidos que quedaron creados:" -ForegroundColor Cyan
Write-Host "  docker exec -it tierra-postgres psql -U tierra_app -d tierra -c `"SELECT email, dni, rol FROM usuarios WHERE email LIKE 'checkout-test-%' ORDER BY creado_en DESC;`"" -ForegroundColor DarkGray
Write-Host "  docker exec -it tierra-postgres psql -U tierra_app -d tierra -c `"SELECT p.tipo_entrega, p.costo_envio, u.email FROM pedidos p JOIN usuarios u ON u.id=p.usuario_id ORDER BY p.creado_en DESC LIMIT 6;`"" -ForegroundColor DarkGray
Write-Host ""
