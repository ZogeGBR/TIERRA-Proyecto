import Link from "next/link";
import type { ProductoResumen } from "@/lib/types";

export function ProductCard({ producto }: { producto: ProductoResumen }) {
  return (
    <Link
      href={`/productos/${producto.id}`}
      className="block border border-tierra-crema-oscuro rounded-lg overflow-hidden hover:shadow-md transition-shadow bg-white focus:outline-none focus:ring-2 focus:ring-tierra-azul focus:ring-offset-2"
    >
      <div className="aspect-square bg-tierra-crema-oscuro">
        {producto.imagenPrincipal && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={producto.imagenPrincipal} alt={producto.nombre} className="w-full h-full object-cover" />
        )}
      </div>
      <div className="p-3">
        <p className="font-medium text-tierra-bordo-oscuro">{producto.nombre}</p>
        <p className="text-xs text-tierra-bordo-oscuro/60">{producto.marca}</p>
        <p className="mt-1 font-bold">${producto.precio.toLocaleString("es-AR")}</p>
      </div>
    </Link>
  );
}
