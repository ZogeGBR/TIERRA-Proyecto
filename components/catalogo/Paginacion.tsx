import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { urlDeFiltros, ventanaDePaginas } from "@/lib/catalogo";
import type { FiltrosDeCatalogo } from "@/lib/types";

const botonBase =
  "inline-flex h-9 min-w-9 items-center justify-center rounded-full px-3 text-sm transition-colors " +
  "focus:outline-none focus:ring-2 focus:ring-tierra-verde/60";

// Navegación entre páginas del catálogo. Cada número es un link que conserva
// el resto de los filtros (búsqueda, categoría, orden...), así se puede
// compartir la página 3 de una búsqueda tal cual.
export function Paginacion({ filtros, totalPaginas }: { filtros: FiltrosDeCatalogo; totalPaginas: number }) {
  if (totalPaginas <= 1) return null;

  const actual = Math.min(filtros.pagina, totalPaginas);
  const href = (n: number) => urlDeFiltros({ ...filtros, pagina: n });

  return (
    <nav aria-label="Paginación" className="mt-10 flex flex-wrap items-center justify-center gap-1.5">
      {actual > 1 ? (
        <Link href={href(actual - 1)} className={`${botonBase} bg-white text-tierra-terracota-oscuro hover:bg-tierra-crema`} aria-label="Página anterior">
          <ChevronLeft size={16} aria-hidden="true" />
        </Link>
      ) : (
        <span className={`${botonBase} bg-white/50 text-tierra-terracota-oscuro/30`} aria-hidden="true">
          <ChevronLeft size={16} />
        </span>
      )}

      {ventanaDePaginas(actual, totalPaginas).map((item, i) =>
        item === "…" ? (
          <span key={`salto-${i}`} className="px-1 text-tierra-terracota-oscuro/50" aria-hidden="true">
            …
          </span>
        ) : item === actual ? (
          <span key={item} aria-current="page" className={`${botonBase} bg-tierra-terracota font-medium text-white`}>
            {item}
          </span>
        ) : (
          <Link key={item} href={href(item)} className={`${botonBase} bg-white text-tierra-terracota-oscuro hover:bg-tierra-crema`} aria-label={`Ir a la página ${item}`}>
            {item}
          </Link>
        )
      )}

      {actual < totalPaginas ? (
        <Link href={href(actual + 1)} className={`${botonBase} bg-white text-tierra-terracota-oscuro hover:bg-tierra-crema`} aria-label="Página siguiente">
          <ChevronRight size={16} aria-hidden="true" />
        </Link>
      ) : (
        <span className={`${botonBase} bg-white/50 text-tierra-terracota-oscuro/30`} aria-hidden="true">
          <ChevronRight size={16} />
        </span>
      )}
    </nav>
  );
}
