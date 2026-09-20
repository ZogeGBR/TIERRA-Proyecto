"use client";

import Link from "next/link";
import { Search, ShoppingCart, ChevronDown } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { MenuCuenta } from "@/components/MenuCuenta";

export function Header() {
  const { items } = useCart();
  const cantidadTotal = items.reduce((acc, i) => acc + i.cantidad, 0);

  const linkNav =
    "transition-colors hover:text-tierra-bordo focus:outline-none focus:ring-2 focus:ring-tierra-bordo/40 rounded";

  return (
    <header className="sticky top-0 z-20">
      <div className="bg-tierra-crema-oscuro text-xs text-tierra-bordo-oscuro px-6 py-2 flex flex-wrap justify-between gap-2">
        <span>Envíos a todo el país</span>
        <span>De lunes a lunes de 9 a 13 hs</span>
        <span>Av. Fontana 482, Esquel 9200</span>
      </div>

      <div className="bg-white/95 backdrop-blur-sm px-6 py-4 flex items-center justify-between border-b border-tierra-crema-oscuro">
        <Link href="/" className="flex items-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/brand/logo.png" alt="Tierra" className="h-8 w-auto" />
        </Link>

        <nav className="hidden md:flex gap-6 text-sm text-tierra-bordo-oscuro items-center">
          <Link href="/" className={`border-b-2 border-tierra-bordo pb-1 font-medium ${linkNav}`}>
            Inicio
          </Link>
          <Link href="/productos" className={`flex items-center gap-1 ${linkNav}`}>
            Catálogo <ChevronDown size={14} />
          </Link>
          {/* Sin dropdown funcional todavía — agrupa lo mismo que "Catálogo"
              hasta que exista una página propia de categorías. */}
          <Link href="/productos" className={`flex items-center gap-1 ${linkNav}`}>
            Categorías <ChevronDown size={14} />
          </Link>
          <a href="#" className={linkNav}>Sobre Tierra</a>
          <a href="#" className={linkNav}>Contacto</a>
        </nav>

        <div className="flex items-center gap-3 text-tierra-bordo">
          <button aria-label="Buscar" className="btn-icono">
            <Search size={16} />
          </button>
          <MenuCuenta />
          <Link href="/carrito" className="btn-icono relative" aria-label="Carrito">
            <ShoppingCart size={16} />
            {cantidadTotal > 0 && (
              <span className="absolute -top-1.5 -right-1.5 bg-tierra-naranja text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center">
                {cantidadTotal}
              </span>
            )}
          </Link>
        </div>
      </div>
    </header>
  );
}
