# 0002 — Conciliación de pagos con Mercado Pago

- **Estado:** propuesta (rama `feat/conciliacion-pagos-mp`)
- **Ubicación en el repo:** `docs/decisiones/0002-conciliacion-pagos-mercado-pago.md`

---

## Contexto

El cobro usa **Checkout Pro**: el backend crea una preferencia y el usuario paga en la página de Mercado Pago. Tierra nunca recibe ni guarda datos de tarjeta; solo el `mp_payment_id`.

Antes de este cambio el webhook marcaba cualquier pago como aprobado sin validar la firma ni consultar a Mercado Pago, el `mp_payment_id` nunca se vinculaba, y los pedidos abandonados dejaban el pago en `PENDIENTE` para siempre. Además había dos riesgos de plata y stock: un pago aprobado **después** de que venciera la reserva marcaba el pedido como pagado sin descontar stock, y un primer intento rechazado cancelaba el pedido, así que si el usuario reintentaba con otra tarjeta el pago aprobado quedaba huérfano.

## Decisión

### Webhook
1. Se valida la firma `x-signature` (HMAC-SHA256 con `MP_WEBHOOK_SECRET`). Sin secret, se rechaza todo.
2. Nunca se usa el estado que viene en la notificación: se consulta el pago a la API de Mercado Pago.
3. Todo se procesa con la fila del pedido bloqueada (`SELECT ... FOR UPDATE`), así dos avisos del mismo pedido van en fila.
4. Idempotente: un aviso repetido no vuelve a descontar stock. Índice único en `pagos.mp_payment_id` como red de seguridad.

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
- El job de vencimientos (cada minuto), antes de soltar el stock de un pedido vencido, **busca en Mercado Pago** pagos con ese `external_reference` (por si el webhook no llegó). Si hay uno aprobado válido, confirma la venta. Si no, libera el stock, cancela el pedido y marca sus pagos pendientes como `EXPIRADO` (estado nuevo, migración V3). Si Mercado Pago no responde, espera hasta 30 minutos antes de cancelar igual.

### Configuración
- `MP_PRODUCCION=true` solo en el servidor real. En ese modo la app **no arranca** si falta `MP_WEBHOOK_SECRET`, si el token es de prueba (`TEST-`) o si las URLs de retorno no son `https://`.
- El token nunca se loguea.
- La URL del webhook se configura en el panel de Mercado Pago (Tus integraciones → Webhooks, evento *Pagos*), no en la preferencia, para que las notificaciones lleguen firmadas.

## Consecuencias

- `ReservaStockLiberadorJob` y `PedidoRepository` cambiaron: quien trabaje en pedidos o stock tiene que tenerlo en cuenta.
- Los reembolsos automáticos quedan en el log como `ERROR` con el motivo: conviene revisarlos.
- Un reembolso o contracargo hecho desde el panel de Mercado Pago sobre un pedido ya pagado **no** cancela el pedido (puede estar despachado): queda logueado como `WARN` para revisión manual.

## Pendiente fuera de esta tarea

- **Login:** `POST /api/pagos/pedidos/{id}/preferencia` hoy no verifica que el pedido sea del usuario que lo pide, porque la API entera está abierta (`SecurityConfig`). Cuando esté el login hay que agregar ese chequeo (marcado con `TODO(login)` en `PagoService`). El webhook tiene que seguir siendo público: se protege con la firma, no con login.
- **Frontend:** el checkout debería mostrar el mensaje del error 409 (pedido vencido o ya pagado) en vez de un error genérico.
