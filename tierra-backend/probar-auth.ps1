# Prueba del circuito de autenticación completo.
# Correr con el backend levantado:  .\probar-auth.ps1

$base = "http://localhost:8080"
$s = New-Object Microsoft.PowerShell.Commands.WebRequestSession
$sondeo = "$base/api/productos?categoriaId=c0000000-0000-0000-0000-000000000001"

function Token {
    ($s.Cookies.GetCookies($base) | Where-Object { $_.Name -eq "XSRF-TOKEN" }).Value
}

# Spring Security invalida el token CSRF al cerrar sesión, así que después de
# un logout hay que pedir uno nuevo. El frontend va a tener que hacer lo mismo.
function AsegurarToken {
    if (-not (Token)) {
        Invoke-WebRequest -Uri $sondeo -WebSession $s -UseBasicParsing | Out-Null
    }
}

function Llamar($metodo, $ruta, $cuerpo) {
    AsegurarToken
    $params = @{
        Method = $metodo; Uri = "$base$ruta"; WebSession = $s; UseBasicParsing = $true
    }
    $t = Token
    if ($t) { $params.Headers = @{ "X-XSRF-TOKEN" = $t } }
    if ($cuerpo) { $params.ContentType = "application/json"; $params.Body = $cuerpo }
    try {
        $r = Invoke-WebRequest @params
        Write-Host "  $metodo $ruta -> $($r.StatusCode)  $($r.Content)" -ForegroundColor Green
    } catch {
        $resp = $_.Exception.Response
        if (-not $resp) {
            Write-Host "  $metodo $ruta -> fallo del cliente: $($_.Exception.Message)" -ForegroundColor Red
            return
        }
        $texto = $_.ErrorDetails.Message
        if (-not $texto) {
            $sr = New-Object System.IO.StreamReader($resp.GetResponseStream())
            $texto = $sr.ReadToEnd(); $sr.Close()
        }
        Write-Host "  $metodo $ruta -> $([int]$resp.StatusCode)  $texto" -ForegroundColor Yellow
    }
}

Write-Host "`n0. Obtener la cookie CSRF (cualquier GET la genera)" -ForegroundColor Cyan
Invoke-WebRequest -Uri $sondeo -WebSession $s -UseBasicParsing | Out-Null
Write-Host "  XSRF-TOKEN = $(if (Token) { 'presente' } else { 'AUSENTE - el CSRF no esta emitiendo el token' })"

Write-Host "`n1. /yo sin sesion (esperado 401)" -ForegroundColor Cyan
Llamar GET "/api/auth/yo"

Write-Host "`n2. Login con credenciales del seed (esperado 200)" -ForegroundColor Cyan
Llamar POST "/api/auth/login" '{"email":"test@tierra.esquel","password":"tierra2026"}'

Write-Host "`n3. /yo con sesion (esperado 200)" -ForegroundColor Cyan
Llamar GET "/api/auth/yo"

Write-Host "`n4. Logout (esperado 204)" -ForegroundColor Cyan
Llamar POST "/api/auth/logout"

Write-Host "`n5. /yo despues del logout (esperado 401)" -ForegroundColor Cyan
Llamar GET "/api/auth/yo"

Write-Host "`n6. Password incorrecta (esperado 401)" -ForegroundColor Cyan
Llamar POST "/api/auth/login" '{"email":"mostrador@tierra.esquel","password":"incorrecta123"}'

Write-Host "`n7. Email inexistente (esperado 401, MISMO mensaje que el 6)" -ForegroundColor Cyan
Llamar POST "/api/auth/login" '{"email":"noexiste@tierra.esquel","password":"incorrecta123"}'

Write-Host "`n8. Bloqueo: 4 intentos fallidos mas sobre mostrador@" -ForegroundColor Cyan
1..4 | ForEach-Object { Llamar POST "/api/auth/login" '{"email":"mostrador@tierra.esquel","password":"mal"}' }
Write-Host "   -> el ultimo deberia ser 423 (cuenta bloqueada)" -ForegroundColor DarkGray

Write-Host "`n9. Login correcto sobre la cuenta bloqueada (esperado 423, no 200)" -ForegroundColor Cyan
Llamar POST "/api/auth/login" '{"email":"mostrador@tierra.esquel","password":"tierra2026"}'

Write-Host "`n10. La cuenta NO bloqueada sigue entrando (esperado 200)" -ForegroundColor Cyan
Llamar POST "/api/auth/login" '{"email":"admin@tierra.esquel","password":"tierra2026"}'

Write-Host "`n11. POST sin token CSRF (esperado 403)" -ForegroundColor Cyan
try {
    Invoke-WebRequest -Method POST -Uri "$base/api/auth/login" -ContentType "application/json" `
        -Body '{"email":"test@tierra.esquel","password":"tierra2026"}' -UseBasicParsing | Out-Null
    Write-Host "  -> 200: EL CSRF NO ESTA PROTEGIENDO" -ForegroundColor Red
} catch {
    Write-Host "  -> $([int]$_.Exception.Response.StatusCode) (403 = correcto)" -ForegroundColor Green
}

Write-Host "`n12. Webhook de Mercado Pago sin token CSRF (NO debe dar 403)" -ForegroundColor Cyan
try {
    $r = Invoke-WebRequest -Method POST -Uri "$base/api/pagos/webhook" -ContentType "application/json" -Body '{}' -UseBasicParsing
    Write-Host "  -> $($r.StatusCode) (accesible, correcto)" -ForegroundColor Green
} catch {
    $c = [int]$_.Exception.Response.StatusCode
    if ($c -eq 403) { Write-Host "  -> 403: EL WEBHOOK QUEDO BLOQUEADO, revisar la exencion" -ForegroundColor Red }
    else { Write-Host "  -> $c (no es 403, el CSRF lo deja pasar: correcto)" -ForegroundColor Green }
}

Write-Host "`nListo. Para desbloquear mostrador@ y volver al estado inicial:" -ForegroundColor Cyan
Write-Host '  docker exec -it tierra-postgres psql -U tierra_app -d tierra -c "UPDATE usuarios SET intentos_fallidos=0, bloqueado_hasta=NULL;"' -ForegroundColor DarkGray
Write-Host ""
