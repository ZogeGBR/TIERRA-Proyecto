# Tierra — Tareas de Backend para cerrar la Fase 2

Base: `develop`. El frontend ya está listo y tolera que falten; el ejemplo ejecutable de cada contrato es `tierra-frontend/dev/backend-falso.mjs` (detalle en `contrato-fase2-frontend.md`).

Convenciones: `/api`, JSON, sesión en cookie HttpOnly, CSRF `XSRF-TOKEN` / `X-XSRF-TOKEN` en métodos no seguros. Errores `{ "mensaje": "...", "codigo": "OPCIONAL" }`. El frontend decide por **código HTTP**, no por el texto.

## 0. Transversales (primero, desbloquean todo)
- [ ] **`SecurityConfig`**: sumar `permitAll()` a las rutas públicas nuevas (`POST /api/checkout`, `POST /api/envios/cotizacion`, `GET /api/categorias`, `GET /api/marcas`, `GET /api/productos/mas-vendidos|mas-buscados`, `GET /api/alquiler/tipos`) y `authenticated()` a `/api/pedidos/mios` y `/api/cuenta/**`. Hoy `anyRequest().denyAll()` responde 401 a todo lo que no está listado.
- [ ] **`ErrorResponse`**: agregar campo opcional `codigo` (String). Lo necesita el 409 `EMAIL_DEL_EQUIPO`.

## 1. Compra sin cuenta (ADR 0005) — la más importante
**`POST /api/checkout`** (público)
- Pide: `{nombre, email, telefono, dni?, tipoEntrega, direccion?{calle,numero?,ciudad,provincia,codigoPostal}, codigoCupon?, guardarDatos?, items[{varianteId,cantidad}]}`
- Responde `201 {pedidoId, total, initPoint, expiraEn}` (ISO-8601). Igual para email nuevo o existente; **nunca abre sesión**.
- Reglas: recalcula precios y envío (la cotización del front es informativa); email del equipo → `409` con `codigo:"EMAIL_DEL_EQUIPO"` y mensaje "No podemos usar ese email para comprar. Usá otro."; DNI solo con `ENVIO_DOMICILIO`; provincia sin cobertura → solo retiro; `guardarDatos` se ignora sin sesión de cliente; stock insuficiente → 409.
- Crea usuario CLIENTE si el email no existe; crea la preferencia de Mercado Pago y devuelve su `initPoint`. Con `expiraEn` el front reabre el mismo link.
- Dominios de pago que el front acepta: `mercadopago.com(.ar)`, `mercadolibre.com(.ar)`, `mpago.la/li`. Si MP usa otro, avisar.

**`POST /api/envios/cotizacion`** (público)
- Pide `{tipoEntrega, provincia?, codigoPostal?, items[]}` → `200 {cubierto:boolean, costo:number|null, mensaje:string|null}`.
- Definir con el cliente: provincias con envío (hoy asumidas: Neuquén, Río Negro, Chubut, Santa Cruz).

## 2. Historial y datos del cliente (requieren sesión de cliente)
- [ ] `GET /api/pedidos/mios` → `PedidoHistorial[]`, más nuevo primero. **Enmascarado en backend:** `contactoDni` como `***.***.123`, `contactoTelefono` como `••• 4567`. `401` sin sesión.
- [ ] `GET /api/cuenta/datos-entrega` → `{nombre, telefono, dni, direccion}`; `404` si no hay.
- [ ] `DELETE /api/cuenta/datos-entrega` → `204`.
- Estados de pedido que el front muestra: `PENDIENTE, PAGADO, PREPARANDO, ENVIADO, ENTREGADO, CANCELADO`.

## 3. Catálogo
- [ ] `GET /api/productos` con filtros `q, categoriaId, marcaId, genero, precioMin, precioMax, orden (nombre|precio_asc|precio_desc), pagina, tamanio` → `{contenido, pagina, tamanio, totalElementos, totalPaginas}`. Hoy devuelve lista simple y `[]` sin filtro (el front acepta ambas, pero el catálogo completo necesita este).
- [ ] `GET /api/categorias` → `[{id, nombre}]`; `GET /api/marcas` → `[{id, nombre}]` (para el panel de filtros).
- [ ] Opcional (tarea 8): `slug` en productos; el front sigue funcionando con el UUID.

## 4. Home — rankings
- [ ] `GET /api/productos/mas-vendidos?limite=12` y `GET /api/productos/mas-buscados?limite=12` → `ProductoResumen[]`.
- Hoy no se registran ventas por producto ni búsquedas: vendidos = sumar `items` de pedidos pagados (`PAGADO` en adelante); buscados = guardar cada consulta del buscador, ventana de 30 días recomendada.
- Si falla o viene vacío, el front oculta la pestaña (nunca inventa orden).

## 5. Alquiler
- [ ] `GET /api/alquiler/tipos` → `[{id, nombre, precioDia}]` (solo para el estimador). Confirmar con el cliente tipos y precios, y si se cuentan el día de retiro y el de devolución (el estimador cuenta ambos: del 10 al 15 son 6 días).

## 6. Ya existe y coincide (no tocar)
`POST /auth/codigo`, `POST /auth/codigo/verificar` (6 dígitos, 10 min, 5 intentos), `POST /auth/equipo/login` (423 si bloqueada), `GET /auth/yo`, `POST /auth/logout`, `GET /productos/{id}`, `GET /alquiler/**`, `POST /pagos/pedidos/{id}/preferencia`.

## Para probar contra el front
Levantar el backend real en `:8080` y el front con `NEXT_PUBLIC_API_URL=http://localhost:8080/api NEXT_PUBLIC_CATALOGO_DE_PRUEBA=0`. Cuando todo ande, `dev/backend-falso.mjs` se puede borrar.
