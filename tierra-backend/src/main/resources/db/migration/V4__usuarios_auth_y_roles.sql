-- =========================================================
-- TIERRA — V4: Columnas de autenticación y renombre de rol
--
-- 1. Agrega a 'usuarios' lo que necesita Spring Security:
--    - activo: mapea a UserDetails.isEnabled(). El panel de la fase 3
--      lo usa para dar de baja usuarios sin borrarlos (borrar un usuario
--      con pedidos rompe las claves foráneas).
--    - intentos_fallidos / bloqueado_hasta: bloqueo por fuerza bruta.
--      Van en la base y no en memoria para que sobrevivan a los reinicios
--      y para que el panel pueda mostrarlos y desbloquear cuentas.
--
-- 2. Renombra el valor 'STAFF' del enum rol_usuario a 'OPERADOR', que es
--    como lo llama el contrato con el cliente. RENAME VALUE actualiza las
--    filas existentes solas: es la misma entrada física con otro nombre.
--    Se hace ahora porque todavía no hay nada construido encima.
-- =========================================================

ALTER TABLE usuarios
  ADD COLUMN activo             BOOLEAN   NOT NULL DEFAULT true,
  ADD COLUMN intentos_fallidos  INT       NOT NULL DEFAULT 0,
  ADD COLUMN bloqueado_hasta    TIMESTAMP NULL;

ALTER TYPE rol_usuario RENAME VALUE 'STAFF' TO 'OPERADOR';
