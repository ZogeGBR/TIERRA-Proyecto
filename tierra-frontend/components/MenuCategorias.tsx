"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { api } from "@/lib/api";
import { ORDEN_POR_DEFECTO, aplanarCategorias, urlDeFiltros } from "@/lib/catalogo";
import type { OpcionCategoria } from "@/lib/types";

// El menú "Categorías" del encabezado. Antes era un link a /productos con una
// flecha que no abría nada. Las categorías se piden la primera vez que se abre
// el menú (no al cargar cada página del sitio) y el resultado se conserva.
//
// Es un desplegable simple (un botón que muestra una lista de links), no un
// role="menu" de ARIA: ese rol promete navegación con las flechas del
// teclado, que acá no existe.
export function MenuCategorias({ claseLink }: { claseLink: string }) {
  const [abierto, setAbierto] = useState(false);
  const [categorias, setCategorias] = useState<OpcionCategoria[] | null>(null);
  const [fallo, setFallo] = useState(false);
  const contenedor = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!abierto || categorias !== null || fallo) return;
    let cancelado = false;
    api.categorias
      .listar()
      .then((c) => !cancelado && setCategorias(c))
      .catch(() => !cancelado && setFallo(true));
    return () => {
      cancelado = true;
    };
  }, [abierto, categorias, fallo]);

  useEffect(() => {
    if (!abierto) return;
    function alClickear(e: MouseEvent) {
      if (contenedor.current && !contenedor.current.contains(e.target as Node)) setAbierto(false);
    }
    function alTeclear(e: KeyboardEvent) {
      if (e.key === "Escape") setAbierto(false);
    }
    document.addEventListener("mousedown", alClickear);
    document.addEventListener("keydown", alTeclear);
    return () => {
      document.removeEventListener("mousedown", alClickear);
      document.removeEventListener("keydown", alTeclear);
    };
  }, [abierto]);

  const enlace =
    "block rounded-lg px-3 py-1.5 text-sm text-tierra-terracota-oscuro transition-colors hover:bg-tierra-crema focus:bg-tierra-crema focus:outline-none";

  return (
    <div className="relative" ref={contenedor}>
      <button
        type="button"
        aria-expanded={abierto}
        aria-controls="menu-categorias"
        onClick={() => setAbierto((v) => !v)}
        className={`flex items-center gap-1 ${claseLink}`}
      >
        Categorías <ChevronDown size={14} aria-hidden="true" className={`transition-transform ${abierto ? "rotate-180" : ""}`} />
      </button>

      {abierto && (
        <div
          id="menu-categorias"
          className="absolute left-0 z-30 mt-3 w-60 rounded-xl border border-tierra-crema-oscuro bg-white p-2 shadow-lg"
        >
          <Link href="/productos" onClick={() => setAbierto(false)} className={`${enlace} font-medium`}>
            Ver todo el catálogo
          </Link>

          {categorias === null && !fallo && <p className="px-3 py-1.5 text-sm text-tierra-terracota-oscuro/60">Cargando…</p>}
          {fallo && (
            <p role="alert" className="px-3 py-1.5 text-sm text-tierra-terracota-oscuro/60">
              No pudimos cargar las categorías.
            </p>
          )}

          {categorias &&
            aplanarCategorias(categorias).map(({ categoria, nivel }) => (
              <Link
                key={categoria.id}
                href={urlDeFiltros({ categoriaId: categoria.id, orden: ORDEN_POR_DEFECTO, pagina: 1 })}
                onClick={() => setAbierto(false)}
                style={{ paddingLeft: `${0.75 + nivel * 1}rem` }}
                className={enlace}
              >
                {categoria.nombre}
              </Link>
            ))}
        </div>
      )}
    </div>
  );
}
