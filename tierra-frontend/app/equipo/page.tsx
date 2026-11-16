import type { Metadata } from "next";
import { Suspense } from "react";
import { FormularioEquipo } from "./FormularioEquipo";

// Entrada del EQUIPO de Tierra (con contraseña). No se enlaza desde ninguna
// parte del sitio público y le pide a los buscadores que no la listen.
export const metadata: Metadata = {
  title: "Acceso del equipo — Tierra",
  robots: { index: false, follow: false }
};

export default function EquipoPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-tierra-terracota-oscuro" />}>
      <FormularioEquipo />
    </Suspense>
  );
}
