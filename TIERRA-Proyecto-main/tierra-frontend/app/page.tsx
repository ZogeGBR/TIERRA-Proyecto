import Link from "next/link";
import { Backpack, Snowflake, Truck, CreditCard, Award, Headphones } from "lucide-react";
import { CategoryCard } from "@/components/CategoryCard";
import { ProductCard } from "@/components/ProductCard";
import { HeroCarrusel } from "@/components/HeroCarrusel";
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

// Rotan por las tarjetas de categoría para que no sea el mismo tono
// repetido cinco veces — variedad, no aleatoriedad (siempre el mismo
// color para la misma posición, para que sea predecible entre recargas).
const COLORES_ACENTO = ["terracota", "verde", "ambar", "terracota", "verde"] as const;

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
      <section className="relative h-[560px] flex items-center overflow-hidden bg-tierra-crema-oscuro">
        {/* Carrusel de fotos reales del equipo en uso. Ver components/HeroCarrusel.tsx.
            La tarjeta de texto es semitransparente y SIN backdrop-blur: el blur
            combinado con el header sticky (que también usa blur) generaba un
            efecto de "se queda pegada" al scrollear rápido — era un problema de
            rendimiento del navegador, no de posicionamiento (no hay sticky/fixed
            acá). Sacar el blur resuelve las dos cosas a la vez: menos opaca y
            sin el glitch visual. */}
        <HeroCarrusel />

        <div className="relative z-20 max-w-6xl mx-auto px-6 w-full">
          <div className="max-w-md bg-white/55 rounded-3xl p-8 shadow-lg">
            <h1 className="font-serif text-4xl md:text-5xl font-semibold text-tierra-terracota-oscuro leading-tight drop-shadow-sm">
              Equipos para tus aventuras en la montaña
            </h1>
            <p className="mt-4 text-tierra-terracota-oscuro/90 drop-shadow-sm">
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

      <section className="border-b border-tierra-crema-oscuro py-6 bg-gradient-to-r from-tierra-crema via-white to-tierra-crema">
        <div className="max-w-6xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-6">
          {[
            { Icono: Truck, texto: "Envíos\na todo el país", color: "bg-tierra-terracota" },
            { Icono: CreditCard, texto: "Comprá en\ncuotas", color: "bg-tierra-verde" },
            { Icono: Award, texto: "Productos\nseleccionados", color: "bg-tierra-ambar" },
            { Icono: Headphones, texto: "Asesoramiento\npersonalizado", color: "bg-tierra-terracota-oscuro" }
          ].map(({ Icono, texto, color }) => (
            <div key={texto} className="flex items-center gap-3">
              <div className={`w-12 h-12 rounded-full ${color} text-white flex items-center justify-center shrink-0 shadow-sm`}>
                <Icono size={20} />
              </div>
              <p className="text-sm text-tierra-terracota-oscuro whitespace-pre-line leading-tight">{texto}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Fondo "papel rasgado": CSS provisto por el usuario (ver globals.css,
          sección "FONDO PAPEL RASGADO"), tal cual salvo las reglas de
          tarjetas — esas las siguen manejando CategoryCard/ProductCard,
          sin cambios acá. */}
      <div className="catalogo">
        <div className="craquelado craquelado-top" />
        <div className="craquelado craquelado-bottom" />

        <section className="papel-central">
          <div className="contenido-catalogo">
            <section className="seccion">
              <h2 className="font-serif text-2xl md:text-3xl font-semibold text-tierra-terracota-oscuro mb-6">Categorías</h2>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {categorias.map((cat, i) => (
                  <CategoryCard
                    key={cat.id}
                    nombre={cat.nombre}
                    categoriaId={cat.id}
                    imagen={cat.imagen}
                    colorAcento={COLORES_ACENTO[i % COLORES_ACENTO.length]}
                  />
                ))}
              </div>
            </section>

            {destacados.length > 0 && (
              <section className="seccion">
                <h2 className="font-serif text-2xl md:text-3xl font-semibold text-tierra-terracota-oscuro mb-6">Productos destacados</h2>
                <div className="flex gap-5 overflow-x-auto pb-2 -mx-1 px-1">
                  {destacados.map((p) => (
                    <div key={p.id} className="w-48 shrink-0">
                      <ProductCard producto={p} />
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>
        </section>
      </div>

      <section className="relative overflow-hidden bg-gradient-to-br from-tierra-ambar/20 via-tierra-crema-oscuro to-tierra-verde/15">
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
            <p className="font-serif text-2xl font-semibold uppercase text-tierra-terracota-oscuro">Somos Tierra</p>
            <p className="mt-1 text-tierra-terracota-oscuro/80">
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
