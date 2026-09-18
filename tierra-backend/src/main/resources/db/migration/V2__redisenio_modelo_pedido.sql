-- =========================================================
-- TIERRA — V2: Rediseño del modelo de pedido
-- 1. Agrega tipo_entrega (ENVIO_DOMICILIO, RETIRO_LOCAL)
-- 2. Guarda la dirección de entrega como snapshot copiado en el pedido
--    en lugar de referenciar por FK a la tabla 'direcciones'.
-- =========================================================

-- 1. Tipo enum para forma de entrega
CREATE TYPE tipo_entrega AS ENUM ('ENVIO_DOMICILIO', 'RETIRO_LOCAL');

-- 2. Agregar columna tipo_entrega y campos de snapshot de dirección
ALTER TABLE pedidos
  ADD COLUMN tipo_entrega tipo_entrega NOT NULL DEFAULT 'ENVIO_DOMICILIO',
  ADD COLUMN envio_calle VARCHAR(200),
  ADD COLUMN envio_numero VARCHAR(20),
  ADD COLUMN envio_ciudad VARCHAR(100),
  ADD COLUMN envio_provincia VARCHAR(100),
  ADD COLUMN envio_codigo_postal VARCHAR(20);

-- 3. Migrar datos existentes (si hubiese pedidos creados previamente)
UPDATE pedidos p
SET envio_calle = d.calle,
    envio_numero = d.numero,
    envio_ciudad = d.ciudad,
    envio_provincia = d.provincia,
    envio_codigo_postal = d.codigo_postal
FROM direcciones d
WHERE p.direccion_envio_id = d.id;

-- Si había pedidos sin dirección previa, asignarles RETIRO_LOCAL para mantener consistencia
UPDATE pedidos
SET tipo_entrega = 'RETIRO_LOCAL'
WHERE envio_calle IS NULL;

-- 4. Eliminar clave foránea y columna direccion_envio_id
ALTER TABLE pedidos DROP COLUMN direccion_envio_id;

-- 5. Constraint de integridad: domicilio requiere dirección, retiro local no debe tenerla
ALTER TABLE pedidos ADD CONSTRAINT chk_pedidos_tipo_entrega_direccion CHECK (
  (tipo_entrega = 'RETIRO_LOCAL' AND envio_calle IS NULL AND envio_ciudad IS NULL AND envio_provincia IS NULL AND envio_codigo_postal IS NULL)
  OR
  (tipo_entrega = 'ENVIO_DOMICILIO' AND envio_calle IS NOT NULL AND envio_ciudad IS NOT NULL AND envio_provincia IS NOT NULL AND envio_codigo_postal IS NOT NULL)
);
