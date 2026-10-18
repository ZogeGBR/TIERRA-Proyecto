import type { DireccionCheckoutRequest, ItemPedidoRequest, TipoEntrega } from "./types";

// Por qué existe esto.
//
// Al apretar "Comprar" el backend crea el pedido (reserva stock) y devuelve el
// link de pago de Mercado Pago junto con su vencimiento. Si la persona vuelve
// con "atrás" o el pago falla, ese pedido YA existe: crear otro duplicaría la
// reserva de stock. Por eso se guardan el pedido, el link y el vencimiento, y
// "Volver a pagar" reabre el MISMO link mientras no venza -- Mercado Pago
// admite varios intentos sobre el mismo link, así que no hace falta ni
// siquiera hablar con el backend (auditoría Fase 2, tarea 13).
//
// Se guarda en sessionStorage (no localStorage): es por pestaña y se borra al
// cerrarla, que es la vida útil de un pago sin terminar.

const CLAVE = "tierra_pedido_pendiente";

// Si el backend no manda un vencimiento utilizable, se asume la misma
// ventana que la reserva de stock (InventarioService.TTL_RESERVA_MINUTOS).
export const VIGENCIA_POR_DEFECTO_MS = 20 * 60 * 1000;

type Almacen = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export interface PagoPendiente {
  pedidoId: string;
  initPoint: string;
  /** Instante (ms desde 1970) en que vence el link. */
  venceEn: number;
}

function almacenDelNavegador(): Almacen | null {
  try {
    return typeof window !== "undefined" ? window.sessionStorage : null;
  } catch {
    return null;
  }
}

// El backend manda `expiraEn` como texto ISO. Si falta o no se entiende, se
// usa la vigencia por defecto desde `ahora`.
export function vencimientoDe(expiraEn: string | null | undefined, ahora: number = Date.now()): number {
  const t = expiraEn ? Date.parse(expiraEn) : NaN;
  return Number.isFinite(t) ? t : ahora + VIGENCIA_POR_DEFECTO_MS;
}

// Identifica "esta compra": mismos productos, misma cantidad, misma entrega.
// Si la persona vuelve atrás y cambia la dirección o el carrito, la firma
// cambia y el pedido guardado deja de servir -- por eso no hace falta
// invalidarlo a mano cada vez que se toca un paso.
export function firmaDeCompra(
  items: ItemPedidoRequest[],
  tipoEntrega: TipoEntrega,
  direccion: DireccionCheckoutRequest | null,
  email = ""
): string {
  // Ordenado para que el mismo carrito agregado en otro orden dé igual firma.
  const productos = items
    .map((i) => `${i.varianteId}x${i.cantidad}`)
    .sort()
    .join(",");
  const destino =
    tipoEntrega === "ENVIO_DOMICILIO" && direccion
      ? [direccion.calle, direccion.numero ?? "", direccion.ciudad, direccion.provincia, direccion.codigoPostal]
          .map((p) => p.trim().toLowerCase())
          .join("|")
      : "retiro";
  // El email entra en la firma: el pedido queda a nombre de ese email, y
  // cambiarlo es otra compra.
  return `${tipoEntrega}#${destino}#${productos}#${email.trim().toLowerCase()}`;
}

export function guardarPagoPendiente(
  pago: PagoPendiente & { firma: string },
  almacen: Almacen | null = almacenDelNavegador()
): void {
  if (!almacen) return;
  try {
    almacen.setItem(CLAVE, JSON.stringify(pago));
  } catch {
    // Sin almacenamiento solo se pierde la protección contra duplicados.
  }
}

export function borrarPagoPendiente(almacen: Almacen | null = almacenDelNavegador()): void {
  if (!almacen) return;
  try {
    almacen.removeItem(CLAVE);
  } catch {
    // Nada que hacer.
  }
}

interface Guardado extends PagoPendiente {
  firma: string;
}

function leerGuardado(almacen: Almacen, ahora: number): Guardado | null {
  try {
    const crudo = almacen.getItem(CLAVE);
    if (crudo === null) return null;
    const x: unknown = JSON.parse(crudo);
    if (
      typeof x !== "object" || x === null ||
      typeof (x as Record<string, unknown>).pedidoId !== "string" ||
      typeof (x as Record<string, unknown>).initPoint !== "string" ||
      typeof (x as Record<string, unknown>).firma !== "string" ||
      typeof (x as Record<string, unknown>).venceEn !== "number"
    ) {
      throw new Error("pago pendiente con formato inválido");
    }
    const g = x as Guardado;
    if (ahora >= g.venceEn) {
      borrarPagoPendiente(almacen);
      return null;
    }
    return g;
  } catch {
    borrarPagoPendiente(almacen);
    return null;
  }
}

// El pago pendiente de ESTA compra (misma firma), si sigue vigente. Vigente
// pero de otra compra: no se borra (puede volver a esa), solo no se usa.
export function leerPagoPendiente(
  firma: string,
  ahora: number = Date.now(),
  almacen: Almacen | null = almacenDelNavegador()
): PagoPendiente | null {
  if (!almacen) return null;
  const g = leerGuardado(almacen, ahora);
  if (!g || g.firma !== firma) return null;
  return { pedidoId: g.pedidoId, initPoint: g.initPoint, venceEn: g.venceEn };
}

// Cualquier pago pendiente vigente, sea de la compra que sea. Lo usan el
// carrito ("Tenés un pago sin terminar") y la página de pago fallido, que no
// conocen la firma.
export function leerCualquierPagoPendiente(
  ahora: number = Date.now(),
  almacen: Almacen | null = almacenDelNavegador()
): PagoPendiente | null {
  if (!almacen) return null;
  const g = leerGuardado(almacen, ahora);
  return g ? { pedidoId: g.pedidoId, initPoint: g.initPoint, venceEn: g.venceEn } : null;
}

// --- Seguridad del link de pago ---

const DOMINIOS_DE_PAGO = ["mercadopago.com", "mercadopago.com.ar", "mercadolibre.com", "mercadolibre.com.ar", "mpago.la", "mpago.li"];

// Antes de mandar al navegador a un link guardado, se comprueba que sea
// https y de Mercado Pago. Lo guardado en el navegador lo puede editar
// cualquiera; redirigir a ciegas sería una redirección abierta.
export function esLinkDePago(link: string): boolean {
  try {
    const u = new URL(link);
    if (u.protocol !== "https:") return false;
    const host = u.hostname.toLowerCase();
    return DOMINIOS_DE_PAGO.some((d) => host === d || host.endsWith("." + d));
  } catch {
    return false;
  }
}

// --- Datos que vuelven de Mercado Pago en la URL ---

const FORMATO_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// El id del pedido llega en la URL (external_reference) y cualquiera puede
// escribir esa URL a mano: se valida el formato antes de usarlo o mostrarlo, y
// NUNCA se toma como prueba de que algo se pagó (eso lo decide el webhook).
export function esIdDePedido(valor: string | undefined): valor is string {
  return typeof valor === "string" && FORMATO_UUID.test(valor);
}

// Número corto para mostrarle a la persona: los primeros 8 caracteres.
export function numeroDePedido(id: string): string {
  return id.slice(0, 8).toUpperCase();
}

export function pedidoDeLaUrl(valor: string | string[] | undefined): string | null {
  const v = Array.isArray(valor) ? valor[0] : valor;
  return esIdDePedido(v) ? v : null;
}
