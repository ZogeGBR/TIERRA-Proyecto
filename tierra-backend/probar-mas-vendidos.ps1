# Verifica "mas vendidos" de la home: GET /api/productos/mas-vendidos.
# Correr con el backend levantado en el perfil dev:  .\probar-mas-vendidos.ps1
#
# Regla: pedidos pagados (PAGADO, PREPARANDO, ENVIADO o ENTREGADO) de los
# ultimos 90 dias, productos activos, por unidades vendidas, como maximo 8,
# y lista vacia si hay menos de 3.
#
# El ranking es de toda la base, que ya tiene ventas de otros scripts: por
# eso se compara contra la misma regla calculada en SQL. Ademas se insertan
# ventas controladas con cantidades grandes para los casos puntuales, y al
# terminar se borran (aunque el script falle a la mitad).
#
# Con -DejarVentas quedan las tres ventas que ponen primeros a Z, W y V,
# para ver el carrusel "Lo que mas se elige" en la home. La proxima corrida
# sin -DejarVentas las borra al empezar.
param([switch]$DejarVentas)

. "$PSScriptRoot\probar-comun.ps1"
$fallas = 0
$sello = Get-Date -Format "yyyyMMddHHmmss"
function Escalar($consulta) { return "$(Sql $consulta)".Trim() }
function Filas($consulta) { return ,@(Sql $consulta | ForEach-Object { "$_".Trim() } | Where-Object { $_ }) }
# Un INSERT ... RETURNING id: psql imprime el id y despues "INSERT 0 1".
function Insertar($consulta) {
    return "$(Sql $consulta | Where-Object { "$_".Trim() -match '^[0-9a-f-]{36}$' } | Select-Object -First 1)".Trim()
}
# En dos pasos, como ListaDe en probar-catalogo.ps1 (Windows PowerShell 5.1).
function Lista($r) {
    try { $json = ConvertFrom-Json $r.Texto } catch { return ,@() }
    return ,@($json | Where-Object { $null -ne $_ })
}
function Ids($lista) { return (@($lista | ForEach-Object { "$($_.id)" }) -join ",") }
$estadosVendidos = "'PAGADO','PREPARANDO','ENVIADO','ENTREGADO'"
# La misma regla, en SQL: los ids en orden, separados por coma.
function EsperadoSegunLaBase($limite) {
    $ids = Escalar "SELECT coalesce(string_agg(id::text, ',' ORDER BY orden), '') FROM (SELECT pr.id, row_number() OVER (ORDER BY sum(i.cantidad) DESC, pr.nombre, pr.id) AS orden FROM pedido_items i JOIN pedidos p ON p.id = i.pedido_id JOIN variantes_producto v ON v.id = i.variante_id JOIN productos pr ON pr.id = v.producto_id WHERE p.estado IN ($estadosVendidos) AND p.creado_en >= localtimestamp - interval '90 days' AND pr.activo GROUP BY pr.id, pr.nombre ORDER BY sum(i.cantidad) DESC, pr.nombre, pr.id LIMIT $limite) t;"
    if (@($ids.Split(",") | Where-Object { $_ }).Count -lt 3) { return "" }
    return $ids
}

# Siete productos activos del seed, cada uno con una variante.
$filas = Filas "SELECT p.id || '|' || (SELECT v.id FROM variantes_producto v WHERE v.producto_id = p.id ORDER BY v.id LIMIT 1) FROM productos p WHERE p.activo AND EXISTS (SELECT 1 FROM variantes_producto v WHERE v.producto_id = p.id) ORDER BY p.id LIMIT 7;"
$prod = @{}; $var = @{}
$nombres = @("Z", "W", "V", "X", "T", "Y", "U")
for ($i = 0; $i -lt 7; $i++) {
    $partes = "$($filas[$i])".Trim().Split("|")
    $prod[$nombres[$i]] = $partes[0]; $var[$nombres[$i]] = $partes[1]
}
# Lo que haya quedado de una corrida con -DejarVentas.
Sql "DELETE FROM pedidos WHERE usuario_id IN (SELECT id FROM usuarios WHERE email LIKE 'ranking.%@prueba.tierra.esquel'); DELETE FROM usuarios WHERE email LIKE 'ranking.%@prueba.tierra.esquel';" | Out-Null
$email = "ranking.$sello@prueba.tierra.esquel"
$cliente = Insertar "INSERT INTO usuarios (nombre, email, rol) VALUES ('Cliente Ranking', '$email', 'CLIENTE') RETURNING id;"
$creados = @()
$primeros3 = @()
function Venta($letra, $estado, $diasAtras, $cantidad) {
    $id = Insertar "INSERT INTO pedidos (usuario_id, estado, tipo_entrega, subtotal, total, contacto_nombre, creado_en) VALUES ('$cliente', '$estado', 'RETIRO_LOCAL', 1, 1, 'Ranking', localtimestamp - interval '$diasAtras days') RETURNING id;"
    Sql "INSERT INTO pedido_items (pedido_id, variante_id, cantidad, precio_unitario, nombre_producto) SELECT '$id', v.id, $cantidad, 1, p.nombre FROM variantes_producto v JOIN productos p ON p.id = v.producto_id WHERE v.id = '$($var[$letra])';" | Out-Null
    return $id
}

try {
    Write-Host "`n1. Ventas controladas" -ForegroundColor Cyan
    $primeros3 += Venta "Z" "PAGADO" 0 300000
    $primeros3 += Venta "W" "ENTREGADO" 1 200000
    $primeros3 += Venta "V" "ENVIADO" 2 100000
    $creados += Venta "X" "CANCELADO" 0 900000
    $creados += Venta "T" "PENDIENTE" 0 900000
    $creados += Venta "Y" "PAGADO" 100 900000
    $creados += Venta "U" "PAGADO" 0 800000
    Sql "UPDATE productos SET activo = false WHERE id = '$($prod.U)';" | Out-Null
    Write-Host "  Z pagado 300000 u., W entregado 200000, V enviado 100000; X cancelado, T pendiente,"
    Write-Host "  Y pagado hace 100 dias (900000 cada uno) y U pagado 800000 pero inactivo."

    Write-Host "`n2. El ranking" -ForegroundColor Cyan
    $s = NuevaSesion
    $r = Pedir $s GET "/api/productos/mas-vendidos"
    Verificar $r 200 "GET /api/productos/mas-vendidos sin sesion"
    $lista = Lista $r
    $ids = Ids $lista
    Condicion ($ids -eq (EsperadoSegunLaBase 8)) "coincide con la regla calculada en la base ($(@($lista).Count) productos)"
    $primeros = (@($lista)[0..2] | ForEach-Object { "$($_.id)" }) -join ","
    Condicion ($primeros -eq "$($prod.Z),$($prod.W),$($prod.V)") "los primeros son Z, W y V, en ese orden (pagado, entregado y enviado cuentan)"
    Condicion (@($lista).Count -le 8) "como maximo 8"
    $puestoDe = @{}
    for ($i = 0; $i -lt @($lista).Count; $i++) { $puestoDe["$(@($lista)[$i].id)"] = $i }
    foreach ($caso in @(@("X", "cancelado"), @("T", "pendiente"), @("Y", "de hace 100 dias"))) {
        $p = $puestoDe[$prod[$caso[0]]]
        Condicion ($null -eq $p -or $p -ge 3) "$($caso[0]) ($($caso[1]), 900000 u.) no cuenta esas unidades: no queda arriba"
    }
    Condicion (-not $puestoDe.ContainsKey($prod.U)) "U (inactivo) no aparece"
    $p0 = @($lista)[0]
    Condicion ($p0.id -and $p0.nombre -and $null -ne $p0.precio -and $null -ne $p0.marca -and $null -ne $p0.categoria -and $p0.PSObject.Properties.Name -contains "imagenPrincipal") "cada producto trae id, nombre, marca, categoria, precio e imagenPrincipal"
    $sesion = $s.Cookies.GetCookies($base) | Where-Object { $_.Name -eq "JSESSIONID" }
    Condicion (-not $sesion) "no abre una sesion"

    Write-Host "`n3. El limite" -ForegroundColor Cyan
    $tres = Lista (Pedir $s GET "/api/productos/mas-vendidos?limite=3")
    Condicion ((Ids $tres) -eq "$($prod.Z),$($prod.W),$($prod.V)") "?limite=3 -> Z, W y V"
    Verificar (Pedir $s GET "/api/productos/mas-vendidos?limite=2") 400 "?limite=2 (con menos de 3 nunca se muestra)"
    Verificar (Pedir $s GET "/api/productos/mas-vendidos?limite=9") 400 "?limite=9"
    Verificar (Pedir $s GET "/api/productos/mas-vendidos?limite=abc") 400 "?limite=abc"
}
finally {
    Sql "UPDATE productos SET activo = true WHERE id = '$($prod.U)';" | Out-Null
    # Las de X, T, Y y U se borran siempre (U volvio a estar activo y con sus
    # 800000 unidades quedaria primero). Las de Z, W y V, salvo -DejarVentas.
    $aBorrar = @($creados)
    if (-not $DejarVentas) { $aBorrar += $primeros3 }
    if ($aBorrar.Count -gt 0) {
        Sql "DELETE FROM pedidos WHERE id IN ('$($aBorrar -join "','")');" | Out-Null
    }
    if (-not $DejarVentas) { Sql "DELETE FROM usuarios WHERE email = '$email';" | Out-Null }
}

if ($DejarVentas) {
    Write-Host "`n4. Quedaron las ventas de Z, W y V" -ForegroundColor Cyan
    $r = Pedir (NuevaSesion) GET "/api/productos/mas-vendidos"
    Condicion ($r.Codigo -eq 200 -and (Ids (Lista $r)) -eq (EsperadoSegunLaBase 8)) "el ranking coincide con la base: abri la home para ver el carrusel"
    Write-Host "  Para borrarlas, volve a correr el script sin -DejarVentas."
} else {
    Write-Host "`n4. Despues de borrar las ventas controladas" -ForegroundColor Cyan
    $r = Pedir (NuevaSesion) GET "/api/productos/mas-vendidos"
    $esperado = EsperadoSegunLaBase 8
    $texto = "lista vacia: hay menos de 3 con ventas"
    if ($esperado) { $texto = "$(@($esperado.Split(',')).Count) productos" }
    Condicion ($r.Codigo -eq 200 -and (Ids (Lista $r)) -eq $esperado) "sigue coincidiendo con la base ($texto)"
}
Condicion ((Escalar "SELECT activo FROM productos WHERE id = '$($prod.U)';") -eq "t") "U volvio a estar activo"

Resumen
