# 0005 — Compra sin cuenta previa y acceso de clientes por código

- **Estado:** propuesta. Se aprueba antes del día 19 de la Fase 2; ninguna de las tareas 2, 3, 4, 9, 12 y 19 empieza sin este documento aprobado.
- **Reemplaza a:** 0002 (checkout con autenticación obligatoria).
- **Modifica:** 0003 (la contraseña queda solo para el equipo y el registro desaparece). El resto de la 0003 sigue vigente.
- **Fecha:** Fase 2, antes del día 19
- **Ubicación en el repo:** `docs/decisiones/0005-acceso-por-codigo-y-compra-sin-cuenta.md`

---

## Contexto

La decisión 0002 eliminó la compra como invitado, sujeta a la confirmación del cliente, porque el presupuesto la comprometía en su punto 2.9. En la segunda entrevista Tierra confirmó lo contrario: **quiere que se pueda comprar sin registrarse**.

La primera respuesta fue un checkout exprés con cuenta implícita: el sistema creaba una cuenta sin avisar y le abría sesión al comprador. Se descartó por dos motivos. Uno técnico: el cliente que volvía con el mismo email no podía volver a comprar, porque abrirle sesión a quien escribe un email existente es entregarle la cuenta de otro. Y uno del equipo: una cuenta creada a espaldas del comprador genera más desconfianza que pedirle que cree una.

Se compararon tres modelos (ver "Alternativas descartadas") y el equipo eligió el de Shopify y Tiendanube: **se compra sin cuenta y sin contraseña, y para ver los pedidos el cliente pide un código de seis dígitos por email**.

## La decisión, en tres líneas

1. **Comprar** no exige cuenta ni sesión: nombre, email y teléfono. Nunca se bloquea una compra.
2. **Ver los pedidos** exige un código de seis dígitos que llega al email de la compra. Los clientes no tienen contraseña.
3. **El equipo de Tierra** —Daniel, Flor y F97— entra con contraseña, por una página aparte.

Cada cuenta tiene **un solo canal de acceso**, y la base de datos lo garantiza.

---

## Comprar — `POST /api/checkout`

### Tabla de casos

| Sesión | Email escrito en el checkout | Qué pasa |
|---|---|---|
| Ninguna | No existe | Se crea el cliente **sin contraseña**, se crea el pedido y se devuelve el link de pago |
| Ninguna | Ya existe como cliente | El pedido se asocia a ese cliente. **No se modifica ningún dato de su cuenta.** Se devuelve el link de pago |
| Ninguna | Pertenece al equipo | 409: *"No podemos usar ese email para comprar. Usá otro."* |
| De cliente | Se ignora | El pedido va a nombre del cliente de la sesión |
| Del equipo | Cualquiera | Se trata como si no hubiera sesión. La sesión del equipo no se altera |

Si aparece una combinación que no está en esta tabla, es un error de diseño: se resuelve modificando este documento antes de programar, no durante.

### El checkout nunca abre sesión

Escribir el email de otra persona no da acceso a nada. Lo peor que se puede hacer es un pedido a nombre de otro, que paga quien lo hace.

**Por qué.** Es lo que hacía inviable la cuenta implícita: si comprar abriera sesión, cualquiera que conociera un email podría entrar a la cuenta de su dueño escribiéndolo en el checkout.

### La respuesta es idéntica para un email nuevo y uno existente

Siempre `{ pedidoId, total, initPoint, expiraEn }`, con el mismo código HTTP. `expiraEn` es el vencimiento de la preferencia de Mercado Pago, que el frontend usa para ofrecer "volver a pagar".

**Por qué.** Si la respuesta difiriera, el checkout serviría para averiguar quién compró alguna vez en Tierra.

La diferencia de tiempo que queda —crear el cliente es una escritura más en la base— es de milisegundos, y la llamada a Mercado Pago que viene después varía cientos. No se puede medir desde afuera.

### Los datos de contacto y de entrega se guardan en el pedido

Nombre, teléfono y DNI del destinatario, y la dirección, quedan como copia en el pedido (`pedidos.contacto_nombre`, `contacto_telefono`, `contacto_dni` y la dirección en línea). La cuenta no se toca.

**Por qué.** Si el checkout actualizara la cuenta, escribir el email de otra persona modificaría sus datos. Además, el destinatario puede ser alguien distinto del comprador, que es lo normal en un regalo.

**Consecuencia:** `PedidoService.crearPedido` recibe la dirección en línea (`DireccionEntrega`) y los datos de contacto, en vez del id de una dirección guardada, y deja de depender de `DireccionRepository`. **La validación de "dirección ajena" desaparece porque desaparece el id que la hacía necesaria.**

**Un cliente nuevo** se crea solo con nombre, email y rol `CLIENTE`. `usuarios.telefono` y `usuarios.dni` quedan vacíos: esos datos viven en cada pedido.

La única excepción es el cliente **con sesión** que pide guardar sus datos para la próxima compra (ver "Datos guardados para la próxima compra"). Sin sesión, el checkout nunca escribe en la cuenta.

### Datos obligatorios

| Dato | Retiro en el local | Envío a domicilio |
|---|---|---|
| Nombre, email y teléfono | Sí | Sí |
| DNI | No | Sí |
| Dirección completa | No | Sí |
| Provincia dentro de la zona de cobertura | — | Sí; fuera de zona se ofrece el retiro |

El costo del envío lo **vuelve a calcular** el checkout al crear el pedido. El endpoint de cotización (`POST /api/envios/cotizacion`) le informa el costo a la pantalla, pero el que cobra es el checkout: nunca se usa un monto que mande el navegador.

### El email se normaliza antes de buscarlo

Minúsculas y sin espacios, con `AuthService.normalizarEmail`, igual en el checkout y en el pedido de código.

**Por qué.** El `UNIQUE` de PostgreSQL distingue mayúsculas. Sin normalizar, una compra con `Juan@...` y otra con `juan@...` crearían dos clientes, y el historial quedaría partido en dos.

### Dos compras simultáneas con un email nuevo

Las dos intentan crear el mismo cliente, y la segunda choca con el `UNIQUE`. **No puede terminar en un error 500.** La creación se hace con `INSERT ... ON CONFLICT (email) DO NOTHING` y después se lee el cliente, que en los dos casos es el mismo.

### El email de alguien del equipo no sirve para comprar

Es la única fila de la tabla que responde distinto, y revela que ese email es del equipo. Se acepta (ver "Riesgos aceptados").

**Por qué no hay alternativa razonable.** Todo pedido necesita un dueño. Asociar el pedido a la cuenta del equipo mezclaría los dos canales, y crear una segunda cuenta con el mismo email no es posible.

### Una sola puerta para crear pedidos

`POST /api/checkout` es el único endpoint que crea pedidos. **Se elimina `POST /api/pedidos`.** `PedidoController` queda para el historial.

**Por qué.** Dos endpoints que hacen lo mismo con reglas distintas son el doble de superficie de ataque, sin ningún beneficio.

### El link de pago se genera después de confirmar el pedido

La preferencia de Mercado Pago se pide **después** de que la transacción del pedido confirma, y en otra transacción. Es una llamada de red y no debe ocurrir con la fila del pedido bloqueada.

**Si Mercado Pago falla, el pedido se cancela y el stock se libera en el momento**, y se responde 503: *"No pudimos generar el link de pago. No se hizo ningún cobro; probá de nuevo."*

**Por qué.** Sin esto, el stock queda retenido veinte minutos por un pedido que nadie puede pagar, y si era la última unidad, el mismo comprador ve "sin stock" al reintentar. Cancelar es seguro: si Mercado Pago no devolvió el link, nadie lo tiene y nadie puede pagar ese pedido.

### Cuentas de cliente dadas de baja

Una cuenta de cliente con `activo = false` no puede pedir códigos. **Las compras con su email se siguen asociando a ella**, porque comprar no exige cuenta.

**Por qué no se rechazan.** La razón típica para dar de baja a un cliente es el fraude, por ejemplo alguien que desconoce pagos. Rechazar las compras con su email no lo frena, porque compra con otro email en dos segundos, y en cambio revela que ese email está dado de baja.

**Qué entra en cada fase:**

- **Fase 2:** no existe forma de dar de baja a un cliente desde el sistema. Lo único que se programa es que el pedido de código trate una cuenta inactiva como cualquier otro caso: respuesta genérica y nada enviado.
- **Fase 3:** el panel permite dar de baja clientes, y ahí se define qué significa la baja según el motivo. Un pedido de supresión de datos de la Ley 25.326 no se resuelve borrando la cuenta, porque los pedidos se conservan por obligaciones fiscales: se **anonimiza**, reemplazando nombre, teléfono y DNI de la cuenta y de sus pedidos y conservando el resto.

---

## Datos guardados para la próxima compra

Un cliente **con sesión** puede pedir que el checkout recuerde sus datos, y la próxima vez que compre con sesión los encuentra completos.

### Cómo funciona

- En el checkout, **solo con sesión de cliente**, aparece la casilla *"Guardar mis datos para la próxima compra"*, destildada por defecto.
- Si está tildada, el checkout guarda en la cuenta nombre, teléfono, DNI y dirección (`usuarios.nombre`, `usuarios.telefono`, `usuarios.dni` y una sola dirección en `direcciones`, marcada como predeterminada). Se guardan en la misma transacción que el pedido.
- La próxima compra con sesión precarga esos datos, y el cliente puede cambiarlos antes de comprar.
- *"Borrar mis datos guardados"*, en el mismo checkout, los elimina de la cuenta. No toca los pedidos.
- Sin sesión, la casilla no aparece, y si el pedido la trae igual, el backend la ignora.

**Por qué solo con sesión.** Quien tiene sesión demostró con el código que el email es suyo. Sin sesión, cualquiera puede escribir cualquier email, y guardar datos en esa cuenta sería modificar la cuenta de otra persona: el problema que la regla de "los datos van en el pedido" evita.

**Por qué destildada.** Guardar el DNI y la dirección tiene que ser una elección del cliente, no algo que pase sin que lo note.

**Una sola dirección, no una libreta.** Alcanza para el caso real, que es comprar de nuevo con el mismo destino. Una libreta de varias direcciones queda fuera del alcance.

**Endpoints:** `GET /api/cuenta/datos-entrega` y `DELETE /api/cuenta/datos-entrega`, rol `CLIENTE`. No hay endpoint para escribir: el único camino es el checkout con la casilla tildada, para que exista una sola puerta de escritura.

Los datos guardados se muestran **completos**, sin ocultar nada, porque los escribió el mismo cliente con su sesión. Es distinto de los datos de un pedido, que pudo hacer otra persona (ver la sección siguiente).

### Completar el formulario desde el navegador

Independientemente de la casilla, los campos del checkout llevan el atributo `autocomplete` correcto (`name`, `email`, `tel`, `street-address`, `address-level1`, `address-level2`, `postal-code`). El celular o la computadora ofrecen completarlos con lo que ya tienen guardado. Funciona con y sin sesión, y no guarda nada en el servidor.

---

## Qué ve el dueño de un email

Los pedidos se asocian por email, y un email mal escrito asocia un pedido a otra persona. Por eso, **todo lo que se le muestra o se le envía al dueño de un email sobre un pedido oculta el DNI y el teléfono del destinatario**:

| Dato del pedido | Cómo se muestra |
|---|---|
| DNI | Solo los últimos 3 dígitos: `***.***.123` |
| Teléfono | Solo los últimos 4 dígitos: `••• 4567` |
| Nombre del destinatario | Completo |
| Dirección de entrega | Completa: el dueño legítimo necesita saber a dónde mandó el pedido |
| Productos, montos y estado | Completos |

**Dónde se aplica:**

- **Fase 2:** en el historial de pedidos (`GET /api/pedidos/mios`). El ocultamiento se hace en el backend, al armar la respuesta: el dato completo nunca llega al navegador.
- **Fase 3:** en los emails de confirmación y de despacho. Tienen el mismo problema: si el email está mal escrito, le llegan a otra persona.
- **El panel del equipo** muestra todo completo: lo necesita para despachar.

## Pedir y usar un código — `POST /api/auth/codigo` y `POST /api/auth/codigo/verificar`

### Tabla de casos

| Email | Al pedir el código | Al verificarlo |
|---|---|---|
| No existe | Respuesta genérica. **No se envía nada** | Error genérico |
| Cliente | Respuesta genérica. **Se envía el código** | Correcto: se abre sesión. Si no, error genérico y suma un intento |
| Cliente que alcanzó el límite de solicitudes | Respuesta genérica. No se envía nada | Su código vigente, si tiene uno, sigue sirviendo |
| Cliente bloqueado | Respuesta genérica. No se envía nada | Error genérico. No suma intentos |
| Cliente con `activo = false` | Respuesta genérica. No se envía nada | Error genérico |
| Del equipo | Respuesta genérica. **No se envía nada** | Error genérico |

### Los dos mensajes, siempre iguales

Al pedir el código, en **todos** los casos de la tabla:

> *"Si ese email tiene compras en Tierra, te enviamos un código. Puede tardar unos minutos: revisá también la carpeta de spam."*

Al verificar, en todos los casos de error:

> *"El código es incorrecto o venció. Pedí uno nuevo."*

**Por qué.** Cualquier diferencia permite averiguar qué emails son clientes. Eso incluye el límite y el bloqueo: decir "pediste demasiados códigos" o "tu cuenta está bloqueada" confirma que el email existe. Es preferible que un cliente legítimo espere sin saber por qué a que cualquiera pueda consultar la lista de clientes.

Un email con formato inválido sí puede responder 400: no revela nada sobre quién está registrado.

### Un código nunca abre una sesión del equipo

Los códigos solo se generan para cuentas `CLIENTE`, y **al verificar se vuelve a comprobar el rol**, por si cambió mientras el código estaba vigente.

**Por qué.** Si un código pudiera abrir una sesión del equipo, tomar el control del email de Daniel o de Flor daría acceso al panel. Con contraseña, además hace falta la contraseña.

### Cómo se genera el código

Con `SecureRandom`, uniforme entre `000000` y `999999`. Los ceros a la izquierda cuentan: el código es un texto de seis dígitos, no un número.

### Cómo se guarda: HMAC con clave del servidor

Se guarda `HMAC-SHA256(clave, usuarioId + ":" + codigo)`, nunca el código.

**Por qué no en texto plano:** quien lea la base, aunque sea una copia de respaldo, podría entrar a cualquier cuenta con código vigente.

**Por qué no un hash sin clave, ni BCrypt:** hay solo un millón de códigos posibles. Contra un hash sin clave se prueban todos en segundos, y BCrypt solo lo alarga un poco. Con HMAC, una copia de la base **sin la clave** no revela nada. La clave vive en una variable de entorno, no en la base.

**Por qué el id del usuario dentro del HMAC:** el mismo código para dos clientes produce valores distintos, y una fila copiada de una cuenta a otra no sirve.

La comparación es de **tiempo constante**, con `MessageDigest.isEqual`, igual que la firma del webhook de Mercado Pago.

**La clave:** `CODIGO_ACCESO_CLAVE`, de al menos 32 bytes, distinta de cualquier otro secreto. **Sin ella, el backend no arranca.** El perfil `dev` trae una clave fija de desarrollo. Cambiar la clave solo invalida los códigos vigentes en ese momento, que duran diez minutos, así que rotarla no tiene costo.

### Cuándo un código es válido

Hay **un solo código vigente por cliente**: pedir uno nuevo invalida el anterior.

Un código es válido si no venció (10 minutos), no se usó, no fue invalidado y tiene menos de 5 intentos fallidos. Al verificarse bien, se marca usado y no sirve una segunda vez.

### Intentos, códigos agotados y bloqueo

- Cada verificación fallida suma un intento al código vigente. **Al quinto, el código queda agotado**, y ni siquiera el código correcto entra después.
- Cada código agotado suma uno en `usuarios.intentos_fallidos`. **Con tres códigos agotados seguidos, el cliente queda bloqueado una hora** (`usuarios.bloqueado_hasta`).
- Una verificación correcta vuelve el contador a cero.
- **Cuando el bloqueo vence, el contador arranca de cero.** Es la lección del bug de la Fase 1: sin esto, un solo error después del bloqueo vuelve a bloquear al instante.

**La seguridad no depende del bloqueo, sino del límite diario.** Como máximo se pueden probar 25 códigos por día contra una cuenta: 5 códigos por día y 5 intentos cada uno. Sostenido durante **un año entero**, eso da menos de un 1% de probabilidad de acertar, y la víctima recibiría casi dos mil emails que no pidió. El bloqueo existe para cortar rachas, no para sostener ese número. Un atacante puede esquivarlo pidiendo un código nuevo antes de agotar el anterior, y no gana nada: sigue limitado a 25 intentos por día.

### Límite de solicitudes

3 códigos cada 15 minutos y 5 cada 24 horas, por email. Se cuentan los códigos generados, en `codigos_acceso`. Pasado el límite, se responde el mensaje genérico y no se genera nada.

### Los campos de bloqueo los toca un solo canal

`usuarios.intentos_fallidos` y `usuarios.bloqueado_hasta` cuentan **códigos agotados** en las cuentas de cliente e **intentos de contraseña** en las del equipo. Nunca las dos cosas en la misma cuenta.

**Por qué.** Si el login del equipo contara intentos sobre cuentas de cliente, cualquiera podría bloquear el acceso de un cliente probando contraseñas contra su email.

### El envío: después de confirmar y fuera del hilo de la petición

`CodigoAccesoService` no envía nada: publica un evento que escucha un `@TransactionalEventListener(phase = AFTER_COMMIT)` con `@Async`, y ese listener llama a la interfaz `EnviadorCodigoAcceso`.

**Por qué después de confirmar:** si la transacción falla, no se envía un código que no existe.

**Por qué fuera del hilo:** si el envío fuera síncrono, la respuesta tardaría cientos de milisegundos más cuando el email es de un cliente. **El tiempo delataría lo que el mensaje oculta.**

**Dos implementaciones:**

- **Desarrollo** (perfil `dev`): escribe el código en el log y en `target/codigos-dev/<email>.txt`, que es de donde lo leen los scripts de verificación.
- **Real:** llega con el módulo de emails. Hasta entonces, **sin perfil `dev` y sin enviador real el backend no arranca**, con un mensaje que lo dice. Es el mismo criterio que con Mercado Pago: un error claro en el deploy es mejor que un sistema que parece funcionar y no manda nada.

**El email del código** dice el código, que vence en diez minutos, y que si la persona no lo pidió puede ignorarlo. **No lleva ningún enlace que abra sesión**: el código se tipea, y por eso funciona aunque el email se lea en otro dispositivo.

### Concurrencia

Pedir y verificar bloquean la fila del usuario (`PESSIMISTIC_WRITE`) mientras deciden.

**Por qué.** Sin el bloqueo, dos verificaciones simultáneas del mismo código podrían aceptarse las dos, y dos pedidos simultáneos podrían pasar el límite de solicitudes.

### Limpieza

Una tarea programada diaria borra los códigos de más de 48 horas. El límite de solicitudes mira solo las últimas 24 horas, así que no hace falta guardarlos más.

---

## Entrar como equipo — `POST /api/auth/equipo/login`

### Tabla de casos

| Cuenta | Qué pasa |
|---|---|
| Del equipo | Igual que hoy: contraseña con BCrypt y bloqueo por intentos fallidos |
| Cliente | Error genérico de credenciales. **No suma intento fallido** |
| No existe | Error genérico de credenciales |

Reemplaza a `POST /api/auth/login`, sin otro cambio de comportamiento para el equipo.

### Cómo se rechaza a un cliente

`UsuarioDetailsService` lanza `UsernameNotFoundException` cuando la cuenta es `CLIENTE`, exactamente como si el email no existiera.

**Por qué ahí y no en el controller.** Spring convierte esa excepción en "credenciales inválidas" y además ejecuta una comparación BCrypt de relleno, así que **un cliente tarda lo mismo que un email inexistente**. Rechazarlo en otro lugar dejaría una diferencia de tiempo que alcanza para distinguirlos.

`AuthService.registrarIntentoFallido` ignora las cuentas de cliente, por la regla de un solo canal.

### La página `/equipo`

El login con contraseña sale de `/login` y pasa a `/equipo`. No se enlaza desde ninguna parte del sitio público y lleva `<meta name="robots" content="noindex">`.

**No es una medida de seguridad**: la protección es la contraseña y el bloqueo. Solo evita que un cliente llegue ahí por error y no entienda por qué le piden una contraseña.

### Contraseñas olvidadas del equipo

**F97 las repone a mano**, con una herramienta que se construye en la Fase 3 y que también sirve para crear las cuentas del equipo en producción.

**Por qué no por email.** Si la recuperación fuera por email, tomar el control del correo de alguien del equipo daría acceso al panel. Con tres personas, reponer a mano es una molestia chica.

---

## Una cuenta, un canal

La migración `V8` agrega una restricción a la tabla `usuarios`:

```sql
ALTER TABLE usuarios ADD CONSTRAINT chk_usuarios_metodo_acceso CHECK (
  (rol = 'CLIENTE'  AND password_hash IS NULL) OR
  (rol <> 'CLIENTE' AND password_hash IS NOT NULL)
);
```

**Por qué en la base y no solo en el código.** Las tablas de arriba dependen de que un cliente nunca tenga contraseña y alguien del equipo siempre la tenga. Una regla en el código se puede saltear con un script, un seed o un cambio apurado; un `CHECK` no.

**Los clientes no tienen opción de contraseña.** Dos métodos de acceso por cuenta duplican la superficie de ataque, y la contraseña es el más débil de los dos.

**Cambiar a alguien de canal** —un cliente que pasa a trabajar en Tierra, por ejemplo— lo hace la herramienta de la Fase 3, en una sola transacción: cambia el rol, pone o quita la contraseña, invalida los códigos vigentes y reinicia los contadores. No hay otra forma de hacerlo sin violar la restricción, y eso es intencional.

---

## Sesiones

La sesión se abre igual para los dos canales: con `SesionAutenticacionService`, que **cambia el identificador de sesión al autenticar** para evitar la fijación de sesión. El resto de la decisión 0003 no cambia: cookie `httpOnly`, `SameSite` configurable, token CSRF en todos los `POST` salvo el webhook.

### Duración según el canal

| Canal | Inactividad máxima | Variable |
|---|---|---|
| Clientes | 7 días | `SESSION_TIMEOUT` (ya existe) |
| Equipo | 12 horas | `SESSION_TIMEOUT_EQUIPO` (nueva) |

La inactividad se cuenta desde la última petición: cada vez que la persona usa el sitio, el reloj vuelve a cero. Con 12 horas, quien usa el panel durante la jornada no pierde la sesión mientras trabaja; la pierde a la noche y vuelve a entrar al día siguiente.

**Por qué distinto.** Desde la sesión de un cliente se ve el historial de una persona. Desde la del equipo, en la Fase 3, se ven los pedidos, las direcciones, los teléfonos y los DNI de todos los clientes, y se cambian stock y precios. Además, **hoy no hay forma de cerrar una sesión a distancia**: si se pierde un celular o queda abierta la computadora del local, la sesión solo se corta cuando vence. Con 12 horas, la exposición se termina sola en el día; con 7 días, dura una semana.

**Cómo se implementa.** `SesionAutenticacionService` fija la duración al abrir la sesión, según el rol (`HttpSession.setMaxInactiveInterval`). Va en la tarea 3, que ya toca esa clase. El valor es configurable para que Tierra lo pueda cambiar sin tocar código.

**Aviso para quien construya el panel (Fase 3):**

- Si el panel consulta el servidor automáticamente cada tanto, por ejemplo para avisar de pedidos nuevos, **la sesión nunca queda inactiva** y el límite deja de funcionar. Esas consultas no pueden mantener viva la sesión, o hay que sumar un límite de duración total.
- Cuando la sesión vence, el panel tiene que detectar el 401, llevar a `/equipo` y volver a la pantalla donde estaba, sin perder lo que se estaba cargando si se puede evitar.

### Dos cosas que conviene saber de estas duraciones

- **La cookie es de sesión del navegador**: no tiene vencimiento propio. En una computadora, cerrar el navegador cierra la sesión, aunque el servidor la siga guardando. Se deja así a propósito. Ponerle un vencimiento a la cookie la haría vencer a un plazo fijo **desde el login**, aunque la persona la esté usando. Para ver el historial alcanza con pedir otro código. Del lado opuesto: en el celular el navegador casi nunca se cierra, así que ahí las duraciones se cumplen enteras.
- **Las sesiones viven en memoria hasta la Fase 6**, como dice la 0003. Cada reinicio del backend cierra todas.

---

## Endpoints y reglas de `SecurityConfig`

| Endpoint | Regla | Cambio |
|---|---|---|
| `POST /api/checkout` | Público | Nuevo (tarea 9) |
| `POST /api/envios/cotizacion` | Público | Nuevo (tarea 10) |
| `POST /api/auth/codigo` | Público | Nuevo (tarea 3) |
| `POST /api/auth/codigo/verificar` | Público | Nuevo (tarea 3) |
| `POST /api/auth/equipo/login` | Público | Reemplaza a `/api/auth/login` (tarea 3) |
| `POST /api/auth/registro` | — | **Se elimina**, con `RegistroRequest` y `AuthService.registrar` (tarea 3) |
| `POST /api/pedidos` | — | **Se elimina** (tarea 9) |
| `GET /api/pedidos/mios` | Rol `CLIENTE` | Nuevo (tarea 19). Filtra por el usuario de la sesión, nunca por un id que mande el navegador |
| `POST /api/pagos/pedidos/*/preferencia` | Con sesión | Sin cambios. Lo usa el botón "Pagar" del historial; `PagoService` ya verifica que el pedido sea del usuario |
| `GET /api/cuenta/datos-entrega` | Rol `CLIENTE` | Nuevo (tarea 22). Devuelve los datos guardados del cliente de la sesión |
| `DELETE /api/cuenta/datos-entrega` | Rol `CLIENTE` | Nuevo (tarea 22). Borra los datos guardados; no toca los pedidos |
| `GET /api/auth/yo`, `POST /api/auth/logout` | Con sesión | Sin cambios |

Todas las peticiones nuevas que modifican algo (`POST` y `DELETE`) llevan token CSRF, como las de la Fase 1. El cierre de las reglas sigue siendo `denyAll()`.

---

## Parámetros

Todos configurables por variable de entorno. Los del código van bajo `auth.codigo` en `application.yml`.

| Parámetro | Valor | Variable |
|---|---|---|
| Largo del código | 6 dígitos | — (fijo) |
| Vigencia | 10 minutos | `CODIGO_VIGENCIA_MINUTOS` |
| Intentos por código | 5 | `CODIGO_INTENTOS_MAXIMOS` |
| Códigos vigentes a la vez por cliente | 1 | — (fijo) |
| Solicitudes por email cada 15 minutos | 3 | `CODIGO_SOLICITUDES_15_MIN` |
| Solicitudes por email cada 24 horas | 5 | `CODIGO_SOLICITUDES_DIA` |
| Códigos agotados seguidos para bloquear | 3 | `CODIGO_AGOTADOS_BLOQUEO` |
| Duración del bloqueo | 60 minutos | `CODIGO_BLOQUEO_MINUTOS` |
| Clave del HMAC | ≥ 32 bytes, obligatoria | `CODIGO_ACCESO_CLAVE` |
| Sesión de clientes | 7 días de inactividad | `SESSION_TIMEOUT` (ya existe) |
| Sesión del equipo | 12 horas de inactividad | `SESSION_TIMEOUT_EQUIPO` |

El largo del código no es configurable a propósito: la probabilidad calculada más arriba depende de él, y también el campo del frontend.

---

## Lo que nunca se loguea

- **Ningún código**, fuera de la implementación de desarrollo.
- **El cuerpo de las peticiones** a `/api/auth/codigo`, `/api/auth/codigo/verificar`, `/api/auth/equipo/login` y `/api/checkout`. Los tres primeros llevan credenciales; el último, DNI, teléfono y dirección.

---

## Riesgos aceptados

**Molestar a un cliente.** Cualquiera que conozca el email de un cliente puede agotar sus cinco códigos diarios, invalidarle el código que acaba de pedir o bloquearlo una hora. **La víctima puede seguir comprando**: lo único que pierde es ver su historial ese día. El límite por IP de la Fase 6 lo encarece.

**Probar contra muchas cuentas a la vez.** El límite de 25 intentos por día es por cuenta. Un atacante con mil emails de clientes reales tendría alrededor de un 2,5% diario de acertar en alguna, a costa de hacer que Tierra mande cinco mil emails por día. **Por eso el límite por IP de la Fase 6 es obligatorio antes del lanzamiento, no una mejora.** Una cuenta comprometida expone el historial de esa persona —productos y direcciones de entrega— y, si los guardó, sus datos completos: teléfono, DNI y dirección.

**Los emails del equipo se pueden averiguar** en el checkout, por la respuesta 409. Son tres direcciones que probablemente figuren en el sitio, y el login del equipo tiene su propio bloqueo.

**El login del equipo informa que una cuenta está bloqueada o deshabilitada.** Es el comportamiento de la Fase 1, y Spring hace esa verificación antes de comparar la contraseña. Solo puede pasar con las cuentas del equipo, porque los clientes se rechazan antes, como si no existieran.

**Una diferencia de tiempo de milisegundos** al pedir y verificar un código: con un cliente real se escribe en la base, y con un email inexistente no. Medirla exige miles de peticiones, que es justo lo que frena el límite por IP.

**Un email mal escrito** asocia el pedido a otra persona, que lo ve en su historial con el nombre y la dirección del destinatario. Es el comportamiento de cualquier tienda que identifica por email. Para reducir lo que se expone, el historial y los emails **ocultan el DNI y el teléfono** (ver "Qué ve el dueño de un email").

**Hasta el módulo de emails de la Fase 3 nadie se entera de nada.** El email de confirmación de compra, que es lo que avisa al dueño de un email usado por otro, todavía no existe. En desarrollo no importa, y a producción no se puede llegar sin el módulo, porque el backend no arranca sin un enviador real.

---

## Alternativas descartadas

**Mantener la 0002, con login obligatorio.** Ya estaba construida y probada. Se descarta porque el cliente pidió de forma explícita comprar sin registrarse.

**Cuenta implícita, abriendo sesión al comprar** (plan de la versión 1 de la Fase 2). Se descarta porque abrir sesión con un email existente le entrega la cuenta a cualquiera que lo escriba, y no abrirla deja al cliente que vuelve sin poder comprar. Además, el equipo objetó crear cuentas a espaldas del comprador.

**Contraseña opcional para clientes, además del código.** Se descarta: dos métodos por cuenta duplican la superficie de ataque, vuelve la recuperación de contraseña, y la contraseña es el más débil de los dos.

**Firebase con email y contraseña.** Se descarta: vuelve el login obligatorio, que contradice el pedido del cliente. Si se quisiera volver a eso, la Fase 1 ya lo resuelve sin Firebase.

**Firebase sin contraseña, con enlace por email.** Era una alternativa válida. Su ventaja real es no escribir código de seguridad propio. Se descarta por cinco razones: el enlace abre la sesión en el dispositivo donde se lee el email y no donde se compra; agrega un proveedor externo y una credencial de cuenta de servicio muy delicada; reparte la identidad entre nuestra base y Google; complica el entorno de desarrollo; y suma un proyecto de Google Cloud a la entrega. El esfuerzo estimado era parecido.

**La contrapartida de la opción elegida** es que el código de seguridad es nuestro: la generación, el HMAC, los límites y el bloqueo. Se mitiga con este documento escrito antes del código, con un test por cada fila de las tablas y con los tests de la sección siguiente.

---

## Qué tiene que quedar probado

**Cada fila de las tres tablas de casos tiene su test.** Además, estos, que son los que se rompen con facilidad:

1. El código vence a los 10 minutos.
2. El quinto intento fallido agota el código; un sexto con el código correcto **no** entra.
3. Un código usado no sirve una segunda vez.
4. Pedir un código nuevo invalida el anterior.
5. La sexta solicitud del día no genera código **y responde exactamente lo mismo que la primera**.
6. Tres códigos agotados seguidos bloquean una hora; el bloqueo vence solo y el contador arranca de cero.
7. La respuesta de pedir un código es idéntica para un email inexistente, un cliente y alguien del equipo.
8. El login del equipo con el email de un cliente responde igual que con un email inexistente y **no modifica** sus contadores.
9. Comprar con el email de un cliente existente **no modifica ningún dato de su cuenta**, y la respuesta es idéntica a la de un email nuevo.
10. Dos compras simultáneas con el mismo email nuevo crean **un solo** cliente y dos pedidos.
11. Si falla la preferencia de Mercado Pago, el pedido queda cancelado y el stock liberado.
12. La sesión se abre con un identificador nuevo, en los dos canales.
13. El código nunca aparece en el log fuera del perfil `dev`.
14. Sin `CODIGO_ACCESO_CLAVE`, o sin perfil `dev` y sin enviador real, el backend no arranca.
15. La sesión del equipo vence a las 12 horas de inactividad y la de un cliente a los 7 días.
16. El historial nunca devuelve el DNI ni el teléfono completos: el ocultamiento se verifica en la respuesta del endpoint, no en la pantalla.
17. Con la casilla tildada y sesión de cliente, los datos quedan guardados y la compra siguiente los devuelve en `GET /api/cuenta/datos-entrega`. **Sin sesión, aunque el pedido traiga la casilla tildada, la cuenta no cambia.**
18. Borrar los datos guardados no modifica ningún pedido.

Los scripts de verificación cambian en los mismos Pull Requests que los rompen: `probar-codigo.ps1` (nuevo), `probar-auth.ps1` (solo el equipo), `probar-permisos.ps1` (el cliente entra por código) y `probar-checkout.ps1` (reemplaza a `probar-pedidos.ps1`).

---

## Consecuencias

### En el modelo de datos

| Migración | Tarea | Cambio |
|---|---|---|
| `V7` | 2 | `usuarios.password_hash` admite nulos; tabla `codigos_acceso` |
| `V8` | 3 | Clientes sin contraseña y restricción `chk_usuarios_metodo_acceso` |
| `V9` | 9 | `contacto_nombre`, `contacto_telefono` y `contacto_dni` en `pedidos` |

Los números son una reserva: el definitivo se confirma al mergear, y nunca se mergea un número menor después de uno mayor.

**El seed de desarrollo cambia en el mismo Pull Request que `V8`:** `test@tierra.esquel` pasa a no tener contraseña. Si no, en una base nueva el seed choca con la restricción y el backend no arranca.

`codigos_acceso` usa `TIMESTAMP` como el resto del esquema. La migración a `TIMESTAMPTZ` de la Fase 5 se hace para todas las tablas a la vez.

### En las otras decisiones

- **0002** pasa a estado *reemplazada por 0005*.
- **0003**: la contraseña y el bloqueo por intentos quedan solo para el equipo, y el registro desaparece. Su apartado "Qué falta verificar automáticamente" se actualiza: el caso de `POST /api/pedidos` pasa a `POST /api/checkout`.
- **0004**: sin cambios. El link de pago sale ahora del checkout, pero la conciliación, el webhook y el job son los mismos.

### En el frontend

- `/login` pasa a tener dos pasos, email y código. Se crea `/equipo` y **se elimina `/registro`**, con todos sus enlaces.
- El checkout explica junto al campo del email para qué sirve: *"Te mandamos la confirmación a este email. Con él vas a poder ver tus pedidos cuando quieras, sin contraseña."*
- El frontend nunca intenta adivinar si un email existe: muestra el mensaje genérico que recibe.
- Los campos del checkout llevan `autocomplete`, y con sesión aparecen la casilla para guardar los datos y la opción de borrarlos.

### En el plan

- **El módulo de emails pasa a ser imprescindible para lanzar**: sin él, los clientes no pueden ver sus pedidos. Está en la Fase 3.
- **La herramienta de cuentas del equipo también**: hoy no hay forma de crearlas en producción. Fase 3.
- **El límite por IP** de la Fase 6 cubre el pedido y la verificación de códigos, el login del equipo, el checkout y la cotización.
- **La política de privacidad** (Fase 4) explica que el email de la compra sirve para acceder al historial, que los datos de entrega se guardan con cada pedido, y que el cliente con sesión puede guardar sus datos en la cuenta y borrarlos cuando quiera.
- **Tarea nueva en la Fase 2:** la 22, datos guardados con sesión (Backend B y Frontend A, días 34-36). No mueve el cierre de la fase.
- **Para la Fase 3:** el ocultamiento de DNI y teléfono en los emails; la baja de clientes con anonimización; y, en el panel, que las consultas automáticas no mantengan viva la sesión.
