-- Conciliacion de pagos: refuerza a nivel de base que un mismo pago de
-- Mercado Pago (mp_payment_id) nunca puede quedar vinculado a mas de una
-- fila de pagos. El codigo en PagoService ya evita reprocesar una
-- notificacion repetida, pero dos notificaciones casi simultaneas del
-- mismo pago podrian pisarse antes de que la primera termine de guardar:
-- este indice es la ultima linea de defensa contra esa carrera.
--
-- Parcial (WHERE mp_payment_id IS NOT NULL) porque cada Pago se crea sin
-- mp_payment_id (todavia no existe: recien se conoce cuando el usuario
-- termina de pagar en Mercado Pago y llega el webhook) y puede haber
-- muchas filas con ese valor en null en simultaneo.
CREATE UNIQUE INDEX ux_pagos_mp_payment_id
  ON pagos (mp_payment_id)
  WHERE mp_payment_id IS NOT NULL;
