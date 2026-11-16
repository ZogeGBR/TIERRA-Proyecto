# Tierra — backend

Spring Boot 3.3 + Java 17 + PostgreSQL 16. El esquema lo gestiona Flyway,
con las migraciones en `src/main/resources/db/migration/` (la V1 es el
baseline del esquema v3: solo venta online + alquiler de invierno). El local usa su
propio sistema (Andino) y el dueño pidió explícitamente que el stock de
la web y el del local queden separados — no es una limitación técnica
transitoria, es una decisión de negocio estable.

## Regla de oro de este backend

**Ningún service, salvo `InventarioService`, modifica `stock` ni
`stock_reservado` de una variante.** Reservar (al armar el pedido),
confirmar venta (al pagar), liberar (si el pago falla o se abandona el
carrito), ajustar (alta de mercadería nueva) — todo pasa por ahí.

## Flujo de venta

1. `POST /api/checkout` — no exige sesión (decisión 0005). En una transacción
   resuelve el cliente por el email (o por la sesión de cliente), crea el
   pedido con los datos de contacto y la dirección, y **reserva** stock por
   20 minutos (`InventarioService.reservarStock`). No descuenta nada todavía.
   Después de confirmar esa transacción pide el link de Mercado Pago y lo
   devuelve. Si Mercado Pago falla, cancela el pedido, libera el stock y
   responde 503: no queda nada retenido.
2. `POST /api/pagos/pedidos/{id}/preferencia` — genera un link nuevo para un
   pedido pendiente (para volver a pagar).
3. `POST /api/pagos/webhook` — valida la firma de Mercado Pago, consulta
   el pago real a su API y recién ahí `PagoService.confirmarPago` descuenta
   stock (`InventarioService.confirmarVenta`), solo si el monto coincide y
   el pedido sigue pendiente. Si el pago se rechaza, el pedido sigue abierto
   para reintentar con otra tarjeta.
4. `ReservaStockLiberadorJob` corre cada minuto: antes de liberar un pedido
   vencido consulta a Mercado Pago por si el webhook no llegó; si no hubo
   pago aprobado, libera el stock, cancela el pedido y expira el pago.

Detalle y motivos en `docs/decisiones/0004-conciliacion-pagos-mercado-pago.md`.

## Autenticación

Sesión en cookie (decisión 0003), con dos canales de acceso (decisión 0005):

- **Clientes:** sin contraseña. Piden un código de seis dígitos por email
  (`POST /api/auth/codigo`) y lo verifican (`POST /api/auth/codigo/verificar`).
  Comprar no exige cuenta: el checkout crea el cliente si hace falta, sin
  contraseña y sin abrir sesión.
- **Equipo** (Administrador y Operador): email y contraseña, en
  `POST /api/auth/equipo/login`.

Hasta que exista el módulo de emails, con el perfil `dev` el código se
escribe en el log y en `target/codigos-dev/` (ver CONTRIBUTING.md §6.3).
Las reglas por endpoint viven en `SecurityConfig`, y su cierre es
`denyAll()`: un endpoint nuevo sin regla queda cerrado.

## Lo que este backend NO hace (a propósito)

- **No gestiona el stock del local** — eso vive en Andino, fuera de este
  sistema. No hay endpoints de venta de mostrador ni de sesión de caja.
- **No sincroniza inventario entre canales** — si un producto se agota en
  el local, la web no se entera, y viceversa. Es la decisión explícita
  del cliente.

(Una versión anterior de este backend sí tenía ese módulo omnicanal —
se sacó por completo cuando se confirmó que no hacía falta.)

## Lo que falta (marcado con TODO o directamente ausente)

- **Panel de administración** para cargar catálogo y hacer ajustes de
  stock — hoy `InventarioService.ajustarStock` existe pero no tiene
  controller.
- **Facturación electrónica** — ya emiten factura hoy con un sistema
  intermedio (no ARCA directo); falta identificar cuál e integrarlo.
- **Integración con Andreani** — el costo del envío ya sale de
  `EnvioService` y de un cotizador intercambiable (hoy un monto fijo
  configurable, `ENVIO_COSTO_FIJO`). Falta el cotizador de Andreani y crear
  el envío cuando se aprueba el pago: ver
  `docs/decisiones/0006-envios-cotizador-intercambiable-andreani.md`.
  La zona de envío (Neuquén, Río Negro, Chubut y Santa Cruz) está en
  configuración (`ENVIO_PROVINCIAS`).
