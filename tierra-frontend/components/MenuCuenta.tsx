"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { User, LogOut, Package } from "lucide-react";
import { useAuth, esCliente } from "@/context/AuthContext";

// Reemplaza al botón de usuario que antes no hacía nada.
//
// Sin sesión es un enlace a /login (ingreso por código) que se acuerda de
// dónde estaba la persona, para devolverla ahí después de entrar. Con sesión,
// un menú con su nombre, "Mis pedidos" (clientes) y la opción de salir.
export function MenuCuenta() {
  const { usuario, cargando, cerrarSesion } = useAuth();
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

    // El carrito NO se vacía al salir: como comprar no exige cuenta, el
    // carrito es del navegador (tarea 17), no de la sesión. Vaciarlo acá le
    // borraría la compra a quien solo quería cerrar sesión.
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
    // Desde las propias pantallas de acceso no se manda `redirect`: volvería
    // a la misma pantalla.
    const enAcceso = pathname.startsWith("/login") || pathname.startsWith("/equipo");
    return (
      <Link
        href={enAcceso ? "/login" : `/login?redirect=${encodeURIComponent(pathname)}`}
        className="btn-icono"
        aria-label="Ver mis pedidos (ingresar con un código)"
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
                     shadow-lg py-2 text-sm text-tierra-terracota-oscuro z-30"
        >
          <div className="px-4 py-2 border-b border-tierra-crema-oscuro">
            <p className="font-medium">Hola, {primerNombre}</p>
            <p className="text-xs text-tierra-terracota-oscuro/60 truncate">{usuario.email}</p>
          </div>

          {esCliente(usuario) && (
            <Link
              href="/cuenta/pedidos"
              role="menuitem"
              onClick={() => setAbierto(false)}
              className="w-full text-left px-4 py-2 flex items-center gap-2
                         transition-colors hover:bg-tierra-crema
                         focus:outline-none focus:bg-tierra-crema"
            >
              <Package size={14} />
              Mis pedidos
            </Link>
          )}

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
