# Tierra — backend

Spring Boot 3 + PostgreSQL. `schema.sql` en la raíz de este proyecto es el
schema v2, con soporte omnicanal (web + local físico).

## Regla de oro de este backend

**Ningún service, salvo `InventarioService`, modifica `stock_fisico` ni
`stock_reservado` de una variante.** Todo pasa por ahí: reservar (web),
confirmar venta (web, al pagar), vender directo (local), ingreso de
compra, ajuste manual. Cada cambio queda respaldado por una fila en
`movimientos_inventario`, que nunca se edita ni se borra.

## Flujo de venta web (v2)

1. `POST /api/pedidos` — crea el pedido y **reserva** stock por 20 minutos
   (`InventarioService.reservarStockWeb`). No descuenta nada todavía.
2. `POST /api/pagos/pedidos/{id}/preferencia` — genera el link de Mercado Pago.
3. `POST /api/pagos/webhook` — cuando Mercado Pago confirma el pago,
   `PagoService.confirmarPago` recién ahí descuenta stock de verdad
   (`InventarioService.confirmarVentaWeb`). Si el pago se rechaza, libera
   la reserva sin tocar el stock físico.
4. `ReservaStockLiberadorJob` corre cada minuto y libera reservas vencidas
   de carritos abandonados que nunca llegaron a pagar.

## Flujo de venta en el local (nuevo en v2)

1. `POST /api/caja/sesiones` — abre una sesión de caja (usuario + ubicación
   + monto inicial). Un mismo usuario no puede tener dos sesiones abiertas.
2. `POST /api/ventas-locales` — registra la venta: descuenta stock directo
   (sin reserva previa, el producto ya está en la mano del cliente) y
   acepta medios de pago combinados (ej. efectivo + tarjeta).
3. `POST /api/caja/sesiones/{id}/cerrar` — cierra la sesión con el monto
   final contado, para el arqueo.

**Importante:** el cobro con tarjeta en el local se asume que ocurre en una
terminal física *fuera* de este software (se tipea el monto, se aprueba, y
acá solo se registra "hubo un cobro con tarjeta por tal monto"). Integrar
la terminal al software es posible pero amplía el alcance de cumplimiento
PCI de la operación presencial — no está hecho a propósito.

## Lo que falta (marcado con TODO o directamente ausente)

- **Panel de administración** para cargar catálogo, ver movimientos de
  inventario y hacer ajustes manuales — hoy `InventarioService.ajusteManual`
  existe pero no tiene controller.
- **Login/autenticación** — `spring-boot-starter-security` está en el
  `pom.xml` pero sin configurar. Los endpoints no tienen protección todavía.
- **Facturación electrónica (ARCA)** — no hay ninguna integración; falta
  definir con un contador si se usa un proveedor intermediario.
- **Verificación de firma del webhook de Mercado Pago** — sigue pendiente
  en `PagoController`, igual que en v1.
- **Costo de envío fijo** en `PedidoService` — sigue como placeholder.
- Cargar al menos una fila en `ubicaciones` con `tipo = 'deposito'` antes
  de poder vender online: `PagoService.confirmarPago` la busca y falla si
  no existe.
