# 0004 — Conciliación de pagos con Mercado Pago

- **Estado:** propuesta (rama `feat/conciliacion-pagos-mp`)
- **Ubicación en el repo:** `docs/decisiones/0004-conciliacion-pagos-mercado-pago.md`

---

## Contexto

El cobro usa **Checkout Pro**: el backend crea una preferencia y el usuario paga en la página de Mercado Pago. Tierra nunca recibe ni guarda datos de tarjeta; solo el `mp_payment_id`.

Antes de este cambio el webhook marcaba cualquier pago como aprobado sin validar la firma ni consultar a Mercado Pago, el `mp_payment_id` nunca se vinculaba, y los pedidos abandonados dejaban el pago en `PENDIENTE` para siempre. Además había dos riesgos de plata y stock: un pago aprobado **después** de que venciera la reserva marcaba el pedido como pagado sin descontar stock, y un primer intento rechazado cancelaba el pedido, así que si el usuario reintentaba con otra tarjeta el pago aprobado quedaba huérfano.

## Decisión

### Webhook
1. Se valida la firma `x-signature` (HMAC-SHA256 con `MP_WEBHOOK_SECRET`). Sin secret, se rechaza todo.
2. Nunca se usa el estado que viene en la notificación: se consulta el pago a la API de Mercado Pago.
3. Todo se procesa con la fila del pedido bloqueada (`SELECT ... FOR UPDATE`), así dos avisos del mismo pedido van en fila.
4. Idempotente: un aviso repetido no vuelve a descontar stock. Índice único en `pagos.mp_payment_id` como red de seguridad (migración V5).

### Cuándo un pedido pasa a PAGADO
Solo si el pago está `approved` **y** el monto es exactamente el total del pedido **y** la moneda es ARS **y** el pedido sigue `PENDIENTE` **y** su stock sigue reservado.

Un pago aprobado que no cumple alguna condición (monto distinto, doble pago del mismo pedido, pago tardío sobre un pedido cancelado) **se reembolsa automáticamente** por la API y queda `REEMBOLSADO`. Si el reembolso falla, no se guarda nada y se reintenta.

### Rechazos
Un pago rechazado **no** cancela el pedido: el usuario puede reintentar con otra tarjeta mientras dure la reserva. Cada intento queda registrado como una fila de `pagos`.

### Que no queden pagos pendientes
- La preferencia usa `binary_mode` (aprobado o rechazado al instante, nunca "en proceso").
- Se excluyen Rapipago/Pago Fácil (`ticket`) y cajero (`atm`): se acreditan en días y la reserva de stock dura 20 minutos. Se aceptan tarjetas de crédito, débito, prepagas y dinero en cuenta.
- La preferencia **vence 3 minutos antes** que la reserva de stock. No se genera link si quedan menos de 2 minutos.
- Apretar "Pagar" varias veces reutiliza el mismo pago pendiente.
- El job de vencimientos (cada minuto), antes de soltar el stock de un pedido vencido, **busca en Mercado Pago** pagos con ese `external_reference` (por si el webhook no llegó). Si hay uno aprobado válido, confirma la venta. Si no, libera el stock, cancela el pedido y marca sus pagos pendientes como `EXPIRADO` (estado nuevo, migración V6). Si Mercado Pago no responde, espera hasta 30 minutos antes de cancelar igual.

### Productos sin control de stock (caso Scott)
Las variantes con `controla_stock = false` no generan reserva. Por eso la conciliación no exige que el pedido tenga reservas: lo único que cuenta como vencimiento es una reserva ya liberada. Un pedido solo con productos Scott tiene el mismo plazo para pagar (20 minutos desde su creación) y el job lo cierra igual si nunca se paga.

### Quién puede pagar un pedido
`POST /api/pagos/pedidos/{id}/preferencia` exige sesión (decisión 0003) y además verifica que el pedido sea del usuario logueado. Si es de otra persona responde 404, igual que si no existiera, para no revelar qué ids de pedido son válidos.

### Configuración
- `MP_PRODUCCION=true` solo en el servidor real. En ese modo la app **no arranca** si falta `MP_WEBHOOK_SECRET`, si el token es de prueba (`TEST-`) o si las URLs de retorno no son `https://`.
- El token nunca se loguea.
- La URL del webhook se configura en el panel de Mercado Pago (Tus integraciones → Webhooks, evento *Pagos*), no en la preferencia, para que las notificaciones lleguen firmadas.

## Consecuencias

- `ReservaStockLiberadorJob` y `PedidoRepository` cambiaron: quien trabaje en pedidos o stock tiene que tenerlo en cuenta.
- Los reembolsos automáticos quedan en el log como `ERROR` con el motivo: conviene revisarlos.
- Un reembolso o contracargo hecho desde el panel de Mercado Pago sobre un pedido ya pagado **no** cancela el pedido (puede estar despachado): queda logueado como `WARN` para revisión manual.

## Pendiente de confirmar con el cliente: medios de pago offline

La auditoría v3 dice que la tarea 7 (pago aprobado después de que venció la reserva) depende de si el cliente quiere aceptar pagos offline (Rapipago, Pago Fácil, transferencia por cajero). **Esta implementación asume que no**: esos medios están excluidos de la preferencia y un pago que llega tarde se reembolsa. Con esa premisa la tarea 7 queda resuelta.

Si el cliente pide pagos offline:
- Volver a habilitarlos es quitar la exclusión de `ticket` / `atm` en `PagoService.crearPreferenciaPago` y el `binary_mode`.
- **Pero el reembolso automático deja de servir**: un pago en efectivo se acredita días después, siempre llegaría con la reserva vencida y se devolvería. Habría que reemplazarlo por lo que proponía la auditoría v2: al aprobarse tarde, volver a verificar el stock y descontarlo si alcanza; si no, dejar el pedido en un estado explícito (por ejemplo `PAGADO_SIN_STOCK`) para gestión manual desde el panel de pedidos.
- La reserva de 20 minutos y el vencimiento de la preferencia también habría que revisarlos para esos medios.

## Aviso para quien construya el panel de pedidos (Fase 3)

La propuesta compromete **registrar cobros manuales** (transferencia o pago en el local). Hoy `ReservaStockLiberadorJob` cancela cualquier pedido `PENDIENTE` cuya reserva venció y expira sus pagos pendientes, sin mirar el medio de pago. Mientras solo exista Mercado Pago es correcto; **con cobro manual no**: un pedido que espera una transferencia no puede cancelarse solo a los 20 minutos.

Cuando se agregue ese flujo hay que distinguir esos pedidos, por ejemplo con un estado propio (`ESPERANDO_PAGO_MANUAL`) o marcando el medio de pago elegido en el pedido, y excluirlos del job (las consultas `findPedidosConReservasVencidas` y `findPendientesSinReservasActivas`). También hay que decidir qué pasa con su reserva de stock mientras esperan.

## Pendiente fuera de esta tarea

- **Webhook público:** `POST /api/pagos/webhook` tiene que seguir sin login y exento de CSRF (ya está así en `SecurityConfig`). Se protege con la firma, no con sesión.
- **Frontend:** el checkout debería mostrar el mensaje del error 409 (pedido vencido o ya pagado) en vez de un error genérico.
