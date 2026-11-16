-- Datos guardados para la próxima compra (tarea 22, ADR 0005).
--
-- El cliente con sesión puede guardar UNA dirección en su cuenta, no una
-- libreta. Se le suman piso y departamento, como a la dirección del pedido
-- (V10), para que la precarga no pierda lo que pide Andreani.
ALTER TABLE direcciones
    ADD COLUMN piso         VARCHAR(10),
    ADD COLUMN departamento VARCHAR(10);

-- Si algún cliente tenía más de una (solo puede pasar en una base de
-- desarrollo vieja), queda la predeterminada; entre iguales, una cualquiera
-- pero siempre la misma (el id mayor).
DELETE FROM direcciones d
USING direcciones otra
WHERE otra.usuario_id = d.usuario_id
  AND (otra.es_predeterminada, otra.id) > (d.es_predeterminada, d.id);

-- Una sola dirección por cliente, garantizado por la base: el checkout la
-- escribe con INSERT ... ON CONFLICT (usuario_id), así dos compras
-- simultáneas de la misma cuenta no pueden dejar dos.
CREATE UNIQUE INDEX ux_direcciones_usuario ON direcciones (usuario_id);
