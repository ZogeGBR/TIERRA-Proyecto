-- =========================================================
-- TIERRA — V3: Flag controla_stock para variantes de producto
-- Permite que líneas como bicicletas Scott se configuren sin
-- control de unidades y permanezcan siempre disponibles.
-- NOT NULL DEFAULT true para que las variantes existentes no cambien de comportamiento.
-- =========================================================

ALTER TABLE variantes_producto
  ADD COLUMN controla_stock BOOLEAN NOT NULL DEFAULT true;

-- Configurar las variantes de productos de marca Scott sin control de unidades y stock 0
UPDATE variantes_producto vp
SET controla_stock = false,
    stock = 0
FROM productos p
JOIN marcas m ON p.marca_id = m.id
WHERE vp.producto_id = p.id
  AND m.nombre ILIKE 'Scott';
