# Verifica el login del EQUIPO con contrasena (ADR 0005). Los clientes ya no
# tienen contrasena: su acceso por codigo se prueba en probar-codigo.ps1.
# Correr con el backend levantado en el perfil dev:  .\probar-auth.ps1
#
# Desbloquea las cuentas al empezar y al terminar, asi que se puede correr
# cuantas veces haga falta.

. "$PSScriptRoot\probar-comun.ps1"
$fallas = 0
DesbloquearTodos

Write-Host "`n0. La cookie CSRF se genera con cualquier GET" -ForegroundColor Cyan
$s = NuevaSesion
Condicion ([bool](Token $s)) "XSRF-TOKEN presente"

Write-Host "`n1. Login y logout" -ForegroundColor Cyan
Verificar (Pedir $s GET "/api/auth/yo") 401 "/yo sin sesion"
Verificar (EntrarComoEquipo $s "admin@tierra.esquel") 200 "login de admin@ por /equipo/login"
$yo = Pedir $s GET "/api/auth/yo"
Verificar $yo 200 "/yo con sesion"
Condicion ($yo.Texto -like '*"rol":"ADMIN"*') "la sesion es de ADMIN"
Verificar (Pedir $s POST "/api/auth/logout") 204 "logout"
Verificar (Pedir $s GET "/api/auth/yo") 401 "/yo despues del logout"

Write-Host "`n2. Credenciales incorrectas: el mismo mensaje en todos los casos" -ForegroundColor Cyan
$mal = Pedir $s POST "/api/auth/equipo/login" '{"email":"mostrador@tierra.esquel","password":"incorrecta123"}'
$nadie = Pedir $s POST "/api/auth/equipo/login" '{"email":"noexiste@tierra.esquel","password":"incorrecta123"}'
$cliente = Pedir $s POST "/api/auth/equipo/login" '{"email":"test@tierra.esquel","password":"tierra2026"}'
Verificar $mal 401 "contrasena incorrecta"
Verificar $nadie 401 "email inexistente"
Verificar $cliente 401 "email de un cliente"
$m1 = MensajeDe $mal
$m2 = MensajeDe $nadie
$m3 = MensajeDe $cliente
Condicion (($m1 -eq $m2) -and ($m1 -eq $m3)) "el mensaje es identico en los tres casos"

Write-Host "`n3. Bloqueo por intentos fallidos (5 intentos, 15 minutos)" -ForegroundColor Cyan
Write-Host "   El quinto fallido bloquea: esa respuesta todavia es 401, y el" -ForegroundColor DarkGray
Write-Host "   bloqueo rige desde el pedido siguiente." -ForegroundColor DarkGray
1..4 | ForEach-Object { Pedir $s POST "/api/auth/equipo/login" '{"email":"mostrador@tierra.esquel","password":"mal"}' | Out-Null }
Verificar (EntrarComoEquipo $s "mostrador@tierra.esquel") 423 "contrasena correcta sobre la cuenta bloqueada"
Verificar (EntrarComoEquipo (NuevaSesion) "admin@tierra.esquel") 200 "otra cuenta del equipo sigue entrando"

Write-Host "`n4. CSRF y webhook" -ForegroundColor Cyan
try {
    Invoke-WebRequest -Method POST -Uri "$base/api/auth/equipo/login" -ContentType "application/json" `
        -Body '{"email":"admin@tierra.esquel","password":"tierra2026"}' -UseBasicParsing | Out-Null
    Condicion $false "POST sin token CSRF tiene que dar 403 (dio 200: EL CSRF NO ESTA PROTEGIENDO)"
} catch {
    $c = [int]$_.Exception.Response.StatusCode
    Condicion ($c -eq 403) "POST sin token CSRF -> $c (esperado 403)"
}
try {
    $r = Invoke-WebRequest -Method POST -Uri "$base/api/pagos/webhook" -ContentType "application/json" -Body '{}' -UseBasicParsing
    Condicion $true "webhook de Mercado Pago sin token CSRF -> $($r.StatusCode) (accesible)"
} catch {
    $c = [int]$_.Exception.Response.StatusCode
    Condicion ($c -ne 403) "webhook de Mercado Pago sin token CSRF -> $c (no tiene que ser 403)"
}

DesbloquearTodos
Write-Host "`n(Cuentas desbloqueadas de nuevo.)" -ForegroundColor DarkGray
Resumen
