import { api } from "@/lib/api";
import { ProductCard } from "@/components/ProductCard";

// El endpoint actual requiere categoriaId O marcaId (ver ProductoController).
// Acá se asume que la categoría llega como id vía query param; si el frontend
// arranca antes de tener categorías cargadas, hay que exponer también
// GET /api/categorias en el backend para resolver el slug -> id.
export default async function CatalogoPage({
  searchParams
}: {
  // Desde Next 15, searchParams llega como Promise y hay que esperarlo.
  searchParams: Promise<{ categoriaId?: string; marcaId?: string }>;
}) {
  const { categoriaId, marcaId } = await searchParams;
  let productos: Awaited<ReturnType<typeof api.productos.listarPorCategoria>> = [];

  try {
    if (categoriaId) {
      productos = await api.productos.listarPorCategoria(categoriaId);
    } else if (marcaId) {
      productos = await api.productos.listarPorMarca(marcaId);
    }
  } catch {
    // Si el backend todavía no está levantado, mostramos el catálogo vacío
    // en vez de romper la página.
  }

  return (
    <div className="max-w-6xl mx-auto px-6 py-10">
      <h1 className="font-serif text-2xl md:text-3xl font-semibold text-tierra-terracota-oscuro mb-6">Catálogo</h1>

      {productos.length === 0 ? (
        <p className="text-tierra-terracota-oscuro/60">
          No hay productos para mostrar todavía. Elegí una categoría o marca desde el inicio.
        </p>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
          {productos.map((p) => (
            <ProductCard key={p.id} producto={p} />
          ))}
        </div>
      )}
    </div>
  );
}
