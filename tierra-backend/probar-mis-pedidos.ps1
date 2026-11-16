# Verifica "Mis pedidos" (tarea 19, decision 0005).
# Correr con el backend levantado en el perfil dev:  .\probar-mis-pedidos.ps1
#
# Cada corrida crea un cliente nuevo de @prueba.tierra.esquel, le hace
# cuatro compras y despues fija el estado de cada pedido por SQL (pagado,
# cancelado sin pagar, cancelado con reembolso, pendiente). Asi el resultado
# no depende de si hay o no un token de prueba valido de Mercado Pago.
# Tambien le inserta 55 pedidos de una sola vez para probar el tope de 50.

. "$PSScriptRoot\probar-comun.ps1"
$fallas = 0
$sello = Get-Date -Format "yyyyMMddHHmmss"
$email = "historial.$sello@prueba.tierra.esquel"
$mochila = "e0000000-0000-0000-0000-000000000005"
function Escalar($consulta) { return "$(Sql $consulta)".Trim() }
function Mios($s) { Pedir $s GET "/api/pedidos/mios" }
# En dos pasos, como ListaDe en probar-catalogo.ps1: Windows PowerShell 5.1
# entrega el arreglo JSON entero como un solo objeto (PowerShell 7, elemento
# por elemento). Al pasarlo por el pipeline queda igual en los dos.
function Lista($r) {
    try { $json = ConvertFrom-Json $r.Texto } catch { return ,@() }
    return ,@($json | Where-Object { $null -ne $_ })
}
function Comprar($s, $cuerpo) { Pedir $s POST "/api/checkout" $cuerpo }
$dir = "{""calle"":""San Martin"",""numero"":""123"",""piso"":""2"",""departamento"":""B"",""ciudad"":""Esquel"",""provincia"":""Chubut"",""codigoPostal"":""9200""}"
function ConEnvio($items) {
    "{""nombre"":""Ana Destinataria"",""email"":""$email"",""telefono"":""+54 9 2945 123456"",""dni"":""30.111.222"",""tipoEntrega"":""ENVIO_DOMICILIO"",""direccion"":$dir,""items"":$items}"
}
function ConRetiro {
    "{""nombre"":""Ana Retira"",""email"":""$email"",""telefono"":""2945 654321"",""tipoEntrega"":""RETIRO_LOCAL"",""items"":[{""varianteId"":""$mochila"",""cantidad"":1}]}"
}
function FijarEstado($id, $estado, $estadoPago) {
    $sql = "UPDATE pedidos SET estado = '$estado' WHERE id = '$id'; UPDATE pagos SET estado = 'EXPIRADO' WHERE pedido_id = '$id';"
    if ($estadoPago) {
        $sql += " INSERT INTO pagos (pedido_id, metodo, estado, monto) SELECT id, 'MERCADO_PAGO', '$estadoPago', total FROM pedidos WHERE id = '$id';"
    }
    Sql $sql | Out-Null
}

ReiniciarCliente "test@tierra.esquel"
DesbloquearTodos
CancelarPedidosDePrueba

Write-Host "`n1. Solo clientes con sesion" -ForegroundColor Cyan
Verificar (Mios (NuevaSesion)) 401 "sin sesion"
$equipo = NuevaSesion
Verificar (EntrarComoEquipo $equipo "admin@tierra.esquel") 200 "login del equipo"
Verificar (Mios $equipo) 403 "con sesion del equipo"

Write-Host "`n2. Un cliente nuevo con cuatro pedidos" -ForegroundColor Cyan
$anonimo = NuevaSesion
$ids = @()
$ids += VerificarCompra (Comprar $anonimo (ConEnvio "[{""varianteId"":""$mochila"",""cantidad"":2},{""varianteId"":""e0000000-0000-0000-0000-000000000001"",""cantidad"":1}]")) $email "pedido A, con envio y dos productos"
Start-Sleep -Milliseconds 50
$ids += VerificarCompra (Comprar $anonimo (ConRetiro)) $email "pedido B, con retiro"
Start-Sleep -Milliseconds 50
$ids += VerificarCompra (Comprar $anonimo (ConRetiro)) $email "pedido C, con retiro"
Start-Sleep -Milliseconds 50
$ids += VerificarCompra (Comprar $anonimo (ConRetiro)) $email "pedido D, con retiro"
$a, $b, $c, $d = $ids
FijarEstado $a "PAGADO" "APROBADO"
FijarEstado $b "CANCELADO" $null
FijarEstado $c "CANCELADO" "REEMBOLSADO"
FijarEstado $d "PENDIENTE" $null
# Sin Mercado Pago, D se cancelo y su reserva quedo liberada: se borra esa
# reserva (ya liberada, no toca stock) para que vuelva a poder pagarse. Con un
# token valido, D sigue pendiente con su reserva activa y esto no hace nada.
Sql "DELETE FROM reservas_stock WHERE pedido_id = '$d' AND liberada;" | Out-Null
Write-Host "  (A pagado, B cancelado sin pagar, C cancelado y reembolsado, D pendiente)"

Write-Host "`n3. Su historial" -ForegroundColor Cyan
$s = NuevaSesion
Verificar (EntrarComoCliente $s $email) 200 "entrar con codigo"
$r = Mios $s
Verificar $r 200 "GET /api/pedidos/mios"
$lista = Lista $r
$orden = ($lista | ForEach-Object { $_.id }) -join ","
Condicion ($orden -eq "$d,$c,$a") "D, C y A, del mas nuevo al mas viejo (B no aparece)"
Condicion (-not ($r.Texto.Contains($b))) "el cancelado que nunca se pago no aparece"
$pa = $lista | Where-Object { $_.id -eq $a }
$pc = $lista | Where-Object { $_.id -eq $c }
$pd = $lista | Where-Object { $_.id -eq $d }
Condicion ($pa.estado -eq "PAGADO" -and $pc.estado -eq "CANCELADO" -and $pd.estado -eq "PENDIENTE") "estados: $($pa.estado), $($pc.estado), $($pd.estado)"

Write-Host "`n4. DNI y telefono ocultos desde el backend" -ForegroundColor Cyan
Condicion ($pa.contactoDni -eq "***.***.222") "DNI: $($pa.contactoDni)"
Condicion ($pa.contactoTelefono -eq ([char]0x2022).ToString() * 3 + " 3456") "telefono: $($pa.contactoTelefono)"
Condicion (-not ($r.Texto -match "30111222|30\.111\.222|2945 123456|123456\b|654321")) "la respuesta no trae el DNI ni los telefonos completos en ningun lado"
Condicion ($pa.contactoNombre -eq "Ana Destinataria") "el nombre del destinatario va completo"
$da = $pa.direccionEntrega
Condicion ($da.calle -eq "San Martin" -and $da.numero -eq "123" -and $da.piso -eq "2" -and $da.departamento -eq "B" -and $da.codigoPostal -eq "9200") "la direccion va completa, con piso y depto"
Condicion ($null -eq $pd.contactoDni -and $null -eq $pd.direccionEntrega -and $pd.tipoEntrega -eq "RETIRO_LOCAL") "con retiro, sin DNI ni direccion"

Write-Host "`n5. Productos y montos" -ForegroundColor Cyan
# Los dos lados pasan a ASCII igual (cada caracter no ASCII se vuelve "?"):
# en Windows PowerShell 5.1 la salida de psql llega con la codificacion de la
# consola y la tilde de "Unico" no coincidiria con la de la respuesta.
$nombres = (($pa.items | ForEach-Object { "$($_.nombreProducto)|$($_.talla)|$($_.color)|$($_.cantidad)" }) -join " ; ") -replace '[^ -~]', '?'
$esperado = Escalar "SELECT regexp_replace(string_agg(nombre_producto || '|' || coalesce(talla, '') || '|' || coalesce(color, '') || '|' || cantidad, ' ; ' ORDER BY nombre_producto, talla, color, id), '[^ -~]', '?', 'g') FROM pedido_items WHERE pedido_id = '$a';"
Condicion (@($pa.items).Count -eq 2 -and $nombres -eq $esperado) "dos productos con talle, color y cantidad ($nombres)"
$totalBase = Escalar "SELECT total FROM pedidos WHERE id = '$a';"
Condicion ([decimal]$pa.total -eq [decimal]$totalBase -and [decimal]$pa.costoEnvio -gt 0) "total $($pa.total) (envio $($pa.costoEnvio)), igual al de la base"
# Sobre el texto de la respuesta: PowerShell 7 convierte las fechas del JSON
# a DateTime y pierde la zona horaria.
$fecha = [regex]::Match($r.Texto, '"creadoEn":"([^"]+)"').Groups[1].Value
Condicion ($fecha -match "(Z|[+-]\d\d:\d\d)$") "la fecha lleva zona horaria ($fecha)"

Write-Host "`n6. Lo que se compro no cambia si se edita el producto" -ForegroundColor Cyan
$nombreOriginal = Escalar "SELECT nombre FROM productos WHERE id = (SELECT producto_id FROM variantes_producto WHERE id = '$mochila');"
Sql "UPDATE productos SET nombre = 'Nombre Editado Despues' WHERE id = (SELECT producto_id FROM variantes_producto WHERE id = '$mochila');" | Out-Null
$despues = Mios $s
Sql "UPDATE productos SET nombre = '$nombreOriginal' WHERE id = (SELECT producto_id FROM variantes_producto WHERE id = '$mochila');" | Out-Null
Condicion ($despues.Texto.Contains($nombreOriginal) -and -not $despues.Texto.Contains("Nombre Editado Despues")) "el historial sigue mostrando '$nombreOriginal'"

Write-Host "`n7. Cada cliente ve solo lo suyo" -ForegroundColor Cyan
$test = NuevaSesion
Verificar (EntrarComoCliente $test "test@tierra.esquel") 200 "entrar como test@"
$deTest = Mios $test
Condicion ($deTest.Codigo -eq 200 -and -not ($deTest.Texto.Contains($a) -or $deTest.Texto.Contains($c) -or $deTest.Texto.Contains($d))) "test@ no ve los pedidos del cliente nuevo"
$deOtro = Escalar "SELECT count(*) FROM pedidos WHERE usuario_id = (SELECT id FROM usuarios WHERE email = 'test@tierra.esquel');"
Condicion ((Lista $r).Count -eq 3 -and [int]$deOtro -gt 0) "y el cliente nuevo ve solo sus 3 (test@ tiene $deOtro en la base)"

Write-Host "`n8. Pagar un pedido pendiente desde el historial" -ForegroundColor Cyan
# Con un token valido de Mercado Pago responde 200 con el link; sin token,
# 503 con su codigo (nunca un 500), y el pedido sigue pendiente.
$r = Pedir $s POST "/api/pagos/pedidos/$d/preferencia"
$estadoD = Escalar "SELECT estado FROM pedidos WHERE id = '$d';"
$okPago = ($r.Codigo -eq 200 -and ($r.Texto | ConvertFrom-Json).initPoint) -or ($r.Codigo -eq 503 -and (CodigoDe $r) -eq "LINK_DE_PAGO_NO_DISPONIBLE")
Condicion ($okPago -and $estadoD -eq "PENDIENTE") "Pagar -> $($r.Codigo) $(CodigoDe $r), el pedido sigue $estadoD"
Verificar (Pedir $test POST "/api/pagos/pedidos/$d/preferencia") 404 "test@ no puede pagar un pedido ajeno"

Write-Host "`n9. Como maximo los 50 mas recientes" -ForegroundColor Cyan
Sql "INSERT INTO pedidos (usuario_id, estado, tipo_entrega, subtotal, total, contacto_nombre, creado_en) SELECT (SELECT id FROM usuarios WHERE email = '$email'), 'ENTREGADO', 'RETIRO_LOCAL', 1000, 1000, 'Pedido Viejo', now() - (g || ' days')::interval FROM generate_series(1, 55) g;" | Out-Null
$muchos = Lista (Mios $s)
Condicion ($muchos.Count -eq 50) "responde 50 de 58 ($($muchos.Count))"
Condicion ($muchos[0].id -eq $d) "y el primero sigue siendo el mas nuevo"

# Se limpia todo menos D, que queda pendiente para la prueba a mano en el
# navegador (con "Pagar"). Despues lo cancela solo el job de vencimientos,
# como a cualquier pedido abandonado. D no retiene stock sin Mercado Pago;
# con un token valido, su reserva vence a los 20 minutos.
ReiniciarCliente "test@tierra.esquel"
CancelarPedidosDePrueba $d
Write-Host ""
Write-Host "Para probar en el navegador, entra con: $email" -ForegroundColor Cyan
Write-Host "(el pendiente con 'Pagar' se puede pagar unos 15 minutos; despues vence y el sistema lo cancela)"
Resumen
