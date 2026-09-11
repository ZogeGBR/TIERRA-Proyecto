import { api } from "@/lib/api";
import { AgregarAlCarrito } from "./AgregarAlCarrito";

export default async function ProductoDetallePage({ params }: { params: { id: string } }) {
  const producto = await api.productos.detalle(params.id);

  return (
    <div className="max-w-6xl mx-auto px-6 py-10 grid md:grid-cols-2 gap-10">
      <div className="aspect-square bg-tierra-crema-oscuro rounded-lg overflow-hidden">
        {producto.imagenes[0] && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={producto.imagenes[0]} alt={producto.nombre} className="w-full h-full object-cover" />
        )}
      </div>

      <div>
        <p className="text-sm text-tierra-bordo-oscuro/60">{producto.marca}</p>
        <h1 className="font-serif text-3xl font-semibold text-tierra-bordo-oscuro">{producto.nombre}</h1>
        <p className="mt-2 text-2xl font-bold">${producto.precio.toLocaleString("es-AR")}</p>
        <p className="mt-4 text-tierra-bordo-oscuro/80">{producto.descripcion}</p>

        <AgregarAlCarrito producto={producto} />
      </div>
    </div>
  );
}
