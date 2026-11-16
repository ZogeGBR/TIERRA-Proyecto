import type { Metadata } from "next";
import Link from "next/link";
import { Compass } from "lucide-react";

export const metadata: Metadata = {
  title: "Página no encontrada — Tierra",
  robots: { index: false }
};

// Pantalla para una dirección que no existe, y para lo que una página
// resuelve con notFound() (por ejemplo, un producto que no está).
export default function NoEncontrada() {
  return (
    <div className="max-w-xl mx-auto px-6 py-20 text-center">
      <div className="w-20 h-20 mx-auto rounded-full bg-tierra-verde/10 text-tierra-verde flex items-center justify-center">
        <Compass size={36} />
      </div>
      <h1 className="mt-6 font-serif text-3xl font-semibold text-tierra-terracota-oscuro">
        No encontramos lo que buscabas
      </h1>
      <p className="mt-3 text-tierra-terracota-oscuro/80">
        La página no existe o el producto ya no está disponible.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link href="/productos" className="btn-primario">
          Ver el catálogo
        </Link>
        <Link href="/" className="btn-secundario">
          Volver al inicio
        </Link>
      </div>
    </div>
  );
}
