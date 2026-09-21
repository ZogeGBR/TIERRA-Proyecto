# Fase 1 — Qué cambió y cómo levantar el proyecto

Documento para el resto del equipo. Explica qué se hizo en las tareas 1 a 3, qué cambió respecto de lo que estaba, y cómo poner el proyecto a andar desde cero.

> **Lo primero, si volvés a trabajar después de un tiempo:** corré `docker compose down -v` desde `tierra-infra` antes de arrancar el backend. El seed dejó de ser una migración versionada y sin eso Flyway no arranca. Detalle en la sección 4.

---

## 1. Qué se construyó

Autenticación completa, de punta a punta.

**En el backend:** registro y login con contraseñas hasheadas con BCrypt, sesión en cookie, logout que invalida del lado del servidor, bloqueo por intentos fallidos, protección CSRF, y reglas de autorización por endpoint y por rol.

**En el frontend:** pantallas de login y registro, un contexto que mantiene el estado de la sesión, y el menú de cuenta en el encabezado.

**Antes de esto la API estaba completamente abierta**: cualquiera podía llamar a cualquier endpoint sin credenciales.

### Cómo funciona, en una frase

La sesión vive en una cookie que el navegador manda sola en cada petición. **El frontend nunca dice quién es el usuario: lo deduce el backend.** Todo lo demás es consecuencia de eso.

---

## 2. Lo que cambió respecto del trabajo de las tareas 4 y 5

Dos cosas de lo que hizo Backend B se completaron. Ninguna era un error: las dos dependían de que existiera el login.

### La validación de dirección ajena ahora sí protege

`PedidoService` ya verificaba que la dirección de envío perteneciera al usuario. El código era correcto, incluido el detalle de responder "no encontrada" en vez de "no es tuya" para no confirmar que el recurso existe.

El problema era de dónde salía el usuario:

```java
// Antes
Usuario usuario = usuarioRepository.findById(request.usuarioId())
```

`request.usuarioId()` venía en el cuerpo de la petición. Alcanzaba con mandar el id de otra persona junto con el id de una dirección de esa misma persona para que la comparación diera verdadero.

**Ahora** el usuario sale del `SecurityContext`, que el cliente no puede falsificar:

```java
// Ahora — el controller lo saca de la sesión y se lo pasa
public PedidoResponseDTO crearPedido(UUID usuarioId, CrearPedidoRequest request)
```

**Qué cambia para quien use la API:** `CrearPedidoRequest` **ya no acepta `usuarioId`**. Si lo mandás, se ignora. Y `POST /api/pedidos` ahora exige sesión: las pruebas con Postman necesitan loguearse primero.

### El retiro en el local ya no cobra envío

`crearPedido` aplicaba un costo fijo de $12.000 sin mirar el tipo de entrega, mientras el frontend mostraba el total sin él. El comprador veía un número y pagaba otro.

El `TODO` del cálculo real sigue ahí: depende de la definición de envíos que falta cerrar con el cliente.

### Los tests se actualizaron

`PedidoServiceTest` se ajustó a la firma nueva y se le agregaron dos casos: que `RETIRO_LOCAL` no cobre envío y que `ENVIO_DOMICILIO` sí. Quedan **13 tests** en total contando `InventarioServiceTest`.

---

## 3. Cambios de infraestructura que afectan a todos

### El seed dejó de ser una migración versionada

**Era** `V4__seed_dev.sql`, dentro de `db/migration`. Eso significaba que los datos de prueba —incluidas dos cuentas con contraseña inválida, una con permisos de operación— se habrían insertado **en la base de producción**, porque las migraciones versionadas corren en todos los ambientes.

**Ahora** vive en `db/dev/R__seed_dev.sql` y Flyway sólo mira esa carpeta cuando el perfil activo es `dev`.

Dos consecuencias prácticas:

- Hace falta `SPRING_PROFILES_ACTIVE=dev` en tu `.env`. Sin eso el backend arranca igual, pero la base queda vacía. **El comportamiento por defecto es el de producción, a propósito**: si alguien olvida el perfil, el resultado es una base sin datos —molesto y evidente— en vez de datos falsos en producción, que sería silencioso.
- Es una migración **repetible**: para agregar productos de prueba, editás el archivo y reiniciás. No hace falta borrar la base.

### El rol `STAFF` ahora se llama `OPERADOR`

Para que el código hable el mismo idioma que el contrato con el cliente, que define "Administrador" y "Operador". Se renombró el valor del enum de PostgreSQL y el de Java. No hay nada más que hacer.

### Usuarios de prueba

Los tres comparten la contraseña **`tierra2026`**:

| Email | Rol |
|---|---|
| `test@tierra.esquel` | CLIENTE |
| `mostrador@tierra.esquel` | OPERADOR |
| `admin@tierra.esquel` | ADMIN |

### Scripts nuevos en `tierra-backend/`

| Script | Para qué |
|---|---|
| `run-dev.ps1` | Arranca el backend leyendo las variables de tu `.env`. Evita escribir las cinco `$env:` cada vez |
| `probar-auth.ps1` | 12 casos: login, logout, bloqueo, CSRF, exención del webhook |
| `probar-pedidos.ps1` | 7 casos: que el usuario salga de la sesión y que el retiro no cobre envío |
| `probar-permisos.ps1` | 16 casos: reglas por endpoint y distinción Administrador / Operador |

Conviene correrlos después de tocar `SecurityConfig`, `AuthService` o cualquier contrato de la API.

### Decisiones registradas

En `docs/decisiones/`. La `0003` explica por qué sesión y no JWT, por qué CSRF con dos capas, por qué el webhook está exento, y dos trampas que costaron tiempo y conviene no repetir.

---

## 4. Cómo levantar el proyecto desde cero

### 4.1 — Una sola vez, la primera

```powershell
# Permitir ejecutar los scripts del proyecto
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser

# Que git no meta saltos de línea de Windows
git config --global core.autocrlf false
```

Necesitás **Docker Desktop**, **Java 17** y **Node 18 o superior**. Maven no hace falta: el repo trae el wrapper.

Si no tenés Java 17:

```powershell
winget install EclipseAdoptium.Temurin.17.JDK
```

Y que `JAVA_HOME` apunte ahí — Maven usa esa variable, no la versión que esté primera en el PATH.

### 4.2 — Clonar y configurar

```powershell
git clone https://github.com/ZogeGBR/TIERRA-Proyecto.git
cd TIERRA-Proyecto
Copy-Item .env.example .env
Copy-Item tierra-frontend\.env.local.example tierra-frontend\.env.local
```

**Son dos archivos de entorno distintos y no se pueden unificar:** Next.js sólo lee `.env.local` dentro de su carpeta, y el backend no tiene por qué conocer la URL del frontend.

Abrí `.env` y verificá que tenga estas cinco variables. La que más se olvida es la última:

```dotenv
DB_USUARIO=tierra_app
DB_PASSWORD=tierra_dev_local
MP_ACCESS_TOKEN=TEST-0000000000000000-000000-00000000000000000000000000000000-000000000
JAVA_TOOL_OPTIONS=-Duser.timezone=UTC
SPRING_PROFILES_ACTIVE=dev
```

> `JAVA_TOOL_OPTIONS` **no es opcional en Windows**. La JVM reporta la zona horaria como `America/Buenos_Aires`, un nombre que PostgreSQL no reconoce, y la conexión falla con un error que no menciona nada de esto.

### 4.3 — Abrir en Visual Studio Code

Abrí **la carpeta raíz del repositorio**, no `tierra-backend` ni `tierra-frontend` por separado. La configuración de `.vscode/` está pensada así.

Extensiones necesarias:

- **Extension Pack for Java** (Microsoft) — incluye el soporte de Maven y el depurador
- **Spring Boot Extension Pack** (VMware) — opcional pero cómodo
- **Tailwind CSS IntelliSense** — opcional, para el frontend

La primera vez, VS Code va a tardar un par de minutos indexando el proyecto Java. Esperá a que termine la barra de abajo a la derecha antes de intentar ejecutar nada.

### 4.4 — Levantar, en orden

**El orden importa.** Si arrancás el backend antes que Postgres, falla la conexión. Si arrancás el frontend antes que el backend, el catálogo aparece vacío.

**Terminal 1 — Base de datos**

Con Docker Desktop abierto:

```powershell
cd tierra-infra
docker compose up -d
docker compose logs postgres --tail 3
```

Esperá el `database system is ready to accept connections`. Esa terminal queda libre.

> **Hay dos `docker-compose.yml` en el repo.** El de `tierra-infra/` levanta **sólo PostgreSQL**, y es el de desarrollo. El de la raíz levanta **todo el stack en contenedores** y sirve para probar el conjunto. Los dos usan el mismo nombre de contenedor y el mismo puerto, así que **no pueden correr a la vez**. Y `docker compose` busca el archivo subiendo por las carpetas padre: si lo ejecutás desde una subcarpeta, puede agarrar el de la raíz sin que te des cuenta. Si ves un error de nombre de contenedor en uso, es esto.

**Terminal 2 — Backend**

```powershell
cd tierra-backend
.\run-dev.ps1
```

Esperá el `Started TierraApplication`. Dos cosas para mirar en el log:

- `The following 1 profile is active: "dev"` — si dice `No active profile set`, falta la variable y la base va a quedar sin datos
- **NO** tiene que aparecer `Using generated security password`. Si aparece, `SecurityConfig` no tomó el control

**Alternativa desde VS Code:** el botón Run sobre `TierraApplication.java`. El `launch.json` lee tu `.env` automáticamente, así que no hace falta exportar nada. Es el camino más cómodo para depurar con puntos de interrupción.

**Terminal 3 — Frontend**

```powershell
cd tierra-frontend
npm install
npm run dev
```

Y abrís `http://localhost:3000`.

### 4.5 — Verificar que todo anda

```powershell
cd tierra-backend
.\probar-auth.ps1
.\probar-permisos.ps1
```

Todos los casos tienen que decir `OK`. Y desde el navegador: entrá a `/login`, iniciá sesión con `test@tierra.esquel` / `tierra2026`, y tiene que aparecer tu nombre en el menú del encabezado.

### 4.6 — Frenar todo

`Ctrl+C` en las terminales del backend y del frontend — en la del backend, responder `S`. Y `docker compose down` desde `tierra-infra` si querés apagar la base. Sin `-v`, los datos se conservan.

---

## 5. Problemas conocidos y qué significan

| Síntoma | Causa |
|---|---|
| `FATAL: invalid value for parameter "TimeZone"` | Falta `JAVA_TOOL_OPTIONS`. Ver 4.2 |
| `FATAL: password authentication failed` | Arrancaste por consola sin exportar `DB_PASSWORD`. Usá `run-dev.ps1` |
| Flyway no arranca, falta una migración aplicada | El seed dejó de ser versionado. `docker compose down -v` y levantar de nuevo |
| La base arranca sin productos ni usuarios | Falta `SPRING_PROFILES_ACTIVE=dev` |
| `Conflict. The container name "/tierra-postgres" is already in use` | Los dos compose peleando. Ver el recuadro de 4.4 |
| `.ps1 no está firmado digitalmente` | Política de ejecución. Ver 4.1 |
| `401` en `/api/auth/yo` en la consola del navegador | **Es lo normal**: significa que no hay sesión. Aparece dos veces en desarrollo porque React monta los componentes por duplicado a propósito |
| `mvn no se reconoce` | Usá `.\mvnw`, no `mvn` |
| Errores rojos en VS Code después de un pull | `Ctrl+Shift+P` → *Java: Clean Java Language Server Workspace* → *Restart and delete* |

---

## 6. Qué NO funciona todavía, y es esperado

Para que nadie lo reporte como una regresión:

**El checkout no completa.** El pedido necesita el id de una dirección que ya exista, y todavía no hay forma de que el cliente dé de alta la suya. Eso es la libreta de direcciones, de la Fase 2. **El retiro en el local sí funciona**, con sesión iniciada.

**El pago no acredita.** El vínculo entre el pago de Mercado Pago y el pedido nunca se establece. Es la tarea 6.

**El catálogo sin parámetros devuelve lista vacía.** Es el comportamiento actual del endpoint, no un error de tu instalación. Se rediseña en la Fase 2.

**No hay recuperación de contraseña.** Depende del módulo de notificaciones, de la Fase 3.

**`/api/admin` tiene dos endpoints y son un esqueleto.** Existen para que las reglas de permisos sean verificables y para que la Fase 3 siga el patrón en vez de inventarlo.

---

## 7. Para quien rediseñe las pantallas de login y registro

Están hechas funcionales pero sobrias, a propósito. **Sólo hay que editar lo estético.**

- Toda la lógica vive en `context/AuthContext.tsx`. Las páginas llaman a `iniciarSesion`, `registrar` y `cerrarSesion`, y muestran lo que devuelven. **Se pueden reescribir enteras sin tocar nada funcional.**
- Los cuatro estados están implementados: inicial, cargando, error y éxito. El área de error existe en el DOM aunque esté vacía, con `role="alert"`.
- La estructura HTML es semántica —`<form>` con `onSubmit`, `<label>` asociado a cada campo, `autoComplete` correcto— y conviene conservarla: es lo que hace que funcionen el envío con Enter y los gestores de contraseñas.
- Los nombres y las ubicaciones de archivo son definitivos.
- **No hace falta agregar ningún control.** Si encontrás que falta uno, es un error nuestro: avisá en vez de agregarlo.

---

## 8. Reglas que conviene no romper

Tres cosas que se rompen fácil y se notan tarde.

**No edites una migración de Flyway ya mergeada.** Flyway guarda un checksum de cada archivo aplicado; si cambia, el backend deja de arrancar para todo el equipo. Se corrige siempre hacia adelante, con una migración nueva.

**No saques `@EnableMethodSecurity` de `MetodoSeguridadConfig`.** Sin esa anotación, los `@PreAuthorize` se ignoran **en silencio**: no hay error ni advertencia, y el endpoint que creés protegido queda abierto.

**No cierres `POST /api/pagos/webhook`.** Lo llama Mercado Pago, que no tiene ni puede tener credenciales nuestras, y está exento de CSRF por el mismo motivo. Su protección es la verificación de firma, de la tarea 6. Si se cierra, los pagos dejan de acreditarse y nadie se entera hasta que un cliente reclama.
