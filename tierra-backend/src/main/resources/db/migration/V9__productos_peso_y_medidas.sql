-- Peso y medidas del producto ya embalado (tarea 10, decisión 0006).
--
-- Los pide Andreani para cotizar el envío y para crearlo. Se agregan ahora,
-- vacías, para que Tierra las pueda ir cargando antes de la integración: es
-- el dato que más tarda en juntarse. Mientras no estén, el costo del envío
-- sale del cotizador fijo y estas columnas no se usan.
--
-- Por producto y no por variante: alcanza para el caso real (un talle más no
-- cambia el bulto de forma relevante) y es lo que Tierra puede cargar en su
-- planilla de productos.
ALTER TABLE productos
    ADD COLUMN peso_gramos INT CHECK (peso_gramos > 0),
    ADD COLUMN alto_cm     INT CHECK (alto_cm > 0),
    ADD COLUMN ancho_cm    INT CHECK (ancho_cm > 0),
    ADD COLUMN largo_cm    INT CHECK (largo_cm > 0);

COMMENT ON COLUMN productos.peso_gramos IS 'Peso del producto embalado, en gramos. Lo usa el cotizador de Andreani.';
COMMENT ON COLUMN productos.alto_cm IS 'Alto del producto embalado, en centímetros.';
COMMENT ON COLUMN productos.ancho_cm IS 'Ancho del producto embalado, en centímetros.';
COMMENT ON COLUMN productos.largo_cm IS 'Largo del producto embalado, en centímetros.';
