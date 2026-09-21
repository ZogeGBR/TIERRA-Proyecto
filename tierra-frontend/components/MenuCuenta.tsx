"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { User, LogOut } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";

// Reemplaza al botón de usuario que antes no hacía nada.
//
// Sin sesión es un enlace a /login que se acuerda de dónde estaba la persona,
// para devolverla ahí después de entrar. Con sesión, un menú con su nombre y
// la opción de salir.
export function MenuCuenta() {
  const { usuario, cargando, cerrarSesion } = useAuth();
  const { vaciarCarrito } = useCart();
  const router = useRouter();
  const pathname = usePathname();

  const [abierto, setAbierto] = useState(false);
  const contenedor = useRef<HTMLDivElement>(null);

  // Cerrar al hacer clic afuera o con Escape. Un menú que sólo se cierra
  // volviendo a apretar el botón es de las cosas que más molestan en móvil.
  useEffect(() => {
    if (!abierto) return;

    function alClickear(e: MouseEvent) {
      if (contenedor.current && !contenedor.current.contains(e.target as Node)) {
        setAbierto(false);
      }
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

  async function salir() {
    setAbierto(false);
    await cerrarSesion();

    // El carrito vive en localStorage por navegador, no por usuario: sin esto,
    // la próxima persona que use esta computadora vería los productos de la
    // anterior. Sincronizarlo con el backend es trabajo de la fase 2.
    vaciarCarrito();

    router.push("/");
  }

  // Mientras se resuelve la sesión inicial no se sabe si hay alguien. Mostrar
  // "iniciar sesión" en ese momento haría parpadear el encabezado para quien
  // sí está logueado, así que se deja el botón inerte por un instante.
  if (cargando) {
    return (
      <span className="btn-icono opacity-50" aria-hidden="true">
        <User size={16} />
      </span>
    );
  }

  if (!usuario) {
    return (
      <Link
        href={`/login?redirect=${encodeURIComponent(pathname)}`}
        className="btn-icono"
        aria-label="Iniciar sesión"
      >
        <User size={16} />
      </Link>
    );
  }

  const primerNombre = usuario.nombre.split(" ")[0];

  return (
    <div className="relative" ref={contenedor}>
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        className="btn-icono"
        aria-label={`Cuenta de ${usuario.nombre}`}
        aria-expanded={abierto}
        aria-haspopup="menu"
      >
        <User size={16} />
      </button>

      {abierto && (
        <div
          role="menu"
          className="absolute right-0 mt-2 w-56 bg-white rounded-xl border border-tierra-crema-oscuro
                     shadow-lg py-2 text-sm text-tierra-bordo-oscuro z-30"
        >
          <div className="px-4 py-2 border-b border-tierra-crema-oscuro">
            <p className="font-medium">Hola, {primerNombre}</p>
            <p className="text-xs text-tierra-bordo-oscuro/60 truncate">{usuario.email}</p>
          </div>

          <button
            type="button"
            role="menuitem"
            onClick={salir}
            className="w-full text-left px-4 py-2 flex items-center gap-2
                       transition-colors hover:bg-tierra-crema
                       focus:outline-none focus:bg-tierra-crema"
          >
            <LogOut size={14} />
            Cerrar sesión
          </button>
        </div>
      )}
    </div>
  );
}
