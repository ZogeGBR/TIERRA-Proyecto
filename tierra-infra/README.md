# Tierra — levantar todo en local

Este paquete tiene lo que falta entre `tierra-backend` y `tierra-frontend`
para verlo funcionando de punta a punta: la base de datos con el schema
v2 ya aplicado y datos de prueba cargados.

## 0. Qué necesitás instalado

- **Docker Desktop** (o Docker + docker compose sueltos) — para la base.
- **Java 17** y **Maven** — para el backend.
- **Node.js 18+** — para el frontend.

## 1. Base de datos

Parado en esta carpeta (`tierra-infra`):

```
docker compose up -d
```

La primera vez que se levanta, Postgres ejecuta automáticamente
`init-db/01-schema.sql` (crea todas las tablas) y luego
`init-db/02-seed-data.sql` (carga marcas, categorías, productos con
stock, equipo de alquiler y dos usuarios de prueba). Tarda unos segundos.

Para confirmar que quedó arriba: `docker compose ps` — el contenedor
`tierra-postgres` tiene que figurar como `healthy` o `running`.

**Si necesitás volver a cargar los datos desde cero** (por ejemplo,
porque cambiaste el schema): los scripts de init solo corren la primera
vez que se crea el volumen. Para forzar que corran de nuevo:
```
docker compose down -v   # -v borra el volumen, y con él los datos
docker compose up -d
```

## 2. Backend

En otra terminal, parado en `tierra-backend`:

```
export DB_PASSWORD=tierra_dev_local
export MP_ACCESS_TOKEN=TEST-0000000000000000-000000-00000000000000000000000000000000-000000000
mvn spring-boot:run
```

El `MP_ACCESS_TOKEN` de arriba es un valor de relleno — alcanza para que
la aplicación arranque (la necesita en `application.yml`), pero **para
que el checkout con Mercado Pago funcione de verdad** hay que reemplazarlo
por un access token de prueba real, que se genera gratis en el panel de
desarrolladores de Mercado Pago (Tus integraciones → credenciales de prueba).

Si arrancó bien, en `http://localhost:8080/api/productos?categoriaId=c0000000-0000-0000-0000-000000000001`
debería devolver la bicicleta de prueba en JSON.

## 3. Frontend

En una tercera terminal, parado en `tierra-frontend`:

```
npm install
cp .env.local.example .env.local
npm run dev
```

Abrí `http://localhost:3000`.

## 4. Cómo navegar con los datos de prueba

Un gap que quedó pendiente en el frontend: la home linkea a
`/productos?categoria=bicicletas` (un slug), pero el backend espera
`/productos?categoriaId=<uuid>`. Hasta que se resuelva ese punto
(agregar `GET /api/categorias` para resolver slug → id, como quedó
anotado en el `README.md` del frontend), navegá directo con los IDs de
`02-seed-data.sql`, por ejemplo:

- Bicicletas: `http://localhost:3000/productos?categoriaId=c0000000-0000-0000-0000-000000000001`
- Ropa deportiva: `http://localhost:3000/productos?categoriaId=c0000000-0000-0000-0000-000000000003`
- Mochilas: `http://localhost:3000/productos?categoriaId=c0000000-0000-0000-0000-000000000006`

Desde ahí se puede entrar al detalle de cualquier producto y agregarlo
al carrito con normalidad.

## Qué todavía no vas a poder probar de punta a punta

- **El checkout real** — `CrearPedidoRequest` pide un `usuarioId` y
  `direccionEnvioId` que hoy el frontend no completa solo (no hay
  login). Podés probar el endpoint directo con el usuario y la dirección
  de prueba que carga el seed:
  - `usuarioId`: `99000000-0000-0000-0000-000000000001`
  - `direccionEnvioId`: `88000000-0000-0000-0000-000000000001`
- **El pago con Mercado Pago** — funciona solo si pusiste un access
  token de prueba real en el paso 2.
- **La venta de mostrador** (`/api/ventas-locales`) — no tiene pantalla
  en el frontend todavía, se puede probar solo llamando a la API
  directo (por ejemplo con curl o Postman), abriendo antes una sesión de
  caja con el usuario `99000000-0000-0000-0000-000000000002`.
