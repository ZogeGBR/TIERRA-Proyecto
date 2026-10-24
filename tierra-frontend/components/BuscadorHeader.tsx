"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, X } from "lucide-react";
import { MAX_LARGO_BUSQUEDA, ORDEN_POR_DEFECTO, urlDeFiltros } from "@/lib/catalogo";

// La lupa del encabezado. Antes era un botón sin ninguna acción. Abre una
// barra de búsqueda debajo del encabezado y, al enviar, lleva al catálogo con
// el texto ya aplicado (/productos?q=...).
export function BuscadorHeader() {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [texto, setTexto] = useState("");
  const campo = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (abierto) campo.current?.focus();
  }, [abierto]);

  useEffect(() => {
    if (!abierto) return;
    function alTeclear(e: KeyboardEvent) {
      if (e.key === "Escape") setAbierto(false);
    }
    document.addEventListener("keydown", alTeclear);
    return () => document.removeEventListener("keydown", alTeclear);
  }, [abierto]);

  function alBuscar(e: React.FormEvent) {
    e.preventDefault();
    const q = texto.replace(/\s+/g, " ").trim();
    if (!q) return; // buscar nada no lleva a ningún lado: se queda abierta
    router.push(urlDeFiltros({ q, orden: ORDEN_POR_DEFECTO, pagina: 1 }));
    setAbierto(false);
    setTexto("");
  }

  return (
    <>
      <button
        type="button"
        aria-label={abierto ? "Cerrar búsqueda" : "Buscar"}
        aria-expanded={abierto}
        aria-controls="buscador-header"
        onClick={() => setAbierto((v) => !v)}
        className="btn-icono"
      >
        {abierto ? <X size={16} aria-hidden="true" /> : <Search size={16} aria-hidden="true" />}
      </button>

      {/* Se posiciona respecto del <header> (que es sticky, o sea posicionado),
          no del botón: ocupa todo el ancho, justo debajo de la barra. */}
      {abierto && (
        <div id="buscador-header" className="absolute left-0 right-0 top-full border-b border-tierra-crema-oscuro bg-white shadow-md">
          <form role="search" onSubmit={alBuscar} className="mx-auto flex max-w-3xl gap-2 px-6 py-3">
            <label htmlFor="buscar-header" className="sr-only">
              Buscar productos
            </label>
            <input
              id="buscar-header"
              ref={campo}
              type="search"
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              maxLength={MAX_LARGO_BUSQUEDA}
              placeholder="¿Qué estás buscando? Campera, carpa, Scott…"
              className="w-full rounded-full border border-tierra-crema-oscuro bg-white px-5 py-2.5 text-sm text-tierra-terracota-oscuro
                         placeholder:text-tierra-terracota-oscuro/40 focus:border-tierra-verde focus:outline-none focus:ring-1 focus:ring-tierra-verde"
            />
            <button type="submit" className="btn-primario">
              Buscar
            </button>
          </form>
        </div>
      )}
    </>
  );
}
