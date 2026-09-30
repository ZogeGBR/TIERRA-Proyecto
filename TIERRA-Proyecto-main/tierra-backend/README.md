# Tierra — backend

Spring Boot 3 + PostgreSQL. `schema.sql` en la raíz de este proyecto es el
schema v3: solo venta online + alquiler de invierno. El local usa su
propio sistema (Andino) y el dueño pidió explícitamente que el stock de
la web y el del local queden separados — no es una limitación técnica
transitoria, es una decisión de negocio estable.

## Regla de oro de este backend

**Ningún service, salvo `InventarioService`, modifica `stock` ni
`stock_reservado` de una variante.** Reservar (al armar el pedido),
confirmar venta (al pagar), liberar (si el pago falla o se abandona el
carrito), ajustar (alta de mercadería nueva) — todo pasa por ahí.

## Flujo de venta

1. `POST /api/pedidos` — crea el pedido y **reserva** stock por 20 minutos
   (`InventarioService.reservarStock`). No descuenta nada todavía.
2. `POST /api/pagos/pedidos/{id}/preferencia` — genera el link de Mercado Pago.
3. `POST /api/pagos/webhook` — valida la firma de Mercado Pago, consulta
   el pago real a su API y recién ahí `PagoService.confirmarPago` descuenta
   stock (`InventarioService.confirmarVenta`), solo si el monto coincide y
   el pedido sigue pendiente. Si el pago se rechaza, el pedido sigue abierto
   para reintentar con otra tarjeta.
4. `ReservaStockLiberadorJob` corre cada minuto: antes de liberar un pedido
   vencido consulta a Mercado Pago por si el webhook no llegó; si no hubo
   pago aprobado, libera el stock, cancela el pedido y expira el pago.

Detalle y motivos en `docs/decisiones/0004-conciliacion-pagos-mercado-pago.md`.

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
- **Login/autenticación** — `spring-boot-starter-security` está en el
  `pom.xml` pero sin configurar (hoy deja todo abierto con `SecurityConfig`).
- **Facturación electrónica** — ya emiten factura hoy con un sistema
  intermedio (no ARCA directo); falta identificar cuál e integrarlo.
- **Costo de envío fijo** en `PedidoService` — el cliente cotiza los
  envíos al momento, no hay tarifa fija ni por zona todavía; falta
  reemplazar el placeholder por el criterio real.
- **Alcance geográfico de envíos**: arrancar solo con Patagonia (Chubut,
  Santa Cruz, Río Negro, Neuquén) antes de abrir a todo el país — no está
  restringido en el código todavía.
