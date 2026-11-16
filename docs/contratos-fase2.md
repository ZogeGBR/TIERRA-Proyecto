# Contratos de la API — Fase 2

Lo que el backend promete y el frontend usa, endpoint por endpoint. Se completa con cada tarea del backend de la Fase 2: si cambiás un endpoint de esta lista, actualizá este documento en el mismo PR.

Convenciones para todos los endpoints:

- **Errores:** `{ "mensaje": "...", "timestamp": "..." }`. El `mensaje` está escrito para mostrárselo a la persona.
- **400:** un parámetro con formato inválido (un id que no es UUID, un número que no es número, un valor que no existe). Nunca debería llegar un 500 por algo que escribió quien usa la API.
- **Público:** se puede llamar sin sesión y no abre una.

| Endpoint | Tarea | Estado |
|---|---|---|
| `GET /api/categorias` | 7 | ✅ |
| `GET /api/marcas` | 7 | ✅ |
| `GET /api/productos` | 6 | ✅ |
| `GET /api/productos/filtros` | 6 | ✅ |
| `GET /api/productos/{id}` | 6 | ✅ (agrega el precio por variante) |
| `POST /api/checkout` | 9 | pendiente |
| `POST /api/envios/cotizacion` | 10 | pendiente |
| `GET /api/pedidos/mios` | 19 | pendiente |
| `GET /api/cuenta/datos-entrega` | 22 | pendiente |
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
