# Tierra — Plataforma E-Commerce & Alquiler Outdoor

Plataforma integral de comercio electrónico para la venta de bicicletas, indumentaria y accesorios outdoor, junto con el sistema de alquiler de equipos de nieve e invierno en la Patagonia.

---

## 🏛️ Estructura del Proyecto

El repositorio está organizado en tres componentes principales:

```text
Pagina/
├── tierra-infra/          # Base de datos PostgreSQL 16 y Docker Compose
│   ├── docker-compose.yml # Definición del contenedor tierra-postgres
│   └── init-db/           # Scripts SQL iniciales (01-schema.sql y 02-seed-data.sql)
│
├── tierra-backendV8/      # API REST en Spring Boot 3 + Java 17 + Hibernate
│   ├── src/               # Controladores, Servicios, Entidades JPA, DTOs y Jobs
│   ├── schema.sql         # Esquema relacional v3 de referencia
│   └── pom.xml            # Dependencias de Maven
│
├── tierra-frontendV1.1/   # Interfaz web en Next.js 14 + React 18 + TailwindCSS
│   ├── app/               # Rutas de App Router (catálogo, carrito, checkout, alquiler)
│   ├── components/        # Componentes reutilizables de UI
│   └── package.json       # Dependencias de Node.js
│
├── .vscode/               # Configuraciones de ejecución y depuración para el IDE
└── TIERRA-...             # Diagramas UML de clases, contratos y políticas legales
```

---

## 📋 Requisitos Previos

Antes de comenzar, verificá tener instalado el software necesario. Si te falta alguno, seguí las instrucciones de la sección siguiente.

| Herramienta | Versión requerida | Comando de verificación |
| :--- | :--- | :--- |
| **Docker Desktop** | Última versión estable | `docker --version` |
| **Java JDK** | Java 17 LTS | `java -version` |
| **Node.js** | v18.0 o superior (recomendado LTS) | `node -v` |
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
* Recordá reiniciar la terminal para que reconozca la variable de entorno `JAVA_HOME` y el comando `java`.

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

---

### Paso 1: Base de Datos (Docker)

1. Abrí la aplicación **Docker Desktop** en Windows y esperá a que indique *"Engine running"*.
2. En una terminal de PowerShell, situate en la carpeta `tierra-infra` y levantá el contenedor:
   ```powershell
   cd c:\Mati\F97\Tierra\Pagina\tierra-infra
   docker compose up -d
   ```
3. La primera vez se ejecutarán automáticamente los scripts dentro de `init-db/`:
   * `01-schema.sql`: Crea las tablas del esquema relacional v3.
   * `02-seed-data.sql`: Carga datos de prueba (categorías, bicicletas, cascos, indumentaria y usuarios demo).
4. Verificá que el contenedor esté activo:
   ```powershell
   docker compose ps
   ```
   *(Debe figurar `tierra-postgres` en estado `Up` o `running` exponiendo el puerto `5432`).*

> 💡 **Nota para reiniciar la base**: Si alguna vez modificás los scripts de base de datos o querés reiniciar todos los datos a cero, ejecutá:
> ```powershell
> docker compose down -v
> docker compose up -d
> ```

---

### Paso 2: Backend (Spring Boot)

El backend corre en el puerto **`8080`** y se conecta a PostgreSQL en `localhost:5432`.

#### Opción recomendada: Ejecutar desde el IDE
1. Abrí el archivo [`TierraApplication.java`](tierra-backendV8/src/main/java/com/tierra/ecommerce/TierraApplication.java).
2. Hacé clic en el botón **Run** o **Debug** arriba de la función `main` o en el panel de ejecución.
3. El proyecto ya incluye el archivo `.vscode/launch.json` configurado con las variables de entorno de desarrollo (`DB_PASSWORD` y `MP_ACCESS_TOKEN`).

#### Opción alternativa: Ejecutar por consola (PowerShell)
En una terminal en la carpeta `tierra-backendV8`:
```powershell
cd c:\Mati\F97\Tierra\Pagina\tierra-backendV8
$env:DB_PASSWORD="tierra_dev_local"
$env:MP_ACCESS_TOKEN="TEST-0000000000000000-000000-00000000000000000000000000000000-000000000"
$env:JAVA_TOOL_OPTIONS="-Duser.timezone=UTC"
```
Si tenés Maven instalado globalmente:
```powershell
mvn spring-boot:run
```

#### Verificación del Backend
Abrí en el navegador o en Postman:
[http://localhost:8080/api/productos?categoriaId=c0000000-0000-0000-0000-000000000001](http://localhost:8080/api/productos?categoriaId=c0000000-0000-0000-0000-000000000001)
Deberías ver una respuesta JSON con la lista de bicicletas cargadas en la base.

---

### Paso 3: Frontend (Next.js)

En **otra ventana de terminal**:

1. Navegá a la carpeta del frontend:
   ```powershell
   cd c:\Mati\F97\Tierra\Pagina\tierra-frontendV1.1
   ```
2. Creá el archivo de variables locales de entorno (solo la primera vez):
   ```powershell
   Copy-Item .env.local.example .env.local
   ```
   *(Contiene `NEXT_PUBLIC_API_URL=http://localhost:8080/api`).*
3. Instalá los paquetes de Node.js:
   ```powershell
   npm install
   ```
4. Iniciá el servidor de desarrollo:
   ```powershell
   npm run dev
   ```
5. Abrí en tu navegador:
   **[http://localhost:3000](http://localhost:3000)**

---

## 🧪 Datos de Prueba Disponibles

El script inicial `02-seed-data.sql` precarga identificadores útiles para pruebas:

* **Categorías para filtrar el catálogo**:
  * Bicicletas: `c0000000-0000-0000-0000-000000000001`
  * Ropa deportiva: `c0000000-0000-0000-0000-000000000003`
  * Ropa urbana: `c0000000-0000-0000-0000-000000000004`
  * Carpas: `c0000000-0000-0000-0000-000000000005`
  * Mochilas: `c0000000-0000-0000-0000-000000000006`
  * Cascos: `c0000000-0000-0000-0000-000000000007`
* **Usuario y Dirección de prueba para pedidos**:
  * `usuarioId`: `99000000-0000-0000-0000-000000000001`
  * `direccionEnvioId`: `88000000-0000-0000-0000-000000000001`

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
* Las advertencias sobre versiones de `next`, `glob` o `minimatch` no impiden el funcionamiento local.
* Para actualizar a la última versión con parches de la rama 14 sin romper librerías:
  ```powershell
  npm install next@14.2.35
  ```
* Evitá usar `npm audit fix --force` ya que podría introducir cambios incompatibles con la versión actual del proyecto.