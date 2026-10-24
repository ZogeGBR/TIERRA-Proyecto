import type { FiltrosDeCatalogo, GeneroProducto, OpcionCategoria, OrdenCatalogo } from "./types";

// Productos por página. 12 se reparte parejo en las grillas de 2, 3 y 4
// columnas, así la última fila nunca queda a medias salvo en la última página.
export const TAMANIO_PAGINA = 12;

export const ORDEN_POR_DEFECTO: OrdenCatalogo = "nombre";

export const ORDENES: { valor: OrdenCatalogo; etiqueta: string }[] = [
  { valor: "nombre", etiqueta: "Nombre (A-Z)" },
  { valor: "precio_asc", etiqueta: "Menor precio" },
  { valor: "precio_desc", etiqueta: "Mayor precio" }
];

export const GENEROS: { valor: GeneroProducto; etiqueta: string }[] = [
  { valor: "HOMBRE", etiqueta: "Hombre" },
  { valor: "MUJER", etiqueta: "Mujer" },
  { valor: "NINO", etiqueta: "Niños" },
  { valor: "UNISEX", etiqueta: "Unisex" }
];

export const MAX_LARGO_BUSQUEDA = 80;
export const PRECIO_MAXIMO = 100_000_000;

const FORMATO_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type ParametrosDeUrl = Record<string, string | string[] | undefined>;

function primero(valor: string | string[] | undefined): string | undefined {
  return Array.isArray(valor) ? valor[0] : valor;
}

function leerPrecio(valor: string | undefined): number | undefined {
  // Solo enteros: los precios del catálogo están en pesos, sin centavos.
  if (valor === undefined || !/^\d{1,9}$/.test(valor)) return undefined;
  const n = Number(valor);
  return n <= PRECIO_MAXIMO ? n : undefined;
}

// Convierte los parámetros de la URL en filtros VÁLIDOS. La URL la puede
// escribir cualquiera, y lo que no se entiende se descarta en vez de mandarse
// al backend: un id con formato inválido, por ejemplo, hace que el backend
// responda 500 (no tiene manejador para ese error), no 400.
export function filtrosDeLaUrl(params: ParametrosDeUrl): FiltrosDeCatalogo {
  const q = primero(params.q)?.replace(/\s+/g, " ").trim().slice(0, MAX_LARGO_BUSQUEDA);

  const categoriaId = primero(params.categoriaId);
  const marcaId = primero(params.marcaId);
  const genero = GENEROS.find((g) => g.valor === primero(params.genero))?.valor;
  const orden = ORDENES.find((o) => o.valor === primero(params.orden))?.valor ?? ORDEN_POR_DEFECTO;

  let precioMin = leerPrecio(primero(params.precioMin));
  let precioMax = leerPrecio(primero(params.precioMax));
  // Rango al revés (desde 500 hasta 100): se da vuelta en vez de devolver
  // "sin resultados", que es lo que la persona no quiso decir.
  if (precioMin !== undefined && precioMax !== undefined && precioMin > precioMax) {
    [precioMin, precioMax] = [precioMax, precioMin];
  }

  const textoPagina = primero(params.pagina);
  const pagina = textoPagina !== undefined && /^\d{1,6}$/.test(textoPagina) ? Math.max(1, Number(textoPagina)) : 1;

  return {
    q: q || undefined,
    categoriaId: categoriaId && FORMATO_UUID.test(categoriaId) ? categoriaId : undefined,
    marcaId: marcaId && FORMATO_UUID.test(marcaId) ? marcaId : undefined,
    genero,
    precioMin,
    precioMax,
    orden,
    pagina
  };
}

// Filtros -> query string (sin el "?"). Solo incluye lo que no es el valor por
// defecto, y siempre en el mismo orden: así la misma búsqueda da siempre la
// misma URL (útil para compartirla y para no llenar el historial de
// duplicados).
export function queryDeFiltros(f: FiltrosDeCatalogo): string {
  const p = new URLSearchParams();
  if (f.q) p.set("q", f.q);
  if (f.categoriaId) p.set("categoriaId", f.categoriaId);
  if (f.marcaId) p.set("marcaId", f.marcaId);
  if (f.genero) p.set("genero", f.genero);
  if (f.precioMin !== undefined) p.set("precioMin", String(f.precioMin));
  if (f.precioMax !== undefined) p.set("precioMax", String(f.precioMax));
  if (f.orden !== ORDEN_POR_DEFECTO) p.set("orden", f.orden);
  if (f.pagina > 1) p.set("pagina", String(f.pagina));
  return p.toString();
}

export function urlDeFiltros(f: FiltrosDeCatalogo, base = "/productos"): string {
  const query = queryDeFiltros(f);
  return query ? `${base}?${query}` : base;
}

// Cantidad de filtros activos, para el contador del botón "Filtros". El
// orden y la página no cuentan: no achican el resultado. El rango de precio
// cuenta como uno aunque tenga mínimo y máximo.
export function cantidadDeFiltros(f: FiltrosDeCatalogo): number {
  return [
    f.q !== undefined,
    f.categoriaId !== undefined,
    f.marcaId !== undefined,
    f.genero !== undefined,
    f.precioMin !== undefined || f.precioMax !== undefined
  ].filter(Boolean).length;
}

export function formatearPrecio(n: number): string {
  return `$${n.toLocaleString("es-AR")}`;
}

// Qué números de página mostrar: la primera, la última y las vecinas de la
// actual, con "…" donde se salta de a más de una. Si falta una sola página en
// el medio, se muestra el número en vez de "…" (un "…" que esconde una única
// página es peor que mostrarla).
export function ventanaDePaginas(actual: number, total: number): (number | "…")[] {
  const visibles = [...new Set([1, total, actual - 1, actual, actual + 1])]
    .filter((n) => n >= 1 && n <= total)
    .sort((a, b) => a - b);
  const salida: (number | "…")[] = [];
  visibles.forEach((n, i) => {
    if (i > 0) {
      const salto = n - visibles[i - 1];
      if (salto === 2) salida.push(visibles[i - 1] + 1);
      else if (salto > 2) salida.push("…");
    }
    salida.push(n);
  });
  return salida;
}

// Las categorías en orden de árbol (cada padre seguido de sus hijas), con el
// nivel de sangría. Una categoría cuyo padre no está en la lista se trata como
// raíz: con datos inconsistentes sería peor que desapareciera del filtro.
export function aplanarCategorias(categorias: OpcionCategoria[]): { categoria: OpcionCategoria; nivel: number }[] {
  const ids = new Set(categorias.map((c) => c.id));
  const salida: { categoria: OpcionCategoria; nivel: number }[] = [];
  const visitadas = new Set<string>();
  const agregar = (padreId: string | null, nivel: number) => {
    for (const c of categorias) {
      const esHija = padreId === null ? c.padreId === null || !ids.has(c.padreId) : c.padreId === padreId;
      if (esHija && !visitadas.has(c.id)) {
        visitadas.add(c.id);
        salida.push({ categoria: c, nivel });
        agregar(c.id, nivel + 1);
      }
    }
  };
  agregar(null, 0);
  return salida;
}
