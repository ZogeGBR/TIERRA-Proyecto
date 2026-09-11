-- =========================================================
-- TIERRA — Modelo de datos v3 (PostgreSQL)
-- E-commerce (venta online) + alquiler de equipo de invierno.
--
-- Cambio respecto de v2: el dueño confirmó que el stock de la
-- web y el del local (que usa su propio sistema, Andino) tienen
-- que quedar SEPARADOS a propósito, y que es una decisión estable
-- (no algo que vaya a cambiar en el corto plazo). Por eso se saca
-- todo lo que existía para unificarlos:
--   - ubicaciones, sesiones_caja, movimientos_inventario: afuera.
--   - pedidos vuelve a ser solo de la venta online, sin canal.
--   - variantes_producto.stock_fisico vuelve a llamarse stock,
--     sin el "físico" que solo tenía sentido comparándolo con otro canal.
-- Lo único que se mantiene de ese esfuerzo es reservas_stock (el
-- carrito reserva con vencimiento en vez de descontar directo) —
-- eso no es una cuestión omnicanal, es una corrección real de un
-- bug de sobreventa que existía incluso con un solo canal.
-- =========================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";   -- para gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS "btree_gist"; -- para el EXCLUDE de no-solapamiento en alquiler

-- ---------- TIPOS ENUM ----------
CREATE TYPE rol_usuario AS ENUM ('CLIENTE', 'ADMIN', 'STAFF');
CREATE TYPE genero_producto AS ENUM ('HOMBRE', 'MUJER', 'UNISEX', 'NINO');
CREATE TYPE estado_pedido AS ENUM ('PENDIENTE', 'PAGADO', 'PREPARANDO', 'ENVIADO', 'ENTREGADO', 'CANCELADO');
CREATE TYPE metodo_pago AS ENUM ('MERCADO_PAGO', 'TARJETA_CREDITO', 'TARJETA_DEBITO', 'EFECTIVO');
CREATE TYPE estado_pago AS ENUM ('PENDIENTE', 'APROBADO', 'RECHAZADO', 'REEMBOLSADO');
CREATE TYPE estado_envio AS ENUM ('PENDIENTE', 'EN_CAMINO', 'ENTREGADO', 'DEVUELTO');
CREATE TYPE estado_reserva AS ENUM ('RESERVADO', 'ENTREGADO', 'DEVUELTO', 'CANCELADO', 'ATRASADO');
CREATE TYPE condicion_equipo AS ENUM ('EXCELENTE', 'BUENO', 'REGULAR', 'FUERA_DE_SERVICIO');

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
  rol            rol_usuario NOT NULL DEFAULT 'CLIENTE',
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
-- 2. CATALOGO (venta online)
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
  genero        genero_producto NOT NULL DEFAULT 'UNISEX',
  precio        DECIMAL(12,2) NOT NULL CHECK (precio >= 0),
  activo        BOOLEAN NOT NULL DEFAULT true,
  creado_en     TIMESTAMP NOT NULL DEFAULT now()
);

-- El stock de acá es EXCLUSIVO de la venta online. El local usa su
-- propio sistema (Andino) y es intencional que no estén sincronizados
-- — el dueño lo pidió así explícitamente y no es algo transitorio.
CREATE TABLE variantes_producto (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  producto_id        UUID NOT NULL REFERENCES productos(id) ON DELETE CASCADE,
  sku                VARCHAR(50) UNIQUE NOT NULL,
  talla              VARCHAR(20),
  color              VARCHAR(50),
  -- stock_reservado es lo que el carrito tiene bloqueado con TTL
  -- mientras el pago no se confirma (ver reservas_stock). Disponible
  -- para vender = stock - stock_reservado.
  stock              INT NOT NULL DEFAULT 0 CHECK (stock >= 0),
  stock_reservado    INT NOT NULL DEFAULT 0 CHECK (stock_reservado >= 0),
  precio_adicional   DECIMAL(12,2) NOT NULL DEFAULT 0,
  CHECK (stock_reservado <= stock)
);

CREATE TABLE imagenes_producto (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  producto_id  UUID NOT NULL REFERENCES productos(id) ON DELETE CASCADE,
  -- TEXT y no VARCHAR(255): las imágenes de producto pueden venir como
  -- ilustraciones vectoriales embebidas (data:image/svg+xml,...), que son
  -- strings largos — un VARCHAR corto las rechaza y tira abajo el INSERT
  -- completo (así se rompió el seed la primera vez que se cargaron).
  url          TEXT NOT NULL,
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
-- 4. PEDIDOS Y ENVIOS (venta online exclusivamente)
-- =========================================================

CREATE TABLE pedidos (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id          UUID NOT NULL REFERENCES usuarios(id),
  direccion_envio_id  UUID REFERENCES direcciones(id),
  cupon_id            UUID REFERENCES cupones(id),
  estado              estado_pedido NOT NULL DEFAULT 'PENDIENTE',
  subtotal            DECIMAL(12,2) NOT NULL,
  descuento           DECIMAL(12,2) NOT NULL DEFAULT 0,
  costo_envio         DECIMAL(12,2) NOT NULL DEFAULT 0,
  total               DECIMAL(12,2) NOT NULL,
  creado_en           TIMESTAMP NOT NULL DEFAULT now()
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
  transportista       VARCHAR(50),   -- Correo Argentino, Andreani, OCA, o gestión propia
  numero_seguimiento  VARCHAR(100),
  costo               DECIMAL(12,2) NOT NULL DEFAULT 0,
  estado              estado_envio NOT NULL DEFAULT 'PENDIENTE',
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
  condicion           condicion_equipo NOT NULL DEFAULT 'BUENO',
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
  estado          estado_reserva NOT NULL DEFAULT 'RESERVADO',
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
-- 5b. RESERVA DE STOCK DEL CARRITO (con vencimiento)
-- =========================================================
-- El carrito NO descuenta stock directo: solo sube stock_reservado,
-- con un TTL. El descuento real ocurre recién cuando el pago se
-- confirma (ver InventarioService.confirmarVenta en el backend). Si
-- la reserva expira o el pago falla, un job la libera y baja
-- stock_reservado — esto es lo que evita vender de más si dos
-- personas compran la última unidad casi al mismo tiempo.
CREATE TABLE reservas_stock (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  variante_id  UUID NOT NULL REFERENCES variantes_producto(id),
  pedido_id    UUID REFERENCES pedidos(id),
  cantidad     INT NOT NULL CHECK (cantidad > 0),
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
  estado         estado_pago NOT NULL DEFAULT 'PENDIENTE',
  monto          DECIMAL(12,2) NOT NULL,
  mp_payment_id  VARCHAR(100),   -- id devuelto por Mercado Pago; nunca datos de tarjeta
  creado_en      TIMESTAMP NOT NULL DEFAULT now(),
  CHECK (
    (pedido_id IS NOT NULL AND reserva_id IS NULL) OR
    (pedido_id IS NULL AND reserva_id IS NOT NULL)
  )
);

-- =========================================================
-- 7. AUDITORÍA
-- =========================================================
-- Acciones administrativas sensibles sobre la web (cambio de precio,
-- ajuste de stock online, cambio de rol, anulación de pedido).
-- No tiene nada que ver con el local — ese registro es del sistema
-- Andino, fuera del alcance de este proyecto.
CREATE TABLE registro_auditoria (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id     UUID REFERENCES usuarios(id),
  accion         VARCHAR(100) NOT NULL,   -- ej. 'AJUSTE_STOCK', 'CAMBIO_PRECIO', 'ANULACION_PEDIDO'
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

CREATE INDEX idx_productos_categoria    ON productos(categoria_id);
CREATE INDEX idx_productos_marca        ON productos(marca_id);
CREATE INDEX idx_variantes_producto     ON variantes_producto(producto_id);
CREATE INDEX idx_pedidos_usuario        ON pedidos(usuario_id);
CREATE INDEX idx_reservas_usuario       ON reservas_alquiler(usuario_id);
CREATE INDEX idx_reserva_items_equipo   ON reserva_items(equipo_id);
CREATE INDEX idx_resenas_producto       ON resenas(producto_id);
CREATE INDEX idx_auditoria_entidad      ON registro_auditoria(entidad, entidad_id);
