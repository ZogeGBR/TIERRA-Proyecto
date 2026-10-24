# Contrato Fase 2 que asume el frontend

Esto es lo que el frontend **espera** del backend. Es una suposición hecha a partir de la auditoría de Fase 2 (sección 3 y tareas 4, 10, 12, 13, 18, 19, 20, 22): el backend de `develop` solo tiene lo marcado como existente arriba. **El equipo de backend tiene que confirmarlo o corregirlo.** Hay un backend de mentira que lo cumple (`dev/backend-falso.mjs`) y sirve de ejemplo ejecutable.

Convenciones: base `/api`, JSON, cookie de sesión `HttpOnly`, cookie `XSRF-TOKEN` + header `X-XSRF-TOKEN` en todo método no seguro (ya es así hoy).

**Errores**: cualquier 4xx/5xx devuelve `{ "mensaje": "texto para la persona", "codigo": "OPCIONAL" }`. El frontend decide por **código HTTP**, nunca por el texto. Único `codigo` usado: `EMAIL_DEL_EQUIPO` (409 en checkout).

## Cruce con el backend `develop` (revisado contra el código)
**Ya existe y coincide:** `POST /auth/codigo`, `POST /auth/codigo/verificar`, `POST /auth/equipo/login`, `GET /auth/yo`, `POST /auth/logout`, `GET /productos?categoriaId=` o `?marcaId=`, `GET /productos/{id}`, `GET /alquiler/**` (disponibilidad), `POST /pagos/pedidos/{id}/preferencia`, CSRF (`XSRF-TOKEN` / `X-XSRF-TOKEN`).

**Falta en develop (el frontend lo tolera y avisa "todavía no disponible"):** `POST /checkout`, `POST /envios/cotizacion`, `GET /pedidos/mios`, `GET|DELETE /cuenta/datos-entrega`, `GET /alquiler/tipos`, `GET /productos/mas-vendidos|mas-buscados`, `GET /categorias`, `GET /marcas`, y `GET /productos` con búsqueda/paginación (hoy devuelve **lista simple** y `[]` sin filtro).

**Difiere:**
- Los errores son `{mensaje, timestamp}` **sin `codigo`**: el 409 `EMAIL_DEL_EQUIPO` del checkout hay que agregarlo (campo `codigo` en `ErrorResponse`).
- `SecurityConfig` termina en `anyRequest().denyAll()`: una ruta pública nueva responde **401** hasta que se la habilite con `permitAll()`. Al implementar los endpoints públicos de abajo, sumarlos ahí.
- `423 Locked` en login de equipo (cuenta bloqueada): el frontend muestra el mensaje del backend.
- El frontend acepta tanto lista simple como página `{contenido,pagina,tamanio,totalElementos,totalPaginas}`.

## Endpoints nuevos

| # | Método y ruta | Quién | Pide | Responde |
|---|---|---|---|---|
| 1 | `POST /checkout` | público | `{nombre,email,telefono,dni?,tipoEntrega,direccion?{calle,numero?,ciudad,provincia,codigoPostal},codigoCupon?,guardarDatos?,items[{varianteId,cantidad}]}` | `201 {pedidoId,total,initPoint,expiraEn}` — igual para email nuevo o existente. **Nunca abre sesión.** |
| 2 | `POST /envios/cotizacion` | público | `{tipoEntrega,provincia?,codigoPostal?,items[]}` | `200 {cubierto:boolean,costo:number\|null,mensaje:string\|null}` |
| 3 | `POST /auth/codigo` | público | `{email}` | `200 {mensaje}` **siempre** igual, exista o no el email (y también si es del equipo, sin mandar nada). |
| 4 | `POST /auth/codigo/verificar` | público | `{email,codigo}` | `200 Usuario` + cookie de sesión; `401` genérico si el código es incorrecto/vencido/agotado; `429` si abusan. |
| 5 | `POST /auth/equipo/login` | público | `{email,password}` | `200 Usuario` + cookie; `401` si no. Solo emails del equipo. |
| 6 | `GET /pedidos/mios` | cliente con sesión | — | `PedidoHistorial[]`, más nuevo primero. `contactoDni` como `***.***.123` y `contactoTelefono` como `••• 4567` **ya enmascarados por el backend**. `401` sin sesión. |
| 7 | `GET /cuenta/datos-entrega` | cliente | — | `{nombre,telefono,dni,direccion}`; `404` si no hay nada guardado. |
| 8 | `DELETE /cuenta/datos-entrega` | cliente | — | `204`. |
| 9 | `GET /alquiler/tipos` | público | — | `[{id,nombre,precioDia}]` (solo para el estimador; sin disponibilidad ni reservas). |
| 10 | `GET /productos/mas-vendidos?limite=12` | público | — | `ProductoResumen[]` (mismo formato que el listado del catálogo), el más vendido primero. Para la home. |
| 11 | `GET /productos/mas-buscados?limite=12` | público | — | `ProductoResumen[]`, el más buscado primero. Para la home. |

## Reglas que el frontend da por hechas (el backend es quien manda)
- **Checkout**: rechaza emails del equipo con `409 + codigo:"EMAIL_DEL_EQUIPO"` y mensaje "No podemos usar ese email para comprar. Usá otro."; DNI solo se exige con `ENVIO_DOMICILIO`; provincia fuera de Neuquén / Río Negro / Chubut / Santa Cruz → solo retiro; `guardarDatos` se ignora sin sesión de cliente; recalcula precios y costo de envío (la cotización del front es informativa). `expiraEn` es ISO-8601; con él se reabre el mismo link ("Volver a pagar") sin pedir otro.
- **Código de acceso**: 6 dígitos, 10 min, 5 intentos. El front espera 60 s para ofrecer reenvío.
- **Sesión**: cliente 7 días, equipo 12 h (el front no lo calcula; solo reacciona al 401).
- **DNI**: el front manda solo dígitos (`12345678`).
- **Estados de pedido** que sabe mostrar: `PENDIENTE, PAGADO, PREPARANDO, ENVIADO, ENTREGADO, CANCELADO` (uno desconocido se muestra tal cual).
- Link de pago: solo se redirige si es `https` y de `mercadopago.com(.ar)`, `mercadolibre.com(.ar)`, `mpago.la/li`. Si Mercado Pago usa otro dominio, hay que sumarlo en `lib/pedidoPendiente.ts` (`DOMINIOS_DE_PAGO`).
- `slug` en productos (tarea 8): opcional. Mientras no llegue, las rutas usan el UUID; cuando llegue, se activa en `lib/rutas.ts` y el UUID sigue funcionando.

## Rankings de la home (endpoints 10 y 11)
- **Hoy el backend no registra ventas por producto (se podría sacar de `items` de pedidos pagados) ni búsquedas** (haría falta guardar cada consulta del buscador). Si el equipo decide otro origen o nombre de endpoint, se ajusta en `api.productos.ranking` (`lib/api.ts`).
- El frontend es tolerante: si un endpoint falla, devuelve algo que no es una lista o viene vacío, **esa pestaña no se muestra** (y si fallan las dos, no se muestra el carrusel). Nunca se inventa un orden.
- Se valida cada ítem (`id`, `nombre`, `precio` numérico), se descartan repetidos y se corta en 12.
- Recomendación: contar solo pedidos pagados (`PAGADO` en adelante) y, para "más buscados", una ventana reciente (p. ej. 30 días).

## Decisiones de negocio a confirmar con el cliente
1. Lista de provincias con envío (hoy: las 4 patagónicas del texto de la auditoría).
2. Alquiler: ¿se cuenta el día de retiro y el de devolución? (el estimador cuenta ambos: del 10 al 15 son 6 días).
3. Tipos de alquiler, precios por día y número de WhatsApp (`NEXT_PUBLIC_WHATSAPP_ALQUILER`).
4. Las pantallas de éxito/pendiente dicen "te mandamos la confirmación por email": ese email es de la Fase 3.
