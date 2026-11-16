-- =========================================================
-- Datos de prueba para DESARROLLO LOCAL.
--
-- Migración REPETIBLE (R__), no versionada. Vive en db/dev/, que sólo
-- se agrega a spring.flyway.locations cuando el perfil activo es 'dev'
-- (ver application-dev.yml). En producción Flyway ni mira esta carpeta.
--
-- Al ser repetible corre después de todas las versionadas y se vuelve a
-- ejecutar cada vez que cambia su contenido. Todos los INSERT usan
-- ON CONFLICT DO NOTHING, así que re-ejecutarla es inofensivo: para
-- sumar datos de prueba alcanza con editar este archivo y reiniciar.
--
-- Carga marcas, categorías, productos, variantes con stock, equipo de
-- alquiler y usuarios/direcciones de prueba.
-- =========================================================

-- ---------- MARCAS ----------
INSERT INTO marcas (id, nombre) VALUES
  ('b0000000-0000-0000-0000-000000000001', 'Scott'),
  ('b0000000-0000-0000-0000-000000000002', 'The North Face'),
  ('b0000000-0000-0000-0000-000000000003', 'Northland'),
  ('b0000000-0000-0000-0000-000000000004', 'Saucony'),
  ('b0000000-0000-0000-0000-000000000005', 'New Balance')
ON CONFLICT (id) DO NOTHING;

-- ---------- CATEGORIAS (con jerarquía) ----------
INSERT INTO categorias (id, nombre, slug, categoria_padre_id) VALUES
  ('c0000000-0000-0000-0000-000000000001', 'Bicicletas', 'bicicletas', NULL),
  ('c0000000-0000-0000-0000-000000000002', 'Ropa', 'ropa', NULL),
  ('c0000000-0000-0000-0000-000000000003', 'Ropa deportiva', 'ropa-deportiva', 'c0000000-0000-0000-0000-000000000002'),
  ('c0000000-0000-0000-0000-000000000004', 'Ropa urbana', 'ropa-urbana', 'c0000000-0000-0000-0000-000000000002'),
  ('c0000000-0000-0000-0000-000000000005', 'Carpas', 'carpas', NULL),
  ('c0000000-0000-0000-0000-000000000006', 'Mochilas', 'mochilas', NULL),
  ('c0000000-0000-0000-0000-000000000007', 'Cascos', 'cascos', NULL)
ON CONFLICT (id) DO NOTHING;

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
   'Casco de montaña con ventilación regulable, para ciclismo y outdoor.', 'UNISEX', 39990, true)
ON CONFLICT (id) DO NOTHING;

-- ---------- IMAGENES ----------
INSERT INTO imagenes_producto (producto_id, url, orden) VALUES
  ('d0000000-0000-0000-0000-000000000001', '/images/products/bicicleta-mtb.png', 0),
  ('d0000000-0000-0000-0000-000000000002', '/images/products/campera-outdoor.png', 0),
  ('d0000000-0000-0000-0000-000000000003', '/images/products/mochila-trekking.png', 0),
  ('d0000000-0000-0000-0000-000000000004', '/images/products/carpa-2-personas.png', 0),
  ('d0000000-0000-0000-0000-000000000005', 'data:image/svg+xml,%3Csvg%20xmlns%3D%27http%3A//www.w3.org/2000/svg%27%20viewBox%3D%270%200%20300%20300%27%3E%3Crect%20width%3D%27300%27%20height%3D%27300%27%20fill%3D%27%235C2A32%27/%3E%3Cg%20fill%3D%27none%27%20stroke%3D%27white%27%20stroke-width%3D%2710%27%20stroke-linecap%3D%27round%27%20stroke-linejoin%3D%27round%27%3E%3Cpath%20d%3D%22M50%20200%20Q50%20160%2090%20155%20L140%20150%20Q160%20110%20200%20115%20Q230%20118%20245%20150%20Q260%20175%20250%20200%20Z%22/%3E%3Cpath%20d%3D%22M50%20200%20L250%20200%20L250%20220%20Q250%20230%20240%20230%20L60%20230%20Q50%20230%2050%20220%20Z%22/%3E%3Cpath%20d%3D%22M100%20155%20L110%20190%20M140%20150%20L145%20190%20M180%20145%20L185%20190%22/%3E%3C/g%3E%3C/svg%3E', 0),
  ('d0000000-0000-0000-0000-000000000006', 'data:image/svg+xml,%3Csvg%20xmlns%3D%27http%3A//www.w3.org/2000/svg%27%20viewBox%3D%270%200%20300%20300%27%3E%3Crect%20width%3D%27300%27%20height%3D%27300%27%20fill%3D%27%235C2A32%27/%3E%3Cg%20fill%3D%27none%27%20stroke%3D%27white%27%20stroke-width%3D%2710%27%20stroke-linecap%3D%27round%27%20stroke-linejoin%3D%27round%27%3E%3Cpath%20d%3D%22M120%2060%20Q150%2040%20180%2060%20L180%2080%20L230%20110%20L215%20170%20L180%20150%20L180%20250%20L120%20250%20L120%20150%20L85%20170%20L70%20110%20L120%2080%20Z%22/%3E%3Cpath%20d%3D%22M150%2060%20L150%20100%22/%3E%3C/g%3E%3C/svg%3E', 0),
  ('d0000000-0000-0000-0000-000000000007', '/images/products/casco-montana.png', 0)
ON CONFLICT DO NOTHING;

-- ---------- VARIANTES (stock exclusivo de la venta online) ----------
-- Nota: La bicicleta Scott (BICI-MTB29-UN) tiene controla_stock = false y stock = 0
-- porque los productos Scott permanecen siempre disponibles sin control de unidades.
INSERT INTO variantes_producto (id, producto_id, sku, talla, color, stock, stock_reservado, controla_stock) VALUES
  ('e0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001', 'BICI-MTB29-UN', 'Único', 'Negro', 0, 0, false),

  ('e0000000-0000-0000-0000-000000000002', 'd0000000-0000-0000-0000-000000000002', 'CAMP-OUT-S-AZU', 'S', 'Azul', 8, 0, true),
  ('e0000000-0000-0000-0000-000000000003', 'd0000000-0000-0000-0000-000000000002', 'CAMP-OUT-M-AZU', 'M', 'Azul', 10, 0, true),
  ('e0000000-0000-0000-0000-000000000004', 'd0000000-0000-0000-0000-000000000002', 'CAMP-OUT-L-NEG', 'L', 'Negro', 6, 0, true),

  ('e0000000-0000-0000-0000-000000000005', 'd0000000-0000-0000-0000-000000000003', 'MOCH-TRK50-VER', 'Único', 'Verde', 12, 0, true),

  ('e0000000-0000-0000-0000-000000000006', 'd0000000-0000-0000-0000-000000000004', 'CARP-2P-VER', 'Único', 'Verde', 7, 0, true),

  ('e0000000-0000-0000-0000-000000000007', 'd0000000-0000-0000-0000-000000000005', 'ZAP-RUN-40', '40', 'Negro/Blanco', 4, 0, true),
  ('e0000000-0000-0000-0000-000000000008', 'd0000000-0000-0000-0000-000000000005', 'ZAP-RUN-42', '42', 'Negro/Blanco', 6, 0, true),
  ('e0000000-0000-0000-0000-000000000009', 'd0000000-0000-0000-0000-000000000005', 'ZAP-RUN-44', '44', 'Negro/Blanco', 3, 0, true),

  ('e0000000-0000-0000-0000-000000000010', 'd0000000-0000-0000-0000-000000000006', 'BUZO-URB-M-GRIS', 'M', 'Gris', 9, 0, true),
  ('e0000000-0000-0000-0000-000000000011', 'd0000000-0000-0000-0000-000000000006', 'BUZO-URB-L-GRIS', 'L', 'Gris', 9, 0, true),

  ('e0000000-0000-0000-0000-000000000012', 'd0000000-0000-0000-0000-000000000007', 'CASCO-MONT-UN', 'Único', 'Verde', 8, 0, true)
ON CONFLICT (id) DO UPDATE SET controla_stock = EXCLUDED.controla_stock, stock = EXCLUDED.stock;

-- ---------- PRODUCTOS ADICIONALES PARA PROBAR EL CATÁLOGO (tarea 6) ----------
-- Inventados, solo para desarrollo: con 7 productos no se puede probar la
-- paginación (12 por página) ni combinar filtros. Cubren a propósito:
--   - los cuatro géneros, talles en letras y números, colores variados;
--   - variantes SIN stock (Campera de Plumas M Bordó, Zapatillas Trail 38,
--     Mochila de Ataque roja): el filtro por talle o color no las cuenta;
--   - una variante con precio adicional (Bicicleta Urbana talle L);
--   - un producto inactivo (Guantes de Invierno), que no tiene que aparecer;
--   - tildes en nombres y descripciones, para la búsqueda sin tildes.
-- Sin imágenes: el frontend muestra su marcador de "sin foto".
INSERT INTO productos (id, marca_id, categoria_id, nombre, descripcion, genero, precio, activo) VALUES
  ('d0000000-0000-0000-0000-000000000008', 'b0000000-0000-0000-0000-000000000002',
   'c0000000-0000-0000-0000-000000000003', 'Campera de Plumas Mujer',
   'Campera de plumas con capucha desmontable, liviana y compresible.', 'MUJER', 189990, true),

  ('d0000000-0000-0000-0000-000000000009', 'b0000000-0000-0000-0000-000000000003',
   'c0000000-0000-0000-0000-000000000003', 'Pantalón de Trekking Hombre',
   'Pantalón desmontable de secado rápido, con protección UV.', 'HOMBRE', 79990, true),

  ('d0000000-0000-0000-0000-000000000010', 'b0000000-0000-0000-0000-000000000003',
   'c0000000-0000-0000-0000-000000000003', 'Remera Térmica',
   'Primera capa térmica de manga larga, para frío intenso.', 'UNISEX', 34990, true),

  ('d0000000-0000-0000-0000-000000000011', 'b0000000-0000-0000-0000-000000000004',
   'c0000000-0000-0000-0000-000000000003', 'Zapatillas Trail Mujer',
   'Zapatillas de trail con suela de alta tracción para barro y piedra.', 'MUJER', 119990, true),

  ('d0000000-0000-0000-0000-000000000012', 'b0000000-0000-0000-0000-000000000005',
   'c0000000-0000-0000-0000-000000000004', 'Zapatillas Urbanas',
   'Zapatillas de uso diario, capellada de cuero y suela de goma.', 'UNISEX', 99990, true),

  ('d0000000-0000-0000-0000-000000000013', 'b0000000-0000-0000-0000-000000000002',
   'c0000000-0000-0000-0000-000000000004', 'Buzo Polar Niños',
   'Buzo de micropolar con cierre entero, abrigado y liviano.', 'NINO', 44990, true),

  ('d0000000-0000-0000-0000-000000000014', 'b0000000-0000-0000-0000-000000000004',
   'c0000000-0000-0000-0000-000000000003', 'Campera Rompevientos',
   'Rompevientos ultraliviano con capucha, se guarda en su propio bolsillo.', 'UNISEX', 69990, true),

  ('d0000000-0000-0000-0000-000000000015', 'b0000000-0000-0000-0000-000000000001',
   'c0000000-0000-0000-0000-000000000001', 'Bicicleta Urbana Rodado 28',
   'Bicicleta urbana con cambios internos, guardabarros y portaequipaje.', 'UNISEX', 649990, true),

  ('d0000000-0000-0000-0000-000000000016', 'b0000000-0000-0000-0000-000000000001',
   'c0000000-0000-0000-0000-000000000001', 'Bicicleta Infantil Rodado 20',
   'Bicicleta para chicos de 6 a 9 años, cuadro de aluminio.', 'NINO', 289990, true),

  ('d0000000-0000-0000-0000-000000000017', 'b0000000-0000-0000-0000-000000000003',
   'c0000000-0000-0000-0000-000000000005', 'Carpa 4 Personas',
   'Carpa familiar con dos ábsides y doble techo impermeable.', 'UNISEX', 159990, true),

  ('d0000000-0000-0000-0000-000000000018', 'b0000000-0000-0000-0000-000000000003',
   'c0000000-0000-0000-0000-000000000005', 'Bolsa de Dormir -5 °C',
   'Bolsa de dormir tipo momia, temperatura de confort de -5 °C.', 'UNISEX', 89990, true),

  ('d0000000-0000-0000-0000-000000000019', 'b0000000-0000-0000-0000-000000000002',
   'c0000000-0000-0000-0000-000000000006', 'Mochila de Ataque 30L',
   'Mochila liviana para salidas de un día, con porta bastones.', 'UNISEX', 109990, true),

  ('d0000000-0000-0000-0000-000000000020', 'b0000000-0000-0000-0000-000000000004',
   'c0000000-0000-0000-0000-000000000006', 'Riñonera Running',
   'Riñonera elástica para correr, con lugar para el celular.', 'UNISEX', 24990, true),

  ('d0000000-0000-0000-0000-000000000021', 'b0000000-0000-0000-0000-000000000001',
   'c0000000-0000-0000-0000-000000000007', 'Casco Urbano',
   'Casco urbano con luz trasera integrada.', 'UNISEX', 54990, true),

  ('d0000000-0000-0000-0000-000000000022', 'b0000000-0000-0000-0000-000000000002',
   'c0000000-0000-0000-0000-000000000003', 'Guantes de Invierno',
   'Guantes impermeables con forro polar. Dado de baja: sirve para probar que un producto inactivo no aparece.', 'UNISEX', 29990, false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO variantes_producto (id, producto_id, sku, talla, color, stock, stock_reservado, precio_adicional, controla_stock) VALUES
  ('e0000000-0000-0000-0000-000000000013', 'd0000000-0000-0000-0000-000000000008', 'CPLU-M-XS-NEG', 'XS', 'Negro', 3, 0, 0, true),
  ('e0000000-0000-0000-0000-000000000014', 'd0000000-0000-0000-0000-000000000008', 'CPLU-M-S-NEG', 'S', 'Negro', 5, 0, 0, true),
  ('e0000000-0000-0000-0000-000000000015', 'd0000000-0000-0000-0000-000000000008', 'CPLU-M-M-BOR', 'M', 'Bordó', 0, 0, 0, true),
  ('e0000000-0000-0000-0000-000000000016', 'd0000000-0000-0000-0000-000000000008', 'CPLU-M-L-BOR', 'L', 'Bordó', 2, 0, 0, true),
  ('e0000000-0000-0000-0000-000000000017', 'd0000000-0000-0000-0000-000000000009', 'PTRK-H-S-GRI', 'S', 'Gris', 4, 0, 0, true),
  ('e0000000-0000-0000-0000-000000000018', 'd0000000-0000-0000-0000-000000000009', 'PTRK-H-M-GRI', 'M', 'Gris', 6, 0, 0, true),
  ('e0000000-0000-0000-0000-000000000019', 'd0000000-0000-0000-0000-000000000009', 'PTRK-H-L-VER', 'L', 'Verde', 5, 0, 0, true),
  ('e0000000-0000-0000-0000-000000000020', 'd0000000-0000-0000-0000-000000000009', 'PTRK-H-XL-VER', 'XL', 'Verde', 2, 0, 0, true),
  ('e0000000-0000-0000-0000-000000000021', 'd0000000-0000-0000-0000-000000000010', 'RTER-S-NEG', 'S', 'Negro', 10, 0, 0, true),
  ('e0000000-0000-0000-0000-000000000022', 'd0000000-0000-0000-0000-000000000010', 'RTER-M-NEG', 'M', 'Negro', 10, 0, 0, true),
  ('e0000000-0000-0000-0000-000000000023', 'd0000000-0000-0000-0000-000000000010', 'RTER-L-AZU', 'L', 'Azul', 8, 0, 0, true),
  ('e0000000-0000-0000-0000-000000000024', 'd0000000-0000-0000-0000-000000000011', 'ZTRL-M-36-VIO', '36', 'Violeta', 3, 0, 0, true),
  ('e0000000-0000-0000-0000-000000000025', 'd0000000-0000-0000-0000-000000000011', 'ZTRL-M-37-VIO', '37', 'Violeta', 4, 0, 0, true),
  ('e0000000-0000-0000-0000-000000000026', 'd0000000-0000-0000-0000-000000000011', 'ZTRL-M-38-GRI', '38', 'Gris', 0, 0, 0, true),
  ('e0000000-0000-0000-0000-000000000027', 'd0000000-0000-0000-0000-000000000011', 'ZTRL-M-39-GRI', '39', 'Gris', 2, 0, 0, true),
  ('e0000000-0000-0000-0000-000000000028', 'd0000000-0000-0000-0000-000000000012', 'ZURB-39-BLA', '39', 'Blanco', 5, 0, 0, true),
  ('e0000000-0000-0000-0000-000000000029', 'd0000000-0000-0000-0000-000000000012', 'ZURB-41-BLA', '41', 'Blanco', 5, 0, 0, true),
  ('e0000000-0000-0000-0000-000000000030', 'd0000000-0000-0000-0000-000000000012', 'ZURB-43-NEG', '43', 'Negro', 4, 0, 0, true),
  ('e0000000-0000-0000-0000-000000000031', 'd0000000-0000-0000-0000-000000000012', 'ZURB-45-NEG', '45', 'Negro', 1, 0, 0, true),
  ('e0000000-0000-0000-0000-000000000032', 'd0000000-0000-0000-0000-000000000013', 'BPOL-N-8-ROJ', '8', 'Rojo', 4, 0, 0, true),
  ('e0000000-0000-0000-0000-000000000033', 'd0000000-0000-0000-0000-000000000013', 'BPOL-N-10-ROJ', '10', 'Rojo', 4, 0, 0, true),
  ('e0000000-0000-0000-0000-000000000034', 'd0000000-0000-0000-0000-000000000013', 'BPOL-N-12-AZU', '12', 'Azul', 3, 0, 0, true),
  ('e0000000-0000-0000-0000-000000000035', 'd0000000-0000-0000-0000-000000000014', 'CROM-S-AMA', 'S', 'Amarillo', 3, 0, 0, true),
  ('e0000000-0000-0000-0000-000000000036', 'd0000000-0000-0000-0000-000000000014', 'CROM-M-AMA', 'M', 'Amarillo', 3, 0, 0, true),
  ('e0000000-0000-0000-0000-000000000037', 'd0000000-0000-0000-0000-000000000014', 'CROM-L-NEG', 'L', 'Negro', 4, 0, 0, true),
  ('e0000000-0000-0000-0000-000000000038', 'd0000000-0000-0000-0000-000000000015', 'BURB28-S-AZU', 'S', 'Azul', 2, 0, 0, true),
  ('e0000000-0000-0000-0000-000000000039', 'd0000000-0000-0000-0000-000000000015', 'BURB28-L-AZU', 'L', 'Azul', 1, 0, 25000, true),
  ('e0000000-0000-0000-0000-000000000040', 'd0000000-0000-0000-0000-000000000016', 'BINF20-UNI-ROJ', 'Único', 'Rojo', 3, 0, 0, true),
  ('e0000000-0000-0000-0000-000000000041', 'd0000000-0000-0000-0000-000000000017', 'CARP-4P-UNI-NAR', 'Único', 'Naranja', 4, 0, 0, true),
  ('e0000000-0000-0000-0000-000000000042', 'd0000000-0000-0000-0000-000000000018', 'BDOR-5-UNI-AZU', 'Único', 'Azul', 6, 0, 0, true),
  ('e0000000-0000-0000-0000-000000000043', 'd0000000-0000-0000-0000-000000000019', 'MATQ30-UNI-NEG', 'Único', 'Negro', 5, 0, 0, true),
  ('e0000000-0000-0000-0000-000000000044', 'd0000000-0000-0000-0000-000000000019', 'MATQ30-UNI-ROJ', 'Único', 'Rojo', 0, 0, 0, true),
  ('e0000000-0000-0000-0000-000000000045', 'd0000000-0000-0000-0000-000000000020', 'RINO-RUN-UNI-NEG', 'Único', 'Negro', 12, 0, 0, true),
  ('e0000000-0000-0000-0000-000000000046', 'd0000000-0000-0000-0000-000000000021', 'CURB-S-BLA', 'S', 'Blanco', 3, 0, 0, true),
  ('e0000000-0000-0000-0000-000000000047', 'd0000000-0000-0000-0000-000000000021', 'CURB-M-BLA', 'M', 'Blanco', 4, 0, 0, true),
  ('e0000000-0000-0000-0000-000000000048', 'd0000000-0000-0000-0000-000000000021', 'CURB-L-NEG', 'L', 'Negro', 2, 0, 0, true),
  ('e0000000-0000-0000-0000-000000000049', 'd0000000-0000-0000-0000-000000000022', 'GINV-S-NEG', 'S', 'Negro', 5, 0, 0, true)
ON CONFLICT (id) DO UPDATE SET controla_stock = EXCLUDED.controla_stock, stock = EXCLUDED.stock;

-- ---------- PESO Y MEDIDAS (V9, decisión 0006) ----------
-- Valores aproximados del producto embalado, solo para desarrollo: le dan
-- datos al cotizador de Andreani cuando se integre. Los reales los carga Tierra.
UPDATE productos p SET peso_gramos = v.peso, alto_cm = v.alto, ancho_cm = v.ancho, largo_cm = v.largo
FROM (VALUES
  ('d0000000-0000-0000-0000-000000000001'::uuid, 15000, 80, 25, 150),
  ('d0000000-0000-0000-0000-000000000002'::uuid, 900, 8, 30, 40),
  ('d0000000-0000-0000-0000-000000000003'::uuid, 1800, 20, 35, 65),
  ('d0000000-0000-0000-0000-000000000004'::uuid, 3200, 18, 18, 55),
  ('d0000000-0000-0000-0000-000000000005'::uuid, 1100, 13, 20, 32),
  ('d0000000-0000-0000-0000-000000000006'::uuid, 700, 8, 30, 38),
  ('d0000000-0000-0000-0000-000000000007'::uuid, 450, 18, 22, 28),
  ('d0000000-0000-0000-0000-000000000008'::uuid, 800, 8, 30, 40),
  ('d0000000-0000-0000-0000-000000000009'::uuid, 600, 6, 28, 35),
  ('d0000000-0000-0000-0000-000000000010'::uuid, 300, 4, 25, 30),
  ('d0000000-0000-0000-0000-000000000011'::uuid, 1000, 13, 20, 32),
  ('d0000000-0000-0000-0000-000000000012'::uuid, 1200, 13, 20, 32),
  ('d0000000-0000-0000-0000-000000000013'::uuid, 500, 6, 28, 34),
  ('d0000000-0000-0000-0000-000000000014'::uuid, 350, 5, 20, 25),
  ('d0000000-0000-0000-0000-000000000015'::uuid, 17000, 80, 25, 160),
  ('d0000000-0000-0000-0000-000000000016'::uuid, 9000, 60, 20, 110),
  ('d0000000-0000-0000-0000-000000000017'::uuid, 5800, 20, 20, 70),
  ('d0000000-0000-0000-0000-000000000018'::uuid, 1700, 25, 25, 45),
  ('d0000000-0000-0000-0000-000000000019'::uuid, 1100, 15, 30, 50),
  ('d0000000-0000-0000-0000-000000000020'::uuid, 250, 5, 15, 25),
  ('d0000000-0000-0000-0000-000000000021'::uuid, 500, 18, 22, 28),
  ('d0000000-0000-0000-0000-000000000022'::uuid, 200, 3, 15, 25)
) AS v(id, peso, alto, ancho, largo)
WHERE p.id = v.id;

-- ---------- ALQUILER DE INVIERNO ----------
-- precio_dia (V14) es el que usa el estimador de la página de alquiler. Se
-- actualiza también en una base que ya tenía los tipos.
INSERT INTO tipos_equipo_alquiler (id, nombre, precio_dia) VALUES
  ('f0000000-0000-0000-0000-000000000001', 'Esquís', 12000),
  ('f0000000-0000-0000-0000-000000000002', 'Tabla de snowboard', 13000),
  ('f0000000-0000-0000-0000-000000000003', 'Botas de esquí', 6000),
  ('f0000000-0000-0000-0000-000000000004', 'Bastones', 2500)
ON CONFLICT (id) DO UPDATE SET precio_dia = EXCLUDED.precio_dia;

INSERT INTO equipos_alquiler (id, tipo_id, marca_id, modelo, talla, numero_serie, condicion, precio_dia, deposito_garantia, activo) VALUES
  ('11000000-0000-0000-0000-000000000001', 'f0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'Scott Scrapper', '160cm', 'ESQ-0001', 'BUENO', 12000, 80000, true),
  ('11000000-0000-0000-0000-000000000002', 'f0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'Scott Scrapper', '170cm', 'ESQ-0002', 'EXCELENTE', 12000, 80000, true),
  ('11000000-0000-0000-0000-000000000003', 'f0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000001', 'Scott Zoom', '155cm', 'SNB-0001', 'BUENO', 13000, 90000, true),
  ('11000000-0000-0000-0000-000000000004', 'f0000000-0000-0000-0000-000000000003', NULL, 'Genérica', '42', 'BOT-0001', 'BUENO', 6000, 40000, true),
  ('11000000-0000-0000-0000-000000000005', 'f0000000-0000-0000-0000-000000000003', NULL, 'Genérica', '44', 'BOT-0002', 'BUENO', 6000, 40000, true),
  ('11000000-0000-0000-0000-000000000006', 'f0000000-0000-0000-0000-000000000004', NULL, 'Genérica', 'Único', 'BAS-0001', 'EXCELENTE', 2500, 15000, true)
ON CONFLICT (id) DO NOTHING;

-- ---------- USUARIOS DE PRUEBA ----------
-- test@ es CLIENTE: no tiene contraseña y entra con un código de seis
-- dígitos (ADR 0005). En desarrollo el código aparece en el log del backend
-- y en target/codigos-dev/test@tierra.esquel.txt.
--
-- mostrador@ y admin@ son del equipo y entran con la contraseña tierra2026
-- por /equipo. Son hashes BCrypt reales (factor 12). No son secretos: este
-- archivo sólo corre en desarrollo. Ver CONTRIBUTING.md §2.4.
--
-- La restricción chk_usuarios_metodo_acceso (V8) exige que ningún cliente
-- tenga contraseña y que todo el equipo la tenga.
--
-- El rol del vendedor es OPERADOR (antes STAFF, renombrado en V4 para
-- que el código hable el mismo idioma que el contrato con el cliente).
INSERT INTO usuarios (id, nombre, email, password_hash, telefono, dni, rol) VALUES
  ('99000000-0000-0000-0000-000000000001', 'Usuario de Prueba', 'test@tierra.esquel',
   NULL, '+54 9 2945 000000', '30111222', 'CLIENTE'),
  ('99000000-0000-0000-0000-000000000002', 'Vendedor Mostrador', 'mostrador@tierra.esquel',
   '$2b$12$tSKEXG/niOKpVf76/FKRqOtp/cErDuQ.CVFaTUV50z6LBE.QepTiW', '+54 9 2945 000001', '30222333', 'OPERADOR'),
  ('99000000-0000-0000-0000-000000000003', 'Administradora Tierra', 'admin@tierra.esquel',
   '$2b$12$F0uXbFOURXkd5.H6mDj03uoakevaiUT5hqu9gZUzlwwRfn9Se4eTy', '+54 9 2945 000002', NULL, 'ADMIN')
ON CONFLICT (id) DO NOTHING;

-- La dirección guardada de test@ (tarea 22). Sin columna en el ON CONFLICT:
-- desde la V11 hay una sola por cliente, y si test@ ya guardó otra (con otro
-- id) esta no se inserta, en vez de chocar con el índice único.
INSERT INTO direcciones (id, usuario_id, calle, numero, ciudad, provincia, codigo_postal, es_predeterminada) VALUES
  ('88000000-0000-0000-0000-000000000001', '99000000-0000-0000-0000-000000000001', 'Av. Fontana', '482', 'Esquel', 'Chubut', '9200', true)
ON CONFLICT DO NOTHING;
