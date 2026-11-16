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
- **Comprar todavía exige sesión.** El checkout actual crea el pedido con `POST /api/pedidos`; sin sesión, invita a entrar con el código. El checkout sin cuenta llega con la tarea 9 (ver abajo).

## Integración por etapas

El diseño viene de la rama `Zoe-Frontend` y se integra por etapas, cada una atada a la tarea del backend que la habilita:

| Etapa | Qué entra | Depende de |
|---|---|---|
| 0 | Diseño completo, home, catálogo, detalle, carrito, `/login`, `/equipo`, alquiler, Sobre Tierra, páginas de vuelta de Mercado Pago | Lo que ya existe |
| 1 | Catálogo con búsqueda, filtros, orden y paginación contra el backend real | Tarea 6 |
| 2 | Checkout sin cuenta, cotización de envío y datos guardados | Tareas 9, 10 y 22 |
| 3 | "Mis pedidos" (`/cuenta/pedidos`) | Tarea 19 |
| 4 | Estimador de alquiler con los tipos y precios reales | Tarea 20 |

Mientras un endpoint no existe, la pantalla que lo usa lo dice ("todavía no está disponible") en vez de romperse. Hasta la etapa 1, el catálogo filtra solo por categoría o marca: sin filtro, o con una categoría padre como "Ropa", no muestra productos.

## Pruebas

| Comando | Qué hace |
|---|---|
| `npm test` | Pruebas de la lógica pura: acceso por código, destinos seguros, validaciones, cobertura, pago pendiente, alquiler, rankings |
| `npm run lint` | ESLint con la configuración de Next |
| `npm run build` | Compila para producción; tiene que terminar sin errores |

## Catálogo de prueba

`lib/catalogoDePrueba.ts` tiene productos inventados para trabajar en el buscador y los filtros sin backend. Está **apagado** salvo `NEXT_PUBLIC_CATALOGO_DE_PRUEBA=1`; con el backend real tiene que quedar en `0`. Cuando está encendido, el catálogo muestra un aviso.

## Notas de diseño

- **Animaciones:** `app/template.tsx` (fundido por pantalla y tema por ruta: invierno en alquiler), `.grilla-anim` (escalonado), `components/Nieve.tsx`.
- **Movimiento:** variables `--ease-salida`, `--ease-vaiven`, `--t-micro`, `--t-bloque` en `app/globals.css`. Todo se anima solo con `transform`/`opacity` y respeta `prefers-reduced-motion`; la luz del cursor y la inclinación de tarjetas, solo con mouse.
- **Componentes de movimiento:** `TituloPalabras` (titulares por palabra), `BarraProgreso` (hilo de lectura), `LuzCursor`, `Inclinar`, `CarruselProductos` (bucle con física) y `HeroCarrusel` (cambia de foto cuando se llena la barra).
- **Contacto real** en `lib/contacto.ts`. Videos de fondo por ruta en `app/template.tsx` (`VideoFondo`).
- **Rutas con slug:** `lib/rutas.ts` ya lo soporta; hoy usa el id (el slug quedó para la Fase 3).
- **Imágenes:** con `<img>`, no `next/image`. `next.config.mjs` no tiene `remotePatterns` a propósito (ver el comentario ahí).
