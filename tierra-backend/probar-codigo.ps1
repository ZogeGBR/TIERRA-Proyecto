# Verifica el acceso de clientes por codigo de seis digitos (ADR 0005).
# Correr con el backend levantado en el perfil dev:  .\probar-codigo.ps1
#
# Reinicia los codigos y el bloqueo de test@ al empezar y al terminar, asi
# que se puede correr cuantas veces haga falta.

. "$PSScriptRoot\probar-comun.ps1"
$fallas = 0
$cliente = "test@tierra.esquel"
$generico = "Si ese email tiene compras en Tierra, te enviamos un c"

ReiniciarCliente $cliente

Write-Host "`n1. Pedir un codigo: la respuesta es la MISMA para todos" -ForegroundColor Cyan
$s = NuevaSesion
$rCliente = PedirCodigo $s $cliente
Verificar $rCliente 200 "cliente test@"
$codigo = EsperarCodigo $cliente
Condicion ($codigo -match '^\d{6}$') "al cliente le llega un codigo de seis digitos"
BorrarCodigo "nadie@tierra.esquel"; BorrarCodigo "admin@tierra.esquel"
$rInexistente = PedirCodigo $s "nadie@tierra.esquel"
$rEquipo = PedirCodigo $s "admin@tierra.esquel"
Verificar $rInexistente 200 "email inexistente"
Verificar $rEquipo 200 "alguien del equipo"
Condicion ((MensajeDe $rCliente).StartsWith($generico)) "el mensaje es el generico"
Condicion (($rCliente.Texto -eq $rInexistente.Texto) -and ($rCliente.Texto -eq $rEquipo.Texto)) "el texto es identico en los tres casos"
Start-Sleep -Seconds 1
Condicion (-not (EsperarCodigo "nadie@tierra.esquel" 1)) "a un email inexistente no se le envia nada"
Condicion (-not (EsperarCodigo "admin@tierra.esquel" 1)) "al equipo no se le envia nada"

Write-Host "`n2. Verificar el codigo" -ForegroundColor Cyan
$incorrecto = if ($codigo -eq "000000") { "000001" } else { "000000" }
$rMal = VerificarCodigo $s $cliente $incorrecto
Verificar $rMal 401 "codigo incorrecto"
Verificar (VerificarCodigo $s "nadie@tierra.esquel" "123456") 401 "email inexistente"
Condicion ((MensajeDe $rMal) -like 'El c*digo es incorrecto o venci*') "error generico"
Verificar (VerificarCodigo $s $cliente $codigo) 200 "codigo correcto abre la sesion"
$yo = Pedir $s GET "/api/auth/yo"
Verificar $yo 200 "/api/auth/yo con la sesion abierta"
Condicion ($yo.Texto -like '*"rol":"CLIENTE"*') "la sesion es de CLIENTE"
Verificar (Pedir $s POST "/api/auth/logout") 204 "logout"
$s = NuevaSesion
Verificar (VerificarCodigo $s $cliente $codigo) 401 "el mismo codigo no sirve dos veces"

Write-Host "`n3. Pedir uno nuevo invalida el anterior" -ForegroundColor Cyan
PedirCodigo $s $cliente | Out-Null
$primero = EsperarCodigo $cliente
PedirCodigo $s $cliente | Out-Null
$segundo = EsperarCodigo $cliente
Condicion ($primero -and $segundo) "llegaron los dos codigos"
Verificar (VerificarCodigo $s $cliente $primero) 401 "el primero ya no sirve"
Verificar (VerificarCodigo (NuevaSesion) $cliente $segundo) 200 "el segundo si"

Write-Host "`n4. Limite: 3 codigos cada 15 minutos" -ForegroundColor Cyan
Write-Host "   (ya se pidieron 3: el del punto 1 y los dos del punto 3)" -ForegroundColor DarkGray
$r = PedirCodigo $s $cliente
Verificar $r 200 "la cuarta solicitud responde lo mismo"
Condicion ($r.Texto -eq $rCliente.Texto) "con el mismo texto"
Condicion (-not (EsperarCodigo $cliente 2)) "pero no se genera ningun codigo"

Write-Host "`n5. Cinco intentos fallidos agotan el codigo" -ForegroundColor Cyan
ReiniciarCliente $cliente
PedirCodigo $s $cliente | Out-Null
$codigo = EsperarCodigo $cliente
$incorrecto = if ($codigo -eq "000000") { "000001" } else { "000000" }
1..5 | ForEach-Object { VerificarCodigo $s $cliente $incorrecto | Out-Null }
Verificar (VerificarCodigo $s $cliente $codigo) 401 "despues de 5 fallidos, ni el correcto entra"

Write-Host "`n6. Tres codigos agotados seguidos bloquean una hora" -ForegroundColor Cyan
ReiniciarCliente $cliente
1..3 | ForEach-Object {
    PedirCodigo $s $cliente | Out-Null
    $c = EsperarCodigo $cliente
    $mal = if ($c -eq "000000") { "000001" } else { "000000" }
    1..5 | ForEach-Object { VerificarCodigo $s $cliente $mal | Out-Null }
}
$bloqueo = Sql "SELECT bloqueado_hasta IS NOT NULL FROM usuarios WHERE email = '$cliente';"
Condicion ("$bloqueo".Trim() -eq "t") "test@ queda bloqueado"
Sql "DELETE FROM codigos_acceso WHERE usuario_id = (SELECT id FROM usuarios WHERE email = '$cliente');" | Out-Null
$r = PedirCodigo $s $cliente
Verificar $r 200 "un cliente bloqueado recibe la misma respuesta"
Condicion (-not (EsperarCodigo $cliente 2)) "pero no se le envia ningun codigo"

Write-Host "`n7. Un solo canal por cuenta" -ForegroundColor Cyan
ReiniciarCliente $cliente
$antes = Sql "SELECT intentos_fallidos FROM usuarios WHERE email = '$cliente';"
$rClienteEquipo = Pedir $s POST "/api/auth/equipo/login" "{""email"":""$cliente"",""password"":""tierra2026""}"
$rNadieEquipo = Pedir $s POST "/api/auth/equipo/login" "{""email"":""nadie@tierra.esquel"",""password"":""tierra2026""}"
Verificar $rClienteEquipo 401 "un cliente no entra con contrasena"
Condicion ((MensajeDe $rClienteEquipo) -eq (MensajeDe $rNadieEquipo)) "mismo mensaje que un email inexistente"
$despues = Sql "SELECT intentos_fallidos FROM usuarios WHERE email = '$cliente';"
Condicion ("$antes".Trim() -eq "$despues".Trim()) "y no se le suman intentos fallidos"
Verificar (EntrarComoEquipo (NuevaSesion) "admin@tierra.esquel") 200 "el equipo entra con contrasena por /equipo/login"

Write-Host "`n8. Las rutas viejas ya no existen" -ForegroundColor Cyan
$s = NuevaSesion
Verificar (Pedir $s POST "/api/auth/login" "{""email"":""admin@tierra.esquel"",""password"":""tierra2026""}") 401 "POST /api/auth/login"
Verificar (Pedir $s POST "/api/auth/registro" "{""nombre"":""X"",""email"":""x@x.com"",""password"":""12345678""}") 401 "POST /api/auth/registro"

ReiniciarCliente $cliente
Resumen
