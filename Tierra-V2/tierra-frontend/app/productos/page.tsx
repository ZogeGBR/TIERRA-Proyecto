import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AlertTriangle, SearchX } from "lucide-react";
import { ProductCard } from "@/components/ProductCard";
import { CatalogoLayout } from "@/components/catalogo/CatalogoLayout";
import { FiltrosActivos } from "@/components/catalogo/FiltrosActivos";
import { Paginacion } from "@/components/catalogo/Paginacion";
import { api, USAR_CATALOGO_DE_PRUEBA } from "@/lib/api";
import { filtrosDeLaUrl, urlDeFiltros } from "@/lib/catalogo";

export const metadata: Metadata = {
  title: "Catálogo — Tierra"
};

// Catálogo con búsqueda, filtros combinables y paginación. Todo el estado
// vive en la URL (?q=...&categoriaId=...&pagina=2): este componente la lee, le
// pide al backend esa página, y los componentes interactivos navegan a URLs
// nuevas. Ver lib/catalogo.ts para cómo se valida lo que llega por la URL.
export default async function CatalogoPage({
  searchParams
}: {
  searchParams: { [clave: string]: string | string[] | undefined };
}) {
  const filtros = filtrosDeLaUrl(searchParams);

  // allSettled y no all: si las categorías o las marcas fallan, el catálogo
  // se sigue mostrando (solo sin esas listas en el panel); recién si falla el
  // listado de productos hay un error que mostrar.
  const [productos, categorias, marcas] = await Promise.allSettled([
    api.productos.listar(filtros),
    api.categorias.listar(),
    api.marcas.listar()
  ]);

  // Una página que no existe (?pagina=99, o un filtro nuevo que dejó menos
  // páginas) lleva a la última. Va fuera de cualquier try/catch porque
  // redirect() funciona lanzando una excepción.
  if (productos.status === "fulfilled" && productos.value.totalPaginas > 0 && filtros.pagina > productos.value.totalPaginas) {
    redirect(urlDeFiltros({ ...filtros, pagina: productos.value.totalPaginas }));
  }

  const listaCategorias = categorias.status === "fulfilled" ? categorias.value : [];
  const listaMarcas = marcas.status === "fulfilled" ? marcas.value : [];

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <h1 className="mb-6 font-serif text-2xl font-semibold text-tierra-terracota-oscuro md:text-3xl">
        {filtros.q ? `Resultados para “${filtros.q}”` : "Catálogo"}
      </h1>

      {USAR_CATALOGO_DE_PRUEBA && (
        <div
          role="note"
          className="mb-6 rounded-xl border border-tierra-ambar/40 bg-tierra-ambar/10 px-4 py-3 text-sm text-tierra-terracota-oscuro"
        >
          <strong>Catálogo de prueba.</strong> Estos productos son simulados para desarrollar el buscador y los
          filtros. Solo los 7 del seed abren su detalle real; en los demás se puede probar la pantalla, pero no
          comprarlos. Para desactivarlo: <code>NEXT_PUBLIC_CATALOGO_DE_PRUEBA=0</code>.
        </div>
      )}

      <CatalogoLayout
        filtros={filtros}
        categorias={listaCategorias}
        marcas={listaMarcas}
        total={productos.status === "fulfilled" ? productos.value.totalElementos : null}
      >
        <FiltrosActivos filtros={filtros} categorias={listaCategorias} marcas={listaMarcas} />

        {productos.status === "rejected" ? (
          <div role="alert" className="rounded-2xl border border-tierra-crema-oscuro bg-white/70 px-6 py-16 text-center">
            <AlertTriangle className="mx-auto text-tierra-terracota" size={36} aria-hidden="true" />
            <p className="mt-3 font-serif text-xl text-tierra-terracota-oscuro">No pudimos cargar el catálogo</p>
            <p className="mt-1 text-sm text-tierra-terracota-oscuro/70">
              {productos.reason instanceof Error ? productos.reason.message : "Probá de nuevo en un momento."}
            </p>
            <Link href={urlDeFiltros(filtros)} className="btn-primario mt-5 inline-flex">
              Reintentar
            </Link>
          </div>
        ) : productos.value.contenido.length === 0 ? (
          <div className="rounded-2xl border border-tierra-crema-oscuro bg-white/70 px-6 py-16 text-center">
            <SearchX className="mx-auto text-tierra-verde" size={36} aria-hidden="true" />
            <p className="mt-3 font-serif text-xl text-tierra-terracota-oscuro">No encontramos productos con esos filtros</p>
            <p className="mt-1 text-sm text-tierra-terracota-oscuro/70">Probá con otras palabras o quitá algún filtro.</p>
            <Link href="/productos" className="btn-primario mt-5 inline-flex">
              Limpiar filtros
            </Link>
          </div>
        ) : (
          <>
            <div className="grilla-anim grid grid-cols-2 gap-5 lg:grid-cols-3 xl:grid-cols-4">
              {productos.value.contenido.map((p) => (
                <ProductCard key={p.id} producto={p} />
              ))}
            </div>
            <Paginacion filtros={filtros} totalPaginas={productos.value.totalPaginas} />
          </>
        )}
      </CatalogoLayout>
    </div>
  );
}
