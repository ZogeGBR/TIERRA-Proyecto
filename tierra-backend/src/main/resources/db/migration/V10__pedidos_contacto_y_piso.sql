-- Checkout sin cuenta (tarea 9, ADR 0005) y datos para Andreani (decisión 0006).
--
-- 1. Los datos de contacto del destinatario se guardan EN el pedido, no en
--    la cuenta: escribir el email de otra persona en el checkout no tiene
--    que modificar nada de ella, y el destinatario puede no ser el comprador
--    (un regalo).
-- 2. Piso y departamento en la dirección de entrega: Andreani los pide por
--    separado para crear el envío.
ALTER TABLE pedidos
    ADD COLUMN contacto_nombre    VARCHAR(150),
    ADD COLUMN contacto_telefono  VARCHAR(30),
    ADD COLUMN contacto_dni       VARCHAR(20),
    ADD COLUMN envio_piso         VARCHAR(10),
    ADD COLUMN envio_departamento VARCHAR(10);

-- Los pedidos que ya existen (solo en bases de desarrollo) toman el nombre y
-- el teléfono de su usuario.
UPDATE pedidos p
SET contacto_nombre = u.nombre,
    contacto_telefono = u.telefono
FROM usuarios u
WHERE u.id = p.usuario_id;

ALTER TABLE pedidos ALTER COLUMN contacto_nombre SET NOT NULL;

-- Teléfono y DNI (este último solo con envío) los exige el checkout, pero no
-- se agrega un CHECK: los pedidos viejos no los tienen, y un CHECK sin
-- validar igual se evalúa cuando se actualiza una fila vieja (por ejemplo, al
-- cancelarla por vencimiento), que fallaría.
