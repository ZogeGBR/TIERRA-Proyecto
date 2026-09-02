import Link from "next/link";
import { Backpack, Snowflake, Truck, CreditCard, Award, Headphones } from "lucide-react";
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
      <section className="relative h-[500px] flex items-center overflow-hidden bg-tierra-crema-oscuro">
        {/* Foto fija del boceto (sin el texto/botones quemados). object-position
            corrido hacia arriba para que entre la figura completa. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/images/brand/hero.jpg"
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
          style={{ objectPosition: "60% 35%" }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-tierra-crema-oscuro via-tierra-crema-oscuro/60 to-transparent" />

        <div className="relative max-w-6xl mx-auto px-6 w-full">
          <div className="max-w-md">
            <h1 className="font-serif text-4xl md:text-5xl font-semibold text-tierra-bordo-oscuro leading-tight">
              Equipos para tus aventuras en la montaña
            </h1>
            <p className="mt-4 text-tierra-bordo-oscuro/80">
              Todo lo que necesitás para explorar sin límites.
            </p>
            <div className="mt-6 flex gap-3">
              <Link href="/productos" className="btn-primario">
                <Backpack size={18} />
                Ver catálogo
              </Link>
              <Link href="/alquiler" className="btn-secundario">
                <Snowflake size={18} />
                Alquiler de invierno
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-tierra-crema-oscuro py-6">
        <div className="max-w-6xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-6">
          {[
            { Icono: Truck, texto: "Envíos\na todo el país" },
            { Icono: CreditCard, texto: "Comprá en\ncuotas" },
            { Icono: Award, texto: "Productos\nseleccionados" },
            { Icono: Headphones, texto: "Asesoramiento\npersonalizado" }
          ].map(({ Icono, texto }) => (
            <div key={texto} className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-tierra-bordo text-white flex items-center justify-center shrink-0">
                <Icono size={20} />
              </div>
              <p className="text-sm text-tierra-bordo-oscuro whitespace-pre-line leading-tight">{texto}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-6 py-12">
        <h2 className="font-serif text-2xl md:text-3xl font-semibold text-tierra-bordo-oscuro mb-6">Categorías</h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {categorias.map((cat) => (
            <CategoryCard key={cat.id} nombre={cat.nombre} categoriaId={cat.id} imagen={cat.imagen} />
          ))}
        </div>
      </section>

      {destacados.length > 0 && (
        <section className="max-w-6xl mx-auto px-6 pb-12">
          <h2 className="font-serif text-2xl md:text-3xl font-semibold text-tierra-bordo-oscuro mb-6">Productos destacados</h2>
          <div className="flex gap-5 overflow-x-auto pb-2 -mx-1 px-1">
            {destacados.map((p) => (
              <div key={p.id} className="w-48 shrink-0">
                <ProductCard producto={p} />
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="bg-tierra-crema-oscuro relative overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/images/brand/cordillera.png"
          alt=""
          className="hidden md:block absolute right-0 bottom-0 w-1/2 h-full object-cover object-bottom opacity-70"
        />
        <div className="relative max-w-6xl mx-auto px-6 py-12 flex flex-col md:flex-row items-center gap-8">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/brand/sello.png" alt="Sello Tierra" className="w-24 h-24 shrink-0" />
          <div className="flex-1 text-center md:text-left">
            <p className="font-serif text-2xl font-semibold uppercase text-tierra-bordo-oscuro">Somos Tierra</p>
            <p className="mt-1 text-tierra-bordo-oscuro/80">
              Vivimos la montaña tanto como vos. Seleccionamos los mejores productos para que cada salida
              sea una experiencia única.
            </p>
          </div>
          <a href="#" className="btn-primario whitespace-nowrap">
            Conocenos
          </a>
        </div>
      </section>
    </div>
  );
}
