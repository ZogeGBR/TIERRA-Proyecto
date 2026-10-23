# Simula la notificacion de pago (webhook) que manda Mercado Pago, firmada
# con HMAC-SHA256 igual que la firma Mercado Pago. Sirve para probar en
# local la confirmacion de un pago: Mercado Pago no puede llamar a un
# backend que corre en localhost, y sin esto el pedido recien se confirma
# cuando vence la reserva (20 minutos), via el job de vencimientos.
#
# Uso, desde tierra-backend, con el backend levantado:
#     .\probar-webhook.ps1 -PagoId 185750028472
#
# PagoId es el numero de operacion de un pago HECHO de verdad con
# credenciales de prueba (el que muestra Mercado Pago al terminar de pagar).
# El backend no le cree a la notificacion: consulta ese pago a la API de
# Mercado Pago. Con un numero inventado no se aprueba nada.
#
# La clave tiene que ser la misma con la que arranco el backend
# (MP_WEBHOOK_SECRET). Sin clave el backend rechaza todas las
# notificaciones, a proposito. Para probar en local alcanza con cualquier
# valor, cargado en la terminal del backend ANTES de arrancarlo y en la de
# este script:
#     $env:MP_WEBHOOK_SECRET = "clave-local-de-prueba"
# Si no esta en el entorno, se busca en el .env de la raiz del repo.

param(
    [Parameter(Mandatory = $true)][string]$PagoId,
    [string]$Clave = $env:MP_WEBHOOK_SECRET
)

. "$PSScriptRoot\probar-comun.ps1"
$fallas = 0

if (-not $Clave) {
    $env_raiz = Join-Path $PSScriptRoot "..\.env"
    if (Test-Path $env_raiz) {
        $linea = Get-Content $env_raiz | Where-Object { $_ -match '^MP_WEBHOOK_SECRET=' } | Select-Object -First 1
        if ($linea) { $Clave = ($linea -split '=', 2)[1].Trim() }
    }
}
if (-not $Clave) {
    Write-Host ""
    Write-Host "Falta MP_WEBHOOK_SECRET. Sin clave el backend rechaza todas las notificaciones." -ForegroundColor Red
    Write-Host "Cargala en esta terminal y en la del backend (y reinicialo):" -ForegroundColor Red
    Write-Host '    $env:MP_WEBHOOK_SECRET = "clave-local-de-prueba"'
    Write-Host ""
    exit 1
}

# x-signature: "ts=<segundos>,v1=<hmac en hex>". El manifest que se firma
# es el que documenta Mercado Pago y valida WebhookSignatureValidator.
function Firmar($dataId, $requestId, $ts) {
    $hmac = New-Object System.Security.Cryptography.HMACSHA256
    $hmac.Key = [Text.Encoding]::UTF8.GetBytes($Clave)
    $manifest = "id:$($dataId.ToLower());request-id:$requestId;ts:$ts;"
    $hash = -join ($hmac.ComputeHash([Text.Encoding]::UTF8.GetBytes($manifest)) | ForEach-Object { $_.ToString("x2") })
    return "ts=$ts,v1=$hash"
}

# Sin sesion ni token CSRF, como lo llama Mercado Pago: el webhook es
# publico y esta exento de CSRF en SecurityConfig.
function MandarWebhook($dataId, $firma, $requestId) {
    $p = @{ Method = "POST"; Uri = "$base/api/pagos/webhook?data.id=$dataId&type=payment"; UseBasicParsing = $true
            Headers = @{ "x-signature" = $firma; "x-request-id" = $requestId }
            ContentType = "application/json"; Body = "{}" }
    try {
        $r = Invoke-WebRequest @p
        return [pscustomobject]@{ Codigo = [int]$r.StatusCode; Texto = $r.Content }
    } catch {
        $resp = $_.Exception.Response
        if (-not $resp) { return [pscustomobject]@{ Codigo = 0; Texto = "fallo del cliente: $($_.Exception.Message)" } }
        return [pscustomobject]@{ Codigo = [int]$resp.StatusCode; Texto = $_.ErrorDetails.Message }
    }
}

$ts = [DateTimeOffset]::UtcNow.ToUnixTimeSeconds()

Write-Host "`n1. Notificacion con firma falsa" -ForegroundColor Cyan
$requestId = [guid]::NewGuid().ToString()
$falsa = "ts=$ts,v1=" + ("0" * 64)
Verificar (MandarWebhook $PagoId $falsa $requestId) 401 "se rechaza sin tocar nada"

Write-Host "`n2. Notificacion firmada" -ForegroundColor Cyan
$requestId = [guid]::NewGuid().ToString()
$r = MandarWebhook $PagoId (Firmar $PagoId $requestId $ts) $requestId
Verificar $r 200 "se acepta y se concilia con Mercado Pago"
if ($r.Codigo -eq 401) {
    Write-Host "       La clave no coincide con la del backend. Reinicialo con el mismo MP_WEBHOOK_SECRET." -ForegroundColor DarkGray
}

$vinculado = Sql "SELECT g.estado || ' / pedido ' || p.estado FROM pagos g JOIN pedidos p ON p.id = g.pedido_id WHERE g.mp_payment_id = '$PagoId';"
Condicion ([bool]$vinculado) "el pago quedo vinculado a su pedido"
if ($vinculado) { Write-Host "       pago $vinculado" -ForegroundColor DarkGray }

Write-Host "`n3. La misma notificacion otra vez (Mercado Pago reintenta)" -ForegroundColor Cyan
$requestId = [guid]::NewGuid().ToString()
Verificar (MandarWebhook $PagoId (Firmar $PagoId $requestId $ts) $requestId) 200 "se acepta de nuevo"
$filas = Sql "SELECT count(*) FROM pagos WHERE mp_payment_id = '$PagoId';"
Condicion ($filas -eq "1") "sigue habiendo un solo pago con ese numero (no se proceso dos veces)"

Resumen
