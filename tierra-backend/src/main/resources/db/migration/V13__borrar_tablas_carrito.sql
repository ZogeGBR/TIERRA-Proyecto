-- Tarea 17: el carrito vive en el navegador (localStorage del frontend) y el
-- checkout recibe los productos en el pedido (ADR 0005). Las tablas del
-- carrito venían del esquema v3 (V1) y nunca las usó ningún endpoint ni
-- servicio: se borran para que el esquema diga lo que el sistema hace.
--
-- Nada las referencia: carrito_items solo apunta a carritos y a
-- variantes_producto, y carritos a usuarios.
DROP TABLE carrito_items;
DROP TABLE carritos;
