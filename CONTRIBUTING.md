# Cómo trabajamos en este repositorio

Este documento explica cómo está organizado el repositorio, qué cambió en la Fase 0 y cuáles son las convenciones que seguimos. **Leelo antes de tu primer commit.**

---

## 1. Qué cambió en la Fase 0 y por qué

| Cambio | Motivo |
|---|---|
| Todo el trabajo pasó a `main` | Había dos ramas que parecían "la principal" (`main` y `TIERRA-V1`). Una sola evita que alguien trabaje sobre la equivocada. |
| `main` está protegida: se entra por Pull Request | Cuatro personas en paralelo. Un push directo a `main` puede pisar trabajo ajeno sin que nadie se entere. |
| Se agregó `.gitattributes` | El repositorio guarda todo en LF. Sin esto, cada máquina commitea con los saltos de línea de su sistema y aparecen archivos "modificados" que nadie tocó, además de conflictos falsos. |
| Carpetas renombradas: `tierra-backendV8` → `tierra-backend`, `tierra-frontendV1.1` → `tierra-frontend` | El versionado va en el historial de git, no en el nombre de la carpeta. Antes, reemplazar "V7 por V8" borraba la trazabilidad de qué había cambiado. |
| El esquema de la base lo gestiona **Flyway** | Antes el mismo `schema.sql` estaba en tres lugares sincronizados a mano, y cambiar una tabla obligaba a borrar la base local entera. |
| Las credenciales salen de `application.yml` y van a un `.env` local | Un valor por defecto para la password hace que la aplicación arranque mal en vez de fallar claro. Y es un mal precedente para cuando manejemos el token real de Mercado Pago. |
| `.gitignore` en la raíz | Antes solo había uno dentro de cada subproyecto. |
| Wrapper de Maven (`mvnw`) | Ya no hace falta tener Maven instalado. |
| `docs/decisiones/` | Las decisiones de diseño que afectan a todo el equipo quedan escritas, con su motivo, en vez de vivir en un chat. |

> **Nota temporal:** la rama `TIERRA-V1` sigue existiendo hasta que todo el equipo confirme que no tiene trabajo local apoyado en ella. Está **congelada**: `main` es la rama viva. No commitees sobre `TIERRA-V1`.

---

## 2. Configuración inicial de tu máquina

### 2.1 — Git

Una sola vez, la primera vez:

```powershell
git config --global core.autocrlf false
git config --global user.name "Tu Nombre"
git config --global user.email "el-mismo-mail-de-tu-cuenta-de-github"
```

`core.autocrlf false` es importante: con `.gitattributes` en el repo, dejarlo activado vuelve a generar el problema de los saltos de línea.

El email tiene que coincidir con uno verificado en tu cuenta de GitHub, o tus commits no se te van a atribuir.

### 2.2 — Java 17

El proyecto compila para Java 17. Un JDK más nuevo funciona, pero si aparece un error raro de compilación o de Lombok, probá con el 17 antes de buscar en otro lado.

```powershell
winget install EclipseAdoptium.Temurin.17.JDK
```

**Lo importante es `JAVA_HOME`**, no el PATH: Maven usa esa variable, no la versión de `java` que esté primera. En una terminal como administrador:

```powershell
[Environment]::SetEnvironmentVariable("JAVA_HOME", "C:\Program Files\Eclipse Adoptium\jdk-17.0.20.101-hotspot", "Machine")
```

Ajustá el número de versión al que te haya instalado winget. Verificá con `.\mvnw -v`, que reporta la versión de Java que está usando.

> El `.vscode/settings.json` versionado apunta al JDK en la ruta por defecto de winget. Si instalás Temurin en otro lado, VS Code no lo va a encontrar y vas a tener que ajustar la ruta localmente — mejor instalarlo con el comando de arriba y no a mano.

### 2.3 — Scripts de PowerShell

Windows bloquea por defecto los `.ps1` sin firmar, así que `run-dev.ps1` y los scripts de prueba no van a ejecutarse hasta que lo permitas. Una vez, para tu usuario:

```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

`RemoteSigned` permite los scripts locales y exige firma sólo a los descargados de internet. No requiere permisos de administrador. Si preferís no cambiarlo de forma permanente, `Set-ExecutionPolicy Bypass -Scope Process` afecta sólo a la terminal actual.

### 2.4 — Maven: no hace falta instalarlo

El repo incluye el wrapper. Usá siempre **`.\mvnw`**, nunca `mvn`:

```powershell
.\mvnw clean compile
.\mvnw spring-boot:run
```

La primera vez se descarga Maven solo.

### 2.5 — Clonar y configurar el entorno

```powershell
git clone https://github.com/ZogeGBR/TIERRA-Proyecto.git
cd TIERRA-Proyecto
```

Hay **dos** archivos de entorno, uno por runtime. No se pueden unificar: Next.js solo lee `.env.local` dentro de su propia carpeta, y el backend no tiene por qué conocer la URL del frontend.

| Archivo | Para qué | Se crea con |
|---|---|---|
| `.env` (raíz) | Backend: credenciales de la base, token de MP, timezone | `Copy-Item .env.example .env` |
| `tierra-frontend/.env.local` | Frontend: URL de la API | `Copy-Item .env.local.example .env.local` |

Ninguno de los dos se sube. Los `.example` sí.

Completá tu `.env` con tu propio access token de prueba de Mercado Pago (se genera gratis en el panel de desarrolladores). El que viene en el `.example` es de relleno: alcanza para que la aplicación arranque, pero el checkout no va a funcionar.

> Si ya tenías el repo clonado de antes y ves archivos modificados que no tocaste:
> ```powershell
> git switch main
> git pull
> git rm --cached -r .
> git reset --hard
> ```

---

## 3. Estructura del repositorio

```
TIERRA-Proyecto/
├── tierra-infra/          # PostgreSQL 16 en Docker
│   ├── docker-compose.yml
│                          # (el seed vive en el backend, ver §6.3)
│
├── tierra-backend/        # API REST — Spring Boot 3 + Java 17
│   └── src/main/resources/db/migration/   # Migraciones de Flyway
│
├── tierra-frontend/       # Next.js 14 + React 18 + Tailwind
│
├── docs/decisiones/       # Decisiones de arquitectura (ADR)
├── .gitattributes         # Normalización de saltos de línea
├── .env.example           # Plantilla de variables del backend
└── CONTRIBUTING.md        # Este archivo
```

---

## 4. Ramas

**Una rama por tarea. Nunca se trabaja directo sobre `main`.**

En git una rama no es una carpeta con algunos archivos: es una línea de commits, y cada commit es una foto completa del proyecto. No se "mueven archivos a una rama" — se crea la rama, se trabaja ahí, y se mergea.

### Nombres

| Prefijo | Para qué | Ejemplo |
|---|---|---|
| `feat/` | Funcionalidad nueva | `feat/login-backend` |
| `fix/` | Corrección de un bug | `fix/webhook-idempotencia` |
| `chore/` | Configuración, build, dependencias | `chore/flyway-migraciones` |
| `docs/` | Documentación | `docs/decisiones-arquitectura` |
| `test/` | Tests | `test/inventario-service` |

Todo en minúscula, palabras separadas por guion, sin tildes ni ñ.

### Flujo de trabajo

```powershell
# 1. Partir siempre de main actualizada
git switch main
git pull

# 2. Crear la rama de tu tarea
git switch -c feat/login-backend

# 3. Trabajar y commitear las veces que haga falta
git add <archivos>
git commit -m "feat: endpoint de registro de usuario"

# 4. Antes de subir, traer lo último de main
git pull --rebase origin main

# 5. Subir
git push -u origin feat/login-backend
```

Después abrís el Pull Request en GitHub, pedís revisión, y cuando está aprobado se mergea. Borrá la rama después del merge.

### ⚠️ Después de que se mergea un PR

**Actualizá tu `main` local antes de crear la rama siguiente:**

```powershell
git switch main
git pull
```

El merge ocurre en GitHub, no en tu máquina. Si te salteás este paso y creás la rama nueva desde un `main` viejo, tu rama nace sin los cambios que se acaban de mergear, y el push va a ser rechazado con un mensaje sobre *fast-forward* que no dice cuál es el problema real.

### Dos comandos que te van a salvar

- **Empezaste a editar sin crear la rama:** `git switch -c feat/lo-que-sea` se lleva los cambios sin commitear con vos.
- **Necesitás cambiar de rama con cosas a medias:** `git stash` las guarda aparte y `git stash pop` te las devuelve.

### Regla de oro

Si tu rama va a tocar los mismos archivos que la de otra persona, hablalo antes. Es más barato coordinarse cinco minutos que resolver un conflicto de tres archivos después.

---

## 5. Commits

Formato: `tipo: descripción en presente, en minúscula`

```
feat: agregar endpoint GET /api/categorias
fix: incrementar usos_actuales al aplicar un cupon
chore: actualizar dependencia de flyway
docs: documentar el flujo de consulta de alquiler
test: cubrir liberacion de reservas vencidas
refactor: extraer el calculo de descuento a un metodo propio
```

Un commit debería poder explicarse en una línea. Si necesitás una "y" en la descripción, probablemente son dos commits.

No hace falta que cada commit deje la aplicación funcionando — para eso está la rama. Lo que sí tiene que funcionar es lo que se mergea a `main`.

---

## 6. Levantar el proyecto en local

El orden importa: **base de datos → backend → frontend**.

> **Hay dos `docker-compose.yml` y hacen cosas distintas.** El de `tierra-infra/` levanta **sólo PostgreSQL**, y es el que se usa para desarrollar con el backend y el frontend corriendo en tu máquina — es el que describe esta sección. El de la raíz levanta **todo el stack en contenedores** (base, backend y frontend), y sirve para probar el conjunto o mostrarlo funcionando sin instalar nada.
>
> Los dos declaran un contenedor llamado `tierra-postgres` y usan el puerto 5432, así que **no pueden correr a la vez**. Y como `docker compose` busca el archivo subiendo por las carpetas padre, ejecutarlo desde una subcarpeta del repo puede agarrar el de la raíz sin que te des cuenta. Si te aparece un error de nombre de contenedor en uso, es esto: pará el otro con `docker compose down` desde la carpeta que corresponda.

### 6.1 — Base de datos

Con Docker Desktop abierto y el motor corriendo:

```powershell
cd tierra-infra
docker compose up -d
docker compose logs postgres --tail 5
```

Esperá a ver `database system is ready to accept connections`. Si arrancás el backend antes, va a fallar la conexión.

### 6.2 — Backend

**Desde VS Code (recomendado):** botón Run sobre `TierraApplication.java`. El `launch.json` lee las variables de tu `.env` automáticamente.

**Desde la consola:** hay que exportar las variables a mano. **Maven no lee el `.env`** — eso solo lo hace VS Code a través del `envFile` del `launch.json`.

```powershell
cd tierra-backend
.\run-dev.ps1
```

Ese script lee tu `.env` de la raíz, exporta las variables y arranca. Existe porque Maven, a diferencia de VS Code, no lee el `.env`, y olvidarse de una variable produce errores que no dicen cuál es la causa real: una password vacía aparece como *authentication failed*, y sin el perfil la base queda sin datos de prueba.

Si preferís hacerlo a mano, son cinco variables y duran sólo mientras esa terminal esté abierta:

```powershell
$env:DB_USUARIO="tierra_app"
$env:DB_PASSWORD="tierra_dev_local"
$env:MP_ACCESS_TOKEN="TEST-0000000000000000-000000-00000000000000000000000000000000-000000000"
$env:JAVA_TOOL_OPTIONS="-Duser.timezone=UTC"
$env:SPRING_PROFILES_ACTIVE="dev"

.\mvnw spring-boot:run
```

`JAVA_TOOL_OPTIONS` **no es opcional en Windows**: ver §8.

Flyway crea las tablas al arrancar. En el log tenés que ver `Successfully applied 1 migration`.

### 6.3 — Datos de prueba

**No hay que hacer nada.** El seed lo carga Flyway al arrancar el backend, siempre que tengas `SPRING_PROFILES_ACTIVE=dev` en tu `.env` (§2.5).

Vive en `tierra-backend/src/main/resources/db/dev/R__seed_dev.sql` y es una migración **repetible**: si querés sumar productos de prueba, editá ese archivo y reiniciá el backend. No hace falta borrar la base — todos los `INSERT` usan `ON CONFLICT DO NOTHING`.

Los tres usuarios de prueba comparten la contraseña **`tierra2026`**:

| Email | Rol |
|---|---|
| `test@tierra.esquel` | CLIENTE |
| `mostrador@tierra.esquel` | OPERADOR |
| `admin@tierra.esquel` | ADMIN |

> Si arrancás **sin** el perfil `dev`, el backend levanta igual pero la base queda con el esquema vacío. Es a propósito: el comportamiento por defecto es el de producción, donde estos datos no tienen que existir.

### 6.4 — Frontend

En otra terminal:

```powershell
cd tierra-frontend
npm install
npm run dev
```

### 6.5 — Verificación

```powershell
Invoke-RestMethod "http://localhost:8080/api/productos?categoriaId=c0000000-0000-0000-0000-000000000001"
```

Tiene que devolver la bicicleta de prueba. Y `http://localhost:3000` tiene que abrir el sitio.

> Usá `Invoke-RestMethod` y no `curl`: en PowerShell, `curl` es un alias de `Invoke-WebRequest`, que parsea la respuesta como HTML y te pide confirmación por seguridad.

### 6.6 — Resetear la base desde cero

```powershell
cd tierra-infra
docker compose down -v      # el -v borra el volumen y con él todos los datos
docker compose up -d
```

Después arrancá el backend: Flyway recrea las tablas y, con el perfil `dev`, vuelve a cargar el seed solo.

---

## 7. Cambios en la base de datos

**El esquema lo gestiona Flyway. No se modifica la base a mano ni se edita una migración ya mergeada.**

Para cambiar algo, creás un archivo nuevo en `tierra-backend/src/main/resources/db/migration/`:

```
V2__agregar_controla_stock_a_variantes.sql
V3__pedidos_admiten_invitado.sql
```

Reglas:

- Formato exacto: `V<numero>__<descripcion>.sql`, con **doble** guion bajo.
- El número tiene que ser mayor a todos los que ya existen. Si dos personas crean `V4` en paralelo, coordinen antes: una pasa a `V5`.
- **Una migración mergeada no se edita nunca.** Flyway guarda un checksum de cada archivo aplicado; si lo cambiás, la próxima vez que alguien levante el backend va a fallar con un error de validación. Si te equivocaste, se corrige con una migración nueva.
- Si el cambio toca entidades JPA, actualizalas en el mismo PR. `ddl-auto: validate` no arranca si el esquema y las entidades no coinciden — es a propósito, es la red de seguridad.

---

## 8. Problemas conocidos y cómo resolverlos

### `FATAL: invalid value for parameter "TimeZone": "America/Buenos_Aires"`

El driver de PostgreSQL le manda al servidor la zona horaria de la JVM. Windows reporta `America/Buenos_Aires`, un identificador que Postgres no reconoce — el nombre válido de IANA es `America/Argentina/Buenos_Aires`.

Por eso `JAVA_TOOL_OPTIONS=-Duser.timezone=UTC` es obligatorio. Si arrancás por consola, exportalo; si arrancás desde VS Code, ya sale del `.env`.

### `FATAL: password authentication failed for user "tierra_app"`

Arrancaste por consola sin exportar `DB_PASSWORD`, y Spring resolvió `${DB_PASSWORD}` como cadena vacía. Ver §6.2.

Si las variables están bien definidas, puede ser que el volumen de Postgres traiga datos viejos con otra password: reseteá la base (§6.6).

### `mvn` no se reconoce como comando

Usá `.\mvnw`, no `mvn`. El proyecto trae el wrapper justamente para no depender de una instalación global.

### Errores rojos en VS Code después de un pull que renombró carpetas

`Ctrl+Shift+P` → *Java: Clean Java Language Server Workspace* → **Restart and delete**. Tarda un par de minutos en reindexar.

### El backend arranca pero `/api/productos` devuelve lista vacía

Es el comportamiento actual: sin el parámetro `categoriaId`, el endpoint devuelve una lista vacía a propósito. Está registrado como pendiente en la auditoría.

### YAML: `did not find expected '-' indicator` o `found character that cannot start any token`

En YAML la indentación es estructura y los tabs están prohibidos. Propiedades hermanas van con la misma cantidad de espacios.

Y **no pegues bloques multilínea (here-strings `@'...'@`) en la terminal de PowerShell**: la consola interactiva los escribe literalmente en el archivo en vez de interpretarlos. Editá los archivos desde VS Code.

Para validar un compose antes de levantarlo: `docker compose config`.

---

## 9. Secretos

- Nunca commitees un access token, una password o una clave. Ni en el código, ni en un `.yml`, ni en `launch.json`, ni "temporalmente".
- Todo va en tu `.env` local. Si agregás una variable nueva, sumala también a `.env.example` **sin el valor real**, para que el resto sepa que existe.
- Mientras desarrollamos, el token de Mercado Pago es de prueba y empieza con `TEST-`. El de producción no toca ninguna máquina de desarrollo.
- Si se te escapó un secreto en un commit, avisá enseguida: no alcanza con borrarlo en el commit siguiente, queda en el historial y hay que rotar la credencial.

---

## 10. Decisiones de arquitectura

Cuando se toma una decisión que afecta a todo el equipo — qué se construye, qué no, cómo se resuelve algo — se escribe un archivo en `docs/decisiones/`, numerado:

```
docs/decisiones/0001-tierra-rental-consulta-whatsapp.md
```

Estructura: contexto, decisión, consecuencias. No hace falta que sea largo, sí que quede claro **por qué** se decidió así. Es lo que evita que dentro de seis semanas alguien reconstruya algo que se había descartado a propósito.

---

## 11. Antes de abrir un Pull Request

- [ ] El backend compila y arranca (`.\mvnw spring-boot:run`)
- [ ] El frontend compila (`npm run build`)
- [ ] `git status` no muestra archivos que no querías subir
- [ ] No hay credenciales, tokens ni rutas absolutas de tu máquina en el diff
- [ ] Si tocaste el esquema, hay una migración nueva y las entidades están actualizadas
- [ ] Hiciste `git pull --rebase origin main` y no quedaron conflictos
- [ ] La descripción del PR dice **qué cambia y cómo probarlo**
