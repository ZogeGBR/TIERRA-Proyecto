"use client";

import Link from "next/link";
import { Search, User, ShoppingCart, ChevronDown } from "lucide-react";
import { useCart } from "@/context/CartContext";

export function Header() {
  const { items } = useCart();
  const cantidadTotal = items.reduce((acc, i) => acc + i.cantidad, 0);

  return (
    <header>
      <div className="bg-tierra-crema-oscuro text-xs text-tierra-bordo-oscuro px-6 py-2 flex flex-wrap justify-between gap-2">
        <span>Envíos a todo el país</span>
        <span>De lunes a lunes de 9 a 13 hs</span>
        {/* La dirección real del local se completa cuando esté confirmada. */}
        <span>Av. Fontana 482, Esquel 9200</span>
      </div>

      <div className="bg-white px-6 py-4 flex items-center justify-between border-b border-tierra-crema-oscuro">
        <Link href="/" className="flex items-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/brand/logo.png" alt="Tierra" className="h-8 w-auto" />
        </Link>

        <nav className="hidden md:flex gap-6 text-sm text-tierra-bordo-oscuro items-center">
          <Link href="/" className="border-b-2 border-tierra-bordo pb-1">
            Inicio
          </Link>
          <Link href="/productos" className="flex items-center gap-1">
            Catálogo <ChevronDown size={14} />
          </Link>
          {/* Sin dropdown funcional todavía — agrupa lo mismo que "Catálogo"
              hasta que exista una página propia de categorías. */}
          <Link href="/productos" className="flex items-center gap-1">
            Categorías <ChevronDown size={14} />
          </Link>
          <a href="#">Sobre Tierra</a>
          <a href="#">Contacto</a>
        </nav>

        <div className="flex items-center gap-5 text-tierra-bordo">
          <button aria-label="Buscar" className="hover:opacity-70">
            <Search size={20} />
          </button>
          <button aria-label="Mi cuenta" className="hover:opacity-70">
            <User size={20} />
          </button>
          <Link href="/carrito" className="relative hover:opacity-70" aria-label="Carrito">
            <ShoppingCart size={20} />
            {cantidadTotal > 0 && (
              <span className="absolute -top-2 -right-2 bg-tierra-naranja text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center">
                {cantidadTotal}
              </span>
            )}
          </Link>
        </div>
      </div>
    </header>
  );
}
