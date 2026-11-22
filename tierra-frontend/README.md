# Tierra — frontend

Next.js 15.5 + React 19 (App Router) + TypeScript + Tailwind, consumiendo la API de `tierra-backend`.

## Cómo levantarlo

1. `npm install`
2. `Copy-Item .env.local.example .env.local` y revisar `NEXT_PUBLIC_API_URL` (y, si querés, `NEXT_PUBLIC_WHATSAPP_ALQUILER`).
3. `npm run dev` y abrir `http://localhost:3000`.

El backend tiene que estar levantado (ver [CONTRIBUTING.md §6](../CONTRIBUTING.md#6-levantar-el-proyecto-en-local)).

## Cómo funciona el acceso (ADR 0005)

- **Clientes:** sin contraseña. En `/login` piden un código de 6 dígitos por email y lo escriben. En desarrollo el código aparece en el log del backend y en `target/codigos-dev/` (CONTRIBUTING §6.3).
- **Equipo:** entra por `/equipo`, con email y contraseña. No se enlaza desde el sitio y no hay registro público.
- **El carrito vive en el navegador** (`localStorage`); cerrar sesión no lo borra.
- **Comprar no exige cuenta.** El checkout pide nombre, email y teléfono; con envío a domicilio, también DNI y dirección (piso y departamento son opcionales). Crea el pedido con `POST /api/checkout`, que no abre sesión, y manda a Mercado Pago. Con sesión de cliente, el pedido va a esa cuenta y el email no se puede cambiar; además puede guardar sus datos para la próxima compra (la casilla, destildada por defecto), que se precargan y se pueden borrar desde el mismo checkout.

## Integración por etapas

El diseño viene de la rama `Zoe-Frontend` y se integra por etapas, cada una atada a la tarea del backend que la habilita:

| Etapa | Qué entra | Depende de |
|---|---|---|
| 0 ✅ | Diseño completo, home, catálogo, detalle, carrito, `/login`, `/equipo`, alquiler, Sobre Tierra, páginas de vuelta de Mercado Pago | Lo que ya existe |
| 1 ✅ | Catálogo con búsqueda, filtros (categoría con subcategorías, marca, género, talle, color, precio), orden y paginación contra el backend real | Tarea 6 |
| 2 | Checkout sin cuenta, cotización de envío y datos guardados para la próxima compra ✅ | Tareas 9, 10 y 22 ✅ |
| 3 | "Mis pedidos" (`/cuenta/pedidos`) ✅ | Tarea 19 ✅ |
| 4 | Estimador de alquiler con los tipos y precios reales ✅ | Tarea 20 ✅ |

Las cinco etapas están integradas: cada pantalla usa el endpoint real del backend.

## Pruebas

| Comando | Qué hace |
|---|---|
| `npm test` | Pruebas de la lógica pura: acceso por código, destinos seguros, validaciones, cobertura, pago pendiente, alquiler, rankings |
| `npm run lint` | ESLint 9 con las reglas de Next (`eslint.config.mjs`), sobre todo el proyecto: también `context`, `tests` y los archivos de configuración |
| `npm run build` | Compila para producción; tiene que terminar sin errores |

## Dependencias y `npm audit`

Las versiones van fijas en `package.json` (sin `^`), así cada instalación es igual. Para actualizar, se cambia la versión a mano en un PR propio y se corre la verificación completa. **No uses `npm audit fix --force`**: instala versiones fuera de las fijadas, incluso de otra versión mayor, sin revisión.

`npm audit` reporta hoy 2 avisos (1 alto y 1 moderado) con una sola causa, que no tiene arreglo sin cambiar de versión mayor y que no afecta al sitio:

| Paquete | Por qué no afecta | Cuándo se va |
|---|---|---|
| `postcss` 8.4.31, el que trae Next adentro (alto; npm cuenta también a `next` como moderado, por traerlo) | Next lo usa al compilar, sobre nuestro propio CSS. Las fallas necesitan un CSS malicioso | Con Next 16 |

Si aparece un aviso nuevo, sobre todo de `next`, se revisa enseguida: Next corre en el servidor.

## Notas de diseño

- **Animaciones:** `app/template.tsx` (fundido por pantalla y tema por ruta: invierno en alquiler), `.grilla-anim` (escalonado), `components/Nieve.tsx`.
- **Movimiento:** variables `--ease-salida`, `--ease-vaiven`, `--t-micro`, `--t-bloque` en `app/globals.css`. Todo se anima solo con `transform`/`opacity` y respeta `prefers-reduced-motion`; la luz del cursor y la inclinación de tarjetas, solo con mouse.
- **Componentes de movimiento:** `TituloPalabras` (titulares por palabra), `BarraProgreso` (hilo de lectura), `LuzCursor`, `Inclinar`, `CarruselProductos` (bucle con física) y `HeroCarrusel` (cambia de foto cuando se llena la barra).
- **Contacto real** en `lib/contacto.ts`. Videos de fondo por ruta en `app/template.tsx` (`VideoFondo`).
- **Rutas con slug:** `lib/rutas.ts` ya lo soporta; hoy usa el id (el slug quedó para la Fase 3).
- **Imágenes:** con `<img>`, no `next/image`. `next.config.mjs` no tiene `remotePatterns` a propósito (ver el comentario ahí).
