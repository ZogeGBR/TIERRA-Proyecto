"use client";

import { useEffect, useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Search, SlidersHorizontal } from "lucide-react";
import { GENEROS, ORDENES, aplanarCategorias, cantidadDeFiltros, urlDeFiltros } from "@/lib/catalogo";
import type { FiltrosDeCatalogo, OpcionCategoria, OpcionMarca, OrdenCatalogo } from "@/lib/types";

const opcion =
  "w-full rounded-lg px-3 py-1.5 text-left text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-tierra-verde/60";
const opcionActiva = "bg-tierra-terracota font-medium text-white";
const opcionInactiva = "text-tierra-terracota-oscuro hover:bg-tierra-crema";
const campo =
  "w-full rounded-lg border border-tierra-crema-oscuro bg-white px-3 py-2 text-sm text-tierra-terracota-oscuro " +
  "placeholder:text-tierra-terracota-oscuro/40 transition-colors focus:border-tierra-verde focus:outline-none focus:ring-1 focus:ring-tierra-verde";

function Seccion({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <section className="border-t border-tierra-crema-oscuro pt-4 first:border-t-0 first:pt-0">
      <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-tierra-terracota">{titulo}</h2>
      {children}
    </section>
  );
}

// Panel de filtros + barra de resultados del catálogo.
//
// La URL es la fuente de verdad: este componente no guarda "qué filtros hay",
// los lee de `filtros` (que sale de la URL en el servidor) y cada cambio
// navega a una URL nueva. Así los filtros se pueden compartir, funcionan con
// el botón "atrás" y recargar la página no los pierde.
//
// El contenido (la grilla, ya renderizada en el servidor) llega como
// `children`: pasa por acá solo para atenuarse mientras se carga el resultado
// nuevo, que es la única señal que ve la persona de que su clic hizo algo.
export function CatalogoLayout({
  filtros,
  categorias,
  marcas,
  total,
  children
}: {
  filtros: FiltrosDeCatalogo;
  categorias: OpcionCategoria[];
  marcas: OpcionMarca[];
  total: number | null;
  children: ReactNode;
}) {
  const router = useRouter();
  const [cargando, iniciarTransicion] = useTransition();
  const [panelAbierto, setPanelAbierto] = useState(false);

  const [texto, setTexto] = useState(filtros.q ?? "");
  const [minimo, setMinimo] = useState(filtros.precioMin?.toString() ?? "");
  const [maximo, setMaximo] = useState(filtros.precioMax?.toString() ?? "");

  // Si la URL cambia por otro lado (quitar una etiqueta, "atrás"), los campos
  // de texto tienen que mostrar lo que ahora rige.
  useEffect(() => {
    setTexto(filtros.q ?? "");
    setMinimo(filtros.precioMin?.toString() ?? "");
    setMaximo(filtros.precioMax?.toString() ?? "");
  }, [filtros.q, filtros.precioMin, filtros.precioMax]);

  // Cualquier cambio de filtro vuelve a la página 1.
  function aplicar(cambios: Partial<FiltrosDeCatalogo>) {
    const nuevos: FiltrosDeCatalogo = { ...filtros, ...cambios, pagina: 1 };
    iniciarTransicion(() => router.push(urlDeFiltros(nuevos)));
    // En el celular el panel se pliega al elegir algo: si no, los resultados
    // quedan debajo de un panel larguísimo y parece que no pasó nada. (En
    // pantallas grandes el panel está siempre a la vista: esto no se nota.)
    setPanelAbierto(false);
  }

  function alBuscar(e: React.FormEvent) {
    e.preventDefault();
    aplicar({ q: texto.trim() || undefined });
  }

  function alAplicarPrecio(e: React.FormEvent) {
    e.preventDefault();
    const aNumero = (v: string) => (v.trim() === "" ? undefined : Number(v));
    // Lo inválido ("abc", "-5") se descarta: la URL se vuelve a validar al
    // llegar, pero mejor no mandar basura.
    const min = aNumero(minimo);
    const max = aNumero(maximo);
    aplicar({
      precioMin: min !== undefined && Number.isFinite(min) && min >= 0 ? Math.floor(min) : undefined,
      precioMax: max !== undefined && Number.isFinite(max) && max >= 0 ? Math.floor(max) : undefined
    });
  }

  const arbol = aplanarCategorias(categorias);
  const cantidad = cantidadDeFiltros(filtros);

  return (
    <div className="grid gap-8 md:grid-cols-[16rem_1fr]">
      <div>
        <button
          type="button"
          onClick={() => setPanelAbierto((v) => !v)}
          aria-expanded={panelAbierto}
          aria-controls="panel-filtros"
          className="btn-secundario mb-4 w-full md:hidden"
        >
          <SlidersHorizontal size={16} aria-hidden="true" />
          Filtros{cantidad > 0 ? ` (${cantidad})` : ""}
        </button>

        <aside
          id="panel-filtros"
          aria-label="Filtros del catálogo"
          className={`${panelAbierto ? "block" : "hidden"} space-y-4 rounded-2xl border border-tierra-crema-oscuro bg-white p-5 shadow-sm md:sticky md:top-28 md:block md:max-h-[calc(100vh-8rem)] md:overflow-y-auto`}
        >
          <Seccion titulo="Buscar">
            <form role="search" onSubmit={alBuscar} className="flex gap-2">
              <label htmlFor="buscar-catalogo" className="sr-only">
                Buscar productos
              </label>
              <input
                id="buscar-catalogo"
                type="search"
                value={texto}
                onChange={(e) => setTexto(e.target.value)}
                placeholder="Campera, carpa, Scott…"
                maxLength={80}
                className={campo}
              />
              <button
                type="submit"
                aria-label="Buscar"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-tierra-terracota text-white transition-colors hover:bg-tierra-terracota-oscuro focus:outline-none focus:ring-2 focus:ring-tierra-verde/60"
              >
                <Search size={16} aria-hidden="true" />
              </button>
            </form>
          </Seccion>

          {arbol.length > 0 && (
            <Seccion titulo="Categoría">
              <div className="space-y-0.5">
                <button
                  type="button"
                  aria-pressed={filtros.categoriaId === undefined}
                  onClick={() => aplicar({ categoriaId: undefined })}
                  className={`${opcion} ${filtros.categoriaId === undefined ? opcionActiva : opcionInactiva}`}
                >
                  Todas
                </button>
                {arbol.map(({ categoria, nivel }) => (
                  <button
                    key={categoria.id}
                    type="button"
                    aria-pressed={filtros.categoriaId === categoria.id}
                    onClick={() => aplicar({ categoriaId: categoria.id })}
                    style={{ paddingLeft: `${0.75 + nivel * 1}rem` }}
                    className={`${opcion} ${filtros.categoriaId === categoria.id ? opcionActiva : opcionInactiva}`}
                  >
                    {categoria.nombre}
                  </button>
                ))}
              </div>
            </Seccion>
          )}

          {marcas.length > 0 && (
            <Seccion titulo="Marca">
              <div className="space-y-0.5">
                <button
                  type="button"
                  aria-pressed={filtros.marcaId === undefined}
                  onClick={() => aplicar({ marcaId: undefined })}
                  className={`${opcion} ${filtros.marcaId === undefined ? opcionActiva : opcionInactiva}`}
                >
                  Todas
                </button>
                {marcas.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    aria-pressed={filtros.marcaId === m.id}
                    onClick={() => aplicar({ marcaId: m.id })}
                    className={`${opcion} ${filtros.marcaId === m.id ? opcionActiva : opcionInactiva}`}
                  >
                    {m.nombre}
                  </button>
                ))}
              </div>
            </Seccion>
          )}

          <Seccion titulo="Para">
            <div className="flex flex-wrap gap-1.5">
              {[{ valor: undefined, etiqueta: "Todos" }, ...GENEROS].map((g) => {
                const activo = filtros.genero === g.valor;
                return (
                  <button
                    key={g.etiqueta}
                    type="button"
                    aria-pressed={activo}
                    onClick={() => aplicar({ genero: g.valor })}
                    className={`rounded-full border px-3 py-1 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-tierra-verde/60 ${
                      activo
                        ? "border-tierra-terracota bg-tierra-terracota text-white"
                        : "border-tierra-crema-oscuro text-tierra-terracota-oscuro hover:bg-tierra-crema"
                    }`}
                  >
                    {g.etiqueta}
                  </button>
                );
              })}
            </div>
          </Seccion>

          <Seccion titulo="Precio">
            <form onSubmit={alAplicarPrecio} className="space-y-2">
              <div className="flex items-center gap-2">
                <label htmlFor="precio-minimo" className="sr-only">
                  Precio mínimo
                </label>
                <input
                  id="precio-minimo"
                  inputMode="numeric"
                  value={minimo}
                  onChange={(e) => setMinimo(e.target.value)}
                  placeholder="Mínimo"
                  className={campo}
                />
                <span aria-hidden="true" className="text-tierra-terracota-oscuro/40">
                  –
                </span>
                <label htmlFor="precio-maximo" className="sr-only">
                  Precio máximo
                </label>
                <input
                  id="precio-maximo"
                  inputMode="numeric"
                  value={maximo}
                  onChange={(e) => setMaximo(e.target.value)}
                  placeholder="Máximo"
                  className={campo}
                />
              </div>
              <button type="submit" className="btn-secundario w-full">
                Aplicar precio
              </button>
            </form>
          </Seccion>
        </aside>
      </div>

      <div>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-tierra-terracota-oscuro/70" aria-live="polite">
            {total === null ? "" : `${total} ${total === 1 ? "producto" : "productos"}`}
          </p>
          <label className="flex items-center gap-2 text-sm text-tierra-terracota-oscuro">
            <span>Ordenar por</span>
            <select
              value={filtros.orden}
              onChange={(e) => aplicar({ orden: e.target.value as OrdenCatalogo })}
              className="rounded-lg border border-tierra-crema-oscuro bg-white px-3 py-1.5 text-sm transition-colors focus:border-tierra-verde focus:outline-none focus:ring-1 focus:ring-tierra-verde"
            >
              {ORDENES.map((o) => (
                <option key={o.valor} value={o.valor}>
                  {o.etiqueta}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div aria-busy={cargando} className={`transition-opacity ${cargando ? "pointer-events-none opacity-50" : ""}`}>
          {children}
        </div>
      </div>
    </div>
  );
}
