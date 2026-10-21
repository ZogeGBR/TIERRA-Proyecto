"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ShoppingCart, ChevronDown, Menu, X } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { MenuCuenta } from "@/components/MenuCuenta";
import { BuscadorHeader } from "@/components/BuscadorHeader";
import { MenuCategorias } from "@/components/MenuCategorias";

export function Header() {
  const { items } = useCart();
  const [menuMovil, setMenuMovil] = useState(false);
  // Al bajar, el aviso de arriba se pliega y la barra se vuelve de vidrio y más
  // compacta (como la navegación de F97). Solo cambia al cruzar un umbral.
  const [compacto, setCompacto] = useState(false);
  const ruta = usePathname() ?? "/";
  // El aviso de arriba se esconde SIN cambiar la altura del encabezado (si
  // cambiara, el contenido de la página daría un salto al bajar): el header queda
  // "pegado" con un top negativo igual al alto del aviso y el aviso se va con el scroll.
  const cabecera = useRef<HTMLElement>(null);
  const aviso = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = cabecera.current, a = aviso.current;
    if (!h || !a) return;
    const medir = () => { h.style.top = `${-a.offsetHeight}px`; };
    medir();
    const obs = typeof ResizeObserver !== "undefined" ? new ResizeObserver(medir) : null;
    obs?.observe(a);
    return () => obs?.disconnect();
  }, []);
  useEffect(() => {
    const revisar = () => setCompacto(window.scrollY > 24);
    revisar();
    window.addEventListener("scroll", revisar, { passive: true });
    return () => window.removeEventListener("scroll", revisar);
  }, []);
  const activo = (href: string) => (href === "/" ? ruta === "/" : ruta === href || ruta.startsWith(href + "/"));
  const cantidadTotal = items.reduce((acc, i) => acc + i.cantidad, 0);

  const linkNav =
    "enlace-nav transition-colors hover:text-tierra-terracota focus:outline-none focus:ring-2 focus:ring-tierra-terracota/40 rounded";

  return (
    <header ref={cabecera} className="sticky top-0 z-30" data-compacto={compacto ? "si" : "no"}>
      <div ref={aviso} className="header-aviso bg-tierra-crema-oscuro text-xs text-tierra-terracota-oscuro"><div className="px-6 py-2 flex flex-wrap justify-between gap-2">
        <span>Envíos a Neuquén, Río Negro, Chubut y Santa Cruz</span>
        <span>De lunes a lunes de 9 a 13 hs</span>
        <span>Av. Fontana 482, Esquel 9200</span>
      </div></div>

      <div className="header-barra bg-white/95 backdrop-blur-sm px-6 flex items-center justify-between border-b border-tierra-crema-oscuro">
        <button
          type="button"
          className="md:hidden mr-3 w-10 h-10 rounded-full flex items-center justify-center text-tierra-terracota focus:outline-none focus:ring-2 focus:ring-tierra-terracota/40"
          aria-label={menuMovil ? "Cerrar menú" : "Abrir menú"}
          aria-expanded={menuMovil}
          aria-controls="menu-movil"
          onClick={() => setMenuMovil((v) => !v)}
        >
          {menuMovil ? <X size={20} aria-hidden="true" /> : <Menu size={20} aria-hidden="true" />}
        </button>
        <Link href="/" className="header-logo flex items-center mr-auto md:mr-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/brand/logo.png" alt="Tierra" className="h-8 w-auto" />
        </Link>

        <nav className="hidden md:flex gap-6 text-sm text-tierra-terracota-oscuro items-center">
          <Link href="/" aria-current={activo("/") ? "page" : undefined} className={`${activo("/") ? "enlace-activo font-medium" : ""} ${linkNav}`}>
            Inicio
          </Link>
          <Link href="/productos" aria-current={activo("/productos") ? "page" : undefined} className={`flex items-center gap-1 ${activo("/productos") ? "enlace-activo font-medium" : ""} ${linkNav}`}>
            Catálogo <ChevronDown size={14} />
          </Link>
          <MenuCategorias claseLink={linkNav} />
          <Link href="/sobre-tierra" aria-current={activo("/sobre-tierra") ? "page" : undefined} className={`${activo("/sobre-tierra") ? "enlace-activo font-medium" : ""} ${linkNav}`}>Sobre Tierra</Link>
          <a href="#contacto" className={linkNav}>Contacto</a>
        </nav>

        <div className="flex items-center gap-3 text-tierra-terracota">
          <BuscadorHeader />
          <MenuCuenta />
          <Link
            href="/carrito"
            className="relative w-10 h-10 rounded-full bg-tierra-terracota text-white flex items-center justify-center
                       transition-colors hover:bg-tierra-terracota-oscuro focus:outline-none focus:ring-2 focus:ring-tierra-verde"
            aria-label="Carrito"
          >
            <ShoppingCart size={17} />
            {cantidadTotal > 0 && (
              <span key={cantidadTotal} className="anim-saltito absolute -top-1 -right-1 bg-tierra-ambar text-white text-[10px] font-medium rounded-full min-w-[18px] h-[18px] px-1 flex items-center justify-center border-2 border-white">
                {cantidadTotal}
              </span>
            )}
          </Link>
        </div>
      </div>

      {menuMovil && (
        <nav id="menu-movil" aria-label="Menú principal" className="anim-sube md:hidden bg-white border-b border-tierra-crema-oscuro px-6 py-3 flex flex-col text-sm text-tierra-terracota-oscuro">
          {[
            ["/", "Inicio"],
            ["/productos", "Catálogo"],
            ["/alquiler", "Alquiler"],
            ["/sobre-tierra", "Sobre Tierra"],
            ["/cuenta/pedidos", "Mis pedidos"],
            ["#contacto", "Contacto"],
          ].map(([href, texto]) => (
            <Link key={href} href={href} onClick={() => setMenuMovil(false)} className="py-3 border-b border-tierra-crema-oscuro last:border-0">
              {texto}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}
