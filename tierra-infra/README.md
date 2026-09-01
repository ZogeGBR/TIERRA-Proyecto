# Tierra — levantar todo en local

Este paquete tiene lo que falta entre `tierra-backend` y `tierra-frontend`
para verlo funcionando de punta a punta: la base de datos con el schema
v3 ya aplicado y datos de prueba cargados.

Ver también `tierra-como-levantar-el-proyecto.md` para la guía paso a paso
completa en PowerShell (Windows), con la rutina del día a día y los
problemas conocidos ya resueltos.

## 0. Qué necesitás instalado

- **Docker Desktop** — para la base.
- **Java** y **Maven** — para el backend.
- **Node.js 18+** — para el frontend.

## 1. Base de datos

Parado en esta carpeta (`tierra-infra`):

```
docker compose up -d
```

La primera vez que se levanta, Postgres ejecuta automáticamente
`init-db/01-schema.sql` (crea todas las tablas) y luego
`init-db/02-seed-data.sql` (carga marcas, categorías, productos con
stock, equipo de alquiler y usuarios de prueba). Tarda unos segundos.

Para confirmar que quedó arriba: `docker compose ps` — el contenedor
`tierra-postgres` tiene que figurar como `healthy` o `running`.

**Si necesitás volver a cargar los datos desde cero** (por ejemplo,
porque cambió el schema): los scripts de init solo corren la primera
vez que se crea el volumen. Para forzar que corran de nuevo:
```
docker compose down -v   # -v borra el volumen, y con él los datos
docker compose up -d
```

## 2. Backend

En otra terminal, parado en `tierra-backend` (la subcarpeta que tiene el
`pom.xml` adentro):

```
$env:DB_PASSWORD="tierra_dev_local"
$env:MP_ACCESS_TOKEN="TEST-0000000000000000-000000-00000000000000000000000000000000-000000000"
$env:JAVA_TOOL_OPTIONS="-Duser.timezone=UTC"
mvn spring-boot:run
```

El `MP_ACCESS_TOKEN` de arriba es un valor de relleno — alcanza para que
la aplicación arranque, pero **para que el checkout con Mercado Pago
funcione de verdad** hay que reemplazarlo por un access token de prueba
real, que se genera gratis en el panel de desarrolladores de Mercado Pago.

Si arrancó bien, en `http://localhost:8080/api/productos?categoriaId=c0000000-0000-0000-0000-000000000001`
debería devolver la bicicleta de prueba en JSON.

## 3. Frontend

En una tercera terminal, parado en `tierra-frontend`:

```
npm install
npm run dev
```

Abrí `http://localhost:3000`.

## 4. Datos de prueba disponibles

Categorías con card propia en la home (ver `02-seed-data.sql` para el
resto de los IDs):
- Bicicletas: `c0000000-0000-0000-0000-000000000001`
- Ropa deportiva: `c0000000-0000-0000-0000-000000000003`
- Ropa urbana: `c0000000-0000-0000-0000-000000000004`
- Carpas: `c0000000-0000-0000-0000-000000000005`
- Mochilas: `c0000000-0000-0000-0000-000000000006`
- Cascos: `c0000000-0000-0000-0000-000000000007`

Usuario y dirección de prueba para probar el checkout directo contra la
API (`CrearPedidoRequest` los pide porque todavía no hay login):
- `usuarioId`: `99000000-0000-0000-0000-000000000001`
- `direccionEnvioId`: `88000000-0000-0000-0000-000000000001`

## Qué todavía no vas a poder probar de punta a punta

- **El checkout real desde el frontend** — no hay login todavía, así que
  el formulario no completa `usuarioId`/`direccionEnvioId` solo. Se puede
  probar llamando al endpoint directo con los IDs de arriba.
- **El pago con Mercado Pago** — funciona solo si pusiste un access token
  de prueba real en el paso 2.
