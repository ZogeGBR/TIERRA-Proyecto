# Verifica los endpoints de categorias y marcas (tarea 7).
#
# Requiere el backend levantado con el perfil dev y la base de desarrollo
# en Docker (contenedor tierra-postgres). Uso, desde tierra-backend:
#     .\probar-catalogo.ps1
#
# Compara lo que devuelve la API con lo que hay en la base, asi que sirve
# tambien con categorias y marcas cargadas a mano, no solo con el seed.

$base = if ($env:TIERRA_API) { $env:TIERRA_API } else { "http://localhost:8080" }
$fallas = 0

function Pedir($s, $metodo, $ruta) {
    $p = @{ Method = $metodo; Uri = "$base$ruta"; WebSession = $s; UseBasicParsing = $true }
    $token = ($s.Cookies.GetCookies($base) | Where-Object { $_.Name -eq "XSRF-TOKEN" }).Value
    if ($token) { $p.Headers = @{ "X-XSRF-TOKEN" = $token } }
    try {
        $r = Invoke-WebRequest @p
        return [pscustomobject]@{ Codigo = [int]$r.StatusCode; Texto = $r.Content }
    } catch {
        $resp = $_.Exception.Response
        if (-not $resp) { return [pscustomobject]@{ Codigo = 0; Texto = "fallo del cliente: $($_.Exception.Message)" } }
        return [pscustomobject]@{ Codigo = [int]$resp.StatusCode; Texto = $_.ErrorDetails.Message }
    }
}

function Verificar($r, $esperado, $descripcion) {
    $ok = ($r.Codigo -eq $esperado)
    $color = if ($ok) { "Green" } else { "Red" }
    $marca = if ($ok) { "OK " } else { "MAL" }
    Write-Host "  $marca $descripcion -> $($r.Codigo) (esperado $esperado)" -ForegroundColor $color
    if (-not $ok -and $r.Texto) { Write-Host "       $($r.Texto)" -ForegroundColor DarkGray }
    if (-not $ok) { $script:fallas++ }
}

function Condicion($ok, $descripcion) {
    $color = if ($ok) { "Green" } else { "Red" }
    $marca = if ($ok) { "OK " } else { "MAL" }
    Write-Host "  $marca $descripcion" -ForegroundColor $color
    if (-not $ok) { $script:fallas++ }
}

# Devuelve una fila por linea, sin lineas vacias.
function Sql($consulta) {
    @(docker exec tierra-postgres psql -U tierra_app -d tierra -t -A -c $consulta |
        ForEach-Object { "$_".Trim() } | Where-Object { $_ })
}

# Se comparan ids y no nombres: Windows PowerShell 5.1 puede leer mal los
# acentos de la respuesta, y el orden alfabetico de PowerShell no es el de
# la base. El orden que vale es el de PostgreSQL.
function Ids($lista) { @($lista | ForEach-Object { "$($_.id)" }) }

$s = New-Object Microsoft.PowerShell.Commands.WebRequestSession

Write-Host ""
Write-Host "1. Categorias, sin sesion"
$r = Pedir $s "GET" "/api/categorias"
Verificar $r 200 "GET /api/categorias"
$categorias = @()
# En dos pasos: Windows PowerShell 5.1 entrega el arreglo JSON como un
# solo objeto, y @(... | ConvertFrom-Json) lo anidaria dentro de otro.
if ($r.Codigo -eq 200) { $json = ConvertFrom-Json $r.Texto; $categorias = @($json) }

$enBase = Sql "SELECT id FROM categorias ORDER BY nombre, id;"
Condicion ($categorias.Count -eq $enBase.Count -and $categorias.Count -gt 0) "devuelve todas las categorias de la base ($($categorias.Count) de $($enBase.Count))"
Condicion (((Ids $categorias) -join ",") -eq ($enBase -join ",")) "en el mismo orden que la base (por nombre)"
Condicion (@($categorias | Where-Object { -not $_.id -or -not $_.nombre -or -not $_.slug }).Count -eq 0) "cada una trae id, nombre y slug"

$padresEnBase = Sql "SELECT id || '=' || COALESCE(categoria_padre_id::text, '') FROM categorias ORDER BY nombre, id;"
$padresEnApi = @($categorias | ForEach-Object { "$($_.id)=$($_.categoriaPadreId)" })
Condicion (($padresEnApi -join ",") -eq ($padresEnBase -join ",")) "cada subcategoria trae el id de su padre, y las principales null"
$subcategorias = @($categorias | Where-Object { $_.categoriaPadreId }).Count
Write-Host "       ($subcategorias subcategorias en la respuesta)" -ForegroundColor DarkGray

Write-Host ""
Write-Host "2. Marcas, sin sesion"
$r = Pedir $s "GET" "/api/marcas"
Verificar $r 200 "GET /api/marcas"
$marcas = @()
if ($r.Codigo -eq 200) { $json = ConvertFrom-Json $r.Texto; $marcas = @($json) }

$enBase = Sql "SELECT id FROM marcas ORDER BY nombre;"
Condicion ($marcas.Count -eq $enBase.Count -and $marcas.Count -gt 0) "devuelve todas las marcas de la base ($($marcas.Count) de $($enBase.Count))"
Condicion (((Ids $marcas) -join ",") -eq ($enBase -join ",")) "en el mismo orden que la base (por nombre)"
Condicion (@($marcas | Where-Object { -not $_.id -or -not $_.nombre }).Count -eq 0) "cada una trae id y nombre"
Condicion (@($marcas | Where-Object { $_.PSObject.Properties.Name -notcontains "logoUrl" }).Count -eq 0) "cada una trae el campo logoUrl (puede ser null)"

Write-Host ""
Write-Host "3. Navegar categorias y marcas no abre una sesion"
$sesion = $s.Cookies.GetCookies($base) | Where-Object { $_.Name -eq "JSESSIONID" }
Condicion (-not $sesion) "no hay cookie JSESSIONID"

Write-Host ""
Write-Host "4. Solo se puede leer la lista"
Write-Host "   (con el token CSRF, para que la respuesta la decida la regla de permisos)" -ForegroundColor DarkGray
Verificar (Pedir $s "POST" "/api/categorias") 401 "POST /api/categorias"
Verificar (Pedir $s "DELETE" "/api/marcas") 401 "DELETE /api/marcas"
Verificar (Pedir $s "GET" "/api/categorias/ropa") 401 "GET /api/categorias/ropa (ruta que no existe)"

Write-Host ""
if ($fallas -eq 0) { Write-Host "Todo OK." -ForegroundColor Green }
else { Write-Host "$fallas verificaciones dieron MAL." -ForegroundColor Red }
Write-Host ""
