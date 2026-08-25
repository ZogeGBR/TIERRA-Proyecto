-- =========================================================
-- Datos de prueba para desarrollo local. NO usar en producción.
-- Se ejecuta automáticamente después de 01-schema.sql cuando el
-- contenedor de Postgres arranca por primera vez.
-- =========================================================

-- ---------- UBICACIONES ----------
-- 'Depósito' es obligatoria: PagoService.confirmarPago busca la
-- ubicación con tipo 'deposito' para registrar el egreso de las
-- ventas web. Sin esta fila, confirmar un pago online falla.
INSERT INTO ubicaciones (id, nombre, tipo) VALUES
  ('a0000000-0000-0000-0000-000000000001', 'Local Esquel', 'local'),
  ('a0000000-0000-0000-0000-000000000002', 'Depósito', 'deposito');

-- ---------- MARCAS ----------
INSERT INTO marcas (id, nombre) VALUES
  ('b0000000-0000-0000-0000-000000000001', 'Scott'),
  ('b0000000-0000-0000-0000-000000000002', 'The North Face'),
  ('b0000000-0000-0000-0000-000000000003', 'Northland'),
  ('b0000000-0000-0000-0000-000000000004', 'Saucony'),
  ('b0000000-0000-0000-0000-000000000005', 'New Balance');

-- ---------- CATEGORIAS (con jerarquía) ----------
INSERT INTO categorias (id, nombre, slug, categoria_padre_id) VALUES
  ('c0000000-0000-0000-0000-000000000001', 'Bicicletas', 'bicicletas', NULL),
  ('c0000000-0000-0000-0000-000000000002', 'Ropa', 'ropa', NULL),
  ('c0000000-0000-0000-0000-000000000003', 'Ropa deportiva', 'ropa-deportiva', 'c0000000-0000-0000-0000-000000000002'),
  ('c0000000-0000-0000-0000-000000000004', 'Ropa urbana', 'ropa-urbana', 'c0000000-0000-0000-0000-000000000002'),
  ('c0000000-0000-0000-0000-000000000005', 'Carpas', 'carpas', NULL),
  ('c0000000-0000-0000-0000-000000000006', 'Mochilas', 'mochilas', NULL),
  ('c0000000-0000-0000-0000-000000000007', 'Cascos', 'cascos', NULL);

-- ---------- PRODUCTOS ----------
INSERT INTO productos (id, marca_id, categoria_id, nombre, descripcion, genero, precio, activo) VALUES
  ('d0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001',
   'c0000000-0000-0000-0000-000000000001', 'Bicicleta MTB 29"',
   'Bicicleta de montaña rodado 29, cuadro de aluminio, frenos a disco.', 'UNISEX', 899990, true),

  ('d0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000002',
   'c0000000-0000-0000-0000-000000000003', 'Campera Outdoor',
   'Campera impermeable con capucha, ideal para trekking y running en climas fríos.', 'UNISEX', 149990, true),

  ('d0000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000003',
   'c0000000-0000-0000-0000-000000000006', 'Mochila Trekking 50L',
   'Mochila de trekking con sistema de ventilación en la espalda y cobertor de lluvia.', 'UNISEX', 89990, true),

  ('d0000000-0000-0000-0000-000000000004', 'b0000000-0000-0000-0000-000000000003',
   'c0000000-0000-0000-0000-000000000005', 'Carpa 2 Personas',
   'Carpa iglú de 2 personas, doble techo, ideal para camping de montaña.', 'UNISEX', 64990, true),

  ('d0000000-0000-0000-0000-000000000005', 'b0000000-0000-0000-0000-000000000004',
   'c0000000-0000-0000-0000-000000000003', 'Zapatillas Running',
   'Zapatillas de running con amortiguación media, para asfalto y trail suave.', 'UNISEX', 79990, true),

  ('d0000000-0000-0000-0000-000000000006', 'b0000000-0000-0000-0000-000000000005',
   'c0000000-0000-0000-0000-000000000004', 'Buzo Urbano',
   'Buzo de algodón con capucha, corte oversize.', 'UNISEX', 54990, true),

  ('d0000000-0000-0000-0000-000000000007', 'b0000000-0000-0000-0000-000000000001',
   'c0000000-0000-0000-0000-000000000007', 'Casco de Montaña',
   'Casco de montaña con ventilación regulable, para ciclismo y outdoor.', 'UNISEX', 39990, true);

-- ---------- IMAGENES (fotos reales del boceto para los 5 productos)
-- ---------- destacados; zapatillas/buzo siguen con ilustración vectorial
-- ---------- porque todavía no hay foto real de esos dos) ----------
INSERT INTO imagenes_producto (producto_id, url, orden) VALUES
  ('d0000000-0000-0000-0000-000000000001', '/images/products/bicicleta-mtb.png', 0),
  ('d0000000-0000-0000-0000-000000000002', '/images/products/campera-outdoor.png', 0),
  ('d0000000-0000-0000-0000-000000000003', '/images/products/mochila-trekking.png', 0),
  ('d0000000-0000-0000-0000-000000000004', '/images/products/carpa-2-personas.png', 0),
  ('d0000000-0000-0000-0000-000000000005', 'data:image/svg+xml,%3Csvg%20xmlns%3D%27http%3A//www.w3.org/2000/svg%27%20viewBox%3D%270%200%20300%20300%27%3E%3Crect%20width%3D%27300%27%20height%3D%27300%27%20fill%3D%27%235C2A32%27/%3E%3Cg%20fill%3D%27none%27%20stroke%3D%27white%27%20stroke-width%3D%2710%27%20stroke-linecap%3D%27round%27%20stroke-linejoin%3D%27round%27%3E%3Cpath%20d%3D%22M50%20200%20Q50%20160%2090%20155%20L140%20150%20Q160%20110%20200%20115%20Q230%20118%20245%20150%20Q260%20175%20250%20200%20Z%22/%3E%3Cpath%20d%3D%22M50%20200%20L250%20200%20L250%20220%20Q250%20230%20240%20230%20L60%20230%20Q50%20230%2050%20220%20Z%22/%3E%3Cpath%20d%3D%22M100%20155%20L110%20190%20M140%20150%20L145%20190%20M180%20145%20L185%20190%22/%3E%3C/g%3E%3C/svg%3E', 0),
  ('d0000000-0000-0000-0000-000000000006', 'data:image/svg+xml,%3Csvg%20xmlns%3D%27http%3A//www.w3.org/2000/svg%27%20viewBox%3D%270%200%20300%20300%27%3E%3Crect%20width%3D%27300%27%20height%3D%27300%27%20fill%3D%27%235C2A32%27/%3E%3Cg%20fill%3D%27none%27%20stroke%3D%27white%27%20stroke-width%3D%2710%27%20stroke-linecap%3D%27round%27%20stroke-linejoin%3D%27round%27%3E%3Cpath%20d%3D%22M120%2060%20Q150%2040%20180%2060%20L180%2080%20L230%20110%20L215%20170%20L180%20150%20L180%20250%20L120%20250%20L120%20150%20L85%20170%20L70%20110%20L120%2080%20Z%22/%3E%3Cpath%20d%3D%22M150%2060%20L150%20100%22/%3E%3C/g%3E%3C/svg%3E', 0),
  ('d0000000-0000-0000-0000-000000000007', '/images/products/casco-montana.png', 0);

-- ---------- VARIANTES (con stock_fisico ya cargado) ----------
INSERT INTO variantes_producto (id, producto_id, sku, talla, color, stock_fisico, stock_reservado) VALUES
  ('e0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001', 'BICI-MTB29-UN', 'Único', 'Negro', 5, 0),

  ('e0000000-0000-0000-0000-000000000002', 'd0000000-0000-0000-0000-000000000002', 'CAMP-OUT-S-AZU', 'S', 'Azul', 8, 0),
  ('e0000000-0000-0000-0000-000000000003', 'd0000000-0000-0000-0000-000000000002', 'CAMP-OUT-M-AZU', 'M', 'Azul', 10, 0),
  ('e0000000-0000-0000-0000-000000000004', 'd0000000-0000-0000-0000-000000000002', 'CAMP-OUT-L-NEG', 'L', 'Negro', 6, 0),

  ('e0000000-0000-0000-0000-000000000005', 'd0000000-0000-0000-0000-000000000003', 'MOCH-TRK50-VER', 'Único', 'Verde', 12, 0),

  ('e0000000-0000-0000-0000-000000000006', 'd0000000-0000-0000-0000-000000000004', 'CARP-2P-VER', 'Único', 'Verde', 7, 0),

  ('e0000000-0000-0000-0000-000000000007', 'd0000000-0000-0000-0000-000000000005', 'ZAP-RUN-40', '40', 'Negro/Blanco', 4, 0),
  ('e0000000-0000-0000-0000-000000000008', 'd0000000-0000-0000-0000-000000000005', 'ZAP-RUN-42', '42', 'Negro/Blanco', 6, 0),
  ('e0000000-0000-0000-0000-000000000009', 'd0000000-0000-0000-0000-000000000005', 'ZAP-RUN-44', '44', 'Negro/Blanco', 3, 0),

  ('e0000000-0000-0000-0000-000000000010', 'd0000000-0000-0000-0000-000000000006', 'BUZO-URB-M-GRIS', 'M', 'Gris', 9, 0),
  ('e0000000-0000-0000-0000-000000000011', 'd0000000-0000-0000-0000-000000000006', 'BUZO-URB-L-GRIS', 'L', 'Gris', 9, 0),

  ('e0000000-0000-0000-0000-000000000012', 'd0000000-0000-0000-0000-000000000007', 'CASCO-MONT-UN', 'Único', 'Verde', 8, 0);

-- ---------- ALQUILER DE INVIERNO ----------
INSERT INTO tipos_equipo_alquiler (id, nombre) VALUES
  ('f0000000-0000-0000-0000-000000000001', 'Esquís'),
  ('f0000000-0000-0000-0000-000000000002', 'Tabla de snowboard'),
  ('f0000000-0000-0000-0000-000000000003', 'Botas de esquí'),
  ('f0000000-0000-0000-0000-000000000004', 'Bastones');

INSERT INTO equipos_alquiler (id, tipo_id, marca_id, modelo, talla, numero_serie, condicion, precio_dia, deposito_garantia, activo) VALUES
  ('11000000-0000-0000-0000-000000000001', 'f0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'Scott Scrapper', '160cm', 'ESQ-0001', 'BUENO', 12000, 80000, true),
  ('11000000-0000-0000-0000-000000000002', 'f0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'Scott Scrapper', '170cm', 'ESQ-0002', 'EXCELENTE', 12000, 80000, true),
  ('11000000-0000-0000-0000-000000000003', 'f0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000001', 'Scott Zoom', '155cm', 'SNB-0001', 'BUENO', 13000, 90000, true),
  ('11000000-0000-0000-0000-000000000004', 'f0000000-0000-0000-0000-000000000003', NULL, 'Genérica', '42', 'BOT-0001', 'BUENO', 6000, 40000, true),
  ('11000000-0000-0000-0000-000000000005', 'f0000000-0000-0000-0000-000000000003', NULL, 'Genérica', '44', 'BOT-0002', 'BUENO', 6000, 40000, true),
  ('11000000-0000-0000-0000-000000000006', 'f0000000-0000-0000-0000-000000000004', NULL, 'Genérica', 'Único', 'BAS-0001', 'EXCELENTE', 2500, 15000, true);

-- ---------- USUARIO DE PRUEBA ----------
-- password_hash es un placeholder, NO un hash bcrypt real — el login
-- todavía no está implementado en el backend (ver README), así que este
-- valor no se valida contra nada por ahora. No usar este patrón cuando
-- se implemente autenticación de verdad.
INSERT INTO usuarios (id, nombre, email, password_hash, telefono, dni, rol) VALUES
  ('99000000-0000-0000-0000-000000000001', 'Usuario de Prueba', 'test@tierra.esquel', 'placeholder-no-es-un-hash-real', '+54 9 2945 000000', '30111222', 'CLIENTE'),
  ('99000000-0000-0000-0000-000000000002', 'Vendedor Mostrador', 'mostrador@tierra.esquel', 'placeholder-no-es-un-hash-real', '+54 9 2945 000001', '30222333', 'STAFF');

INSERT INTO direcciones (id, usuario_id, calle, numero, ciudad, provincia, codigo_postal, es_predeterminada) VALUES
  ('88000000-0000-0000-0000-000000000001', '99000000-0000-0000-0000-000000000001', 'Av. Fontana', '482', 'Esquel', 'Chubut', '9200', true);
