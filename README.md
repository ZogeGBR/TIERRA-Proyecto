# Tierra — Plataforma E-Commerce & Alquiler Outdoor


> 📌 **Antes de tu primer commit**, leé [CONTRIBUTING.md](CONTRIBUTING.md): convenciones de ramas, commits y configuración inicial de tu máquina.

Plataforma integral de comercio electrónico para la venta de bicicletas, indumentaria y accesorios outdoor, junto con el sistema de alquiler de equipos de nieve e invierno en la Patagonia.

---

## 🏛️ Estructura del Proyecto

El repositorio está organizado en tres componentes principales:

```text
TIERRA-Proyecto/
├── tierra-infra/             # Base de datos PostgreSQL 16 en Docker
│   ├── docker-compose.yml    # Sólo la base: el que se usa para desarrollar
│   └── stack/                # Base + backend + frontend en contenedores, para demos
│
├── tierra-backend/           # API REST en Spring Boot 3.3 + Java 17 + Hibernate
│   ├── src/                  # Controladores, servicios, entidades JPA, DTOs y jobs
│   │   └── main/resources/db/  # Migraciones de Flyway (migration/) y seed de prueba (dev/)
│   ├── run-dev.ps1           # Arranca el backend leyendo el .env de la raíz
│   ├── probar-*.ps1          # Scripts de verificación contra la API
│   └── pom.xml               # Dependencias de Maven (se usa con el wrapper .\mvnw)
│
├── tierra-frontend/          # Interfaz web en Next.js 15.5 + React 19 + TailwindCSS
│   ├── app/                  # Rutas de App Router (catálogo, carrito, checkout, alquiler, login)
│   ├── components/           # Componentes reutilizables de UI
│   └── package.json          # Dependencias de Node.js
│
├── docs/                     # Decisiones de arquitectura (ADR), guía de ramas y entregas
├── .vscode/                  # Configuración de ejecución y depuración para el IDE
└── TIERRA-...                # Diagramas UML de clases, contratos y políticas legales
```

---

## 📋 Requisitos Previos

Antes de comenzar, verificá tener instalado el software necesario. Si te falta alguno, seguí las instrucciones de la sección siguiente.

| Herramienta | Versión requerida | Comando de verificación |
| :--- | :--- | :--- |
| **Docker Desktop** | Última versión estable | `docker --version` |
| **Java JDK** | Java 17 LTS | `java -version` |
| **Node.js** | v18.18 o superior (recomendado: la LTS actual) | `node -v` |
| **npm** | v9 o superior | `npm -v` |
| **Git** | Cualquier versión reciente | `git --version` |

---

## 📥 Instalación de Dependencias Faltantes (Windows)

Si todavía no tenés instalada alguna de las herramientas, podés instalarlas desde sus páginas oficiales o directamente desde una terminal de PowerShell ejecutando los comandos de `winget`:

### 1. Docker Desktop
* **Opción A (Comando)**:
  ```powershell
  winget install Docker.DockerDesktop
  ```
* **Opción B (Descarga web)**: [Descargar Docker Desktop para Windows](https://www.docker.com/products/docker-desktop/)
* **Requisito en Windows**: Asegurate de tener habilitado **WSL 2** (Windows Subsystem for Linux). Si te lo pide, ejecutá en PowerShell como Administrador:
  ```powershell
  wsl --install
  ```
* ⚠️ **Importante**: Docker Desktop debe ser iniciado manualmente desde el menú de inicio antes de ejecutar cualquier comando de Docker. Esperá a que el ícono esté en verde (*"Engine running"*).

### 2. Java JDK 17
* **Opción A (Comando)**:
  ```powershell
  winget install EclipseAdoptium.Temurin.17.JDK
  ```
* **Opción B (Descarga web)**: [Descargar Eclipse Temurin JDK 17](https://adoptium.net/temurin/releases/?version=17) o [Oracle JDK 17](https://www.oracle.com/java/technologies/downloads/#java17).
* Recordá reiniciar la terminal para que reconozca el comando `java`. Lo que usa Maven es la variable `JAVA_HOME`: si `.\mvnw -v` no encuentra Java, configurala como explica [CONTRIBUTING.md §2.2](CONTRIBUTING.md#22--java-17).

### 3. Node.js y npm
* **Opción A (Comando)**:
  ```powershell
  winget install OpenJS.NodeJS.LTS
  ```
* **Opción B (Descarga web)**: [Descargar Node.js LTS](https://nodejs.org/).

### 4. Extensiones recomendadas para el IDE (VS Code / Antigravity IDE)
* **Extension Pack for Java** (incluye soporte para Java, Maven y Debugger).
* **Tailwind CSS IntelliSense**.

---

## 🚀 Guía Paso a Paso para Ejecutar el Proyecto

El orden correcto de inicio es: **1. Base de Datos ➜ 2. Backend ➜ 3. Frontend**.

Esta es la versión corta. La guía completa, con el detalle de cada variable y los problemas conocidos, está en [CONTRIBUTING.md §6](CONTRIBUTING.md#6-levantar-el-proyecto-en-local).

---

### Paso 0: Configuración inicial (una sola vez)

Desde la raíz del repo, creá los dos archivos de entorno a partir de sus plantillas:

```powershell
Copy-Item .env.example .env
Copy-Item tierra-frontend\.env.local.example tierra-frontend\.env.local
```

El `.env` de la raíz ya sirve para desarrollar tal como viene. Para que el pago con Mercado Pago funcione de verdad, reemplazá `MP_ACCESS_TOKEN` por un access token de prueba propio (se genera gratis en el panel de desarrolladores de Mercado Pago). Ninguno de los dos archivos se sube al repo.

Además, permití ejecutar los scripts de PowerShell del proyecto ([CONTRIBUTING.md §2.3](CONTRIBUTING.md#23--scripts-de-powershell)):

```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

---

### Paso 1: Base de Datos (Docker)

1. Abrí la aplicación **Docker Desktop** en Windows y esperá a que indique *"Engine running"*.
2. En una terminal de PowerShell, situate en la carpeta `tierra-infra` y levantá el contenedor:
   ```powershell
   cd tierra-infra
   docker compose up -d
   ```
   *(O, desde la raíz del repo: `npm run db:up`.)*
3. Verificá que el contenedor esté activo:
   ```powershell
   docker compose ps
   ```
   *(Debe figurar `tierra-postgres` en estado `Up` o `running` exponiendo el puerto `5432`).*

La base arranca vacía: **las tablas las crea el backend** al arrancar (con Flyway) y, con el perfil `dev`, también carga los datos de prueba. No hay scripts SQL que correr a mano.

> 💡 **Nota para reiniciar la base**: no hace falta en el día a día, porque los datos se conservan y el backend aplica solo las migraciones nuevas. Si querés volver a cero (o cambiás a una rama con menos migraciones, ver [CONTRIBUTING.md §6.7](CONTRIBUTING.md#67--resetear-la-base-desde-cero)), desde `tierra-infra`:
> ```powershell
> docker compose down -v
> docker compose up -d
> ```
> *(O, desde la raíz del repo: `npm run db:reset`. Borra todos los datos.)*

---

### Paso 2: Backend (Spring Boot)

El backend corre en el puerto **`8080`** y se conecta a PostgreSQL en `localhost:5432`.

#### Opción recomendada: Ejecutar desde el IDE
1. Abrí el archivo [`TierraApplication.java`](tierra-backend/src/main/java/com/tierra/ecommerce/TierraApplication.java).
2. Hacé clic en el botón **Run** o **Debug** arriba de la función `main` o en el panel de ejecución.
3. El `.vscode/launch.json` lee las variables de entorno de tu `.env` de la raíz (Paso 0), así que no hay que cargarlas a mano.

#### Opción alternativa: Ejecutar por consola (PowerShell)
En una terminal, desde la raíz del repo:
```powershell
cd tierra-backend
.\run-dev.ps1
```
El script lee tu `.env`, exporta las variables y arranca el backend con el wrapper de Maven (`.\mvnw`). Maven no lee el `.env` por su cuenta: sin el script, hay que exportar cada variable a mano ([CONTRIBUTING.md §6.2](CONTRIBUTING.md#62--backend)).

#### Verificación del Backend
Abrí en el navegador o en Postman:
[http://localhost:8080/api/productos?categoriaId=c0000000-0000-0000-0000-000000000001](http://localhost:8080/api/productos?categoriaId=c0000000-0000-0000-0000-000000000001)
Deberías ver una respuesta JSON con la bicicleta de prueba.

---

### Paso 3: Frontend (Next.js)

En **otra ventana de terminal**, desde la raíz del repo:

1. Navegá a la carpeta del frontend:
   ```powershell
   cd tierra-frontend
   ```
2. Instalá los paquetes de Node.js:
   ```powershell
   npm install
   ```
3. Iniciá el servidor de desarrollo:
   ```powershell
   npm run dev
   ```
4. Abrí en tu navegador:
   **[http://localhost:3000](http://localhost:3000)**

*(El `.env.local` del Paso 0 contiene `NEXT_PUBLIC_API_URL=http://localhost:8080/api`.)*

---

## 🧪 Datos de Prueba Disponibles

El seed de desarrollo (`tierra-backend/src/main/resources/db/dev/R__seed_dev.sql`) precarga datos útiles para pruebas.

* **Usuarios de prueba**: los clientes **no tienen contraseña** (decisión [0005](docs/decisiones/0005-acceso-por-codigo-y-compra-sin-cuenta.md)): entran con un código de seis dígitos. La contraseña es sólo para el equipo.

  | Email | Rol | Cómo entra |
  | :--- | :--- | :--- |
  | `test@tierra.esquel` | Cliente | Con código, en `/login` |
  | `mostrador@tierra.esquel` | Operador | Con la contraseña `tierra2026`, en `/equipo` |
  | `admin@tierra.esquel` | Administrador | Con la contraseña `tierra2026`, en `/equipo` |

  Mientras no exista el envío de emails, en desarrollo el código aparece en el log del backend y en un archivo dentro de `target/codigos-dev/` ([CONTRIBUTING.md §6.3](CONTRIBUTING.md#63--datos-de-prueba)).

* **Categorías para filtrar el catálogo**:
  * Bicicletas: `c0000000-0000-0000-0000-000000000001`
  * Ropa deportiva: `c0000000-0000-0000-0000-000000000003`
  * Ropa urbana: `c0000000-0000-0000-0000-000000000004`
  * Carpas: `c0000000-0000-0000-0000-000000000005`
  * Mochilas: `c0000000-0000-0000-0000-000000000006`
  * Cascos: `c0000000-0000-0000-0000-000000000007`

* **Scripts de verificación**: en `tierra-backend/` hay scripts `probar-*.ps1` que prueban la API contra el backend y la base reales. Qué verifica cada uno está en [CONTRIBUTING.md §6.5](CONTRIBUTING.md#65--scripts-de-verificación).

---

## 🛠️ Solución de Problemas Frecuentes (Troubleshooting)

### 1. `open //./pipe/dockerDesktopLinuxEngine: The system cannot find the file specified`
* **Causa**: Docker Desktop está cerrado o aún no terminó de iniciar.
* **Solución**: Abrí la aplicación Docker Desktop en Windows y esperá a que el motor esté activo antes de ejecutar `docker compose up -d`.

### 2. `HibernateException: Unable to determine Dialect without JDBC metadata`
* **Causa**: Spring Boot no pudo conectarse a PostgreSQL.
* **Solución**: Asegurate de haber levantado primero el contenedor de Docker con `docker compose up -d` en `tierra-infra` y que el puerto `5432` esté escuchando.

### 3. Puerto 8080 o 3000 ocupado
Si un proceso quedó colgado en segundo plano ocupando el puerto:
* Buscá el PID del proceso:
  ```powershell
  Get-NetTCPConnection -LocalPort 8080 -ErrorAction SilentlyContinue | Select-Object OwningProcess
  ```
* Finalizá el proceso:
  ```powershell
  Stop-Process -Id <PID> -Force
  ```

### 4. Advertencias de vulnerabilidades en `npm install`
* Las advertencias de `npm audit` no impiden el funcionamiento local.
* Evitá usar `npm audit fix --force`: puede actualizar dependencias a versiones mayores incompatibles con el proyecto. Las actualizaciones de versión (por ejemplo, de Next.js) se hacen en su propia rama y PR.

### 5. Otros errores
Los problemas conocidos del backend (zona horaria, password de la base, Flyway, scripts de PowerShell bloqueados) están en [CONTRIBUTING.md §8](CONTRIBUTING.md#8-problemas-conocidos-y-cómo-resolverlos).
