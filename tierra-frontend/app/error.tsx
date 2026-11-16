"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";

// Pantalla de error para cualquier página que falle al cargarse.
//
// Antes, un error del backend (apagado, 500) mostraba la pantalla de error
// por defecto de Next, sin nada de Tierra ni forma de volver. Va dentro del
// layout, así que el encabezado y el pie siguen en pantalla.
//
// Next oculta el mensaje real de los errores del servidor en producción (por
// seguridad: puede traer datos internos); acá solo se llega con un texto
// genérico y un identificador (`digest`) para buscar en el log del servidor.
export default function ErrorDePagina({
  error,
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="max-w-xl mx-auto px-6 py-20 text-center">
      <div className="w-20 h-20 mx-auto rounded-full bg-tierra-terracota/10 text-tierra-terracota flex items-center justify-center">
        <AlertTriangle size={36} />
      </div>
      <h1 className="mt-6 font-serif text-3xl font-semibold text-tierra-terracota-oscuro">Algo salió mal</h1>
      <p className="mt-3 text-tierra-terracota-oscuro/80">
        No pudimos cargar esta página. Puede ser algo pasajero: probá de nuevo en un momento.
      </p>
      {error.digest && (
        <p className="mt-2 text-xs text-tierra-terracota-oscuro/50">Código de referencia: {error.digest}</p>
      )}
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <button onClick={reset} className="btn-primario">
          Intentar de nuevo
        </button>
        <Link href="/" className="btn-secundario">
          Volver al inicio
        </Link>
      </div>
    </div>
  );
}
