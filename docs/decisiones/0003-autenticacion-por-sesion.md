# 0003 — Autenticación por sesión en cookie

- **Estado:** aceptada
- **Fecha:** Fase 1, tareas 1 a 3
- **Ubicación en el repo:** `docs/decisiones/0003-autenticacion-por-sesion.md`

---

## Contexto

El sistema necesitaba autenticación real: hasta ahora `SecurityConfig` tenía `permitAll()` y la API estaba completamente abierta. La decisión 0002 estableció que para comprar hay que tener cuenta, así que el login pasó a ser prerrequisito de todo lo demás.

## Decisiones

### Autenticación propia, sin proveedores externos

Email y contraseña verificados contra nuestra base, con BCrypt. No hay "entrar con Google".

**Por qué.** El presupuesto no lo contempla, agrega una dependencia externa que puede caerse, y trae un problema que siempre sorprende: alguien se registra con contraseña, vuelve y entra con Google, y ahora hay dos cuentas con el mismo email o hay que resolver cómo unificarlas.

**Lo que se dejó abierto:** agregar un proveedor externo más adelante no requiere migrar nada, siempre que `password_hash` pueda quedar vacío.

### Sesión en cookie `httpOnly`, no JWT

**Por qué.** No hay app móvil ni terceros consumiendo la API: el frontend y el backend son nuestros, así que JWT no aporta nada y cuesta. Con sesión, el logout funciona de verdad sin mantener una lista de tokens revocados. Y la cookie `httpOnly` no es accesible desde JavaScript, a diferencia de un token en `localStorage`.

**Qué cambiaría la decisión:** planear una app móvil.

**Contrapartida asumida:** las sesiones viven en memoria, así que un reinicio del backend deslogea a todos. Aceptable en desarrollo; **antes de producción hay que migrar a Spring Session con JDBC**, o cada deploy va a desloguear a quien esté comprando. Está anotado como ítem obligatorio de la Fase 6.

### La sesión es la única fuente de verdad sobre quién es el usuario

El frontend nunca manda un identificador de usuario. El backend lo deduce del `SecurityContext`.

**Por qué.** Es lo que vuelve efectivas las validaciones de pertenencia. `PedidoService` ya verificaba que la dirección fuera del usuario, pero comparaba contra un id que llegaba en el cuerpo del request: bastaba mandar el id de la víctima junto con una dirección suya para pasar la validación.

**Consecuencia:** `CrearPedidoRequest` no declara `usuarioId`, y cualquier endpoint futuro que opere sobre datos de una persona debe seguir el mismo patrón.

### CSRF habilitado, con dos capas

Token en cookie legible más `SameSite=Lax`.

**Por qué dos.** `SameSite` bloquea el ataque clásico y cuesta una línea, pero depende de que el frontend y el backend queden en el mismo sitio, algo que el hosting todavía no definió. El token no depende de eso.

**Excepción:** `POST /api/pagos/webhook` queda exento. Lo llama Mercado Pago, que no tiene ni puede tener un token nuestro. Su protección es la verificación de firma, que corresponde a la tarea 6. **Si alguien lo cierra por error, los pagos dejan de acreditarse y nadie se entera hasta que un cliente reclama.**

### Bloqueo por intentos fallidos, persistido en la base

Cinco intentos, quince minutos, ambos configurables.

**Por qué en la base y no en memoria.** Un contador en memoria se reinicia con cada deploy, que es justo cuando un atacante lo aprovecha. Además el panel de la Fase 3 puede mostrar y desbloquear cuentas.

**Su límite:** protege una cuenta contra muchos intentos, pero no contra un atacante que prueba una contraseña común contra miles de cuentas distintas. Esa defensa es por IP y va en el proxy inverso, en la Fase 6.

### Dos capas de autorización

Reglas por URL en `SecurityConfig` para lo grueso, y `@PreAuthorize` para lo fino.

**Por qué las dos.** La distinción entre Administrador y Operador no la puede hacer la URL: las dos zonas del panel viven bajo `/api/admin`. El contrato dice que el Operador gestiona pedidos, stock y productos pero no accede a reportes económicos ni a configuración, y eso se resuelve a nivel de método.

**Dos trampas que costaron tiempo y conviene no repetir:**

Sin `@EnableMethodSecurity`, los `@PreAuthorize` **se ignoran en silencio**: no hay error ni advertencia, y el endpoint que uno cree protegido queda abierto. Por eso esa anotación tiene su propia clase, `MetodoSeguridadConfig`, en vez de estar perdida en otra.

Los dos caminos que producen un 403 —la cadena de filtros y la anotación de método— necesitan manejadores **distintos**. El `AccessDeniedHandler` de `SecurityConfig` cubre el primero; el `@ExceptionHandler(AccessDeniedException.class)` de `GlobalExceptionHandler`, el segundo. Tener solo uno hace que la mitad de los 403 lleguen al cliente como 500.

### El cierre de las reglas es `denyAll()`

Un endpoint nuevo al que nadie le asignó permisos falla en vez de quedar accesible.

**Por qué.** Es el error correcto: se nota enseguida. Lo contrario se nota cuando ya es tarde.

## Consecuencias

- `/api/admin/**` exige rol `ADMIN` u `OPERADOR`. El `AdminController` actual es un esqueleto con dos endpoints; la Fase 3 lo extiende siguiendo ese patrón.
- El rol `STAFF` pasó a llamarse `OPERADOR`, para que el código hable el mismo idioma que el contrato.
- La recuperación de contraseña **no existe todavía**. Depende del módulo de notificaciones por email (Fase 3), que a su vez depende de verificar el dominio, un trámite lento. Hasta entonces, alguien que olvida su contraseña necesita que alguien la reponga a mano. **No es aceptable después del lanzamiento.**
- En el registro, decir "ya existe una cuenta con ese email" filtra qué direcciones están registradas. Es inevitable sin el módulo de emails: la mitigación estándar es responder siempre lo mismo y avisar por correo. Deuda consciente.

## Qué falta verificar automáticamente

Todo lo de arriba se comprueba hoy con scripts manuales: `probar-auth.ps1`, `probar-pedidos.ps1` y `probar-permisos.ps1`, en `tierra-backend/`. Sirven, pero solo protegen mientras alguien se acuerde de correrlos.

Los casos que merecen tests automatizados en la Fase 5, en orden de importancia:

1. Un `CLIENTE` recibe 403 en `/api/admin/**`, y un `OPERADOR` en los reportes.
2. `POST /api/pedidos` sin sesión devuelve 401, y con sesión ignora cualquier `usuarioId` del cuerpo.
3. El login con email inexistente y con contraseña incorrecta devuelven **el mismo** mensaje.
4. El contador de intentos se reinicia cuando el bloqueo vence. *(Este caso existe porque el bug apareció en producción de desarrollo y ninguna prueba lo cubría.)*
5. El webhook sigue accesible sin autenticación y sin token CSRF.
