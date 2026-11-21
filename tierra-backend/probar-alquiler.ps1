# Verifica el estimador de alquiler: GET /api/alquiler/tipos (tarea 20).
# Correr con el backend levantado en el perfil dev:  .\probar-alquiler.ps1
#
# Regla (decision 0001): la pagina de alquiler muestra los tipos de equipo
# que tienen precio por dia, ordenados por nombre, sin disponibilidad. Las
# rutas de disponibilidad y reservas estan congeladas y no responden.
#
# Inserta un tipo de prueba para los casos puntuales y lo borra al terminar
# (aunque el script falle a la mitad).

. "$PSScriptRoot\probar-comun.ps1"
$fallas = 0
$sello = Get-Date -Format "yyyyMMddHHmmss"
function Escalar($consulta) { return "$(Sql $consulta)".Trim() }
# Un INSERT ... RETURNING id: psql imprime el id y despues "INSERT 0 1".
function Insertar($consulta) {
    return "$(Sql $consulta | Where-Object { "$_".Trim() -match '^[0-9a-f-]{36}$' } | Select-Object -First 1)".Trim()
}
# En dos pasos, como ListaDe en probar-catalogo.ps1 (Windows PowerShell 5.1).
function Lista($r) {
    try { $json = ConvertFrom-Json $r.Texto } catch { return ,@() }
    return ,@($json | Where-Object { $null -ne $_ })
}
# "id|precio" de cada tipo, en orden. El precio como decimal, para comparar
# 2500 (JSON) con 2500.00 (base) sin depender del formato.
function Pares($lista) { return (@($lista | ForEach-Object { "$($_.id)|$([decimal]$_.precioDia)" }) -join ",") }
function EsperadoSegunLaBase {
    $filas = @(Sql "SELECT id || '|' || precio_dia FROM tipos_equipo_alquiler WHERE precio_dia IS NOT NULL ORDER BY nombre;" | ForEach-Object { "$_".Trim() } | Where-Object { $_ })
    return (@($filas | ForEach-Object { $p = $_.Split("|"); "$($p[0])|$([decimal]$p[1])" }) -join ",")
}
function Tipos { return Lista (Pedir (NuevaSesion) GET "/api/alquiler/tipos") }

$nombre = "Prueba alquiler $sello"
Sql "DELETE FROM tipos_equipo_alquiler WHERE nombre LIKE 'Prueba alquiler %';" | Out-Null
$id = ""

try {
    Write-Host "`n1. Los tipos del seed" -ForegroundColor Cyan
    $s = NuevaSesion
    $r = Pedir $s GET "/api/alquiler/tipos"
    Verificar $r 200 "GET /api/alquiler/tipos sin sesion"
    $lista = Lista $r
    Condicion ((Pares $lista) -eq (EsperadoSegunLaBase)) "coincide con la base: los que tienen precio, por nombre ($(@($lista).Count) tipos)"
    $esquis = @($lista | Where-Object { $_.id -eq "f0000000-0000-0000-0000-000000000001" })[0]
    # "Esquis" con tilde, armado con el codigo del caracter: Windows
    # PowerShell 5.1 lee este archivo como ANSI y una tilde escrita aca
    # llegaria cambiada.
    $conTilde = "Esqu" + [char]0x00ED + "s"
    Condicion ($esquis -and $esquis.nombre -eq $conTilde -and [decimal]$esquis.precioDia -eq 12000) "Esquis (con tilde) a 12000 por dia, como en el seed"
    $campos = @($lista | ForEach-Object { (@($_.PSObject.Properties.Name) | Sort-Object) -join "," } | Sort-Object -Unique)
    Condicion ($campos.Count -eq 1 -and $campos[0] -eq "id,nombre,precioDia") "cada tipo trae solo id, nombre y precioDia (nada de disponibilidad ni unidades)"
    $sesion = $s.Cookies.GetCookies($base) | Where-Object { $_.Name -eq "JSESSIONID" }
    Condicion (-not $sesion) "no abre una sesion"

    Write-Host "`n2. Un tipo sin precio no se muestra" -ForegroundColor Cyan
    $id = Insertar "INSERT INTO tipos_equipo_alquiler (nombre) VALUES ('$nombre') RETURNING id;"
    $lista = Tipos
    Condicion (-not (@($lista | Where-Object { $_.id -eq $id }).Count)) "recien cargado, sin precio: no aparece"
    Condicion ((Pares $lista) -eq (EsperadoSegunLaBase)) "y el resto sigue igual"

    Write-Host "`n3. Con precio, aparece" -ForegroundColor Cyan
    Sql "UPDATE tipos_equipo_alquiler SET precio_dia = 3500.50 WHERE id = '$id';" | Out-Null
    $lista = Tipos
    $nuevo = @($lista | Where-Object { $_.id -eq $id })[0]
    Condicion ($nuevo -and $nuevo.nombre -eq $nombre -and [decimal]$nuevo.precioDia -eq [decimal]"3500.50") "aparece con su precio (3500,50 por dia)"
    Condicion ((Pares $lista) -eq (EsperadoSegunLaBase)) "en su lugar por nombre"

    Write-Host "`n4. La base no acepta un precio en cero o negativo" -ForegroundColor Cyan
    # El UPDATE va dentro de un bloque que atrapa el error, asi psql no lo
    # imprime: si la base lo rechaza, el bloque deja la marca en el nombre.
    foreach ($precio in @("0", "-100")) {
        Sql "DO `$`$ BEGIN UPDATE tipos_equipo_alquiler SET precio_dia = $precio WHERE id = '$id'; EXCEPTION WHEN check_violation THEN UPDATE tipos_equipo_alquiler SET nombre = '$nombre rechazado' WHERE id = '$id'; END `$`$;" | Out-Null
        $fila = Escalar "SELECT nombre || '|' || precio_dia FROM tipos_equipo_alquiler WHERE id = '$id';"
        Condicion ($fila -eq "$nombre rechazado|3500.50") "precio $precio rechazado: queda 3500.50"
        Sql "UPDATE tipos_equipo_alquiler SET nombre = '$nombre' WHERE id = '$id';" | Out-Null
    }

    Write-Host "`n5. Disponibilidad y reservas siguen congeladas (decision 0001)" -ForegroundColor Cyan
    $consulta = "/api/alquiler/disponibilidad?tipoId=f0000000-0000-0000-0000-000000000001&fechaInicio=2026-07-10&fechaFin=2026-07-15"
    $s = NuevaSesion
    Verificar (Pedir $s GET $consulta) 401 "GET /api/alquiler/disponibilidad sin sesion"
    Verificar (Pedir $s POST "/api/alquiler/reservas" "{}") 401 "POST /api/alquiler/reservas sin sesion"
    Verificar (EntrarComoEquipo $s "admin@tierra.esquel") 200 "login del administrador"
    Verificar (Pedir $s GET $consulta) 403 "GET /api/alquiler/disponibilidad: ni el administrador"
    Verificar (Pedir $s POST "/api/alquiler/reservas" "{}") 403 "POST /api/alquiler/reservas: ni el administrador"
    Verificar (Pedir $s GET "/api/alquiler/tipos") 200 "GET /api/alquiler/tipos tambien con sesion"
}
finally {
    if ($id) { Sql "DELETE FROM tipos_equipo_alquiler WHERE id = '$id';" | Out-Null }
}

Write-Host "`n6. Al terminar" -ForegroundColor Cyan
Condicion ((Escalar "SELECT count(*) FROM tipos_equipo_alquiler WHERE nombre LIKE 'Prueba alquiler %';") -eq "0") "el tipo de prueba se borro"
Condicion ((Pares (Tipos)) -eq (EsperadoSegunLaBase)) "la lista sigue coincidiendo con la base"

Resumen
