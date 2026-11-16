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

> **Ramas históricas:** `TIERRA-V1`, `TIERRA-V2` y `TIERRA-V3` están **congeladas**. Quedan como registro de versiones anteriores del proyecto: no se commitea sobre ellas ni se parte de ellas. Las ramas vivas son `main` y `develop` (§4.1).

> **Actualización del flujo:** la Fase 0 dejó a `main` como única rama de trabajo. Con el equipo ya trabajando en paralelo se sumó `develop` como rama de integración, con releases etiquetados y ramas `hotfix/`. El detalle está en la §4.

---

## 2. Configuración inicial de tu máquina

### 2.1 — Git

Una sola vez, la primera vez:

```powershell
git config --global core.autocrlf false
git config --global user.name "Tu Nombre"
git config --global user.email "el-mismo-mail-de-tu-cuenta-de-github"
git config --global push.autoSetupRemote true
```

`core.autocrlf false` es importante: con `.gitattributes` en el repo, dejarlo activado vuelve a generar el problema de los saltos de línea.

El email tiene que coincidir con uno verificado en tu cuenta de GitHub, o tus commits no se te van a atribuir. Si no querés que tu email personal quede en el historial (el repositorio es público), usá la dirección `...@users.noreply.github.com` que GitHub te asigna en *Settings → Emails*.

`push.autoSetupRemote true` hace que el primer `git push` de una rama nueva cree la rama en GitHub y la vincule, sin el error *"has no upstream branch"*.

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

**Scripts que llegaron en un zip o descargados del navegador.** Windows los marca como "descargados de internet" y `RemoteSigned` los rechaza con *"no está firmado digitalmente"*, aunque el mismo archivo traído con `git pull` funcione. Se desbloquean una vez:

```powershell
Get-ChildItem .\tierra-backend\*.ps1 | Unblock-File
```

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
| `tierra-frontend/.env.local` | Frontend: URL de la API | `Copy-Item .env.local.example .env.local`, dentro de `tierra-frontend` |

Ninguno de los dos se sube. Los `.example` sí.

Completá tu `.env` con tu propio access token de prueba de Mercado Pago (se genera gratis en el panel de desarrolladores). El que viene en el `.example` es de relleno: alcanza para que la aplicación arranque, pero el checkout no va a funcionar.

El resto de las variables del `.example` ya sirven para desarrollar tal como vienen. En particular, `CODIGO_ACCESO_CLAVE` (la clave con la que se protegen los códigos de acceso) viene **comentada**, y así tiene que quedar: con el perfil `dev` el backend usa una clave fija de desarrollo. Si la descomentás sin valor, el backend no arranca (`falta CODIGO_ACCESO_CLAVE`), porque una variable vacía reemplaza a la clave del perfil. Fuera del perfil `dev` hace falta una clave propia.

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
├── tierra-infra/
│   ├── docker-compose.yml # Sólo PostgreSQL 16: el que se usa para desarrollar (§6.1)
│   └── stack/             # Base + backend + frontend en contenedores, para demos
│
├── tierra-backend/        # API REST — Spring Boot 3.3 + Java 17
│   ├── src/main/resources/db/migration/   # Migraciones de Flyway (§7)
│   ├── src/main/resources/db/dev/         # Seed de datos de prueba (§6.3)
│   ├── run-dev.ps1        # Arranca el backend leyendo el .env (§6.2)
│   └── probar-*.ps1       # Scripts de verificación (§6.5)
│
├── tierra-frontend/       # Next.js 15.5 + React 19 + Tailwind
│
├── docs/
│   ├── decisiones/        # Decisiones de arquitectura (ADR, §10)
│   ├── contratos-fase2.md # Contrato de cada endpoint de la Fase 2 con el frontend
│   ├── guia-ramas/        # Guía visual de ramas y commits
│   └── ENTREGA-FASE-1.md  # Qué se hizo en la Fase 1
├── .github/CODEOWNERS     # Responsables de revisión por carpeta (§4.7)
├── .gitattributes         # Normalización de saltos de línea
├── .env.example           # Plantilla de variables del backend
├── package.json           # Atajos de npm para el frontend y la base (§6.1)
└── CONTRIBUTING.md        # Este archivo
```

---

## 4. Ramas y flujo de trabajo

**Una rama por tarea. Nunca se trabaja directo sobre `main` ni sobre `develop`.**

En git una rama no es una carpeta con algunos archivos: es una línea de commits, y cada commit es una foto completa del proyecto. No se "mueven archivos a una rama" — se crea la rama, se trabaja ahí, y se mergea.

### 4.1 — Mapa de ramas

Hay solo **dos ramas permanentes**. Todo lo demás es temporal y se borra al mergear.

| Rama | Tipo | Qué contiene | Cómo entra código |
|---|---|---|---|
| `main` | Permanente | Lo que corre en producción. Cada merge lleva un tag de versión (§4.5). | PR desde `develop` (release) o desde `hotfix/` |
| `develop` | Permanente | Integración: todo lo terminado y revisado, listo para el próximo release. | PR desde las ramas de tarea |
| `feat/`, `fix/`, `chore/`... | Temporal | Una sola tarea. | Se crean desde `develop` |
| `hotfix/` | Temporal | Un arreglo urgente en producción. | Se crea desde `main` |

```
main      ●━━━━━━━━━━━━━━━━━━━━━●━━━━━━━━━━━━━━━●━━━━  producción (cada ● lleva un tag)
           ╲                   ╱ ╲             ╱
develop     ●━━●━━━━●━━━●━━━━━●   ●━━●━━━━●━━━●
               ╲   ╱     ╲   ╱
                ●━●       ●━●          ramas de tarea: nacen y mueren en develop
```

> **No hay ramas `back` ni `front`.** El repo es un monorepo y muchas funcionalidades tocan las dos partes (el login, por ejemplo). Partirlas en dos ramas obligaría a dos PRs y dos integraciones por una misma funcionalidad. El área se identifica por el nombre de la rama (§4.2) y la revisión la reparte `CODEOWNERS` (§4.7).

### 4.2 — Nombres

Formato: `<prefijo>/<área>-<descripción>`

| Prefijo | Para qué | Ejemplo |
|---|---|---|
| `feat/` | Funcionalidad nueva | `feat/back-registro-usuario` |
| `fix/` | Corrección de un bug (no urgente) | `fix/back-webhook-idempotencia` |
| `chore/` | Configuración, build, dependencias | `chore/flyway-migraciones` |
| `docs/` | Documentación | `docs/decisiones-arquitectura` |
| `test/` | Tests | `test/back-inventario-service` |
| `refactor/` | Reordenar código sin cambiar lo que hace | `refactor/front-carrito` |
| `hotfix/` | Arreglo **urgente en producción** (§4.6) | `hotfix/back-webhook-mp` |

**El área** va justo después de la barra e indica qué parte del proyecto toca la tarea:

| La tarea toca | Área | Ejemplo |
|---|---|---|
| Solo `tierra-backend/` | `back-` | `feat/back-registro-usuario` |
| Solo `tierra-frontend/` | `front-` | `feat/front-tema-oscuro` |
| Las dos, infraestructura o documentación | *(sin área)* | `feat/login`, `chore/flyway-migraciones` |

Si la tarea tiene identificador en el tablero (`H2`, `F1`...), puede ir después del área: `feat/back-H2-registro-usuario`. Es opcional, pero ayuda a cruzar rama y tarea.

Reglas generales: todo en minúscula, palabras separadas por guion, sin espacios, sin tildes ni ñ, y nombres cortos que digan qué se hace.

### 4.3 — Flujo de una tarea

```powershell
# 1. Partir siempre de develop actualizada
git switch develop
git pull

# 2. Crear la rama de tu tarea
git switch -c feat/back-registro-usuario

# 3. Trabajar y commitear las veces que haga falta
git add <archivos>
git commit -m "feat: endpoint de registro de usuario"

# 4. Antes de subir, traer lo último de develop
git pull --rebase origin develop

# 5. Subir
git push -u origin feat/back-registro-usuario
```

Después abrís el Pull Request en GitHub y pedís revisión. Cuando está aprobado se mergea. Borrá la rama después del merge.

> Si configuraste `push.autoSetupRemote` (§2.1), el paso 5 se reduce a `git push`.
>
> **Durante el cierre de la Fase 2 la revisión se reemplaza por verificación:** ver §4.12.

> ⚠️ **El PR apunta a `develop`, no a `main`.** Al abrirlo, verificá en GitHub que el campo *base* diga `develop`. Un PR de una rama de tarea contra `main` se salta la integración.

### ⚠️ Después de que se mergea un PR

**Actualizá tu `develop` local antes de crear la rama siguiente:**

```powershell
git switch develop
git pull
```

El merge ocurre en GitHub, no en tu máquina. Si te salteás este paso y creás la rama nueva desde un `develop` viejo, tu rama nace sin los cambios que se acaban de mergear, y el push va a ser rechazado con un mensaje sobre *fast-forward* que no dice cuál es el problema real.

### 4.4 — Estrategia de merge

| PR | Cómo se mergea en GitHub | Por qué |
|---|---|---|
| Rama de tarea → `develop` | **Squash and merge** | Un commit por tarea: `develop` queda legible, sin los "wip" ni los "arreglo typo" intermedios. |
| `develop` → `main` (release) | **Create a merge commit** | Conserva el historial de la integración y mantiene `main` y `develop` alineadas. |
| `hotfix/` → `main` y `hotfix/` → `develop` | **Create a merge commit** | Mismo motivo. |

> **Nunca hagas squash de `develop` a `main`.** Si lo hacés, git deja de reconocer que `develop` ya está incluida en `main`: las dos ramas divergen y el release siguiente aparece con conflictos que nadie provocó.

Como el título del squash pasa a ser el mensaje del commit en `develop`, tiene que respetar el formato de la §5.

### 4.5 — Releases y tags

Una release es el momento en que lo que hay en `develop` pasa a producción.

1. Se abre un PR **`develop` → `main`** con título `release: vX.Y.Z` y la lista de lo que incluye.
2. Se revisa, se mergea (*merge commit*, §4.4).
3. Se le pone un **tag** al commit resultante en `main`:

```powershell
git switch main
git pull
git tag -a v0.1.0 -m "Primera version desplegable"
git push origin v0.1.0
```

Un **tag** es una etiqueta fija sobre un commit: a diferencia de una rama, no se mueve. Sirve para saber exactamente qué código corría en cada momento, volver a una versión anterior si la nueva falla y ubicar en qué versión apareció un bug. En GitHub, desde el tag se puede crear una *Release* con el listado de cambios.

**Versionado semántico:** `vMAYOR.MENOR.PARCHE`

| Qué cambió | Qué número sube | Ejemplo |
|---|---|---|
| Un bug corregido (típicamente un `hotfix/`) | PARCHE | `v1.0.0` → `v1.0.1` |
| Funcionalidad nueva que no rompe nada | MENOR | `v1.0.1` → `v1.1.0` |
| Un cambio que rompe la compatibilidad | MAYOR | `v1.1.0` → `v2.0.0` |

Mientras el proyecto no esté en producción usamos `v0.x.y`. La `v1.0.0` es la primera versión que sale al público.

### 4.6 — Hotfix: arreglos urgentes en producción

Se usa **solo** cuando hay un bug grave en lo que ya está en producción y no se puede esperar al ciclo normal. Es la única rama que nace de `main`: ahí está lo que corre en producción, mientras que `develop` puede tener trabajo a medio validar.

```
main      ●━━━━━━━━━━━━━●━━━━━━━●  v1.0.1
           ╲           ╱         ╲
hotfix      ╲━━━━━●━━━●           ╲
                                   ╲
develop   ●━━━━●━━━━━━━━━━●━━━━━━━━━●  el arreglo también baja acá
```

```powershell
git switch main
git pull
git switch -c hotfix/back-webhook-mp
# ...se arregla SOLO ese problema, sin agregar nada más...
git push -u origin hotfix/back-webhook-mp
```

1. PR **`hotfix/...` → `main`**. Se mergea y se publica con tag de PARCHE (`v1.0.1`).
2. **Después, un segundo PR `hotfix/...` → `develop`**, para que el arreglo no se pierda en el próximo release. Es el paso que más se olvida.

### 4.7 — CODEOWNERS: quién revisa qué

El archivo [`.github/CODEOWNERS`](.github/CODEOWNERS) le dice a GitHub **quién es responsable de cada carpeta**. Cuando un PR toca esos archivos, GitHub pide la revisión a esos responsables automáticamente.

```text
/tierra-backend/    @usuario-back
/tierra-frontend/   @usuario-front
```

Con la protección de rama **Require review from Code Owners** (§4.8), un PR no se puede mergear sin la aprobación del responsable del área que toca. Reemplaza a las ramas `back` y `front` como forma de controlar quién aprueba qué.

Si el archivo cambia (alguien entra o sale del equipo, o se reparten distinto las áreas), se modifica por PR como cualquier otro cambio.

### 4.8 — Protección de ramas (configuración en GitHub)

Esto se configura una sola vez en *Settings → Branches*, y lo hace quien administra el repositorio.

| Ajuste | `main` | `develop` |
|---|---|---|
| Require a pull request before merging | ✅ | ✅ |
| Required approvals | 1 | 1 |
| Require review from Code Owners | ✅ | ✅ |
| Dismiss stale approvals when new commits are pushed | ✅ | ✅ |
| Require conversation resolution before merging | ✅ | ✅ |
| Restrict force pushes / Allow deletions | ❌ / ❌ | ❌ / ❌ |

Además, en *Settings → General*:

- **Default branch: `develop`.** Así los PRs nuevos apuntan a `develop` por defecto.
- **Automatically delete head branches:** activado, para que las ramas de tarea se borren solas al mergear.

Cuando exista integración continua (fase 5), se suma **Require status checks to pass** en las dos ramas.

### 4.9 — Dos comandos que te van a salvar

- **Empezaste a editar sin crear la rama:** `git switch -c feat/lo-que-sea` se lleva los cambios sin commitear con vos.
- **Necesitás cambiar de rama con cosas a medias:** `git stash` las guarda aparte y `git stash pop` te las devuelve.

### 4.10 — Regla de oro

Si tu rama va a tocar los mismos archivos que la de otra persona, hablalo antes. Es más barato coordinarse cinco minutos que resolver un conflicto de tres archivos después.

### 4.11 — Antes de partir de `develop`, mirá qué cambió

`git pull` sobre `develop` puede traer migraciones nuevas (§7) o cambios en los scripts. Para ver qué entró desde la última vez:

```powershell
git switch develop
git pull
git --no-pager log --oneline -10
```

Si alguno de esos commits agrega una migración, el backend la aplica solo al arrancar. Si vas a volver a una rama **más vieja**, mirá la §6.7.

### 4.12 — Metodología temporal: cierre de la Fase 2

> **Regla temporal, vigente hasta el cierre de la Fase 2.** Cuando termine, esta sección se borra y vuelve a valer el flujo con revisión de §4.3 y §4.8.

Por falta de tiempo, las tareas que quedan de la Fase 2 no esperan una revisión de otra persona para mergearse. La revisión se reemplaza por **verificación**:

1. **Una tarea = una rama desde `develop` = un PR.** Las convenciones de nombres (§4.2) y commits (§5) no cambian.
2. **Quien abre el PR adjunta la verificación** en la descripción: tests del backend (`.\mvnw clean test`), los scripts `probar-*.ps1` que correspondan contra el backend y la base reales, y, si se tocó el frontend, `npm test`, `npm run lint`, `npm run build` y la prueba de las pantallas afectadas.
3. **Antes de mergear se repite una verificación corta en otra máquina:** `.\mvnw clean test` y el script de la tarea.
4. **Mergea sólo Matías, con *Squash and merge*** (§4.4). Nadie más mergea a `develop`, para que haya un único punto que controla lo que entra.
5. **Después de cada merge**, se actualiza `develop` y se vuelve a correr todo (§4.11) antes de empezar la tarea siguiente.

Lo que **no** cambia: nunca se pushea directo a `main` ni a `develop`, nunca se hace *force push* a una rama compartida, no se edita una migración mergeada (§7) y no se commitean secretos (§9).

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

No hace falta que cada commit deje la aplicación funcionando — para eso está la rama. Lo que sí tiene que funcionar es lo que se mergea a `develop`, y con más razón lo que llega a `main`.

---

## 6. Levantar el proyecto en local

El orden importa: **base de datos → backend → frontend**.

> **Hay dos `docker-compose.yml`.** El de `tierra-infra/` levanta **sólo PostgreSQL** y es el que se usa para desarrollar: el backend y el frontend corren en tu máquina, con recarga en caliente y depurador. Es el que describe esta sección.
>
> El de `tierra-infra/stack/` levanta **todo el stack en contenedores** y sirve para mostrar el sistema andando en una máquina sin Java ni Node. No se usa para desarrollar, y **no puede correr a la vez** que el otro porque comparten los puertos 5432, 8080 y 3000. Ver `tierra-infra/stack/README.md`.
>
> Vive en una subcarpeta a propósito: `docker compose` busca el archivo subiendo por las carpetas padre, así que cuando estaba en la raíz, ejecutarlo desde cualquier subcarpeta lo encontraba a él y construía todo el stack sin que nadie se lo pidiera.

### 6.1 — Base de datos

Con Docker Desktop abierto y el motor corriendo:

```powershell
cd tierra-infra
docker compose up -d
docker compose logs postgres --tail 5
```

Esperá a ver `database system is ready to accept connections`. Si arrancás el backend antes, va a fallar la conexión.

Lo mismo, sin moverte de la raíz del repo, con los atajos del `package.json`:

| Comando | Qué hace |
|---|---|
| `npm run db:up` | Levanta la base (`docker compose up -d` de `tierra-infra`) |
| `npm run db:down` | La baja, **sin borrar** los datos |
| `npm run db:logs` | Muestra el log de Postgres en vivo (`Ctrl+C` para salir) |
| `npm run db:reset` | **Borra todos los datos** y la vuelve a levantar vacía (§6.7) |

Todos apuntan a `tierra-infra/docker-compose.yml`, nunca al del stack.

**No hace falta resetearla cada día.** No es necesario hacer `docker compose down -v` cada vez que empezás a trabajar: los datos se conservan entre reinicios y Flyway aplica solo las migraciones nuevas. Resetear tiene sentido en los casos de la §6.7.

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

Flyway crea las tablas al arrancar. Con la base vacía, en el log tenés que ver una línea `Migrating schema "public" to version ...` por cada migración y al final:

```
Successfully applied 9 migrations to schema "public", now at version v8
```

(Ocho migraciones versionadas más el seed, que también cuenta. El número crece con cada migración nueva.) Las veces siguientes, si no entró ninguna migración nueva, dice `Schema "public" is up to date. No migration necessary.`

Con el perfil `dev` también aparece una línea `[DEV] Los códigos de acceso se escriben en ...` con la carpeta donde vas a encontrar los códigos de acceso (§6.3).

### 6.3 — Datos de prueba

**No hay que hacer nada.** El seed lo carga Flyway al arrancar el backend, siempre que tengas `SPRING_PROFILES_ACTIVE=dev` en tu `.env` (§2.5).

Vive en `tierra-backend/src/main/resources/db/dev/R__seed_dev.sql` y es una migración **repetible**: si querés sumar productos de prueba, editá ese archivo y reiniciá el backend. No hace falta borrar la base — todos los `INSERT` usan `ON CONFLICT DO NOTHING`.

Hay tres usuarios de prueba. Desde la decisión 0005, **los clientes no tienen contraseña**: entran con un código de seis dígitos que piden por email. La contraseña queda sólo para el equipo.

| Email | Rol | Cómo entra |
|---|---|---|
| `test@tierra.esquel` | CLIENTE | Con código, en `/login` |
| `mostrador@tierra.esquel` | OPERADOR | Con la contraseña **`tierra2026`**, en `/equipo` |
| `admin@tierra.esquel` | ADMIN | Con la contraseña **`tierra2026`**, en `/equipo` |

**Dónde ver el código en desarrollo.** Todavía no hay módulo de emails, así que con el perfil `dev` el código no se manda: el backend lo escribe en dos lugares.

- En el log del backend, en una línea `[DEV] Código de acceso para test@tierra.esquel: 123456`.
- En el archivo `target/codigos-dev/test@tierra.esquel.txt`, relativo a la carpeta desde la que arrancaste el backend: `tierra-backend/target/codigos-dev/` si usaste `run-dev.ps1`, o `target/codigos-dev/` en la raíz del repo si arrancaste desde VS Code. La ruta exacta sale en el log al arrancar (§6.2).

El código vence a los 10 minutos y pedir uno nuevo invalida el anterior. Ese archivo y esa línea existen **sólo** con el perfil `dev`: fuera de él, ninguna parte del sistema muestra un código.

> Si arrancás **sin** el perfil `dev`, el backend levanta igual pero la base queda con el esquema vacío. Es a propósito: el comportamiento por defecto es el de producción, donde estos datos no tienen que existir.

### 6.4 — Frontend

En otra terminal:

```powershell
cd tierra-frontend
npm install
npm run dev
```

### 6.5 — Scripts de verificación

En `tierra-backend/` hay scripts que comprueban el comportamiento de la API contra el backend y la base reales. Conviene correrlos después de tocar `SecurityConfig`, `AuthService`, `CodigoAccesoService` o cualquier contrato de la API. Se corren desde `tierra-backend`, con el backend levantado en el perfil `dev`:

| Script | Qué verifica |
|---|---|
| `probar-codigo.ps1` | El acceso de clientes por código: la misma respuesta para cualquier email, el código correcto abre sesión, pedir uno nuevo invalida el anterior, límite de códigos por cuarto de hora, intentos fallidos, bloqueo, un solo canal por cuenta y que las rutas viejas de registro y login ya no existan |
| `probar-auth.ps1` | El login del equipo con contraseña: login y logout, el mismo mensaje para cualquier credencial incorrecta, bloqueo por intentos, CSRF y exención del webhook |
| `probar-permisos.ps1` | Las reglas por endpoint y la distinción Administrador / Operador, con el cliente entrando por código y el equipo por contraseña |
| `probar-checkout.ps1` | El checkout sin cuenta: comprar sin sesión con un email nuevo o existente (la cuenta no se toca), el email del equipo rechazado, la sesión de cliente y la del equipo, DNI, piso y departamento en el pedido, el envío cobrado igual a la cotización, datos inválidos sin crear nada y cinco compras simultáneas con el mismo email nuevo. Sin un token de prueba válido de Mercado Pago cada compra responde 503 con el pedido ya cancelado; el script acepta eso y verifica que no quede stock reservado |
| `probar-catalogo.ps1` | El catálogo comparado con lo que hay en la base: categorías y marcas, y la búsqueda de productos (paginación, orden, subcategorías, texto sin tildes, talle y color con stock, filtros combinados, parámetros inválidos y precio por variante) |
| `probar-envios.ps1` | La cotización de envío: retiro sin costo, las provincias de la zona sin importar tildes, fuera de zona con oferta de retiro, datos inválidos, CSRF, y que el pedido cobre exactamente lo que dijo la cotización |
| `probar-webhook.ps1` | La notificación de pago de Mercado Pago: rechaza una firma falsa, concilia un pago de prueba y no lo procesa dos veces. Recibe el número de operación de un pago hecho con credenciales de prueba (`-PagoId`) |

`probar-comun.ps1` no se ejecuta solo: tiene las funciones que comparten los demás. Los scripts leen la base a través del contenedor `tierra-postgres`, así que Docker tiene que estar corriendo.

Cada caso imprime el código obtenido y el esperado. Todos tienen que decir `OK`. Se pueden correr cuantas veces haga falta: los que tocan el acceso reinician los códigos y desbloquean las cuentas de prueba antes de empezar.

Si Windows se niega a ejecutarlos con *"no está firmado digitalmente"*, ver §2.3.

> Son un sustituto temporal de los tests automatizados, que llegan en la fase 5: sólo protegen mientras alguien se acuerde de ejecutarlos.

### 6.6 — Verificación

```powershell
Invoke-RestMethod "http://localhost:8080/api/productos?categoriaId=c0000000-0000-0000-0000-000000000001"
```

Tiene que devolver una página con la bicicleta de prueba (`/api/productos` sin parámetros devuelve todo el catálogo; el contrato está en `docs/contratos-fase2.md`). Y `http://localhost:3000` tiene que abrir el sitio.

> Usá `Invoke-RestMethod` y no `curl`: en PowerShell, `curl` es un alias de `Invoke-WebRequest`, que parsea la respuesta como HTML y te pide confirmación por seguridad.

### 6.7 — Resetear la base desde cero

```powershell
cd tierra-infra
docker compose down -v      # el -v borra el volumen y con él todos los datos
docker compose up -d
```

O, desde la raíz del repo, `npm run db:reset`. Después arrancá el backend: Flyway recrea las tablas y, con el perfil `dev`, vuelve a cargar el seed solo.

> ⚠️ `docker compose down -v` **siempre desde `tierra-infra`** (o con `npm run db:reset`). Ejecutado en otra carpeta, `docker compose` busca el archivo subiendo por las carpetas padre y puede terminar actuando sobre otro proyecto, o fallar sin decir por qué.

**Cuándo hace falta resetear.** No en el día a día: los datos sobreviven entre reinicios y el backend aplica solo las migraciones nuevas. Sí en estos casos:

- **Cambiás a una rama con menos migraciones** que las que ya tiene tu base (una rama vieja, o una que salió de `develop` antes de que entrara una migración). Flyway no deshace migraciones: la base queda con un esquema que el código de esa rama no espera, y el backend no arranca o falla el seed (ver §8). Reseteá, trabajá en esa rama, y al volver a `develop` reseteá otra vez.
- **Un error de Flyway de validación o checksum** (`Validate failed`, `checksum mismatch`): alguien editó una migración ya aplicada en tu base. Si fue en tu rama, deshacé el cambio y creá una migración nueva (§7); si ya está en `develop`, reseteá.
- **La password de la base no coincide** con la del `.env` (ver §8).
- **Querés volver a los datos de prueba limpios**, por ejemplo después de crear muchos pedidos a mano.

---

## 7. Cambios en la base de datos

**El esquema lo gestiona Flyway. No se modifica la base a mano ni se edita una migración ya mergeada.**

Para cambiar algo, creás un archivo nuevo en `tierra-backend/src/main/resources/db/migration/`:

```
V9__pedidos_datos_de_contacto.sql
```

(Es un ejemplo: el número que te toca es el siguiente al último que haya en la carpeta.)

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

Si las variables están bien definidas, puede ser que el volumen de Postgres traiga datos viejos con otra password: reseteá la base (§6.7).

### `mvn` no se reconoce como comando

Usá `.\mvnw`, no `mvn`. El proyecto trae el wrapper justamente para no depender de una instalación global.

### Errores rojos en VS Code después de un pull que renombró carpetas

`Ctrl+Shift+P` → *Java: Clean Java Language Server Workspace* → **Restart and delete**. Tarda un par de minutos en reindexar.

### El backend no arranca: falla `R__seed_dev.sql` con `violates check constraint`

Tu base tiene migraciones que el código de la rama actual no conoce: típicamente, cambiaste a una rama que salió de `develop` antes de que entrara una migración nueva. El seed de esa rama inserta datos que una restricción de la migración nueva ya no admite (pasó con `chk_usuarios_metodo_acceso`, de la V8: el seed viejo le daba contraseña a `test@`).

Reseteá la base (§6.7) antes de arrancar en esa rama, y otra vez al volver a `develop`. Si la rama es tuya y sigue viva, traele lo último con `git pull --rebase origin develop`.

### El backend no arranca: `Configuración del acceso por código inválida: falta CODIGO_ACCESO_CLAVE`

Tenés `CODIGO_ACCESO_CLAVE=` sin valor en tu `.env`. Una variable vacía reemplaza a la clave fija del perfil `dev`, así que el backend se queda sin clave. Volvé a comentarla (`# CODIGO_ACCESO_CLAVE=`), como viene en el `.env.example` (§2.5).

Si no estás en el perfil `dev`, el error es correcto: fuera de desarrollo hace falta una clave propia de al menos 32 bytes.

### `docker compose` levanta el stack completo (o un proyecto que no es) sin que se lo pidas

Ejecutaste `docker compose` desde una carpeta sin `docker-compose.yml`, y encontró otro subiendo por las carpetas padre. Para la base de desarrollo, entrá a `tierra-infra` o usá `npm run db:up` desde la raíz (§6.1). Si se levantó el stack, bajalo desde `tierra-infra\stack` con `docker compose down`.

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

Cada decisión lleva un **estado**: *propuesta*, *aceptada*, *modificada por NNNN* o *reemplazada por NNNN*. Cuando una decisión cambia, el documento viejo **no se reescribe**: se escribe uno nuevo que explique qué cambió y por qué, y al viejo se le actualiza el estado y, si hace falta, se le agrega una nota que indique qué partes quedaron sin efecto. Así queda la historia. Por ejemplo, la 0005 (compra sin cuenta y acceso por código) reemplazó a la 0002 y modificó a la 0003.

---

## 11. Antes de abrir un Pull Request

- [ ] El backend compila y arranca (`.\mvnw spring-boot:run`)
- [ ] Los tests del backend pasan (`.\mvnw clean test`)
- [ ] Si tocaste la API, corriste los scripts de verificación que correspondan (§6.5) y todos dicen `OK`
- [ ] El frontend compila (`npm run build`) y sus pruebas pasan (`npm test`)
- [ ] `git status` no muestra archivos que no querías subir
- [ ] No hay credenciales, tokens ni rutas absolutas de tu máquina en el diff
- [ ] Si tocaste el esquema, hay una migración nueva y las entidades están actualizadas
- [ ] Hiciste `git pull --rebase origin develop` y no quedaron conflictos
- [ ] El PR apunta a `develop` (o a `main`, solo si es un `hotfix/` o un release; ver §4)
- [ ] El nombre de la rama sigue el formato `<prefijo>/<área>-<descripción>` (§4.2)
- [ ] La descripción del PR dice **qué cambia y cómo probarlo**
