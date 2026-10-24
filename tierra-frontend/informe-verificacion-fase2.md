# Verificación — frontend Fase 2

Base: `TIERRA-Proyecto-develop` (backend en V6). Backend sin tocar: ningún archivo de `tierra-backend/` fue modificado (verificado por fecha de modificación) y los zips de frontend no lo incluyen.

## Tarea por tarea

| Tarea | Estado | Cómo se comprobó / qué falta |
|---|---|---|
| 0 Next ≥ 14.2.35, eslint-config-next, imágenes, carrusel | **Hecho** | `npm ls next` → 15.5.27; `next lint` sin avisos; `textura-fluida.jpg`, `hero-1.jpg` y `hero.jpg` < 300 KB; carrusel sin autoplay con movimiento reducido (E2E). **`bin/` en `.gitignore` queda por hacer en la raíz del repo** (está fuera del frontend): agregar la línea `bin/`. |
| 4 Login por código, `/equipo`, sin `/registro`, `ApiError` con status | **Hecho** (contra backend falso) | E2E: código OK/incorrecto, reenvío con cuenta regresiva, email del equipo sin código, `/equipo` OK/mala, `/registro` → 404. Bug encontrado y corregido: `/equipo` con clave mala decía "tu sesión venció". |
| 12 Checkout sin cuenta (3.1) | **Hecho** (contra backend falso) | E2E: retiro, domicilio con DNI+dirección+cotización, provincia sin cobertura, email del equipo, comprar dos veces el mismo email sin sesión, doble clic = 1 pedido, comprar nunca abre sesión. |
| 13 Retorno de Mercado Pago | **Hecho** | Páginas éxito/pendiente/error que no confían en la URL; "Volver a pagar" reabre el mismo link sin pedir otro pedido; link adulterado en el navegador no redirige afuera; aviso de pago sin terminar en el carrito. |
| 14 Búsqueda/filtros paginados | **Hecho** (contra backend falso) | Paginación, búsqueda y filtro por categoría contra `/api/productos`, `/api/categorias`, `/api/marcas`. |
| 17 Carrito en el navegador | **Hecho** | Cerrar sesión no lo vacía; no se vacía antes de pagar. |
| 18 Errores visibles por código HTTP | **Hecho** | 401/403/429/5xx/red con texto propio (pruebas unitarias); E2E con 500 en checkout y falla de cotización (con reintento). |
| 19 `/cuenta/pedidos` | **Hecho** (contra backend falso) | DNI y teléfono se muestran como llegan, ya ocultos; sesión vencida redirige a login con destino. |
| 20 Alquiler como estimado + WhatsApp | **Parcial** | Estimador, aviso "estimado" y enlace a WhatsApp listos; sin reservas (E2E confirma que no se llama a `/alquiler/reservas`). Falta el número real (`NEXT_PUBLIC_WHATSAPP_ALQUILER`) y confirmar tipos/precios y si se cuenta el día de devolución. |
| 22 Datos guardados | **Hecho** (contra backend falso) | Casilla solo con sesión; precarga; borrado con confirmación. Bug encontrado y corregido: el nombre guardado no pisaba el nombre de la cuenta. |
| 8 (preparación) slug | **Parcial (a propósito)** | `lib/rutas.ts` listo; las rutas siguen con UUID hasta que el backend mande `slug`. |
| 21 Regresión | **Hecho** | 28 casos E2E pasan. |
| Animación y calidad visual | **Hecho** | Aparición al scroll, tarjetas con elevación, skeletons, feedback al agregar, badge del carrito, menú móvil nuevo (no había navegación < 768 px). Todo respeta `prefers-reduced-motion`. Texto de cobertura corregido: ya no dice "envíos a todo el país". |

## Qué se ejecutó
- `npm run build` OK (Next 15.5.27), `tsc` y `next lint` limpios.
- 10 pruebas de lógica pura + **22/22 mutaciones detectadas**.
- 28/28 casos E2E en Chromium (incluye 400 px sin scroll horizontal en 8 pantallas y movimiento reducido).

## Qué NO está verificado
- **Contra el backend real**: develop no tiene los endpoints de Fase 2. Todo lo anterior corrió contra `dev/backend-falso.mjs`, que sigue `contrato-fase2-frontend.md`. Si el backend real difiere, hay que ajustar.
- Safari/iOS y Firefox (solo Chromium); lectores de pantalla (solo se cuidaron roles/etiquetas); dispositivos reales.
- Mercado Pago real (en las pruebas se simula la salida); Google Fonts reales (en el sandbox se usó un mock solo para compilar).
- El E2E no cubre vencimiento del link de pago por reloj ni el reenvío de código tras 60 s reales.

## Riesgos
1. `DOMINIOS_DE_PAGO` es una lista blanca: si Mercado Pago devuelve otro dominio, el botón de pago no redirige.
2. Las pantallas de éxito/pendiente prometen un email de confirmación que es de la Fase 3.
3. Lista de provincias y regla de días de alquiler son supuestos a confirmar con el cliente.
4. Se agregó `tsx` como devDependency (solo para `npm test`).
