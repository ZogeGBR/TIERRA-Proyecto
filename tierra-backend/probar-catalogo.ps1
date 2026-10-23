# Verifica los endpoints de categorias y marcas (tarea 7).
# Correr con el backend levantado en el perfil dev:  .\probar-catalogo.ps1
#
# Compara lo que devuelve la API con lo que hay en la base, asi que sirve
# tambien con categorias y marcas cargadas a mano, no solo con el seed.

. "$PSScriptRoot\probar-comun.ps1"
$fallas = 0

# Las filas de una consulta, sin espacios ni lineas vacias.
function Filas($consulta) {
    @(Sql $consulta | ForEach-Object { "$_".Trim() } | Where-Object { $_ })
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

Resumen
