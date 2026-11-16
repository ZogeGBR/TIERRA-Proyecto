import type { ProductoResumen } from "./types";

// Ranking de la home: "más vendidos" (GET /productos/mas-vendidos).
//
// Regla acordada con Tierra: pedidos pagados de los últimos 90 días, como
// máximo 8 productos, y la sección se oculta mientras haya menos de 3
// productos con ventas (una lista de 1 o 2 parece vacía, no "lo más vendido").
// El backend aplica la misma regla; el frontend la repite para no mostrar
// nunca algo que no la cumpla. "Más buscados" se descartó.

export const LIMITE_RANKING = 8;
export const MINIMO_RANKING = 3;

export type TipoRanking = "vendidos";

export const PESTANIAS: { tipo: TipoRanking; etiqueta: string }[] = [
  { tipo: "vendidos", etiqueta: "Más vendidos" }
];

function esProducto(x: unknown): x is ProductoResumen {
  if (typeof x !== "object" || x === null) return false;
  const p = x as Record<string, unknown>;
  return typeof p.id === "string" && typeof p.nombre === "string" && typeof p.precio === "number" && Number.isFinite(p.precio);
}

// Lo que llega del backend se valida: si no es una lista de productos válida,
// devuelve [] (y la pestaña no se muestra) en vez de romper la home. Se
// descartan los ítems mal formados, se quitan repetidos y se corta en el
// límite.
export function normalizarRanking(respuesta: unknown): ProductoResumen[] {
  if (!Array.isArray(respuesta)) return [];
  const vistos = new Set<string>();
  const salida: ProductoResumen[] = [];
  for (const x of respuesta) {
    if (!esProducto(x) || vistos.has(x.id)) continue;
    vistos.add(x.id);
    salida.push({
      id: x.id,
      slug: typeof x.slug === "string" ? x.slug : undefined,
      nombre: x.nombre,
      marca: typeof x.marca === "string" ? x.marca : "",
      categoria: typeof x.categoria === "string" ? x.categoria : "",
      precio: x.precio,
      imagenPrincipal: typeof x.imagenPrincipal === "string" ? x.imagenPrincipal : null
    });
    if (salida.length >= LIMITE_RANKING) break;
  }
  return salida;
}

// Pestañas que se muestran: solo las que llegan al mínimo de productos.
export function pestaniasConProductos(listas: Record<TipoRanking, ProductoResumen[]>) {
  return PESTANIAS.filter((p) => listas[p.tipo].length >= MINIMO_RANKING);
}
