-- Estimador de alquiler (tarea 20, decisión 0001).
--
-- La página de alquiler muestra los tipos de equipo con un precio por día
-- para calcular un estimado. Ese precio va en el tipo: el precio por unidad
-- (equipos_alquiler) y las tarifas por temporada (tarifas_temporada) son del
-- módulo de reservas, que la decisión 0001 congeló.
--
-- Sin precio, el tipo no se muestra en la página: así un tipo se puede
-- cargar antes de tener precio, o sacarse de la página sin borrarlo.
ALTER TABLE tipos_equipo_alquiler
    ADD COLUMN precio_dia DECIMAL(12,2),
    ADD CONSTRAINT chk_tipos_equipo_alquiler_precio_dia CHECK (precio_dia > 0);
