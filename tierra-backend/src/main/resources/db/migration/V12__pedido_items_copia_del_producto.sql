-- Historial de pedidos (tarea 19).
--
-- 1. Cada ítem guarda una copia del nombre del producto, el talle y el color
--    al momento de comprar, como ya guarda el precio. Así "lo que compraste"
--    no cambia si después se edita el producto (el panel de la Fase 3 lo va
--    a permitir). Los pedidos que ya existen toman los datos actuales.
ALTER TABLE pedido_items
    ADD COLUMN nombre_producto VARCHAR(200),
    ADD COLUMN talla           VARCHAR(20),
    ADD COLUMN color           VARCHAR(50);

UPDATE pedido_items i
SET nombre_producto = p.nombre,
    talla = v.talla,
    color = v.color
FROM variantes_producto v
JOIN productos p ON p.id = v.producto_id
WHERE v.id = i.variante_id;

ALTER TABLE pedido_items ALTER COLUMN nombre_producto SET NOT NULL;

-- 2. Índices que usa el historial y que no existían: los ítems de cada
--    pedido, y los pagos de cada pedido (para saber si un pedido cancelado
--    se había pagado).
CREATE INDEX idx_pedido_items_pedido ON pedido_items (pedido_id);
CREATE INDEX idx_pagos_pedido ON pagos (pedido_id);
