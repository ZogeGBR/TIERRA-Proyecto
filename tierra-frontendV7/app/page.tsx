import Link from "next/link";
import { Backpack, Snowflake } from "lucide-react";
import { CategoryCard } from "@/components/CategoryCard";
import { ProductCard } from "@/components/ProductCard";
import { api } from "@/lib/api";

// IDs fijos por ahora — mismos valores que carga
// tierra-infra/init-db/02-seed-data.sql. En producción esto se reemplaza
// por un fetch a GET /api/categorias (a implementar en el backend) para
// no tener IDs hardcodeados acá.
//
// Nota sobre "Accesorios": el boceto trae una foto para esa categoría,
// pero el catálogo todavía no tiene productos cargados como "Accesorios"
// propiamente — apunta a Mochilas, que es lo más cercano que existe hoy.
const categorias = [
  { nombre: "Bicicletas", id: "c0000000-0000-0000-0000-000000000001", imagen: "/images/categories/bicicletas.png" },
  { nombre: "Ropa", id: "c0000000-0000-0000-0000-000000000003", imagen: "/images/categories/ropa.png" },
  { nombre: "Carpas", id: "c0000000-0000-0000-0000-000000000005", imagen: "/images/categories/carpas.png" },
  { nombre: "Cascos", id: "c0000000-0000-0000-0000-000000000007", imagen: "/images/categories/cascos.png" },
  { nombre: "Accesorios", id: "c0000000-0000-0000-0000-000000000006", imagen: "/images/categories/accesorios.png" }
];

// Los 5 destacados del boceto original, en el mismo orden. Se busca cada
// uno por id dentro de su categoría (no simplemente "el primero de la
// categoría") para no depender del orden en que Postgres devuelva las filas.
const destacadosConfig = [
  { categoriaId: "c0000000-0000-0000-0000-000000000006", productoId: "d0000000-0000-0000-0000-000000000003" }, // Mochila
  { categoriaId: "c0000000-0000-0000-0000-000000000003", productoId: "d0000000-0000-0000-0000-000000000002" }, // Campera
  { categoriaId: "c0000000-0000-0000-0000-000000000005", productoId: "d0000000-0000-0000-0000-000000000004" }, // Carpa
  { categoriaId: "c0000000-0000-0000-0000-000000000007", productoId: "d0000000-0000-0000-0000-000000000007" }, // Casco
  { categoriaId: "c0000000-0000-0000-0000-000000000001", productoId: "d0000000-0000-0000-0000-000000000001" }  // Bicicleta
];

export default async function HomePage() {
  let destacados: Awaited<ReturnType<typeof api.productos.listarPorCategoria>> = [];
  try {
    const listas = await Promise.all(
      destacadosConfig.map((d) => api.productos.listarPorCategoria(d.categoriaId))
    );
    destacados = destacadosConfig
      .map((cfg, i) => listas[i].find((p) => p.id === cfg.productoId))
      .filter((p): p is NonNullable<typeof p> => Boolean(p));
  } catch {
    // Si el backend no está levantado, la home igual se muestra sin destacados.
  }

  return (
    <div>
      <section className="relative h-[420px] flex items-center overflow-hidden bg-tierra-crema-oscuro">
        {/* Foto real del boceto (recortada para dejar el título como texto,
            no como imagen — así sigue siendo accesible y editable). */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/images/brand/hero.png"
          alt=""
          className="absolute right-0 top-0 h-full w-auto max-w-[70%] object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-tierra-crema-oscuro via-tierra-crema-oscuro/70 to-transparent md:to-transparent" />

        <div className="relative max-w-6xl mx-auto px-6 w-full">
          <div className="max-w-md">
            <h1 className="text-4xl font-bold text-tierra-bordo-oscuro leading-tight">
              Equipos para tus aventuras en la montaña
            </h1>
            <p className="mt-4 text-tierra-bordo-oscuro/80">
              Todo lo que necesitás para explorar sin límites.
            </p>
            <div className="mt-6 flex gap-3">
              <Link href="/productos" className="bg-tierra-azul text-white px-5 py-3 rounded-full font-medium flex items-center gap-2">
                <Backpack size={18} />
                Ver catálogo
              </Link>
              <Link
                href="/alquiler"
                className="bg-white text-tierra-bordo-oscuro px-5 py-3 rounded-full font-medium border border-tierra-bordo-oscuro/20 flex items-center gap-2"
              >
                <Snowflake size={18} />
                Alquiler de invierno
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-tierra-crema-oscuro py-4">
        <div className="max-w-6xl mx-auto px-6">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/brand/beneficios.png" alt="Envíos a todo el país, comprá en cuotas, productos seleccionados, asesoramiento personalizado" className="w-full h-auto" />
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-6 py-12">
        <h2 className="text-2xl font-medium text-tierra-bordo-oscuro mb-6">Categorías</h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {categorias.map((cat) => (
            <CategoryCard key={cat.id} nombre={cat.nombre} categoriaId={cat.id} imagen={cat.imagen} />
          ))}
        </div>
      </section>

      {destacados.length > 0 && (
        <section className="max-w-6xl mx-auto px-6 pb-12">
          <h2 className="text-2xl font-medium text-tierra-bordo-oscuro mb-6">Productos destacados</h2>
          <div className="flex gap-5 overflow-x-auto pb-2 -mx-1 px-1">
            {destacados.map((p) => (
              <div key={p.id} className="w-48 shrink-0">
                <ProductCard producto={p} />
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="bg-tierra-crema-oscuro">
        <div className="max-w-6xl mx-auto px-6 py-12 flex flex-col md:flex-row items-center gap-8">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/brand/sello.png" alt="Sello Tierra" className="w-24 h-24 shrink-0" />
          <div className="flex-1 text-center md:text-left">
            <p className="text-xl font-medium text-tierra-bordo-oscuro">Somos Tierra</p>
            <p className="mt-1 text-tierra-bordo-oscuro/80">
              Vivimos la montaña tanto como vos. Seleccionamos los mejores productos para que cada salida
              sea una experiencia única.
            </p>
          </div>
          <a
            href="#"
            className="bg-tierra-azul text-white px-6 py-3 rounded-full font-medium whitespace-nowrap"
          >
            Conocenos
          </a>
        </div>
      </section>
    </div>
  );
}
