# Verifica el checkout sin cuenta (tarea 9, decision 0005).
# Correr con el backend levantado en el perfil dev:  .\probar-checkout.ps1
#
# Sin un token de prueba valido de Mercado Pago (MP_ACCESS_TOKEN), el
# backend no consigue el link de pago y cada compra responde 503 con el
# pedido ya cancelado. El script acepta las dos respuestas (ver
# VerificarCompra en probar-comun.ps1) y verifica todo lo demas igual.
#
# Cada corrida usa emails nuevos de @prueba.tierra.esquel, asi "email
# nuevo" es nuevo de verdad. Esos clientes quedan en la base de desarrollo.

. "$PSScriptRoot\probar-comun.ps1"
$fallas = 0
# Mochila Trekking 50L, del seed: controla stock.
$variante = "e0000000-0000-0000-0000-000000000005"
# Bicicleta MTB 29", del seed: no controla stock (para las compras simultaneas).
$sinControl = "e0000000-0000-0000-0000-000000000001"
$items = "[{""varianteId"":""$variante"",""cantidad"":1}]"
$sello = Get-Date -Format "yyyyMMddHHmmss"
function Email($nombre) { "$nombre.$sello@prueba.tierra.esquel" }
function Json($r) { try { return ($r.Texto | ConvertFrom-Json) } catch { return $null } }
function Escalar($consulta) { return "$(Sql $consulta)".Trim() }
function Comprar($s, $cuerpo) { Pedir $s POST "/api/checkout" $cuerpo }
function Retiro($email) {
    "{""nombre"":""Ana Prueba"",""email"":""$email"",""telefono"":""2945 123456"",""tipoEntrega"":""RETIRO_LOCAL"",""items"":$items}"
}
function Envio($email, $dni, $direccion) {
    "{""nombre"":""Ana Prueba"",""email"":""$email"",""telefono"":""2945 123456"",""dni"":""$dni"",""tipoEntrega"":""ENVIO_DOMICILIO"",""direccion"":$direccion,""items"":$items}"
}
$dirChubut = "{""calle"":""San Martin"",""numero"":""123"",""piso"":""2"",""departamento"":""B"",""ciudad"":""Esquel"",""provincia"":""chubut"",""codigoPostal"":""9200""}"
function Usuarios($email) { Escalar "SELECT count(*) FROM usuarios WHERE email = '$email';" }
function DuenioDe($id) { Escalar "SELECT u.email FROM pedidos p JOIN usuarios u ON u.id = p.usuario_id WHERE p.id = '$id';" }
function Reservado { Escalar "SELECT stock_reservado FROM variantes_producto WHERE id = '$variante';" }

ReiniciarCliente "test@tierra.esquel"
DesbloquearTodos
CancelarPedidosDePrueba

Write-Host "`n1. Sin sesion y con un email nuevo: se compra sin cuenta" -ForegroundColor Cyan
$nueva = Email "nueva"
$s = NuevaSesion
$antes = [int](Reservado)
$r = Comprar $s (Retiro $nueva)
$id = VerificarCompra $r $nueva "retiro en el local"
$esperado = if ($r.Codigo -eq 201) { $antes + 1 } else { $antes }
Condicion ([int](Reservado) -eq $esperado) "stock reservado de la variante: $antes -> $(Reservado) (esperado $esperado)"
$cuenta = Sql "SELECT rol || '|' || CASE WHEN password_hash IS NULL THEN 'sin-clave' ELSE 'con-clave' END || '|' || coalesce(telefono, '-') || '|' || coalesce(dni, '-') FROM usuarios WHERE email = '$nueva';"
Condicion ("$cuenta".Trim() -eq "CLIENTE|sin-clave|-|-") "se creo el cliente sin contrasena, sin telefono ni DNI en la cuenta ($("$cuenta".Trim()))"
$pedido = Sql "SELECT contacto_nombre || '|' || contacto_telefono || '|' || coalesce(contacto_dni, '-') || '|' || costo_envio FROM pedidos WHERE id = '$id';"
Condicion ("$pedido".Trim() -eq "Ana Prueba|2945 123456|-|0.00") "el contacto queda en el pedido, sin DNI ni envio ($("$pedido".Trim()))"
$sesion = $s.Cookies.GetCookies($base) | Where-Object { $_.Name -eq "JSESSIONID" }
Condicion (-not $sesion) "comprar no abre una sesion"

Write-Host "`n2. Envio a domicilio: DNI, piso y departamento quedan en el pedido" -ForegroundColor Cyan
$cotizado = [decimal](Json (Pedir $s POST "/api/envios/cotizacion" "{""tipoEntrega"":""ENVIO_DOMICILIO"",""provincia"":""Chubut"",""codigoPostal"":""9200"",""items"":$items}")).costo
$r = Comprar $s (Envio $nueva "30.111.222" $dirChubut)
$id = VerificarCompra $r $nueva "envio a Chubut"
$pedido = Sql "SELECT contacto_dni || '|' || envio_calle || '|' || envio_numero || '|' || envio_piso || '|' || envio_departamento || '|' || envio_ciudad || '|' || envio_codigo_postal FROM pedidos WHERE id = '$id';"
Condicion ("$pedido".Trim() -eq "30111222|San Martin|123|2|B|Esquel|9200") "direccion completa y DNI solo con numeros ($("$pedido".Trim()))"
$costo = [decimal](Escalar "SELECT costo_envio FROM pedidos WHERE id = '$id';")
Condicion ($costo -eq $cotizado) "cobra el envio que dijo la cotizacion ($costo = $cotizado)"
$sinPiso = "{""calle"":""Ruta 40 km 1800"",""ciudad"":""Esquel"",""provincia"":""Chubut"",""codigoPostal"":""9200""}"
$id = VerificarCompra (Comprar $s (Envio $nueva "30111222" $sinPiso)) $nueva "sin numero, piso ni departamento (son opcionales)"

Write-Host "`n3. El mismo email otra vez (con mayusculas): mismo cliente" -ForegroundColor Cyan
$r = Comprar (NuevaSesion) (Retiro $nueva.ToUpper())
$id = VerificarCompra $r $nueva "segunda compra"
Condicion ((Usuarios $nueva) -eq "1") "sigue habiendo un solo cliente con ese email"
Condicion ((Escalar "SELECT count(*) FROM pedidos p JOIN usuarios u ON u.id = p.usuario_id WHERE u.email = '$nueva';") -eq "4") "y tiene los cuatro pedidos"

Write-Host "`n4. Sin sesion con el email de un cliente existente: la cuenta no se toca" -ForegroundColor Cyan
$cuentaAntes = Escalar "SELECT nombre || '|' || coalesce(telefono, '-') || '|' || coalesce(dni, '-') FROM usuarios WHERE email = 'test@tierra.esquel';"
$r = Comprar (NuevaSesion) "{""nombre"":""Otro Nombre"",""email"":""test@tierra.esquel"",""telefono"":""1111 222222"",""dni"":""20333444"",""tipoEntrega"":""ENVIO_DOMICILIO"",""direccion"":$dirChubut,""items"":$items}"
$id = VerificarCompra $r "test@tierra.esquel" "compra con el email de test@"
Condicion ((DuenioDe $id) -eq "test@tierra.esquel") "el pedido queda a nombre de test@"
Condicion ((Escalar "SELECT contacto_nombre FROM pedidos WHERE id = '$id';") -eq "Otro Nombre") "con el contacto que se escribio en el checkout"
$cuentaDespues = Escalar "SELECT nombre || '|' || coalesce(telefono, '-') || '|' || coalesce(dni, '-') FROM usuarios WHERE email = 'test@tierra.esquel';"
Condicion ($cuentaDespues -eq $cuentaAntes) "y la cuenta de test@ no cambio ($cuentaDespues)"

Write-Host "`n5. Sin sesion con el email del equipo" -ForegroundColor Cyan
$pedidosAdmin = Escalar "SELECT count(*) FROM pedidos p JOIN usuarios u ON u.id = p.usuario_id WHERE u.email = 'admin@tierra.esquel';"
$r = Comprar (NuevaSesion) (Retiro "Admin@Tierra.Esquel")
Verificar $r 409 "no se puede comprar con un email del equipo"
Condicion ((CodigoDe $r) -eq "EMAIL_DEL_EQUIPO") "con codigo EMAIL_DEL_EQUIPO"
Condicion ((Escalar "SELECT count(*) FROM pedidos p JOIN usuarios u ON u.id = p.usuario_id WHERE u.email = 'admin@tierra.esquel';") -eq $pedidosAdmin) "y no se creo ningun pedido"

Write-Host "`n6. Con sesion de cliente: el email escrito se ignora" -ForegroundColor Cyan
$s = NuevaSesion
Verificar (EntrarComoCliente $s "test@tierra.esquel") 200 "entrar como test@ con codigo"
$otra = Email "ignorada"
$r = Comprar $s (Retiro $otra)
$id = VerificarCompra $r "test@tierra.esquel" "compra con sesion y otro email"
Condicion ((Usuarios $otra) -eq "0") "no se creo un cliente con el email escrito"

Write-Host "`n7. Con sesion del equipo: como si no hubiera sesion" -ForegroundColor Cyan
$s = NuevaSesion
Verificar (EntrarComoEquipo $s "admin@tierra.esquel") 200 "login del equipo"
$delEquipo = Email "desde-equipo"
$id = VerificarCompra (Comprar $s (Retiro $delEquipo)) $delEquipo "compra con sesion de admin@"
Condicion ((DuenioDe $id) -eq $delEquipo) "el pedido queda a nombre del email escrito, no de admin@"

Write-Host "`n8. Datos invalidos: 400 o 404, sin crear nada" -ForegroundColor Cyan
$s = NuevaSesion
$inv = Email "invalido"
$pedidosAntes = Escalar "SELECT count(*) FROM pedidos;"
$casos = @(
    @("envio sin DNI", (Envio $inv "" $dirChubut), 400),
    @("envio con DNI de 6 numeros", (Envio $inv "123456" $dirChubut), 400),
    @("envio sin direccion", "{""nombre"":""Ana"",""email"":""$inv"",""telefono"":""2945 123456"",""dni"":""30111222"",""tipoEntrega"":""ENVIO_DOMICILIO"",""items"":$items}", 400),
    @("envio sin codigo postal", (Envio $inv "30111222" "{""calle"":""San Martin"",""ciudad"":""Esquel"",""provincia"":""Chubut""}"), 400),
    @("envio fuera de la zona", (Envio $inv "30111222" "{""calle"":""San Martin"",""ciudad"":""Cordoba"",""provincia"":""Cordoba"",""codigoPostal"":""5000""}"), 400),
    @("telefono con 7 numeros", "{""nombre"":""Ana"",""email"":""$inv"",""telefono"":""123-4567"",""tipoEntrega"":""RETIRO_LOCAL"",""items"":$items}", 400),
    @("sin nombre", "{""email"":""$inv"",""telefono"":""2945 123456"",""tipoEntrega"":""RETIRO_LOCAL"",""items"":$items}", 400),
    @("email invalido", (Retiro "no-es-un-email"), 400),
    @("carrito vacio", "{""nombre"":""Ana"",""email"":""$inv"",""telefono"":""2945 123456"",""tipoEntrega"":""RETIRO_LOCAL"",""items"":[]}", 400),
    @("tipo de entrega desconocido", "{""nombre"":""Ana"",""email"":""$inv"",""telefono"":""2945 123456"",""tipoEntrega"":""DRON"",""items"":$items}", 400),
    @("variante inexistente", "{""nombre"":""Ana"",""email"":""$inv"",""telefono"":""2945 123456"",""tipoEntrega"":""RETIRO_LOCAL"",""items"":[{""varianteId"":""e0000000-0000-0000-0000-0000000000ff"",""cantidad"":1}]}", 404)
)
foreach ($c in $casos) { Verificar (Comprar $s $c[1]) $c[2] $c[0] }
Condicion ((Escalar "SELECT count(*) FROM pedidos;") -eq $pedidosAntes) "no se creo ningun pedido"
Condicion ((Usuarios $inv) -eq "0") "ni el cliente (los que fallan dentro de la transaccion la deshacen)"
function SinToken($cuerpo) {
    try {
        $r = Invoke-WebRequest -Uri "$base/api/checkout" -Method POST -ContentType "application/json" -Body $cuerpo -UseBasicParsing
        return [int]$r.StatusCode
    } catch { return [int]$_.Exception.Response.StatusCode }
}
$sinToken = SinToken (Retiro $inv)
Condicion ($sinToken -eq 403) "sin token CSRF -> $sinToken (esperado 403)"

Write-Host "`n9. Cinco compras simultaneas con el mismo email nuevo" -ForegroundColor Cyan
# Las cinco salen a la vez: la primera crea el cliente y las demas lo
# encuentran (INSERT ... ON CONFLICT DO NOTHING). Ninguna da 500.
Add-Type -AssemblyName System.Net.Http
[System.Net.ServicePointManager]::DefaultConnectionLimit = 20
$simultaneo = Email "simultaneo"
$cuerpo = "{""nombre"":""Ana Prueba"",""email"":""$simultaneo"",""telefono"":""2945 123456"",""tipoEntrega"":""RETIRO_LOCAL"",""items"":[{""varianteId"":""$sinControl"",""cantidad"":1}]}"
$s = NuevaSesion
$token = Token $s
$manejador = New-Object System.Net.Http.HttpClientHandler
$manejador.UseCookies = $false
$cliente = New-Object System.Net.Http.HttpClient($manejador)
$tareas = @()
for ($i = 0; $i -lt 5; $i++) {
    $m = New-Object System.Net.Http.HttpRequestMessage([System.Net.Http.HttpMethod]::Post, "$base/api/checkout")
    $m.Headers.Add("Cookie", "XSRF-TOKEN=$token")
    $m.Headers.Add("X-XSRF-TOKEN", $token)
    $m.Content = New-Object System.Net.Http.StringContent($cuerpo, [System.Text.Encoding]::UTF8, "application/json")
    $tareas += $cliente.SendAsync($m)
}
[System.Threading.Tasks.Task]::WaitAll([System.Threading.Tasks.Task[]]$tareas)
$codigos = @($tareas | ForEach-Object { [int]$_.Result.StatusCode })
$cliente.Dispose()
Condicion (@($codigos | Where-Object { $_ -ne 201 -and $_ -ne 503 }).Count -eq 0) "las cinco responden 201 o 503 ($($codigos -join ', '))"
Condicion ((Usuarios $simultaneo) -eq "1") "un solo cliente con ese email"
Condicion ((Escalar "SELECT count(*) FROM pedidos p JOIN usuarios u ON u.id = p.usuario_id WHERE u.email = '$simultaneo';") -eq "5") "con los cinco pedidos"

ReiniciarCliente "test@tierra.esquel"
CancelarPedidosDePrueba
Resumen
