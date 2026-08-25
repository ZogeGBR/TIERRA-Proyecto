-- =========================================================
-- TIERRA — Modelo de datos v2 (PostgreSQL)
-- E-commerce + venta presencial (omnicanal) + alquiler de
-- equipo de invierno, sobre un único inventario.
--
-- Cambios respecto de v1 (tras confirmar que el local de Esquel
-- vende de forma presencial y comparte stock con la web):
--   1. El stock deja de ser una columna que se pisa: ahora es el
--      resultado de sumar un libro de movimientos append-only
--      (movimientos_inventario). variantes_producto.stock queda
--      como caché materializada, no como fuente de verdad.
--   2. Se agrega reservas_stock con vencimiento: el carrito web
--      reserva, no descuenta; el descuento real ocurre recién
--      cuando el pago se confirma (evita el bug de v1 donde el
--      stock se descontaba antes de confirmar el pago).
--   3. pedidos ahora tiene un campo canal (WEB/LOCAL/ADMIN): es
--      una sola tabla para los dos canales, no una tabla paralela
--      de "ventas locales".
--   4. Se agrega ubicaciones (aunque hoy exista un solo local) y
--      sesiones_caja para trazabilidad del mostrador.
--   5. El EXCLUDE de no-solapamiento de reservas de alquiler pasa
--      de comentario a constraint real.
-- =========================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";   -- para gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS "btree_gist"; -- para el EXCLUDE de no-solapamiento en alquiler

-- ---------- TIPOS ENUM ----------
CREATE TYPE rol_usuario AS ENUM ('cliente', 'admin', 'staff');
CREATE TYPE genero_producto AS ENUM ('hombre', 'mujer', 'unisex', 'nino');
CREATE TYPE estado_pedido AS ENUM ('pendiente', 'pagado', 'preparando', 'enviado', 'entregado', 'cancelado');
CREATE TYPE metodo_pago AS ENUM ('mercado_pago', 'tarjeta_credito', 'tarjeta_debito', 'efectivo');
CREATE TYPE estado_pago AS ENUM ('pendiente', 'aprobado', 'rechazado', 'reembolsado');
CREATE TYPE estado_envio AS ENUM ('pendiente', 'en_camino', 'entregado', 'devuelto');
CREATE TYPE estado_reserva AS ENUM ('reservado', 'entregado', 'devuelto', 'cancelado', 'atrasado');
CREATE TYPE condicion_equipo AS ENUM ('excelente', 'bueno', 'regular', 'fuera_de_servicio');
CREATE TYPE canal_venta AS ENUM ('web', 'local', 'admin');
CREATE TYPE tipo_movimiento_inventario AS ENUM ('ingreso_compra', 'egreso_venta', 'ajuste', 'devolucion', 'merma', 'transferencia');
CREATE TYPE estado_sesion_caja AS ENUM ('abierta', 'cerrada');

-- =========================================================
-- 1. USUARIOS Y DIRECCIONES
-- =========================================================

CREATE TABLE usuarios (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre         VARCHAR(150) NOT NULL,
  email          VARCHAR(150) UNIQUE NOT NULL,
  password_hash  VARCHAR(255) NOT NULL,
  telefono       VARCHAR(30),
  dni            VARCHAR(20),
  rol            rol_usuario NOT NULL DEFAULT 'cliente',
  creado_en      TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE direcciones (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id         UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  calle              VARCHAR(200) NOT NULL,
  numero             VARCHAR(20),
  ciudad             VARCHAR(100) NOT NULL,
  provincia          VARCHAR(100) NOT NULL,
  codigo_postal      VARCHAR(20) NOT NULL,
  es_predeterminada  BOOLEAN NOT NULL DEFAULT false
);

-- =========================================================
-- 1b. UBICACIONES
-- =========================================================
-- Existe desde el día uno aunque hoy haya un solo local. Agregar
-- multi-ubicación después obligaría a migrar todo el historial
-- de movimientos ya cargado.
CREATE TABLE ubicaciones (
  id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre  VARCHAR(100) NOT NULL,   -- ej. 'Local Esquel', 'Depósito'
  tipo    VARCHAR(20) NOT NULL DEFAULT 'local'  -- 'local' | 'deposito'
);

-- =========================================================
-- 2. CATALOGO (venta)
-- =========================================================

CREATE TABLE marcas (
  id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre    VARCHAR(100) UNIQUE NOT NULL,
  logo_url  VARCHAR(255)
);
-- ej: Trevo, Saucony, Fox, Avia, Camelbak, New Balance, Northland, The North Face, Trown, Scott, Waterdog, Nataway

CREATE TABLE categorias (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre              VARCHAR(100) NOT NULL,
  slug                VARCHAR(100) UNIQUE NOT NULL,
  categoria_padre_id  UUID REFERENCES categorias(id)
);
-- ej: Ropa > Ropa urbana / Ropa deportiva | Equipamiento > Carpas / Mochilas | Bicicletas > MTB / Ruta

CREATE TABLE productos (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  marca_id      UUID NOT NULL REFERENCES marcas(id),
  categoria_id  UUID NOT NULL REFERENCES categorias(id),
  nombre        VARCHAR(200) NOT NULL,
  descripcion   TEXT,
  genero        genero_producto NOT NULL DEFAULT 'unisex',
  precio        DECIMAL(12,2) NOT NULL CHECK (precio >= 0),
  activo        BOOLEAN NOT NULL DEFAULT true,
  creado_en     TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE variantes_producto (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  producto_id        UUID NOT NULL REFERENCES productos(id) ON DELETE CASCADE,
  sku                VARCHAR(50) UNIQUE NOT NULL,
  talla              VARCHAR(20),
  color              VARCHAR(50),
  -- CACHÉ, no fuente de verdad: se actualiza cuando se inserta un
  -- movimiento en movimientos_inventario (ver sección 6b) y debe
  -- ser siempre reconstruible sumando ese libro. stock_fisico es lo
  -- que hay en la ubicación; stock_reservado es lo que el carrito
  -- web tiene bloqueado con TTL (ver reservas_stock). Disponible
  -- para vender = stock_fisico - stock_reservado.
  stock_fisico       INT NOT NULL DEFAULT 0 CHECK (stock_fisico >= 0),
  stock_reservado    INT NOT NULL DEFAULT 0 CHECK (stock_reservado >= 0),
  precio_adicional   DECIMAL(12,2) NOT NULL DEFAULT 0,
  CHECK (stock_reservado <= stock_fisico)
);

CREATE TABLE imagenes_producto (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  producto_id  UUID NOT NULL REFERENCES productos(id) ON DELETE CASCADE,
  url          VARCHAR(255) NOT NULL,
  orden        INT NOT NULL DEFAULT 0
);

CREATE TABLE resenas (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  producto_id   UUID NOT NULL REFERENCES productos(id) ON DELETE CASCADE,
  usuario_id    UUID NOT NULL REFERENCES usuarios(id),
  calificacion  SMALLINT NOT NULL CHECK (calificacion BETWEEN 1 AND 5),
  comentario    TEXT,
  creado_en     TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE favoritos (
  usuario_id   UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  producto_id  UUID NOT NULL REFERENCES productos(id) ON DELETE CASCADE,
  creado_en    TIMESTAMP NOT NULL DEFAULT now(),
  PRIMARY KEY (usuario_id, producto_id)
);

-- =========================================================
-- 3. CARRITO Y CUPONES
-- =========================================================

CREATE TABLE carritos (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id  UUID REFERENCES usuarios(id),
  session_id  VARCHAR(100),  -- para invitados sin cuenta
  creado_en   TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE carrito_items (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  carrito_id   UUID NOT NULL REFERENCES carritos(id) ON DELETE CASCADE,
  variante_id  UUID NOT NULL REFERENCES variantes_producto(id),
  cantidad     INT NOT NULL CHECK (cantidad > 0)
);

CREATE TABLE cupones (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo                VARCHAR(50) UNIQUE NOT NULL,
  porcentaje_descuento  DECIMAL(5,2),
  monto_descuento       DECIMAL(12,2),
  valido_desde          DATE,
  valido_hasta          DATE,
  usos_maximos          INT,
  usos_actuales         INT NOT NULL DEFAULT 0
);

-- =========================================================
-- 4. PEDIDOS Y ENVIOS
-- =========================================================

-- Sesión de caja: vincula cada venta presencial con un turno y un
-- vendedor. Es la base del arqueo y de la trazabilidad interna del
-- local — sin esto, un faltante de caja no se puede rastrear a nadie.
CREATE TABLE sesiones_caja (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id     UUID NOT NULL REFERENCES usuarios(id),
  ubicacion_id   UUID NOT NULL REFERENCES ubicaciones(id),
  estado         estado_sesion_caja NOT NULL DEFAULT 'abierta',
  monto_inicial  DECIMAL(12,2) NOT NULL DEFAULT 0,
  monto_final    DECIMAL(12,2),
  abierta_en     TIMESTAMP NOT NULL DEFAULT now(),
  cerrada_en     TIMESTAMP
);

-- PEDIDO es una sola entidad para venta web y venta de mostrador,
-- distinguidas por 'canal'. Una tabla separada de "venta local"
-- duplicaría toda la lógica de devoluciones, facturación y métricas.
CREATE TABLE pedidos (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id          UUID REFERENCES usuarios(id), -- nullable: cliente de mostrador puede no estar registrado
  canal               canal_venta NOT NULL DEFAULT 'web',
  ubicacion_id        UUID REFERENCES ubicaciones(id),   -- obligatorio en canal 'local'
  sesion_caja_id      UUID REFERENCES sesiones_caja(id), -- obligatorio en canal 'local'
  direccion_envio_id  UUID REFERENCES direcciones(id),
  cupon_id            UUID REFERENCES cupones(id),
  estado              estado_pedido NOT NULL DEFAULT 'pendiente',
  subtotal            DECIMAL(12,2) NOT NULL,
  descuento           DECIMAL(12,2) NOT NULL DEFAULT 0,
  costo_envio         DECIMAL(12,2) NOT NULL DEFAULT 0,
  total               DECIMAL(12,2) NOT NULL,
  creado_en           TIMESTAMP NOT NULL DEFAULT now(),
  CHECK (canal <> 'local' OR (ubicacion_id IS NOT NULL AND sesion_caja_id IS NOT NULL))
);

CREATE TABLE pedido_items (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pedido_id         UUID NOT NULL REFERENCES pedidos(id) ON DELETE CASCADE,
  variante_id       UUID NOT NULL REFERENCES variantes_producto(id),
  cantidad          INT NOT NULL CHECK (cantidad > 0),
  precio_unitario   DECIMAL(12,2) NOT NULL
);

CREATE TABLE envios (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pedido_id           UUID NOT NULL REFERENCES pedidos(id),
  transportista       VARCHAR(50),   -- Correo Argentino, Andreani, OCA
  numero_seguimiento  VARCHAR(100),
  costo               DECIMAL(12,2) NOT NULL DEFAULT 0,
  estado              estado_envio NOT NULL DEFAULT 'pendiente',
  fecha_estimada      DATE
);

-- =========================================================
-- 5. ALQUILER DE EQUIPO DE INVIERNO
-- =========================================================

CREATE TABLE tipos_equipo_alquiler (
  id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre  VARCHAR(50) UNIQUE NOT NULL
);
-- ej: esquís, tabla de snowboard, botas de esquí, bastones, casco, antiparras

CREATE TABLE equipos_alquiler (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo_id             UUID NOT NULL REFERENCES tipos_equipo_alquiler(id),
  marca_id            UUID REFERENCES marcas(id),
  modelo              VARCHAR(100),
  talla               VARCHAR(20),          -- largo de esquí en cm, talle de bota, etc.
  numero_serie        VARCHAR(50) UNIQUE,   -- cada unidad física es un ítem serializado
  condicion           condicion_equipo NOT NULL DEFAULT 'bueno',
  precio_dia          DECIMAL(12,2) NOT NULL,
  deposito_garantia   DECIMAL(12,2) NOT NULL,
  activo              BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE tarifas_temporada (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo_id        UUID NOT NULL REFERENCES tipos_equipo_alquiler(id),
  temporada      VARCHAR(50) NOT NULL,   -- ej. 'Invierno 2026'
  precio_dia     DECIMAL(12,2) NOT NULL,
  precio_semana  DECIMAL(12,2),
  fecha_inicio   DATE NOT NULL,
  fecha_fin      DATE NOT NULL
);

CREATE TABLE reservas_alquiler (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id      UUID NOT NULL REFERENCES usuarios(id),
  fecha_inicio    DATE NOT NULL,
  fecha_fin       DATE NOT NULL,
  estado          estado_reserva NOT NULL DEFAULT 'reservado',
  deposito_total  DECIMAL(12,2) NOT NULL,
  precio_total    DECIMAL(12,2) NOT NULL,
  creado_en       TIMESTAMP NOT NULL DEFAULT now(),
  CHECK (fecha_fin >= fecha_inicio)
);

CREATE TABLE reserva_items (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reserva_id            UUID NOT NULL REFERENCES reservas_alquiler(id) ON DELETE CASCADE,
  equipo_id             UUID NOT NULL REFERENCES equipos_alquiler(id),
  precio_dia_aplicado   DECIMAL(12,2) NOT NULL,
  -- fecha_inicio/fecha_fin son las columnas "reales" que escribe la
  -- aplicación (mapeables directo en JPA como LocalDate, sin librerías
  -- extra). 'periodo' es una columna GENERATED: Postgres la calcula sola
  -- a partir de las dos anteriores, así que la aplicación nunca la toca
  -- ni necesita saber que existe — pero el EXCLUDE de abajo sí la usa.
  fecha_inicio          DATE NOT NULL,
  fecha_fin             DATE NOT NULL,
  periodo               daterange GENERATED ALWAYS AS (daterange(fecha_inicio, fecha_fin, '[]')) STORED
);

-- Garantía de motor, no de aplicación: es imposible que dos filas de
-- reserva_items con el mismo equipo_id tengan periodos que se pisen.
-- Esto es lo que en v1 estaba comentado como "opcional" — con venta
-- presencial confirmada, dejar de tenerlo es un riesgo real de doble
-- reserva sobre el mismo esquí un fin de semana de temporada alta.
ALTER TABLE reserva_items ADD CONSTRAINT no_solapamiento_equipo
  EXCLUDE USING gist (equipo_id WITH =, periodo WITH &&);

CREATE TABLE devoluciones_alquiler (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reserva_item_id      UUID NOT NULL REFERENCES reserva_items(id),
  fecha_devolucion     TIMESTAMP NOT NULL DEFAULT now(),
  condicion_devuelta   condicion_equipo NOT NULL,
  cargo_por_dano       DECIMAL(12,2) NOT NULL DEFAULT 0,
  observaciones        TEXT
);

CREATE TABLE mantenimiento_equipo (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  equipo_id    UUID NOT NULL REFERENCES equipos_alquiler(id),
  fecha        TIMESTAMP NOT NULL DEFAULT now(),
  descripcion  TEXT,
  costo        DECIMAL(12,2) NOT NULL DEFAULT 0
);

-- =========================================================
-- 5b. INVENTARIO: libro de movimientos y reservas con vencimiento
-- =========================================================
-- Principio: ningún proceso pisa stock_fisico/stock_reservado
-- directamente. Todo pasa por un movimiento acá, y la aplicación
-- recalcula la caché en variantes_producto a partir de esto.
-- Es sin UPDATE ni DELETE — un asiento contable, no un registro editable.

CREATE TABLE movimientos_inventario (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  variante_id   UUID NOT NULL REFERENCES variantes_producto(id),
  ubicacion_id  UUID NOT NULL REFERENCES ubicaciones(id),
  cantidad      INT NOT NULL,  -- con signo: positivo = ingreso, negativo = egreso
  tipo          tipo_movimiento_inventario NOT NULL,
  canal         canal_venta NOT NULL,
  usuario_id    UUID REFERENCES usuarios(id),  -- obligatorio a nivel aplicación cuando tipo = 'ajuste'
  motivo        TEXT,                          -- obligatorio a nivel aplicación cuando tipo = 'ajuste'
  referencia_pedido_id UUID REFERENCES pedidos(id),
  creado_en     TIMESTAMP NOT NULL DEFAULT now()
);
-- Sin UPDATE/DELETE: revocar estos permisos a nivel de rol de aplicación
-- una vez que el equipo defina los roles de base de datos.

-- Reserva temporal del carrito web, con vencimiento (TTL). El carrito
-- NO descuenta stock_fisico: solo sube stock_reservado. El descuento
-- real (un movimiento 'egreso_venta') recién ocurre cuando el pago se
-- confirma. Si la reserva expira o el pago falla, un worker la libera
-- y baja stock_reservado — esto es lo que evita el bug de v1.
CREATE TABLE reservas_stock (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  variante_id  UUID NOT NULL REFERENCES variantes_producto(id),
  pedido_id    UUID REFERENCES pedidos(id),
  cantidad     INT NOT NULL CHECK (cantidad > 0),
  canal        canal_venta NOT NULL DEFAULT 'web',
  expira_en    TIMESTAMP NOT NULL,
  liberada     BOOLEAN NOT NULL DEFAULT false,
  creado_en    TIMESTAMP NOT NULL DEFAULT now()
);
CREATE INDEX idx_reservas_stock_vigentes ON reservas_stock(expira_en) WHERE liberada = false;

-- =========================================================
-- 6. PAGOS (une venta y alquiler, nunca guarda datos de tarjeta)
-- =========================================================

CREATE TABLE pagos (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pedido_id      UUID REFERENCES pedidos(id),
  reserva_id     UUID REFERENCES reservas_alquiler(id),
  metodo         metodo_pago NOT NULL,
  estado         estado_pago NOT NULL DEFAULT 'pendiente',
  monto          DECIMAL(12,2) NOT NULL,
  mp_payment_id  VARCHAR(100),   -- id devuelto por Mercado Pago; nunca datos de tarjeta
  creado_en      TIMESTAMP NOT NULL DEFAULT now(),
  CHECK (
    (pedido_id IS NOT NULL AND reserva_id IS NULL) OR
    (pedido_id IS NULL AND reserva_id IS NOT NULL)
  )
);

-- =========================================================
-- 7b. AUDITORÍA
-- =========================================================
-- Toda acción administrativa sensible (cambio de precio, ajuste de
-- stock, cambio de rol, descuento en caja, anulación) queda acá.
-- Append-only, igual que movimientos_inventario.
CREATE TABLE registro_auditoria (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id     UUID REFERENCES usuarios(id),
  accion         VARCHAR(100) NOT NULL,   -- ej. 'AJUSTE_STOCK', 'CAMBIO_PRECIO', 'ANULACION_VENTA'
  entidad        VARCHAR(100) NOT NULL,   -- ej. 'variante_producto', 'pedido'
  entidad_id     UUID,
  valor_anterior JSONB,
  valor_nuevo    JSONB,
  ip             VARCHAR(45),
  creado_en      TIMESTAMP NOT NULL DEFAULT now()
);

-- =========================================================
-- INDICES
-- =========================================================

CREATE INDEX idx_productos_categoria      ON productos(categoria_id);
CREATE INDEX idx_productos_marca          ON productos(marca_id);
CREATE INDEX idx_variantes_producto       ON variantes_producto(producto_id);
CREATE INDEX idx_pedidos_usuario          ON pedidos(usuario_id);
CREATE INDEX idx_pedidos_canal            ON pedidos(canal);
CREATE INDEX idx_reservas_usuario         ON reservas_alquiler(usuario_id);
CREATE INDEX idx_reserva_items_equipo     ON reserva_items(equipo_id);
CREATE INDEX idx_resenas_producto         ON resenas(producto_id);
CREATE INDEX idx_movimientos_variante     ON movimientos_inventario(variante_id);
CREATE INDEX idx_sesiones_caja_ubicacion  ON sesiones_caja(ubicacion_id);
CREATE INDEX idx_auditoria_entidad        ON registro_auditoria(entidad, entidad_id);
