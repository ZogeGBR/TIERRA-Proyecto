# Verifica las reglas de autorizacion por endpoint y por rol.
# Correr con el backend levantado en el perfil dev:  .\probar-permisos.ps1
#
# El cliente entra con codigo y el equipo con contrasena (ADR 0005).

. "$PSScriptRoot\probar-comun.ps1"
$fallas = 0
$variante = "e0000000-0000-0000-0000-000000000004"
$items = "[{""varianteId"":""$variante"",""cantidad"":1}]"
$pedido = "{""tipoEntrega"":""RETIRO_LOCAL"",""items"":$items}"

ReiniciarCliente "test@tierra.esquel"
DesbloquearTodos
CancelarPedidosDePrueba

Write-Host "`n=== SIN SESION ===" -ForegroundColor Cyan
$s = NuevaSesion
Write-Host " El catalogo tiene que seguir siendo publico:"
Verificar (Pedir $s GET "/api/productos?categoriaId=c0000000-0000-0000-0000-000000000001") 200 "GET /api/productos"
Verificar (Pedir $s GET "/api/productos/d0000000-0000-0000-0000-000000000001") 200 "GET /api/productos/{id}"
Verificar (Pedir $s GET "/api/alquiler/disponibilidad?tipoId=a0000000-0000-0000-0000-000000000001&fechaInicio=2026-07-10&fechaFin=2026-07-15") 200 "GET /api/alquiler/disponibilidad"
Write-Host " Los dos canales de acceso son publicos:"
Verificar (Pedir $s POST "/api/auth/codigo" '{"email":"nadie@tierra.esquel"}') 200 "POST /api/auth/codigo"
Verificar (Pedir $s POST "/api/auth/codigo/verificar" '{"email":"nadie@tierra.esquel","codigo":"123456"}') 401 "POST /api/auth/codigo/verificar (codigo invalido)"
Verificar (Pedir $s POST "/api/auth/equipo/login" '{"email":"nadie@tierra.esquel","password":"x"}') 401 "POST /api/auth/equipo/login (credenciales invalidas)"
Write-Host " Lo demas, no:"
Verificar (Pedir $s POST "/api/pedidos" $pedido) 401 "POST /api/pedidos"
Verificar (Pedir $s GET "/api/admin/sesion") 401 "GET /api/admin/sesion"
Verificar (Pedir $s GET "/api/auth/yo") 401 "GET /api/auth/yo"
Write-Host " El webhook de Mercado Pago sigue accesible:"
Verificar (Pedir $s POST "/api/pagos/webhook" "{}") 200 "POST /api/pagos/webhook"

Write-Host "`n=== COMO CLIENTE (entra con codigo) ===" -ForegroundColor Cyan
$s = NuevaSesion
Verificar (EntrarComoCliente $s "test@tierra.esquel") 200 "entrar con codigo"
Verificar (Pedir $s GET "/api/auth/yo") 200 "GET /api/auth/yo"
Verificar (Pedir $s POST "/api/pedidos" $pedido) 201 "POST /api/pedidos"
Write-Host " Un cliente NO entra al panel:"
Verificar (Pedir $s GET "/api/admin/sesion") 403 "GET /api/admin/sesion"
Verificar (Pedir $s GET "/api/admin/reportes/verificacion") 403 "GET /api/admin/reportes/verificacion"

Write-Host "`n=== COMO OPERADOR (entra con contrasena) ===" -ForegroundColor Cyan
$s = NuevaSesion
Verificar (EntrarComoEquipo $s "mostrador@tierra.esquel") 200 "login del equipo"
Write-Host " Entra al panel:"
Verificar (Pedir $s GET "/api/admin/sesion") 200 "GET /api/admin/sesion"
Write-Host " Pero NO a los reportes economicos (esto prueba que @PreAuthorize esta activo):"
Verificar (Pedir $s GET "/api/admin/reportes/verificacion") 403 "GET /api/admin/reportes/verificacion"

Write-Host "`n=== COMO ADMINISTRADOR (entra con contrasena) ===" -ForegroundColor Cyan
$s = NuevaSesion
Verificar (EntrarComoEquipo $s "admin@tierra.esquel") 200 "login del equipo"
Verificar (Pedir $s GET "/api/admin/sesion") 200 "GET /api/admin/sesion"
Verificar (Pedir $s GET "/api/admin/reportes/verificacion") 200 "GET /api/admin/reportes/verificacion"

Write-Host "`n=== CIERRE POR DENEGACION ===" -ForegroundColor Cyan
Write-Host " Una ruta que nadie declaro tiene que fallar, no quedar abierta:"
Verificar (Pedir (NuevaSesion) GET "/api/ruta-inventada") 401 "GET /api/ruta-inventada"
Write-Host " Las rutas del registro y del login viejo ya no existen:"
Verificar (Pedir (NuevaSesion) POST "/api/auth/login" '{"email":"admin@tierra.esquel","password":"tierra2026"}') 401 "POST /api/auth/login"
Verificar (Pedir (NuevaSesion) POST "/api/auth/registro" '{"nombre":"X","email":"x@x.com","password":"12345678"}') 401 "POST /api/auth/registro"

ReiniciarCliente "test@tierra.esquel"
CancelarPedidosDePrueba
Resumen
