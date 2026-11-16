import Link from "next/link";
import { X } from "lucide-react";
import { GENEROS, formatearPrecio, urlDeFiltros } from "@/lib/catalogo";
import type { FiltrosDeCatalogo, OpcionCategoria, OpcionMarca } from "@/lib/types";

// Los filtros aplicados, como etiquetas que se pueden quitar de a una. Son
// links (no botones con estado): quitar un filtro es navegar a la misma
// búsqueda sin ese filtro, así que no hace falta JavaScript de cliente.
export function FiltrosActivos({
  filtros,
  categorias,
  marcas
}: {
  filtros: FiltrosDeCatalogo;
  categorias: OpcionCategoria[];
  marcas: OpcionMarca[];
}) {
  // Quitar un filtro vuelve a la página 1: la página 4 de una búsqueda más
  // amplia no tiene por qué existir en la nueva.
  const sin = (cambios: Partial<FiltrosDeCatalogo>) => urlDeFiltros({ ...filtros, ...cambios, pagina: 1 });
  const chips: { clave: string; etiqueta: string; href: string }[] = [];

  if (filtros.q) chips.push({ clave: "q", etiqueta: `Búsqueda: “${filtros.q}”`, href: sin({ q: undefined }) });
  if (filtros.categoriaId) {
    const nombre = categorias.find((c) => c.id === filtros.categoriaId)?.nombre ?? "Categoría";
    chips.push({ clave: "categoria", etiqueta: nombre, href: sin({ categoriaId: undefined }) });
  }
  if (filtros.marcaId) {
    const nombre = marcas.find((m) => m.id === filtros.marcaId)?.nombre ?? "Marca";
    chips.push({ clave: "marca", etiqueta: nombre, href: sin({ marcaId: undefined }) });
  }
  if (filtros.genero) {
    const nombre = GENEROS.find((g) => g.valor === filtros.genero)?.etiqueta ?? filtros.genero;
    chips.push({ clave: "genero", etiqueta: nombre, href: sin({ genero: undefined }) });
  }
  if (filtros.precioMin !== undefined || filtros.precioMax !== undefined) {
    const etiqueta =
      filtros.precioMin !== undefined && filtros.precioMax !== undefined
        ? `${formatearPrecio(filtros.precioMin)} – ${formatearPrecio(filtros.precioMax)}`
        : filtros.precioMin !== undefined
          ? `Desde ${formatearPrecio(filtros.precioMin)}`
          : `Hasta ${formatearPrecio(filtros.precioMax as number)}`;
    chips.push({ clave: "precio", etiqueta, href: sin({ precioMin: undefined, precioMax: undefined }) });
  }

  if (chips.length === 0) return null;

  return (
    <div className="mb-4 flex flex-wrap items-center gap-2" aria-label="Filtros aplicados">
      {chips.map((chip) => (
        <Link
          key={chip.clave}
          href={chip.href}
          aria-label={`Quitar filtro: ${chip.etiqueta}`}
          className="inline-flex items-center gap-1.5 rounded-full border border-tierra-terracota/30 bg-white px-3 py-1 text-sm
                     text-tierra-terracota-oscuro transition-colors hover:border-tierra-terracota hover:bg-tierra-crema
                     focus:outline-none focus:ring-2 focus:ring-tierra-verde/60"
        >
          {chip.etiqueta}
          <X size={14} aria-hidden="true" />
        </Link>
      ))}
      <Link
        href="/productos"
        className="text-sm text-tierra-verde underline-offset-2 hover:underline focus:outline-none focus:ring-2 focus:ring-tierra-verde/60 rounded"
      >
        Limpiar todo
      </Link>
    </div>
  );
}
