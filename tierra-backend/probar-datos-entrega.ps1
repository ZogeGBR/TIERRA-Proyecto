# Verifica los datos guardados para la proxima compra (tarea 22, decision 0005).
# Correr con el backend levantado en el perfil dev:  .\probar-datos-entrega.ps1
#
# Usa la cuenta test@tierra.esquel y al terminar le devuelve los datos del
# seed (nombre, telefono, DNI y la direccion de Av. Fontana), asi los demas
# scripts y la prueba en el navegador la encuentran igual que siempre.
#
# Sin un token de prueba valido de Mercado Pago cada compra responde 503 con
# el pedido cancelado (ver VerificarCompra en probar-comun.ps1). Los datos se
# guardan igual: van en la misma transaccion que el pedido, que se confirma
# antes de pedir el link de pago.

. "$PSScriptRoot\probar-comun.ps1"
$fallas = 0
$test = "test@tierra.esquel"
$items = "[{""varianteId"":""e0000000-0000-0000-0000-000000000005"",""cantidad"":1}]"
$sello = Get-Date -Format "yyyyMMddHHmmss"
function Escalar($consulta) { return "$(Sql $consulta)".Trim() }
function Json($r) { try { return ($r.Texto | ConvertFrom-Json) } catch { return $null } }
function Datos($s) { Pedir $s GET "/api/cuenta/datos-entrega" }
function Borrar($s) { Pedir $s DELETE "/api/cuenta/datos-entrega" }
function Direccion($calle, $numero, $piso, $depto, $provincia, $cp) {
    "{""calle"":""$calle"",""numero"":""$numero"",""piso"":""$piso"",""departamento"":""$depto"",""ciudad"":""Esquel"",""provincia"":""$provincia"",""codigoPostal"":""$cp""}"
}
function Envio($email, $nombre, $telefono, $dni, $direccion, $guardar) {
    "{""nombre"":""$nombre"",""email"":""$email"",""telefono"":""$telefono"",""dni"":""$dni"",""tipoEntrega"":""ENVIO_DOMICILIO"",""direccion"":$direccion,""items"":$items,""guardarDatos"":$guardar}"
}
function Retiro($email, $nombre, $telefono, $guardar) {
    "{""nombre"":""$nombre"",""email"":""$email"",""telefono"":""$telefono"",""tipoEntrega"":""RETIRO_LOCAL"",""items"":$items,""guardarDatos"":$guardar}"
}
function Comprar($s, $cuerpo) { Pedir $s POST "/api/checkout" $cuerpo }
# "nombre|telefono|dni" de la cuenta y "cantidad|calle numero|piso|depto" de su direccion guardada.
function Cuenta($email) {
    Escalar "SELECT nombre || '|' || coalesce(telefono, '-') || '|' || coalesce(dni, '-') FROM usuarios WHERE email = '$email';"
}
function DireccionGuardada($email) {
    Escalar "SELECT count(*) || '|' || coalesce(max(calle || ' ' || coalesce(numero, '') || '|' || coalesce(piso, '-') || '|' || coalesce(departamento, '-')), '-') FROM direcciones WHERE usuario_id = (SELECT id FROM usuarios WHERE email = '$email');"
}
# Una huella de todos los pedidos de test@ (contacto y direccion de cada uno).
function HuellaPedidos {
    Escalar "SELECT count(*) || '|' || coalesce(md5(string_agg(id || contacto_nombre || coalesce(contacto_telefono, '') || coalesce(contacto_dni, '') || coalesce(envio_calle, '') || coalesce(envio_piso, '') || coalesce(envio_departamento, ''), ',' ORDER BY id)), '-') FROM pedidos WHERE usuario_id = (SELECT id FROM usuarios WHERE email = '$test');"
}
function RestaurarDatosDeTest {
    Sql "UPDATE usuarios SET nombre = 'Usuario de Prueba', telefono = '+54 9 2945 000000', dni = '30111222' WHERE email = '$test'; DELETE FROM direcciones WHERE usuario_id = '99000000-0000-0000-0000-000000000001'; INSERT INTO direcciones (id, usuario_id, calle, numero, ciudad, provincia, codigo_postal, es_predeterminada) VALUES ('88000000-0000-0000-0000-000000000001', '99000000-0000-0000-0000-000000000001', 'Av. Fontana', '482', 'Esquel', 'Chubut', '9200', true);" | Out-Null
}

ReiniciarCliente $test
DesbloquearTodos
CancelarPedidosDePrueba

Write-Host "`n1. Solo clientes con sesion" -ForegroundColor Cyan
$s = NuevaSesion
Verificar (Datos $s) 401 "GET sin sesion"
Verificar (Borrar $s) 401 "DELETE sin sesion"
$equipo = NuevaSesion
Verificar (EntrarComoEquipo $equipo "admin@tierra.esquel") 200 "login del equipo"
Verificar (Datos $equipo) 403 "GET con sesion del equipo"
Verificar (Borrar $equipo) 403 "DELETE con sesion del equipo"

Write-Host "`n2. Cliente sin datos guardados" -ForegroundColor Cyan
$s = NuevaSesion
Verificar (EntrarComoCliente $s $test) 200 "entrar como test@ con codigo"
Verificar (Borrar $s) 204 "DELETE (para arrancar sin datos)"
$r = Datos $s
$d = Json $r
Condicion ($r.Codigo -eq 200 -and $d.nombre -and $null -eq $d.telefono -and $null -eq $d.dni -and $null -eq $d.direccion) "GET -> 200 con el nombre de la cuenta y telefono, DNI y direccion vacios"
Condicion ((DireccionGuardada $test) -eq "0|-") "sin direccion en la base"
$huella = HuellaPedidos

Write-Host "`n3. Compra con sesion y la casilla tildada: se guardan" -ForegroundColor Cyan
$id = VerificarCompra (Comprar $s (Envio "otra.$sello@prueba.tierra.esquel" "Ana Guardada" "2945 111111" "30.444.555" (Direccion "San Martin" "123" "4" "C" "Chubut" "9200") "true")) $test "compra con envio y casilla"
$d = Json (Datos $s)
Condicion ($d.nombre -eq "Ana Guardada" -and $d.telefono -eq "2945 111111" -and $d.dni -eq "30444555") "GET devuelve nombre, telefono y DNI (solo numeros): $($d.nombre) | $($d.telefono) | $($d.dni)"
Condicion ($d.direccion.calle -eq "San Martin" -and $d.direccion.numero -eq "123" -and $d.direccion.piso -eq "4" -and $d.direccion.departamento -eq "C" -and $d.direccion.codigoPostal -eq "9200") "y la direccion con piso y depto"
Condicion ((Escalar "SELECT count(*) FROM usuarios WHERE email = 'otra.$sello@prueba.tierra.esquel';") -eq "0") "el email escrito se ignora: no se creo otra cuenta"

Write-Host "`n4. Otra compra con otra direccion: se reemplaza, sigue habiendo una" -ForegroundColor Cyan
$id = VerificarCompra (Comprar $s (Envio $test "Ana Guardada" "2945 111111" "30444555" (Direccion "Rivadavia" "50" "" "" "Chubut" "9200") "true")) $test "compra con otra direccion"
Condicion ((DireccionGuardada $test) -eq "1|Rivadavia 50|-|-") "una sola direccion, la nueva, sin piso ni depto ($(DireccionGuardada $test))"

Write-Host "`n5. Retiro con la casilla: cambia el telefono, se conservan DNI y direccion" -ForegroundColor Cyan
$id = VerificarCompra (Comprar $s (Retiro $test "Ana Retira" "2945 222222" "true")) $test "compra con retiro y casilla"
Condicion ((Cuenta $test) -eq "Ana Retira|2945 222222|30444555") "cuenta: $(Cuenta $test)"
Condicion ((DireccionGuardada $test) -eq "1|Rivadavia 50|-|-") "la direccion guardada sigue ahi"

Write-Host "`n6. Con sesion y sin la casilla: no cambia nada" -ForegroundColor Cyan
$antes = "$(Cuenta $test) / $(DireccionGuardada $test)"
$id = VerificarCompra (Comprar $s (Envio $test "Otro Nombre" "2945 999999" "20111222" (Direccion "Otra Calle" "1" "9" "Z" "Chubut" "9200") "false")) $test "compra con la casilla destildada"
$id = VerificarCompra (Comprar $s "{""nombre"":""Otro Nombre"",""email"":""$test"",""telefono"":""2945 999999"",""tipoEntrega"":""RETIRO_LOCAL"",""items"":$items}") $test "compra sin el campo guardarDatos"
Condicion ("$(Cuenta $test) / $(DireccionGuardada $test)" -eq $antes) "cuenta y direccion iguales ($antes)"

Write-Host "`n7. Sin sesion con la casilla tildada: se ignora" -ForegroundColor Cyan
$anonimo = NuevaSesion
$id = VerificarCompra (Comprar $anonimo (Envio $test "Intruso" "1100 000000" "11222333" (Direccion "Calle Ajena" "666" "1" "A" "Chubut" "9200") "true")) $test "compra sin sesion con el email de test@"
Condicion ("$(Cuenta $test) / $(DireccionGuardada $test)" -eq $antes) "la cuenta de test@ no cambio"
$nuevo = "nuevo.$sello@prueba.tierra.esquel"
$id = VerificarCompra (Comprar $anonimo (Envio $nuevo "Ana Nueva" "2945 333333" "30555666" (Direccion "Belgrano" "10" "" "" "Chubut" "9200") "true")) $nuevo "compra sin sesion con un email nuevo"
Condicion ((Cuenta $nuevo) -eq "Ana Nueva|-|-" -and (DireccionGuardada $nuevo) -eq "0|-") "el cliente nuevo queda sin telefono, DNI ni direccion ($(Cuenta $nuevo))"

Write-Host "`n8. Con sesion del equipo y la casilla: se ignora" -ForegroundColor Cyan
$delEquipo = "equipo.$sello@prueba.tierra.esquel"
$adminAntes = Cuenta "admin@tierra.esquel"
$id = VerificarCompra (Comprar $equipo (Envio $delEquipo "Ana Equipo" "2945 444444" "30777888" (Direccion "Sarmiento" "5" "" "" "Chubut" "9200") "true")) $delEquipo "compra con sesion de admin@"
Condicion ((Cuenta $delEquipo) -eq "Ana Equipo|-|-" -and (Cuenta "admin@tierra.esquel") -eq $adminAntes) "ni el cliente ni admin@ guardan datos"

Write-Host "`n9. Si la compra falla, no se guarda nada" -ForegroundColor Cyan
$r = Comprar $s (Envio $test "No Se Guarda" "2945 555555" "30999000" (Direccion "Fuera" "1" "" "" "Cordoba" "5000") "true")
Verificar $r 400 "compra fuera de la zona con la casilla"
Condicion ("$(Cuenta $test) / $(DireccionGuardada $test)" -eq $antes) "la cuenta no cambio"

Write-Host "`n10. Cinco compras simultaneas con la casilla: una sola direccion" -ForegroundColor Cyan
Add-Type -AssemblyName System.Net.Http
[System.Net.ServicePointManager]::DefaultConnectionLimit = 20
$cookies = ($s.Cookies.GetCookies($base) | ForEach-Object { "$($_.Name)=$($_.Value)" }) -join "; "
$token = Token $s
$manejador = New-Object System.Net.Http.HttpClientHandler
$manejador.UseCookies = $false
$cliente = New-Object System.Net.Http.HttpClient($manejador)
$tareas = @()
for ($i = 1; $i -le 5; $i++) {
    # Bicicleta MTB 29" del seed: no controla stock, asi las cinco pueden comprar.
    # La direccion va en una variable: dentro de un texto entre comillas, un
    # "" vacio en $( ) se lee como comilla escapada y corre los argumentos.
    $dirI = Direccion "Calle $i" "$i" "" "" "Chubut" "9200"
    $cuerpo = "{""nombre"":""Ana Simultanea"",""email"":""$test"",""telefono"":""2945 666666"",""dni"":""30111222"",""tipoEntrega"":""ENVIO_DOMICILIO"",""direccion"":$dirI,""items"":[{""varianteId"":""e0000000-0000-0000-0000-000000000001"",""cantidad"":1}],""guardarDatos"":true}"
    $m = New-Object System.Net.Http.HttpRequestMessage([System.Net.Http.HttpMethod]::Post, "$base/api/checkout")
    $m.Headers.Add("Cookie", $cookies)
    $m.Headers.Add("X-XSRF-TOKEN", $token)
    $m.Content = New-Object System.Net.Http.StringContent($cuerpo, [System.Text.Encoding]::UTF8, "application/json")
    $tareas += $cliente.SendAsync($m)
}
[System.Threading.Tasks.Task]::WaitAll([System.Threading.Tasks.Task[]]$tareas)
$codigos = @($tareas | ForEach-Object { [int]$_.Result.StatusCode })
$cliente.Dispose()
Condicion (@($codigos | Where-Object { $_ -ne 201 -and $_ -ne 503 }).Count -eq 0) "las cinco responden 201 o 503 ($($codigos -join ', '))"
Condicion ((DireccionGuardada $test).StartsWith("1|Calle ")) "una sola direccion guardada ($(DireccionGuardada $test))"

Write-Host "`n11. El seed no choca con una direccion guardada" -ForegroundColor Cyan
# Al reiniciar el backend, si el seed cambio, vuelve a insertar la direccion
# de test@ con su id. Desde la V11 hay una por cliente: tiene que no hacer nada.
Sql "INSERT INTO direcciones (id, usuario_id, calle, numero, ciudad, provincia, codigo_postal, es_predeterminada) VALUES ('88000000-0000-0000-0000-000000000001', '99000000-0000-0000-0000-000000000001', 'Av. Fontana', '482', 'Esquel', 'Chubut', '9200', true) ON CONFLICT DO NOTHING;" | Out-Null
Condicion ((DireccionGuardada $test).StartsWith("1|Calle ")) "el INSERT del seed no hace nada ($(DireccionGuardada $test))"

Write-Host "`n12. Borrar los datos guardados" -ForegroundColor Cyan
$antesDeBorrar = HuellaPedidos
Verificar (Borrar $s) 204 "DELETE"
$d = Json (Datos $s)
Condicion ($d.nombre -eq "Ana Simultanea" -and $null -eq $d.telefono -and $null -eq $d.dni -and $null -eq $d.direccion) "GET: queda el nombre, sin telefono, DNI ni direccion"
Condicion ((DireccionGuardada $test) -eq "0|-") "la direccion se borro de la base"
Condicion ((HuellaPedidos) -eq $antesDeBorrar) "borrar no modifica ningun pedido (contacto y direccion de cada uno)"
$nuevos = [int]($antesDeBorrar.Split("|")[0]) - [int]($huella.Split("|")[0])
Condicion ($nuevos -eq 11) "y siguen estando los 11 pedidos de este script ($nuevos)"
Verificar (Borrar $s) 204 "DELETE de nuevo, sin datos, tambien responde 204"

RestaurarDatosDeTest
ReiniciarCliente $test
CancelarPedidosDePrueba
Resumen
