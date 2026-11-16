// Estimador de precio de alquiler (tarea 20, decisión 0001).
//
// Tierra Rental NO toma reservas en línea: el sistema no conoce ni promete la
// disponibilidad. Esta pantalla solo ESTIMA un precio y arma el mensaje de
// WhatsApp con el que la persona consulta. Todo es lógica pura, probada
// aparte.

export interface TipoAlquiler {
  id: string;
  nombre: string;
  /** Precio por día de UNA unidad, en pesos. */
  precioDia: number;
}

export interface LineaAlquiler {
  tipo: TipoAlquiler;
  cantidad: number;
}

const MS_POR_DIA = 24 * 60 * 60 * 1000;

function aFechaUtc(iso: string): number | null {
  // Solo "yyyy-MM-dd" (lo que da <input type="date">). Se interpreta en UTC
  // para que el cambio de horario no corra un día.
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
  const t = Date.parse(`${iso}T00:00:00Z`);
  return Number.isFinite(t) ? t : null;
}

// Días que se cobran: cuenta el día de retiro y el de devolución. Retirar el
// 10 y devolver el 15 son 6 días. (Criterio a confirmar con el cliente.)
// Devuelve null si las fechas faltan, no se entienden o "hasta" es anterior a
// "desde".
export function diasDeAlquiler(desde: string, hasta: string): number | null {
  const a = aFechaUtc(desde);
  const b = aFechaUtc(hasta);
  if (a === null || b === null || b < a) return null;
  return Math.round((b - a) / MS_POR_DIA) + 1;
}

export function estimarPrecio(lineas: LineaAlquiler[], dias: number): number {
  const porDia = lineas.reduce((acc, l) => acc + l.tipo.precioDia * Math.max(0, Math.floor(l.cantidad)), 0);
  return porDia * dias;
}

function fechaCorta(iso: string): string {
  const [a, m, d] = iso.split("-");
  return `${d}/${m}/${a}`;
}

function pesos(n: number): string {
  return `$${n.toLocaleString("es-AR")}`;
}

// Texto que se manda por WhatsApp. Pregunta por disponibilidad: no afirma
// nada que el sistema no sepa.
export function armarMensajeConsulta(lineas: LineaAlquiler[], desde: string, hasta: string, dias: number, estimado: number, nombre = ""): string {
  const detalle = lineas
    .filter((l) => l.cantidad > 0)
    .map((l) => `${l.cantidad} x ${l.tipo.nombre}`)
    .join(", ");
  return (
    `Hola Tierra!${nombre.trim() ? ` Soy ${nombre.trim()}.` : ""} Quiero consultar disponibilidad para alquilar: ${detalle}. ` +
    `Del ${fechaCorta(desde)} al ${fechaCorta(hasta)} (${dias} ${dias === 1 ? "día" : "días"}). ` +
    `El estimado del sitio es ${pesos(estimado)}. ¿Tienen disponibilidad?`
  );
}

// wa.me exige el número solo con dígitos y código de país (ej. 5492945123456).
// Devuelve null si el número configurado no sirve, para no armar un enlace roto.
export function enlaceWhatsapp(numero: string | undefined, mensaje: string): string | null {
  const digitos = (numero ?? "").replace(/\D/g, "");
  if (digitos.length < 10 || digitos.length > 15) return null;
  return `https://wa.me/${digitos}?text=${encodeURIComponent(mensaje)}`;
}
