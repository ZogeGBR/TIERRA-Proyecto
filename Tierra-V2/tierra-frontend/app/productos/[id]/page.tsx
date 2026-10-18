import { notFound } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import type { ProductoDetalle } from "@/lib/types";
import { AgregarAlCarrito } from "./AgregarAlCarrito";

const FORMATO_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Devuelve el producto, o null si no existe. Cualquier OTRA falla (backend
// caído, 500) se deja subir: la atrapa app/error.tsx, que es lo correcto —
// decirle "no encontrado" a alguien cuando en realidad el servidor está caído
// sería mentirle.
async function cargarProducto(id: string): Promise<ProductoDetalle | null> {
  // El backend no distingue un id mal formado ("/productos/abc") de un error
  // interno: responde 500. Se valida acá para que ese caso sea un 404 limpio
  // en vez de una pantalla de error. Cuando las URLs pasen a usar slug (H-E)
  // esta línea se va, porque el parámetro ya no será un UUID.
  if (!FORMATO_UUID.test(id)) return null;

  try {
    return await api.productos.detalle(id);
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) return null;
    throw e;
  }
}

export default async function ProductoDetallePage({ params }: { params: { id: string } }) {
  const producto = await cargarProducto(params.id);
  if (!producto) notFound();

  return (
    <div className="grilla-anim max-w-6xl mx-auto px-6 py-10 grid md:grid-cols-2 gap-10">
      <div className="aspect-square bg-tierra-crema-oscuro rounded-lg overflow-hidden">
        {producto.imagenes[0] && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={producto.imagenes[0]} alt={producto.nombre} className="w-full h-full object-cover" />
        )}
      </div>

      <div>
        <p className="text-sm text-tierra-terracota-oscuro/60">{producto.marca}</p>
        <h1 className="font-serif text-3xl font-semibold text-tierra-terracota-oscuro">{producto.nombre}</h1>
        <p className="mt-2 text-2xl font-bold">${producto.precio.toLocaleString("es-AR")}</p>
        <p className="mt-4 text-tierra-terracota-oscuro/80">{producto.descripcion}</p>

        <AgregarAlCarrito producto={producto} />
      </div>
    </div>
  );
}
