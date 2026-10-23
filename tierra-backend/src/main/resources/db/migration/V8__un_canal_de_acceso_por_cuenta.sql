-- =========================================================
-- TIERRA - V8: Acceso de clientes por codigo, segunda parte (ADR 0005)
--
-- Un solo canal de acceso por cuenta: los clientes entran con un codigo
-- de seis digitos y NO tienen contrasena; el equipo entra con contrasena
-- y SIEMPRE la tiene.
--
-- 1. Se borra la contrasena de los clientes que ya existen. En produccion
--    todavia no hay clientes; en las bases de desarrollo es test@ y los que
--    se hayan creado con el registro, que desaparece en esta misma tarea.
--
-- 2. Restriccion CHECK que lo garantiza en la base y no solo en el codigo:
--    un script, un seed o un cambio apurado no pueden saltearla. Cambiar a
--    alguien de canal (un cliente que pasa al equipo) exige cambiar el rol y
--    la contrasena en la misma sentencia; es intencional.
--
-- El seed de desarrollo (db/dev/R__seed_dev.sql) se cambio en el mismo
-- commit: en una base nueva corre despues de esta migracion, y si siguiera
-- insertando a test@ con contrasena chocaria con la restriccion.
-- =========================================================

UPDATE usuarios SET password_hash = NULL WHERE rol = 'CLIENTE';

ALTER TABLE usuarios ADD CONSTRAINT chk_usuarios_metodo_acceso CHECK (
  (rol = 'CLIENTE'  AND password_hash IS NULL) OR
  (rol <> 'CLIENTE' AND password_hash IS NOT NULL)
);
