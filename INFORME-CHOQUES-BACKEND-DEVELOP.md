# Frontend Fase 2 vs. backend `develop` — choques y cómo se resolvieron

| Tema | Backend develop | Frontend Fase 2 | Resolución |
|---|---|---|---|
| Login por código, login equipo, `/auth/yo`, logout, CSRF | Existe | Coincide | — |
| `POST /checkout`, `/envios/cotizacion`, `/pedidos/mios`, `/cuenta/datos-entrega`, `/alquiler/tipos`, `mas-vendidos/mas-buscados`, `/categorias`, `/marcas` | **No existen** | Los usa | Backend: implementarlos y habilitarlos en `SecurityConfig`. Frontend: ya no falla feo (ver abajo). |
| Ruta pública inexistente | `denyAll()` → **401 "Necesitás iniciar sesión"** | Mostraba "tu sesión venció" | `apiFetch(..., {publico:true})` convierte ese 401/403 en 501 "todavía no disponible". |
| `GET /productos` | Lista simple; `[]` sin filtro | Esperaba página `{contenido,...}` | Acepta ambos formatos. |
| Categorías/marcas | Sin endpoint | Panel de filtros | Si no hay endpoint, se oculta el filtro y el catálogo sigue. |
| Errores | `{mensaje, timestamp}` sin `codigo` | `EMAIL_DEL_EQUIPO` por `codigo` | **Backend:** agregar `codigo` a `ErrorResponse`. |
| Login de equipo bloqueado | 423 | — | Muestra el mensaje del backend. |
| `POST /api/pedidos` | Exige sesión, usa `usuarioId` de la sesión | Fase 2 usa `/checkout` sin cuenta (ADR 0005) | Pendiente backend: implementar ADR 0005. |

Pruebas: `npm test` (13), `dev/e2e-develop.mjs` (frontend contra comportamiento de develop), más los E2E existentes.
