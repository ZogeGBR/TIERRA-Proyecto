# Contratos de la API — Fase 2

Lo que el backend promete y el frontend usa, endpoint por endpoint. Se completa con cada tarea del backend de la Fase 2: si cambiás un endpoint de esta lista, actualizá este documento en el mismo PR.

Convenciones para todos los endpoints:

- **Errores:** `{ "mensaje": "...", "timestamp": "..." }`. El `mensaje` está escrito para mostrárselo a la persona. Cuando la pantalla tiene que reaccionar distinto según el motivo, viene además `"codigo"` (por ejemplo `"SIN_STOCK"`); si no, el campo no aparece.
- **400:** un parámetro con formato inválido (un id que no es UUID, un número que no es número, un valor que no existe). Nunca debería llegar un 500 por algo que escribió quien usa la API.
- **Público:** se puede llamar sin sesión y no abre una.

| Endpoint | Tarea | Estado |
|---|---|---|
| `GET /api/categorias` | 7 | ✅ |
| `GET /api/marcas` | 7 | ✅ |
| `GET /api/productos` | 6 | ✅ |
| `GET /api/productos/filtros` | 6 | ✅ |
| `GET /api/productos/{id}` | 6 | ✅ (agrega el precio por variante) |
| `POST /api/checkout` | 9 | ✅ |
| `POST /api/envios/cotizacion` | 10 | ✅ |
| `GET /api/pedidos/mios` | 19 | pendiente |
| `GET /api/cuenta/datos-entrega` | 22 | ✅ |
| `DELETE /api/cuenta/datos-entrega` | 22 | ✅ |
| `GET /api/productos/mas-vendidos` | — | pendiente |
| `GET /api/alquiler/tipos` | 20 | pendiente |

---

## Catálogo

### `GET /api/categorias` — público

Todas las categorías, ordenadas por nombre (empates por id).

```json
[
  { "id": "c000…0002", "nombre": "Ropa", "slug": "ropa", "categoriaPadreId": null },
  { "id": "c000…0003", "nombre": "Ropa deportiva", "slug": "ropa-deportiva", "categoriaPadreId": "c000…0002" }
]
```

`categoriaPadreId` es `null` en las categorías de primer nivel. El árbol se arma en el frontend (`aplanarCategorias`, en `lib/catalogo.ts`).

### `GET /api/marcas` — público

Todas las marcas, ordenadas por nombre: `[{ "id", "nombre", "logoUrl" }]`. `logoUrl` puede ser `null`.

### `GET /api/productos` — público

Busca en el catálogo con filtros combinables y devuelve **una página**. Sin parámetros, devuelve la primera página del catálogo completo. Solo aparecen productos activos.

| Parámetro | Tipo | Qué hace |
|---|---|---|
| `q` | texto | Busca palabras en nombre, marca, categoría y descripción. Tienen que aparecer **todas**, sin importar mayúsculas ni tildes (`termica` encuentra "Remera Térmica"). Se toman los primeros 100 caracteres y hasta 10 palabras. `%` y `_` se buscan literalmente |
| `categoriaId` | UUID | La categoría **y todas sus subcategorías**, a cualquier nivel |
| `marcaId` | UUID | |
| `genero` | `HOMBRE`, `MUJER`, `UNISEX` o `NINO` | |
| `precioMin`, `precioMax` | número ≥ 0 | Sobre el precio del producto, inclusive. Si vienen al revés, se dan vuelta |
| `talle` | texto | Productos con una variante de ese talle **con stock disponible** |
| `color` | texto | Ídem para el color. Con `talle` y `color` juntos, tienen que ser **la misma variante** (M y Azul: la campera M azul, no una M negra y una S azul). Los dos se comparan sin mayúsculas ni tildes |
| `orden` | `nombre` (por defecto), `precio_asc`, `precio_desc` | El nombre se ordena sin mayúsculas ni tildes. Los empates se resuelven por nombre y después por id, así un producto nunca aparece en dos páginas |
| `pagina` | entero, desde 1 | Por defecto 1, máximo 10000. Una página más allá de la última viene vacía, con los totales correctos |
| `tamanio` | entero, 1 a 48 | Por defecto 12 |

"Con stock disponible" es la misma regla que usa el carrito: la variante no controla stock, o tiene más unidades que las reservadas por pedidos en curso.

Respuesta:

```json
{
  "contenido": [
    { "id": "d000…0002", "nombre": "Campera Outdoor", "marca": "The North Face",
      "categoria": "Ropa deportiva", "precio": 149990.00, "imagenPrincipal": "/images/products/campera-outdoor.png" }
  ],
  "pagina": 1,
  "tamanio": 12,
  "totalElementos": 21,
  "totalPaginas": 2
}
```

- `imagenPrincipal` es la primera imagen del producto por orden, o `null`.
- `totalPaginas` es 0 si no hay resultados.
- Errores 400: `categoriaId` o `marcaId` que no son UUID, `genero` u `orden` desconocidos, precio negativo o no numérico, `pagina` o `tamanio` fuera de rango.

Cantidad de consultas a la base: fija, no depende de cuántos productos tenga la página. Son como máximo cuatro: las categorías (solo si se filtra por categoría), la página con marca y categoría, el conteo y las imágenes de toda la página.

### `GET /api/productos/filtros` — público

Las opciones de los filtros de talle y color:

```json
{ "talles": ["XS", "S", "M", "L", "XL", "8", "10", "36", "42", "Único"],
  "colores": ["Azul", "Bordó", "Negro", "Rojo"] }
```

- Solo talles y colores de variantes **con stock** en productos activos, así ninguno lleva por sí solo a una lista vacía.
- Talles en este orden: letras de menor a mayor (XXS a XXXL), números de menor a mayor, cualquier otro alfabéticamente, y "Único" al final.
- Colores en orden alfabético.

### `GET /api/productos/{id}` — público

El detalle de un producto activo. Un producto inactivo o inexistente da 404, y un id que no es UUID da 400.

```json
{
  "id": "d000…0015", "nombre": "Bicicleta Urbana Rodado 28", "descripcion": "…",
  "marca": "Scott", "categoria": "Bicicletas", "genero": "UNISEX", "precio": 649990.00,
  "variantes": [
    { "id": "e000…", "sku": "BURB28-S-AZU", "talla": "S", "color": "Azul",
      "stock": 2, "controlaStock": true, "precio": 649990.00 },
    { "id": "e000…", "sku": "BURB28-L-AZU", "talla": "L", "color": "Azul",
      "stock": 1, "controlaStock": true, "precio": 674990.00 }
  ],
  "imagenes": ["/images/products/…"]
}
```

- `variantes[].precio` es el precio de esa variante: el del producto más el adicional de la variante. Es el mismo cálculo con el que el backend cobra, así que el carrito tiene que guardar este valor y no el `precio` del producto.
- `variantes[].stock` son las unidades disponibles: stock menos lo reservado. Si `controlaStock` es `false`, la variante siempre está disponible y `stock` no significa nada (viene el entero más grande de Java, 2147483647).

---

## Checkout

### `POST /api/checkout` — público (con token CSRF, como todo POST)

La única forma de crear un pedido (decisión 0005). Se compra **sin cuenta y sin contraseña**, y **nunca abre una sesión**. Crea el pedido, reserva el stock por 20 minutos y devuelve el link de pago de Mercado Pago.

```json
{
  "nombre": "Ana Pérez",
  "email": "ana@example.com",
  "telefono": "2945 123456",
  "dni": "30.111.222",
  "tipoEntrega": "ENVIO_DOMICILIO",
  "direccion": {
    "calle": "San Martín", "numero": "123", "piso": "2", "departamento": "B",
    "ciudad": "Esquel", "provincia": "Chubut", "codigoPostal": "9200"
  },
  "items": [{ "varianteId": "e000…0005", "cantidad": 1 }]
}
```

| Campo | Obligatorio | Notas |
|---|---|---|
| `nombre` | Sí | Hasta 150 caracteres. Es el de quien recibe: queda en el pedido |
| `email` | Sí | Formato válido. Decide a qué cliente va el pedido (ver la tabla de abajo). Se compara sin mayúsculas ni espacios |
| `telefono` | Sí | Entre 8 y 15 números, con código de área. Se guarda como se escribió |
| `dni` | Con envío | 7 u 8 números; se guardan solo los números. Con retiro se ignora |
| `tipoEntrega` | Sí | `ENVIO_DOMICILIO` o `RETIRO_LOCAL` |
| `direccion` | Con envío | `calle`, `ciudad`, `provincia` y `codigoPostal` (4 números) obligatorios; `numero`, `piso` y `departamento` opcionales. Con retiro se ignora |
| `items` | Sí | Entre 1 y 50 |
| `guardarDatos` | No | `true` guarda los datos en la cuenta para la próxima compra (ver Cuenta). **Solo con sesión de cliente**: sin sesión o con la del equipo se ignora |

El costo del envío lo calcula el backend con el mismo código que la cotización: el pedido cobra lo que dijo `POST /api/envios/cotizacion`. Los cupones no se aplican hasta la Fase 3.

**A quién va el pedido:**

| Sesión | Email del checkout | Qué pasa |
|---|---|---|
| Ninguna | No existe | Se crea el cliente, solo con nombre y email, sin contraseña |
| Ninguna | Es de un cliente | El pedido se asocia a ese cliente. **Su cuenta no se modifica** |
| Ninguna | Es del equipo | 409 con `codigo: "EMAIL_DEL_EQUIPO"` |
| De cliente | Se ignora | El pedido va al cliente de la sesión |
| Del equipo | Cualquiera | Como si no hubiera sesión |

El teléfono, el DNI y la dirección quedan **en el pedido**, nunca en la cuenta: escribir el email de otra persona no cambia nada de ella ni da acceso a nada. La única excepción es `guardarDatos` con sesión de cliente. La respuesta es la misma para un email nuevo y uno existente.

Respuesta (201):

```json
{
  "pedidoId": "5d48e6a8-…",
  "total": 101990.00,
  "initPoint": "https://www.mercadopago.com.ar/checkout/v1/redirect?pref_id=…",
  "expiraEn": "2026-11-16T12:20:00Z"
}
```

`expiraEn` es cuándo vence el link, antes que la reserva de stock.

Errores:

| Código HTTP | `codigo` | Cuándo |
|---|---|---|
| 400 | — | Un campo inválido o faltante, o una provincia fuera de la zona de envío |
| 404 | — | Una variante que no existe o es de un producto inactivo |
| 409 | `EMAIL_DEL_EQUIPO` | El email es de una cuenta del equipo: *"No podemos usar ese email para comprar. Usá otro."* |
| 409 | `SIN_STOCK` | Algún producto no tiene stock suficiente |
| 503 | `LINK_DE_PAGO_NO_DISPONIBLE` | Mercado Pago no devolvió el link. El pedido ya se canceló y el stock se liberó: *"No pudimos generar el link de pago. No se hizo ningún cobro; probá de nuevo."* |
| 503 | — | El correo no pudo cotizar el envío (ver Envíos) |

Ningún error deja un pedido pendiente ni stock reservado: los que ocurren antes de crear el pedido no crean nada, y el 503 del link cancela el pedido en el momento.

---

## Cuenta

Datos guardados para la próxima compra (tarea 22, decisión 0005). Solo para clientes con sesión: sin sesión, 401; con la sesión del equipo, 403. **No hay endpoint para escribirlos**: se guardan únicamente desde el checkout, con sesión de cliente y `guardarDatos: true`, en la misma transacción que el pedido (si el pedido no se crea, no se guarda nada).

### `GET /api/cuenta/datos-entrega` — cliente con sesión

```json
{
  "nombre": "Ana Pérez",
  "telefono": "2945 123456",
  "dni": "30111222",
  "direccion": {
    "calle": "San Martín", "numero": "123", "piso": "2", "departamento": "B",
    "ciudad": "Esquel", "provincia": "Chubut", "codigoPostal": "9200"
  }
}
```

- Completos, sin ocultar nada: los guardó el mismo cliente con su sesión.
- **Sin datos guardados responde 200** con `telefono`, `dni` y `direccion` en `null`. `nombre` es siempre el de la cuenta.
- Hay una sola dirección guardada por cliente: guardar otra la reemplaza.
- Una compra con retiro en el local y la casilla tildada guarda nombre y teléfono, y conserva el DNI y la dirección que ya estaban.

### `DELETE /api/cuenta/datos-entrega` — cliente con sesión (con token CSRF)

Borra el teléfono, el DNI y la dirección guardada. Responde 204, también si no había nada. El nombre queda, porque es el de la cuenta. **No modifica ningún pedido**: cada pedido tiene su propia copia del contacto y la dirección.

---

## Envíos

### `POST /api/envios/cotizacion` — público (con token CSRF, como todo POST)

El costo del envío **antes de pagar**. Informa, no cobra: el checkout vuelve a calcularlo con el mismo código al crear el pedido, así que lo que se muestra y lo que se cobra no pueden diferir. Detrás hay un cotizador intercambiable: hoy un monto fijo, después Andreani (decisión 0006). El contrato no cambia al integrar Andreani.

```json
{
  "tipoEntrega": "ENVIO_DOMICILIO",
  "provincia": "Chubut",
  "codigoPostal": "9200",
  "items": [{ "varianteId": "e000…0003", "cantidad": 1 }]
}
```

| Campo | Obligatorio | Notas |
|---|---|---|
| `tipoEntrega` | Sí | `ENVIO_DOMICILIO` o `RETIRO_LOCAL` |
| `provincia` | Con envío | Se compara sin tildes ni mayúsculas |
| `codigoPostal` | Con envío | 4 números |
| `items` | Sí | Entre 1 y 50. El costo con Andreani va a depender del peso y el valor de lo que se compra |

Respuestas (200):

```json
{ "cubierto": true,  "costo": 12000, "mensaje": null }
{ "cubierto": true,  "costo": 0,     "mensaje": null }
{ "cubierto": false, "costo": null,  "mensaje": "Por ahora enviamos a domicilio solo a Neuquén, Río Negro, Chubut y Santa Cruz. Podés retirar tu compra en el local." }
```

- Con `RETIRO_LOCAL` siempre es `cubierto: true` y `costo: 0`, sin provincia ni código postal.
- **Fuera de la zona no es un error:** 200 con `cubierto: false`. La pantalla tiene que ofrecer el retiro. En cambio, un pedido que llegue igual con envío a una provincia fuera de zona se rechaza con 400 y el mismo mensaje.
- Errores: 400 sin provincia o con un código postal que no tiene 4 números, sin ítems o con un tipo de entrega desconocido; 404 si una variante no existe o es de un producto inactivo; **503** si el correo no pudo cotizar (*"No pudimos calcular el costo del envío. Probá de nuevo en unos minutos."*). Hoy el cotizador fijo nunca da 503; con Andreani puede pasar.
