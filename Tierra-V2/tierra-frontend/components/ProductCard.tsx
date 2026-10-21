import { Inclinar } from "@/components/Inclinar";
import { rutaDeProducto } from "@/lib/rutas";
import Link from "next/link";
import { Mountain, ShoppingCart } from "lucide-react";
import type { ProductoResumen } from "@/lib/types";

// El botón de carrito de acá NO agrega directo al carrito: el listado de
// catálogo (ProductoResumen) no trae el id de variante (talla/color), así
// que hace falta pasar por el detalle para elegir una antes de agregar.
// Lleva al mismo lugar que tocar la tarjeta, pero como ícono de carrito es
// mucho más reconocible como "comprar" que solo la tarjeta entera siendo
// clickeable. Agregar de verdad sin pasar por el detalle necesitaría que
// el backend exponga una variante por defecto, que quedó fuera de esta tarea.
export function ProductCard({ producto }: { producto: ProductoResumen }) {
  return (
    <Inclinar className="group relative h-full">
      <Link
        href={rutaDeProducto(producto)}
        className="flex h-full flex-col rounded-xl overflow-hidden bg-white shadow-sm transition-all duration-200 hover:shadow-xl hover:-translate-y-1 focus:outline-none focus:ring-2 focus:ring-tierra-verde focus:ring-offset-2"
      >
        <div className="aspect-square shrink-0 bg-tierra-crema-oscuro overflow-hidden">
          {producto.imagenPrincipal ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={producto.imagenPrincipal}
              alt={producto.nombre}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
            />
          ) : (
            // Sin foto (el plan reconoce que las del cliente van a llegar
            // tarde): un marcador, no un cuadrado en blanco que parece roto.
            <div className="flex h-full w-full items-center justify-center text-tierra-terracota/25">
              <Mountain size={56} aria-hidden="true" />
            </div>
          )}
        </div>
        <div className="flex flex-1 flex-col p-3.5">
          <p className="truncate text-[11px] uppercase tracking-wide text-tierra-terracota font-medium">{producto.marca}</p>
          <p className="mt-0.5 line-clamp-2 min-h-[2.75rem] font-medium text-tierra-terracota-oscuro leading-snug" title={producto.nombre}>{producto.nombre}</p>
          <p className="mt-auto pt-1.5 text-lg font-bold text-tierra-terracota-oscuro">
            ${producto.precio.toLocaleString("es-AR")}
          </p>
        </div>
      </Link>

      <Link
        href={rutaDeProducto(producto)}
        aria-label={`Ver y comprar ${producto.nombre}`}
        className="absolute top-3 right-3 w-9 h-9 rounded-full bg-white shadow-md flex items-center justify-center
                   text-tierra-terracota-oscuro opacity-0 translate-y-1 transition-all duration-200
                   group-hover:opacity-100 group-hover:translate-y-0
                   hover:bg-tierra-terracota hover:text-white
                   focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-tierra-verde"
      >
        <ShoppingCart size={16} />
      </Link>
    </Inclinar>
  );
}
