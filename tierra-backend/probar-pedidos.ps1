# Verifica dos reglas del alta de pedidos:
#  - el usuario del pedido sale de la sesion, nunca del cuerpo
#  - retirar en el local no cobra envio
# Correr con el backend levantado en el perfil dev:  .\probar-pedidos.ps1
#
# Hasta la tarea 9 el pedido se crea con POST /api/pedidos y sesion. Con el
# checkout sin cuenta, este script se reemplaza por probar-checkout.ps1.

. "$PSScriptRoot\probar-comun.ps1"
$fallas = 0
# Variante con stock del seed (Campera Outdoor, talle M / Azul)
$variante = "e0000000-0000-0000-0000-000000000004"
# Direccion del usuario de prueba (test@tierra.esquel)
$dirPropia = "88000000-0000-0000-0000-000000000001"
$items = "[{""varianteId"":""$variante"",""cantidad"":1}]"

ReiniciarCliente "test@tierra.esquel"
DesbloquearTodos
CancelarPedidosDePrueba

Write-Host "`n1. Crear pedido SIN sesion" -ForegroundColor Cyan
Verificar (Pedir (NuevaSesion) POST "/api/pedidos" "{""tipoEntrega"":""RETIRO_LOCAL"",""items"":$items}") 401 "sin sesion no se crea"

Write-Host "`n2. Entrar como test@ (con codigo)" -ForegroundColor Cyan
$s = NuevaSesion
Verificar (EntrarComoCliente $s "test@tierra.esquel") 200 "entrar con codigo"

Write-Host "`n3. Retiro en el local" -ForegroundColor Cyan
$r = Pedir $s POST "/api/pedidos" "{""tipoEntrega"":""RETIRO_LOCAL"",""items"":$items}"
Verificar $r 201 "RETIRO_LOCAL sin direccion"
Condicion ($r.Texto -like '*"costoEnvio":0,*') "no cobra envio (costoEnvio 0)"

Write-Host "`n4. Envio a domicilio" -ForegroundColor Cyan
Verificar (Pedir $s POST "/api/pedidos" "{""tipoEntrega"":""ENVIO_DOMICILIO"",""items"":$items}") 400 "sin direccion"
$r = Pedir $s POST "/api/pedidos" "{""tipoEntrega"":""ENVIO_DOMICILIO"",""direccionEnvioId"":""$dirPropia"",""items"":$items}"
Verificar $r 201 "con direccion propia"
Condicion ($r.Texto -like '*"costoEnvio":12000*') "cobra el envio (costoEnvio 12000)"

Write-Host "`n5. Mandar el usuarioId de OTRO usuario en el cuerpo" -ForegroundColor Cyan
$r = Pedir $s POST "/api/pedidos" "{""usuarioId"":""99000000-0000-0000-0000-000000000003"",""tipoEntrega"":""RETIRO_LOCAL"",""items"":$items}"
Verificar $r 201 "el pedido se crea igual"
$id = ($r.Texto | ConvertFrom-Json).id
$duenio = Sql "SELECT u.email FROM pedidos p JOIN usuarios u ON u.id = p.usuario_id WHERE p.id = '$id';"
Condicion ("$duenio".Trim() -eq "test@tierra.esquel") "y queda a nombre de test@, no del usuarioId del cuerpo"

Write-Host "`n6. admin@ pide con la direccion de test@" -ForegroundColor Cyan
$s2 = NuevaSesion
Verificar (EntrarComoEquipo $s2 "admin@tierra.esquel") 200 "login del equipo"
Verificar (Pedir $s2 POST "/api/pedidos" "{""tipoEntrega"":""ENVIO_DOMICILIO"",""direccionEnvioId"":""$dirPropia"",""items"":$items}") 404 "una direccion ajena no se encuentra"

ReiniciarCliente "test@tierra.esquel"
CancelarPedidosDePrueba
Resumen
