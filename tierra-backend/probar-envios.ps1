# Verifica la cobertura y la cotizacion de envio (tarea 10, decision 0006).
# Correr con el backend levantado en el perfil dev:  .\probar-envios.ps1
#
# El costo depende de la configuracion (ENVIO_COSTO_FIJO): el script no
# compara contra un numero fijo, sino que verifica que el pedido cobre
# exactamente lo que dijo la cotizacion.

. "$PSScriptRoot\probar-comun.ps1"
$fallas = 0
# Campera Outdoor M azul, del seed.
$variante = "e0000000-0000-0000-0000-000000000003"
$items = "[{""varianteId"":""$variante"",""cantidad"":1}]"
function Cotizar($s, $cuerpo) { Pedir $s POST "/api/envios/cotizacion" $cuerpo }
function Domicilio($provincia, $cp) { "{""tipoEntrega"":""ENVIO_DOMICILIO"",""provincia"":""$provincia"",""codigoPostal"":""$cp"",""items"":$items}" }
function Json($r) { try { return ($r.Texto | ConvertFrom-Json) } catch { return $null } }

ReiniciarCliente "test@tierra.esquel"
CancelarPedidosDePrueba
$s = NuevaSesion

Write-Host "`n1. Retiro en el local: sin costo, sin provincia ni codigo postal" -ForegroundColor Cyan
$r = Cotizar $s "{""tipoEntrega"":""RETIRO_LOCAL"",""items"":$items}"
Verificar $r 200 "cotizacion sin sesion"
$c = Json $r
Condicion ($c.cubierto -eq $true -and [decimal]$c.costo -eq 0) "cubierto y costo 0"

Write-Host "`n2. Dentro de la zona (sin importar tildes ni mayusculas)" -ForegroundColor Cyan
$costos = @()
foreach ($caso in @(@("Neuquen", "8300"), @("RIO NEGRO", "8400"), @("chubut", "9200"), @("Santa Cruz", "9400"))) {
    $r = Cotizar $s (Domicilio $caso[0] $caso[1])
    $c = Json $r
    Condicion ($r.Codigo -eq 200 -and $c.cubierto -eq $true -and [decimal]$c.costo -gt 0) "$($caso[0]) ($($caso[1])): cubierto, costo $($c.costo)"
    $costos += [decimal]$c.costo
}

Write-Host "`n3. Fuera de la zona: no es un error, se ofrece el retiro" -ForegroundColor Cyan
$r = Cotizar $s (Domicilio "Cordoba" "5000")
Verificar $r 200 "Cordoba responde 200"
$c = Json $r
Condicion ($c.cubierto -eq $false -and $null -eq $c.costo) "cubierto false y sin costo"
Condicion ("$($c.mensaje)" -like "*retirar*local*") "el mensaje ofrece el retiro en el local"

Write-Host "`n4. Datos invalidos: 400 o 404, nunca 500" -ForegroundColor Cyan
Verificar (Cotizar $s "{""tipoEntrega"":""ENVIO_DOMICILIO"",""codigoPostal"":""9200"",""items"":$items}") 400 "envio sin provincia"
Verificar (Cotizar $s (Domicilio "Chubut" "92")) 400 "codigo postal de 2 numeros"
Verificar (Cotizar $s (Domicilio "Chubut" "A9200")) 400 "codigo postal con letras"
Verificar (Cotizar $s "{""tipoEntrega"":""RETIRO_LOCAL"",""items"":[]}") 400 "sin productos"
Verificar (Cotizar $s "{""tipoEntrega"":""DRON"",""items"":$items}") 400 "tipo de entrega que no existe"
Verificar (Cotizar $s "{""tipoEntrega"":""ENVIO_DOMICILIO"",""provincia"":""Chubut"",""codigoPostal"":""9200"",""items"":[{""varianteId"":""e0000000-0000-0000-0000-000000000999"",""cantidad"":1}]}") 404 "variante que no existe"
$inactiva = Sql "SELECT v.id FROM variantes_producto v JOIN productos p ON p.id = v.producto_id WHERE NOT p.activo ORDER BY v.id LIMIT 1;"
if ("$inactiva".Trim()) {
    Verificar (Cotizar $s "{""tipoEntrega"":""ENVIO_DOMICILIO"",""provincia"":""Chubut"",""codigoPostal"":""9200"",""items"":[{""varianteId"":""$("$inactiva".Trim())"",""cantidad"":1}]}") 404 "variante de un producto inactivo"
} else { Write-Host "  --  no hay productos inactivos" -ForegroundColor DarkGray }

Write-Host "`n5. Es publico, pero exige el token CSRF como todo POST" -ForegroundColor Cyan
# Sin sesion del navegador ni cookie: el pedido sale sin token.
try {
    Invoke-WebRequest -Uri "$base/api/envios/cotizacion" -Method POST -ContentType "application/json" `
        -Body "{""tipoEntrega"":""RETIRO_LOCAL"",""items"":$items}" -UseBasicParsing | Out-Null
    $codigo = 200
} catch {
    $codigo = if ($_.Exception.Response) { [int]$_.Exception.Response.StatusCode } else { 0 }
}
Condicion ($codigo -eq 403) "sin token CSRF -> $codigo (esperado 403)"

Write-Host "`n6. El pedido cobra exactamente lo que dijo la cotizacion" -ForegroundColor Cyan
# Compra sin sesion a nombre de test@. Se compara contra el pedido guardado,
# que existe tanto si responde 201 como 503 (ver VerificarCompra).
$cotizado = [decimal](Json (Cotizar $s (Domicilio "Chubut" "9200"))).costo
$direccion = "{""calle"":""San Martin"",""numero"":""123"",""ciudad"":""Esquel"",""provincia"":""Chubut"",""codigoPostal"":""9200""}"
$r = Pedir $s POST "/api/checkout" "{""nombre"":""Usuario de Prueba"",""email"":""test@tierra.esquel"",""telefono"":""2945 000000"",""dni"":""30111222"",""tipoEntrega"":""ENVIO_DOMICILIO"",""direccion"":$direccion,""items"":$items}"
$id = VerificarCompra $r "test@tierra.esquel" "compra con envio a Chubut"
$costo = [decimal]"$(Sql "SELECT costo_envio FROM pedidos WHERE id = '$id';")".Trim()
Condicion ($costo -eq $cotizado) "costo de envio del pedido ($costo) = cotizacion ($cotizado)"
$r = Pedir $s POST "/api/checkout" "{""nombre"":""Usuario de Prueba"",""email"":""test@tierra.esquel"",""telefono"":""2945 000000"",""tipoEntrega"":""RETIRO_LOCAL"",""items"":$items}"
$id = VerificarCompra $r "test@tierra.esquel" "compra con retiro"
$costo = [decimal]"$(Sql "SELECT costo_envio FROM pedidos WHERE id = '$id';")".Trim()
Condicion ($costo -eq 0) "con retiro, costo de envio 0"

ReiniciarCliente "test@tierra.esquel"
CancelarPedidosDePrueba
Resumen
