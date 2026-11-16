# Verifica los endpoints del catalogo: categorias y marcas (tarea 7) y la
# busqueda de productos con filtros y paginacion (tarea 6).
# Correr con el backend levantado en el perfil dev:  .\probar-catalogo.ps1
#
# Compara lo que devuelve la API con lo que hay en la base, asi que sirve
# tambien con datos cargados a mano, no solo con el seed. Los casos que
# necesitan un dato que la base no tiene (por ejemplo, un producto inactivo)
# se saltean y lo avisan.

. "$PSScriptRoot\probar-comun.ps1"
$fallas = 0

# Las filas de una consulta, sin espacios ni lineas vacias. Siempre como
# arreglo: la coma evita que PowerShell convierta una sola fila en un texto
# suelto, donde [0] daria la primera letra y .Count el largo del texto.
function Filas($consulta) {
    return ,@(Sql $consulta | ForEach-Object { "$_".Trim() } | Where-Object { $_ })
}

# Se comparan ids y no nombres: Windows PowerShell 5.1 puede leer mal los
# acentos de la respuesta, y el orden alfabetico de PowerShell no es el de
# la base. El orden que vale es el de PostgreSQL.
function Ids($lista) { @($lista | ForEach-Object { "$($_.id)" }) }

# En dos pasos: Windows PowerShell 5.1 entrega el arreglo JSON como un solo
# objeto, y @(... | ConvertFrom-Json) lo anidaria dentro de otro.
function ListaDe($r) {
    if ($r.Codigo -ne 200) { return @() }
    $json = ConvertFrom-Json $r.Texto
    return @($json)
}

$s = NuevaSesion

Write-Host "`n1. Categorias, sin sesion" -ForegroundColor Cyan
$r = Pedir $s GET "/api/categorias"
Verificar $r 200 "GET /api/categorias"
$categorias = ListaDe $r

$enBase = Filas "SELECT id FROM categorias ORDER BY nombre, id;"
Condicion ($categorias.Count -eq $enBase.Count -and $categorias.Count -gt 0) "devuelve todas las categorias de la base ($($categorias.Count) de $($enBase.Count))"
Condicion (((Ids $categorias) -join ",") -eq ($enBase -join ",")) "en el mismo orden que la base (por nombre)"
Condicion (@($categorias | Where-Object { -not $_.id -or -not $_.nombre -or -not $_.slug }).Count -eq 0) "cada una trae id, nombre y slug"

$padresEnBase = Filas "SELECT id || '=' || COALESCE(categoria_padre_id::text, '') FROM categorias ORDER BY nombre, id;"
$padresEnApi = @($categorias | ForEach-Object { "$($_.id)=$($_.categoriaPadreId)" })
Condicion (($padresEnApi -join ",") -eq ($padresEnBase -join ",")) "cada subcategoria trae el id de su padre, y las principales null"
$subcategorias = @($categorias | Where-Object { $_.categoriaPadreId }).Count
Write-Host "       ($subcategorias subcategorias en la respuesta)" -ForegroundColor DarkGray

Write-Host "`n2. Marcas, sin sesion" -ForegroundColor Cyan
$r = Pedir $s GET "/api/marcas"
Verificar $r 200 "GET /api/marcas"
$marcas = ListaDe $r

$enBase = Filas "SELECT id FROM marcas ORDER BY nombre;"
Condicion ($marcas.Count -eq $enBase.Count -and $marcas.Count -gt 0) "devuelve todas las marcas de la base ($($marcas.Count) de $($enBase.Count))"
Condicion (((Ids $marcas) -join ",") -eq ($enBase -join ",")) "en el mismo orden que la base (por nombre)"
Condicion (@($marcas | Where-Object { -not $_.id -or -not $_.nombre }).Count -eq 0) "cada una trae id y nombre"
Condicion (@($marcas | Where-Object { $_.PSObject.Properties.Name -notcontains "logoUrl" }).Count -eq 0) "cada una trae el campo logoUrl (puede ser null)"

Write-Host "`n3. Navegar categorias y marcas no abre una sesion" -ForegroundColor Cyan
$sesion = $s.Cookies.GetCookies($base) | Where-Object { $_.Name -eq "JSESSIONID" }
Condicion (-not $sesion) "no hay cookie JSESSIONID"

Write-Host "`n4. Solo se puede leer la lista" -ForegroundColor Cyan
Write-Host "   (con el token CSRF, para que la respuesta la decida la regla de permisos)" -ForegroundColor DarkGray
Verificar (Pedir $s POST "/api/categorias") 401 "POST /api/categorias"
Verificar (Pedir $s DELETE "/api/marcas") 401 "DELETE /api/marcas"
Verificar (Pedir $s GET "/api/categorias/ropa") 401 "GET /api/categorias/ropa (ruta que no existe)"

# ---------------------------------------------------------------
# Productos (tarea 6)
# ---------------------------------------------------------------

function PaginaDe($r) { if ($r.Codigo -ne 200) { return $null }; return (ConvertFrom-Json $r.Texto) }
function IdsDe($pagina) { if (-not $pagina) { return @() }; @($pagina.contenido | ForEach-Object { "$($_.id)" }) }
function Saltear($texto) { Write-Host "  --  $texto" -ForegroundColor DarkGray }

# Las mismas reglas que el backend: sin mayusculas ni tildes. Las letras con
# tilde se arman con chr() para que este archivo quede en ASCII: Windows
# PowerShell 5.1 lee mal los acentos de un .ps1 guardado sin BOM.
$codigos = 225,224,228,226,227,233,232,235,234,237,236,239,238,243,242,246,244,245,250,249,252,251,241,231,
           193,192,196,194,195,201,200,203,202,205,204,207,206,211,210,214,212,213,218,217,220,219,209,199
$conTilde = ($codigos | ForEach-Object { "chr($_)" }) -join "||"
$sinTilde = "'aaaaaeeeeiiiiooooouuuuncaaaaaeeeeiiiiooooouuuunc'"
function SinTildes($columna) { "translate(lower($columna), $conTilde, $sinTilde)" }
$porNombre = "$(SinTildes 'p.nombre'), p.id"
$conStock = "(v.controla_stock = false OR v.stock - v.stock_reservado > 0)"
# Texto donde busca q: nombre, marca, categoria y descripcion.
$desde = "FROM productos p JOIN marcas m ON m.id = p.marca_id JOIN categorias c ON c.id = p.categoria_id"
function BuscaPalabra($palabra) {
    "($(SinTildes 'p.nombre') LIKE '%$palabra%' OR $(SinTildes 'm.nombre') LIKE '%$palabra%' OR " +
    "$(SinTildes 'c.nombre') LIKE '%$palabra%' OR $(SinTildes "COALESCE(p.descripcion, '')") LIKE '%$palabra%')"
}

$total = [int](Filas "SELECT count(*) FROM productos WHERE activo;")[0]

Write-Host "`n5. Catalogo sin parametros: primera pagina de todo el catalogo" -ForegroundColor Cyan
$r = Pedir $s GET "/api/productos"
Verificar $r 200 "GET /api/productos"
$p = PaginaDe $r
Condicion ($p.totalElementos -eq $total -and $total -gt 0) "totalElementos = productos activos de la base ($($p.totalElementos) de $total)"
Condicion ($p.pagina -eq 1 -and $p.tamanio -eq 12) "pagina 1, de a 12"
Condicion ($p.totalPaginas -eq [math]::Ceiling($total / 12)) "totalPaginas = $([math]::Ceiling($total / 12))"
Condicion (@($p.contenido).Count -eq [math]::Min(12, $total)) "la pagina trae $([math]::Min(12, $total)) productos"
$campos = "id", "nombre", "marca", "categoria", "precio", "imagenPrincipal"
Condicion (@($p.contenido | Where-Object { $o = $_; @($campos | Where-Object { $o.PSObject.Properties.Name -notcontains $_ }).Count -gt 0 }).Count -eq 0) "cada producto trae id, nombre, marca, categoria, precio e imagenPrincipal"

Write-Host "`n6. Recorrer todas las paginas: todos, una sola vez y en orden" -ForegroundColor Cyan
$esperado = Filas "SELECT p.id FROM productos p WHERE p.activo ORDER BY $porNombre;"
$vistos = @()
for ($n = 1; $n -le [math]::Ceiling($total / 5); $n++) { $vistos += IdsDe (PaginaDe (Pedir $s GET "/api/productos?tamanio=5&pagina=$n")) }
Condicion (($vistos -join ",") -eq ($esperado -join ",")) "de a 5 por pagina aparecen los $total activos, sin repetir, por nombre (sin mayusculas ni tildes)"
$inactivos = Filas "SELECT id FROM productos WHERE NOT activo;"
Condicion (@($vistos | Where-Object { $inactivos -contains $_ }).Count -eq 0) "ningun producto inactivo ($($inactivos.Count) en la base)"
$p = PaginaDe (Pedir $s GET "/api/productos?pagina=999")
Condicion ($p -and @($p.contenido).Count -eq 0 -and $p.totalElementos -eq $total) "una pagina que no existe viene vacia, con el total igual"

Write-Host "`n7. Orden por precio (empates por nombre e id)" -ForegroundColor Cyan
$p = PaginaDe (Pedir $s GET "/api/productos?orden=precio_asc&tamanio=48")
$esperado = Filas "SELECT p.id FROM productos p WHERE p.activo ORDER BY p.precio, $porNombre LIMIT 48;"
Condicion (((IdsDe $p) -join ",") -eq ($esperado -join ",")) "precio_asc"
$p = PaginaDe (Pedir $s GET "/api/productos?orden=precio_desc&tamanio=48")
$esperado = Filas "SELECT p.id FROM productos p WHERE p.activo ORDER BY p.precio DESC, $porNombre LIMIT 48;"
Condicion (((IdsDe $p) -join ",") -eq ($esperado -join ",")) "precio_desc"

Write-Host "`n8. Una categoria incluye sus subcategorias" -ForegroundColor Cyan
$padre = Filas "SELECT c.id FROM categorias c WHERE EXISTS (SELECT 1 FROM categorias h WHERE h.categoria_padre_id = c.id) ORDER BY c.nombre, c.id LIMIT 1;"
if ($padre.Count -eq 0) { Saltear "no hay categorias con subcategorias" } else {
    $p = PaginaDe (Pedir $s GET "/api/productos?categoriaId=$($padre[0])&tamanio=48")
    $esperado = Filas ("WITH RECURSIVE arbol AS (SELECT id FROM categorias WHERE id = '$($padre[0])' " +
        "UNION SELECT c.id FROM categorias c JOIN arbol a ON c.categoria_padre_id = a.id) " +
        "SELECT p.id FROM productos p WHERE p.activo AND p.categoria_id IN (SELECT id FROM arbol) ORDER BY $porNombre LIMIT 48;")
    Condicion ($esperado.Count -gt 0 -and ((IdsDe $p) -join ",") -eq ($esperado -join ",")) "los $($esperado.Count) productos de la categoria y sus hijas"
}

Write-Host "`n9. Busqueda por texto" -ForegroundColor Cyan
foreach ($caso in @(
        @{ q = "termica"; palabras = @("termica"); nota = "sin tildes" },
        @{ q = "T%C3%89RMICA"; palabras = @("termica"); nota = "con tilde y en mayusculas" },
        @{ q = "zapatillas%20mujer"; palabras = @("zapatillas", "mujer"); nota = "dos palabras: tienen que estar las dos" },
        @{ q = "north"; palabras = @("north"); nota = "tambien busca en la marca" })) {
    $p = PaginaDe (Pedir $s GET "/api/productos?q=$($caso.q)&tamanio=48")
    $condiciones = ($caso.palabras | ForEach-Object { BuscaPalabra $_ }) -join " AND "
    $esperado = Filas "SELECT p.id $desde WHERE p.activo AND $condiciones ORDER BY $porNombre LIMIT 48;"
    Condicion (((IdsDe $p) -join ",") -eq ($esperado -join ",")) "q=$($caso.q) ($($caso.nota)): $($esperado.Count) productos"
}
$p = PaginaDe (Pedir $s GET "/api/productos?q=%25")
$conPorcentaje = [int](Filas "SELECT count(*) $desde WHERE p.activo AND strpos(p.nombre || m.nombre || c.nombre || COALESCE(p.descripcion, ''), '%') > 0;")[0]
Condicion ($p.totalElementos -eq $conPorcentaje) "q=% busca el caracter %, no funciona como comodin ($conPorcentaje productos)"

Write-Host "`n10. Opciones de talle y color" -ForegroundColor Cyan
$r = Pedir $s GET "/api/productos/filtros"
Verificar $r 200 "GET /api/productos/filtros"
$opciones = ConvertFrom-Json $r.Texto
$desdeVariantes = "FROM variantes_producto v JOIN productos p ON p.id = v.producto_id WHERE p.activo AND $conStock"
$talles = [int](Filas "SELECT count(DISTINCT trim(v.talla)) $desdeVariantes AND trim(v.talla) <> '';")[0]
$colores = [int](Filas "SELECT count(DISTINCT trim(v.color)) $desdeVariantes AND trim(v.color) <> '';")[0]
Condicion (@($opciones.talles).Count -eq $talles) "talles con stock en productos activos ($(@($opciones.talles).Count) de $talles)"
Condicion (@($opciones.colores).Count -eq $colores) "colores con stock en productos activos ($(@($opciones.colores).Count) de $colores)"

Write-Host "`n11. Filtro por talle y color: con stock y en la misma variante" -ForegroundColor Cyan
# Solo talles y colores sin tildes, para no depender de como PowerShell 5.1
# arma la URL.
$talle = Filas "SELECT trim(v.talla) $desdeVariantes AND v.talla ~ '^[A-Za-z0-9]+$' GROUP BY 1 ORDER BY count(*) DESC, 1 LIMIT 1;"
if ($talle.Count -eq 0) { Saltear "no hay talles con stock" } else {
    $t = $talle[0]
    $p = PaginaDe (Pedir $s GET "/api/productos?talle=$t&tamanio=48")
    $esperado = Filas "SELECT p.id FROM productos p WHERE p.activo AND EXISTS (SELECT 1 FROM variantes_producto v WHERE v.producto_id = p.id AND lower(trim(v.talla)) = lower('$t') AND $conStock) ORDER BY $porNombre LIMIT 48;"
    Condicion ($esperado.Count -gt 0 -and ((IdsDe $p) -join ",") -eq ($esperado -join ",")) "talle=${t}: los $($esperado.Count) productos con ese talle disponible"
}
$agotado = Filas "SELECT trim(v.talla) FROM variantes_producto v JOIN productos p ON p.id = v.producto_id WHERE p.activo AND v.talla ~ '^[A-Za-z0-9]+$' GROUP BY 1 HAVING bool_and(NOT $conStock) ORDER BY 1 LIMIT 1;"
if ($agotado.Count -eq 0) { Saltear "no hay ningun talle que exista solo sin stock" } else {
    $t = $agotado[0]
    $p = PaginaDe (Pedir $s GET "/api/productos?talle=$t")
    Condicion ($p.totalElementos -eq 0) "talle=${t} (existe, pero agotado): ningun producto"
    Condicion (@($opciones.talles) -notcontains $t) "talle $t no aparece en las opciones"
}
$cruce = Filas ("SELECT trim(v1.talla) || '|' || trim(v2.color) || '|' || p.id FROM productos p " +
    "JOIN variantes_producto v1 ON v1.producto_id = p.id JOIN variantes_producto v2 ON v2.producto_id = p.id " +
    "WHERE p.activo AND v1.talla ~ '^[A-Za-z0-9]+$' AND v2.color ~ '^[A-Za-z]+$' " +
    "AND (v1.controla_stock = false OR v1.stock - v1.stock_reservado > 0) AND (v2.controla_stock = false OR v2.stock - v2.stock_reservado > 0) " +
    "AND NOT EXISTS (SELECT 1 FROM variantes_producto v WHERE v.producto_id = p.id AND lower(v.talla) = lower(v1.talla) AND lower(v.color) = lower(v2.color) AND $conStock) " +
    "ORDER BY 1 LIMIT 1;")
if ($cruce.Count -eq 0) { Saltear "no hay un producto con el talle en un color y otro color en otro talle" } else {
    $t, $c, $id = $cruce[0].Split("|")
    $p = PaginaDe (Pedir $s GET "/api/productos?talle=$t&color=$c&tamanio=48")
    Condicion ((IdsDe $p) -notcontains $id) "talle=$t y color=$c en variantes DISTINTAS del mismo producto: no aparece"
}

Write-Host "`n12. Filtros combinados" -ForegroundColor Cyan
$p = PaginaDe (Pedir $s GET "/api/productos?genero=UNISEX&precioMin=30000&precioMax=150000&tamanio=48")
$esperado = Filas "SELECT p.id FROM productos p WHERE p.activo AND p.genero = 'UNISEX' AND p.precio BETWEEN 30000 AND 150000 ORDER BY $porNombre LIMIT 48;"
Condicion (((IdsDe $p) -join ",") -eq ($esperado -join ",")) "genero + rango de precio: $($esperado.Count) productos"
$q = PaginaDe (Pedir $s GET "/api/productos?genero=UNISEX&precioMin=150000&precioMax=30000&tamanio=48")
Condicion (((IdsDe $q) -join ",") -eq ($esperado -join ",")) "un rango de precio al reves se da vuelta"

Write-Host "`n13. Parametros invalidos: 400, no 500" -ForegroundColor Cyan
foreach ($u in "categoriaId=abc", "genero=X", "precioMin=abc", "precioMin=-1", "orden=cualquiera", "pagina=0", "tamanio=49") {
    Verificar (Pedir $s GET "/api/productos?$u") 400 "?$u"
}
Verificar (Pedir $s GET "/api/productos/no-es-un-id") 400 "detalle con un id que no es UUID"

Write-Host "`n14. Detalle de producto" -ForegroundColor Cyan
$inactivo = Filas "SELECT id FROM productos WHERE NOT activo ORDER BY id LIMIT 1;"
if ($inactivo.Count -eq 0) { Saltear "no hay productos inactivos" } else {
    Verificar (Pedir $s GET "/api/productos/$($inactivo[0])") 404 "un producto inactivo no se muestra"
}
$conAdicional = Filas "SELECT p.id FROM productos p JOIN variantes_producto v ON v.producto_id = p.id WHERE p.activo ORDER BY v.precio_adicional DESC, p.id LIMIT 1;"
$r = Pedir $s GET "/api/productos/$($conAdicional[0])"
Verificar $r 200 "detalle de un producto activo"
$precios = Filas "SELECT v.id || '=' || (p.precio + v.precio_adicional) FROM variantes_producto v JOIN productos p ON p.id = v.producto_id WHERE p.id = '$($conAdicional[0])';"
$enApi = @((ConvertFrom-Json $r.Texto).variantes | ForEach-Object { "$($_.id)=" + ([decimal]$_.precio).ToString("0.00", [Globalization.CultureInfo]::InvariantCulture) })
Condicion ((($enApi | Sort-Object) -join ",") -eq (($precios | Sort-Object) -join ",")) "cada variante trae su precio: el del producto mas el adicional"

Write-Host "`n15. Navegar el catalogo no abre una sesion" -ForegroundColor Cyan
# Con una sesion nueva del navegador: la de arriba ya hizo los POST de la
# seccion 4, y un pedido rechazado por falta de sesion si crea una.
$limpia = NuevaSesion
foreach ($ruta in "/api/productos", "/api/productos?q=campera&talle=M", "/api/productos/filtros", "/api/productos/$($conAdicional[0])") {
    Pedir $limpia GET $ruta | Out-Null
}
$sesion = $limpia.Cookies.GetCookies($base) | Where-Object { $_.Name -eq "JSESSIONID" }
Condicion (-not $sesion) "no hay cookie JSESSIONID"

Resumen
