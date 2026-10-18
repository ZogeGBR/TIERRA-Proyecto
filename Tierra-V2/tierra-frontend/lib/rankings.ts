import type { ProductoResumen } from "./types";

// Rankings de la home: "más vendidos" y "más buscados" (contrato asumido en
// contrato-fase2-frontend.md: GET /productos/mas-vendidos y /mas-buscados).

export const LIMITE_RANKING = 12;

export type TipoRanking = "vendidos" | "buscados";

export const PESTANIAS: { tipo: TipoRanking; etiqueta: string }[] = [
  { tipo: "vendidos", etiqueta: "Más vendidos" },
  { tipo: "buscados", etiqueta: "Más buscados" }
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

// Pestañas que se muestran: solo las que tienen productos.
export function pestaniasConProductos(listas: Record<TipoRanking, ProductoResumen[]>) {
  return PESTANIAS.filter((p) => listas[p.tipo].length > 0);
}
