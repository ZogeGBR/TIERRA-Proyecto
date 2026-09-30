-- Conciliacion de pagos: estado final para los pagos que nunca se
-- completaron. Antes, un pedido abandonado dejaba su pago en PENDIENTE para
-- siempre (el job solo liberaba el stock). Ahora el job de vencimientos
-- consulta a Mercado Pago y, si no hubo ningun pago aprobado, cancela el
-- pedido y marca sus pagos pendientes como EXPIRADO.
ALTER TYPE estado_pago ADD VALUE IF NOT EXISTS 'EXPIRADO';
