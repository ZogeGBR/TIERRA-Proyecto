-- =========================================================
-- TIERRA - V7: Acceso de clientes por codigo, primera parte (ADR 0005)
--
-- Solo el modelo de datos. No cambia ningun comportamiento: el login con
-- contrasena sigue igual hasta la tarea 3, que agrega el acceso por codigo
-- y la restriccion de "un canal por cuenta" (V8).
--
-- 1. password_hash admite nulos. Los clientes nuevos no van a tener
--    contrasena: compran sin cuenta y entran con un codigo. El equipo la
--    sigue teniendo. La restriccion CHECK que lo garantiza llega en V8,
--    junto con el codigo que la respeta.
--
-- 2. codigos_acceso: una fila por cada codigo de seis digitos enviado.
--    - codigo_hash guarda el HMAC-SHA256 del codigo en hexadecimal (64
--      caracteres), NUNCA el codigo: con un millon de combinaciones
--      posibles, un hash sin clave se revierte en segundos.
--    - intentos: verificaciones fallidas de ESE codigo. Al quinto se agota.
--    - usado / invalidado: un codigo sirve una sola vez, y pedir uno nuevo
--      invalida el anterior.
--    - ON DELETE CASCADE: un codigo no tiene sentido sin su cuenta.
--    - El indice sirve a las dos consultas frecuentes: el codigo vigente de
--      un cliente y cuantos pidio en las ultimas 24 horas.
--    - TIMESTAMP como el resto del esquema, a proposito: el paso a
--      TIMESTAMPTZ de la Fase 5 se hace para todas las tablas a la vez.
-- =========================================================

ALTER TABLE usuarios ALTER COLUMN password_hash DROP NOT NULL;

CREATE TABLE codigos_acceso (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id   UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  codigo_hash  VARCHAR(64) NOT NULL,
  expira_en    TIMESTAMP NOT NULL,
  intentos     INT NOT NULL DEFAULT 0,
  usado        BOOLEAN NOT NULL DEFAULT false,
  invalidado   BOOLEAN NOT NULL DEFAULT false,
  creado_en    TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX idx_codigos_acceso_usuario ON codigos_acceso (usuario_id, creado_en DESC);
