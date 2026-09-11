# 0001 — Tierra Rental: consulta por WhatsApp, no reserva en línea

- **Estado:** aceptada
- **Fecha:** Fase 0
- **Ubicación en el repo:** `docs/decisiones/0001-tierra-rental-consulta-whatsapp.md`

---

## Contexto

El backend tiene un módulo de alquiler transaccional completo: equipos serializados por número de serie, reservas con rango de fechas y constraint de no-solapamiento, tarifas por temporada, depósito de garantía, devoluciones con cargo por daño y mantenimiento de equipo. También hay un endpoint público `POST /api/alquiler/reservas` y un contrato de alquiler redactado para aceptarse en línea al confirmar una reserva.

El presupuesto, en cambio, define Tierra Rental como **informativa y de captación de consultas**, y lista explícitamente "reservas online de Tierra Rental" como fuera de alcance (sección 3). El alcance definitivo quedó como punto abierto (sección 4, punto 8).

Es decir: se construyó un módulo que no estaba vendido, mientras la definición seguía pendiente.

## Decisión

**El alquiler no toma reservas en línea.** El flujo es:

1. El usuario elige fechas en un calendario y la cantidad de equipo que necesita.
2. Con esos datos se arma un mensaje de WhatsApp prellenado, consultando disponibilidad.
3. Tierra responde por WhatsApp y coordina.
4. La reserva y el retiro se resuelven en el local.

El sistema **no conoce la disponibilidad real** del equipo, no la calcula y no la promete.

## Motivo

1. Es lo que está contratado. La sección 2.6 del presupuesto describe exactamente esto.
2. Evita prometer algo que el sistema no puede sostener: si las reservas se confirman en el local, la base nunca va a reflejar el estado real del parque de equipos. Un calendario que dice "disponible" sin saberlo es peor que no tener calendario.
3. Elimina tres riesgos de golpe: el depósito de garantía sin instrumento de cobro, la cláusula de responsabilidad por lesiones aceptada con un clic, y la recolección del DNI del locatario por la web.
4. Libera semanas de trabajo del equipo para los módulos que sí están vendidos y hoy faltan: panel de pedidos, carga de imágenes y notificaciones.

## Consecuencias

### Qué se construye

- Selector de fechas y cantidad en la página de alquiler, que **solo sirve para armar el mensaje**.
- Generación del enlace de WhatsApp: `https://wa.me/<numero>?text=<mensaje codificado>`, con el texto armado en el cliente.
- Listado de los tipos de equipo disponibles para alquilar, **sin estado de disponibilidad**.

### Qué se congela

- `POST /api/alquiler/reservas` — se comenta el `@PostMapping` con una nota explicando por qué. **No construir encima.**
- `ReservaAlquilerService`, `DisponibilidadAlquilerService`, `DevolucionAlquiler`, `TarifaTemporada`, `MantenimientoEquipo`.

No se borra nada. El modelo está bien hecho, el constraint `EXCLUDE` de no-solapamiento es la forma correcta de garantizar que dos reservas no se pisen, y todo eso sirve tal cual si en algún momento se vende el módulo como anexo. Queda congelado y documentado, no eliminado.

### Qué se corrige en los documentos legales

- **Contrato de alquiler:** hoy dice que se acepta al confirmar una reserva en el sitio. Eso ya no es cierto. Pasa a ser un contrato que se firma en el local al retirar el equipo.
- **Política de privacidad:** el sitio ya no recolecta el DNI del locatario. Se saca esa finalidad del tratamiento de datos.

### Qué hace falta del cliente

- El número de WhatsApp al que van las consultas, y quién las atiende.
- El listado de tipos de equipo y cantidades, para poblar el selector.

### Sobre el consentimiento de WhatsApp

Este flujo **no** requiere el consentimiento de la Ley 25.326 que sí aplica al aviso de despacho de un pedido. La diferencia es quién inicia el contacto: acá el usuario abre WhatsApp y manda el mensaje él mismo; el sistema solo arma el texto. No estamos guardando su número ni contactándolo nosotros.

El consentimiento **sí** sigue haciendo falta para el aviso de despacho de las compras, que es otro flujo y se recaba en el checkout.

## Qué invalida de la auditoría

Esta decisión cierra el hallazgo **H-5** (módulo de alquiler transaccional fuera del alcance presupuestado) y la tarea correspondiente de la Fase 0. El riesgo de trabajo no facturable deja de crecer.

Queda abierta una pregunta menor de la auditoría: el presupuesto habla de venta de bicicletas y equipamiento outdoor, mientras el módulo de alquiler construido es de equipo de invierno. Conviene confirmar con el cliente qué se alquila exactamente antes de armar el selector.