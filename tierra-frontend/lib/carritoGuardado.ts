import type { ItemCarrito } from "./types";

export const CLAVE_CARRITO = "tierra_carrito";

// Solo lo que se usa de Storage, para poder probar esto con uno falso.
type Almacen = Pick<Storage, "getItem" | "setItem" | "removeItem">;

function almacenDelNavegador(): Almacen | null {
  // localStorage puede ni existir (SSR) o lanzar solo con tocarlo (modo
  // privado de algunos navegadores, cookies bloqueadas).
  try {
    return typeof window !== "undefined" ? window.localStorage : null;
  } catch {
    return null;
  }
}

function esTextoONulo(v: unknown): v is string | null | undefined {
  return v === null || v === undefined || typeof v === "string";
}

// Convierte un valor leído de localStorage en un ItemCarrito, o null si no
// sirve. localStorage lo puede editar cualquiera (o una versión vieja de la
// app dejar otra forma), así que no se asume nada: un ítem con cantidad
// "abc" o sin varianteId rompería el cálculo del subtotal o el pedido.
export function normalizarItem(crudo: unknown): ItemCarrito | null {
  if (typeof crudo !== "object" || crudo === null) return null;
  const x = crudo as Record<string, unknown>;

  if (typeof x.varianteId !== "string" || x.varianteId === "") return null;
  if (typeof x.productoId !== "string") return null;
  if (typeof x.nombreProducto !== "string") return null;
  if (typeof x.precioUnitario !== "number" || !Number.isFinite(x.precioUnitario) || x.precioUnitario < 0) return null;
  if (typeof x.cantidad !== "number" || !Number.isInteger(x.cantidad) || x.cantidad < 1) return null;
  if (!esTextoONulo(x.talla) || !esTextoONulo(x.color) || !esTextoONulo(x.imagen)) return null;

  return {
    varianteId: x.varianteId,
    productoId: x.productoId,
    nombreProducto: x.nombreProducto,
    talla: x.talla ?? null,
    color: x.color ?? null,
    precioUnitario: x.precioUnitario,
    cantidad: x.cantidad,
    imagen: x.imagen ?? null
  };
}

// Lee el carrito guardado. Nunca lanza: si el valor está corrupto (JSON
// cortado, otro formato) se borra y se devuelve un carrito vacío. Antes,
// un JSON.parse sin protección tiraba abajo toda la app para esa persona,
// y como el valor seguía ahí, también en cada visita siguiente.
export function leerCarritoGuardado(almacen: Almacen | null = almacenDelNavegador()): ItemCarrito[] {
  if (!almacen) return [];
  try {
    const crudo = almacen.getItem(CLAVE_CARRITO);
    if (crudo === null) return [];
    const parseado: unknown = JSON.parse(crudo);
    if (!Array.isArray(parseado)) throw new Error("el carrito guardado no es una lista");
    return parseado.map(normalizarItem).filter((i): i is ItemCarrito => i !== null);
  } catch {
    try {
      almacen.removeItem(CLAVE_CARRITO);
    } catch {
      // Si ni borrar se puede, no hay nada más que hacer.
    }
    return [];
  }
}

// Guardar puede fallar (cuota llena, modo privado). El carrito sigue
// funcionando en memoria; lo único que se pierde es que sobreviva a recargar.
export function guardarCarrito(items: ItemCarrito[], almacen: Almacen | null = almacenDelNavegador()): void {
  if (!almacen) return;
  try {
    almacen.setItem(CLAVE_CARRITO, JSON.stringify(items));
  } catch {
    // Ver comentario de arriba.
  }
}
