# Funciones compartidas por los scripts de verificacion (probar-*.ps1).
# No se ejecuta solo: los demas lo cargan con
#     . "$PSScriptRoot\probar-comun.ps1"
#
# Requiere el backend levantado con el perfil dev y la base de desarrollo
# en Docker (contenedor tierra-postgres, ver tierra-infra/docker-compose.yml).

$base = if ($env:TIERRA_API) { $env:TIERRA_API } else { "http://localhost:8080" }
$sondeo = "$base/api/productos?categoriaId=c0000000-0000-0000-0000-000000000001"

# Una sesion nueva del navegador, ya con la cookie del token CSRF.
function NuevaSesion {
    $s = New-Object Microsoft.PowerShell.Commands.WebRequestSession
    Invoke-WebRequest -Uri $sondeo -WebSession $s -UseBasicParsing | Out-Null
    return $s
}

function Token($s) {
    ($s.Cookies.GetCookies($base) | Where-Object { $_.Name -eq "XSRF-TOKEN" }).Value
}

# Hace la peticion y devuelve el codigo HTTP y el texto de la respuesta.
# Spring invalida el token CSRF al cerrar sesion: si falta, pide uno nuevo.
function Pedir($s, $metodo, $ruta, $cuerpo) {
    if (-not (Token $s)) { Invoke-WebRequest -Uri $sondeo -WebSession $s -UseBasicParsing | Out-Null }
    $p = @{ Method = $metodo; Uri = "$base$ruta"; WebSession = $s; UseBasicParsing = $true
            Headers = @{ "X-XSRF-TOKEN" = (Token $s) } }
    if ($cuerpo) { $p.ContentType = "application/json; charset=utf-8"; $p.Body = $cuerpo }
    try {
        $r = Invoke-WebRequest @p
        return [pscustomobject]@{ Codigo = [int]$r.StatusCode; Texto = $r.Content }
    } catch {
        $resp = $_.Exception.Response
        if (-not $resp) { return [pscustomobject]@{ Codigo = 0; Texto = "fallo del cliente: $($_.Exception.Message)" } }
        $texto = $_.ErrorDetails.Message
        if (-not $texto) {
            $sr = New-Object System.IO.StreamReader($resp.GetResponseStream())
            $texto = $sr.ReadToEnd(); $sr.Close()
        }
        return [pscustomobject]@{ Codigo = [int]$resp.StatusCode; Texto = $texto }
    }
}

# Compara el codigo obtenido con el esperado e imprime OK o MAL. Las fallas
# se cuentan en $fallas, que cada script inicializa en 0.
function Verificar($r, $esperado, $descripcion) {
    $ok = ($r.Codigo -eq $esperado)
    $color = if ($ok) { "Green" } else { "Red" }
    $marca = if ($ok) { "OK " } else { "MAL" }
    Write-Host "  $marca $descripcion -> $($r.Codigo) (esperado $esperado)" -ForegroundColor $color
    if (-not $ok -and $r.Texto) { Write-Host "       $($r.Texto)" -ForegroundColor DarkGray }
    if (-not $ok) { $script:fallas++ }
}

# El campo "mensaje" de una respuesta JSON. Se compara el mensaje y no el
# texto entero porque el texto trae la hora, y segun la version de
# PowerShell puede venir con otro formato.
function MensajeDe($r) {
    try { return ($r.Texto | ConvertFrom-Json).mensaje } catch { return $r.Texto }
}

function Condicion($ok, $descripcion) {
    $color = if ($ok) { "Green" } else { "Red" }
    $marca = if ($ok) { "OK " } else { "MAL" }
    Write-Host "  $marca $descripcion" -ForegroundColor $color
    if (-not $ok) { $script:fallas++ }
}

# ---------------------------------------------------------------
# Base de datos de desarrollo
# ---------------------------------------------------------------

function Sql($consulta) {
    docker exec tierra-postgres psql -U tierra_app -d tierra -t -A -c $consulta
}

# Deja a un cliente sin codigos ni bloqueos. Los limites del acceso por
# codigo (3 cada 15 minutos, 5 por dia) cuentan los codigos guardados: sin
# esto, correr los scripts dos veces seguidas choca con el limite.
function ReiniciarCliente($email) {
    Sql "DELETE FROM codigos_acceso WHERE usuario_id = (SELECT id FROM usuarios WHERE email = '$email'); UPDATE usuarios SET intentos_fallidos = 0, bloqueado_hasta = NULL WHERE email = '$email';" | Out-Null
}

# Cancela los pedidos PENDIENTES de las tres cuentas de prueba y libera el
# stock que tenian reservado. Cada corrida de los scripts reserva unidades
# por 20 minutos: sin esto, dos corridas seguidas se quedan sin stock y los
# pedidos dan 409. Solo toca pedidos de test@, mostrador@ y admin@.
function CancelarPedidosDePrueba {
    Sql "WITH p AS (SELECT id FROM pedidos WHERE estado = 'PENDIENTE' AND usuario_id IN (SELECT id FROM usuarios WHERE email IN ('test@tierra.esquel', 'mostrador@tierra.esquel', 'admin@tierra.esquel'))), r AS (UPDATE reservas_stock SET liberada = true WHERE liberada = false AND pedido_id IN (SELECT id FROM p) RETURNING variante_id, cantidad), v AS (UPDATE variantes_producto vp SET stock_reservado = GREATEST(0, vp.stock_reservado - t.total) FROM (SELECT variante_id, SUM(cantidad) AS total FROM r GROUP BY variante_id) t WHERE vp.id = t.variante_id AND vp.controla_stock RETURNING 1) UPDATE pedidos SET estado = 'CANCELADO' WHERE id IN (SELECT id FROM p);" | Out-Null
}

function DesbloquearTodos {
    Sql "UPDATE usuarios SET intentos_fallidos = 0, bloqueado_hasta = NULL;" | Out-Null
}

# ---------------------------------------------------------------
# Codigos de acceso en desarrollo
# ---------------------------------------------------------------

# En el perfil dev el backend escribe cada codigo en target/codigos-dev.
# La carpeta depende de desde donde se lance: consola en tierra-backend
# (run-dev.ps1) o VS Code en la raiz del repo. Se buscan las dos.
function CarpetasCodigos {
    if ($env:CODIGO_DIRECTORIO_DEV) { return @($env:CODIGO_DIRECTORIO_DEV) }
    return @((Join-Path $PSScriptRoot "target\codigos-dev"), (Join-Path $PSScriptRoot "..\target\codigos-dev"))
}

function BorrarCodigo($email) {
    foreach ($c in CarpetasCodigos) { Remove-Item (Join-Path $c "$email.txt") -ErrorAction SilentlyContinue }
}

# El envio es asincronico: el archivo aparece un instante despues de la
# respuesta. Devuelve $null si no llega en el tiempo dado.
function EsperarCodigo($email, $segundos = 5) {
    $limite = (Get-Date).AddSeconds($segundos)
    while ((Get-Date) -lt $limite) {
        foreach ($c in CarpetasCodigos) {
            $archivo = Join-Path $c "$email.txt"
            if (Test-Path $archivo) { return (Get-Content $archivo -Raw).Trim() }
        }
        Start-Sleep -Milliseconds 200
    }
    return $null
}

function PedirCodigo($s, $email) {
    BorrarCodigo $email
    return Pedir $s POST "/api/auth/codigo" "{""email"":""$email""}"
}

function VerificarCodigo($s, $email, $codigo) {
    return Pedir $s POST "/api/auth/codigo/verificar" "{""email"":""$email"",""codigo"":""$codigo""}"
}

# Entra como cliente: pide el codigo, lo lee del archivo y lo verifica.
function EntrarComoCliente($s, $email) {
    $r = PedirCodigo $s $email
    if ($r.Codigo -ne 200) { return $r }
    $codigo = EsperarCodigo $email
    if (-not $codigo) {
        return [pscustomobject]@{ Codigo = 0; Texto = "No aparecio el codigo en target\codigos-dev. Esta el backend con el perfil dev?" }
    }
    return VerificarCodigo $s $email $codigo
}

function EntrarComoEquipo($s, $email) {
    return Pedir $s POST "/api/auth/equipo/login" "{""email"":""$email"",""password"":""tierra2026""}"
}

function Resumen {
    Write-Host ""
    if ($script:fallas -eq 0) { Write-Host "Todo OK." -ForegroundColor Green }
    else { Write-Host "$($script:fallas) verificaciones dieron MAL." -ForegroundColor Red }
    Write-Host ""
}
