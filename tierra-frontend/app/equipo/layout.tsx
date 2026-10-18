import type { Metadata } from "next";
import type { ReactNode } from "react";

// La página es un Client Component y no puede exportar metadata: por eso este
// layout, que sólo agrega el título y el noindex.
//
// noindex no es una medida de seguridad (la protección es la contraseña y el
// bloqueo por intentos): evita que la página aparezca en los buscadores y que
// un cliente llegue a ella por error. Tampoco se enlaza desde el sitio.
export const metadata: Metadata = {
  title: "Acceso del equipo — Tierra",
  robots: { index: false, follow: false }
};

export default function EquipoLayout({ children }: { children: ReactNode }) {
  return children;
}
