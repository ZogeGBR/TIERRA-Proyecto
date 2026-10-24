// Presentación del historial de pedidos (tarea 19). Lógica pura, sin React.

// Estados del backend (enum EstadoPedido).
const ETIQUETAS: Record<string, string> = {
  PENDIENTE: "Pendiente de pago",
  PAGADO: "Pagado",
  PREPARANDO: "Preparando tu pedido",
  ENVIADO: "Enviado",
  ENTREGADO: "Entregado",
  CANCELADO: "Cancelado"
};

export type TonoEstado = "ok" | "espera" | "malo" | "neutro";

const TONOS: Record<string, TonoEstado> = {
  PENDIENTE: "espera",
  PAGADO: "ok",
  PREPARANDO: "ok",
  ENVIADO: "ok",
  ENTREGADO: "ok",
  CANCELADO: "malo"
};

// Un estado nuevo que el frontend todavía no conoce no rompe la pantalla:
// se muestra tal cual vino, con formato legible.
export function etiquetaDeEstado(estado: string): string {
  const conocido = ETIQUETAS[estado.toUpperCase()];
  if (conocido) return conocido;
  const t = estado.replace(/_/g, " ").toLowerCase();
  return t.charAt(0).toUpperCase() + t.slice(1);
}

export function tonoDeEstado(estado: string): TonoEstado {
  return TONOS[estado.toUpperCase()] ?? "neutro";
}

// Solo un pedido pendiente tiene sentido pagarlo. El backend igual verifica
// que sea del cliente y que todavía se pueda pagar (409 si no).
export function sePuedePagar(estado: string): boolean {
  return estado.toUpperCase() === "PENDIENTE";
}

// "12 de octubre de 2026". Si la fecha no se entiende, se devuelve vacío en
// vez de "Invalid Date".
export function fechaLarga(iso: string): string {
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return "";
  return new Date(t).toLocaleDateString("es-AR", { day: "numeric", month: "long", year: "numeric" });
}
