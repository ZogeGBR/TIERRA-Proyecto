import { TituloPalabras } from "@/components/TituloPalabras";
import Link from "next/link";
import { Backpack, Snowflake, Truck, CreditCard, Award, Headphones } from "lucide-react";
import { CategoryCard } from "@/components/CategoryCard";
import { CarruselProductos } from "@/components/CarruselProductos";
import { HeroCarrusel } from "@/components/HeroCarrusel";
import { api } from "@/lib/api";
import type { OpcionCategoria } from "@/lib/types";
import { Revelar } from "@/components/Revelar";
import { FondoOndas } from "@/components/FondoOndas";
import { TarjetaFija } from "@/components/TarjetaFija";

// Las tarjetas de categorías salen de GET /api/categorias: solo las de primer
// nivel (las subcategorías, como "Ropa deportiva", aparecen en el filtro del
// catálogo). La imagen se elige por slug porque cada foto trae el nombre de
// la categoría escrito adentro; una categoría sin foto propia se dibuja con
// su nombre en texto (ver CategoryCard).
//
// accesorios.png queda sin usar hasta que exista una categoría con ese slug.
const IMAGEN_POR_SLUG: Record<string, string> = {
  bicicletas: "/images/categories/bicicletas.png",
  ropa: "/images/categories/ropa.png",
  carpas: "/images/categories/carpas.png",
  cascos: "/images/categories/cascos.png",
  accesorios: "/images/categories/accesorios.png"
};

async function categoriasDePrimerNivel(): Promise<OpcionCategoria[]> {
  try {
    return (await api.categorias.listar()).filter((c) => !c.categoriaPadreId);
  } catch {
    // Si el backend no responde, la home se muestra igual, sin esta sección.
    return [];
  }
}

// Rotan por las tarjetas de categoría para que no sea el mismo tono
// repetido cinco veces — variedad, no aleatoriedad (siempre el mismo
// color para la misma posición, para que sea predecible entre recargas).
const COLORES_ACENTO = ["terracota", "verde", "ambar", "terracota", "verde"] as const;

export default async function HomePage() {
  // Ranking "más vendidos". api.productos.ranking nunca lanza: si no está
  // disponible o no llega al mínimo de productos, la sección no se muestra.
  const [vendidos, categorias] = await Promise.all([api.productos.ranking("vendidos"), categoriasDePrimerNivel()]);

  return (
    <div>
      {/* Hero + franja de beneficios. La tarjeta (TarjetaFija) queda estática en
          su lugar mientras las fotos pasan por detrás, y se desvanece sin
          moverse cuando el hero termina de pasar. */}
      <div className="relative">
      <section data-hero className="relative h-[640px] overflow-hidden bg-tierra-crema-oscuro">
        {/* Carrusel de fotos reales del equipo en uso. Ver components/HeroCarrusel.tsx.
            La tarjeta es semitransparente y SIN backdrop-blur: el blur combinado
            con el header sticky (que también usa blur) generaba un glitch al
            scrollear rápido (problema de rendimiento del navegador). */}
        <HeroCarrusel />
      </section>

      <TarjetaFija>
            <TituloPalabras
              como="h1"
              texto="Equipos para tus aventuras en la montaña"
              destacar="aventuras"
              className="font-serif text-4xl md:text-5xl font-semibold text-tierra-terracota-oscuro leading-tight drop-shadow-sm"
            />
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
      </TarjetaFija>

      <section className="border-b border-tierra-crema-oscuro py-6 bg-gradient-to-r from-tierra-crema via-white to-tierra-crema">
        <div className="max-w-6xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-6">
          {[
            { Icono: Truck, texto: "Envíos a\n4 provincias patagónicas", color: "bg-tierra-terracota" },
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
      </div>

      {/* Fondo "papel rasgado": CSS provisto por el usuario (ver globals.css,
          sección "FONDO PAPEL RASGADO"), tal cual salvo las reglas de
          tarjetas — esas las siguen manejando CategoryCard/ProductCard,
          sin cambios acá. */}
      <div className="catalogo">
        <FondoOndas />

        <div className="papel-marco">
        <div className="papel-sombra" aria-hidden="true"><i /></div>
        <section className="papel-central">
          <div className="contenido-catalogo">
            {categorias.length > 0 && (
            <section className="seccion">
              <TituloPalabras como="h2" modo="scroll" texto="Categorías" className="font-serif text-2xl md:text-3xl font-semibold text-tierra-terracota-oscuro mb-6" />
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {categorias.map((cat, i) => (
                  <Revelar key={cat.id} retraso={i * 70}>
                  <CategoryCard
                    nombre={cat.nombre}
                    categoriaId={cat.id}
                    imagen={IMAGEN_POR_SLUG[cat.slug]}
                    colorAcento={COLORES_ACENTO[i % COLORES_ACENTO.length]}
                  />
                  </Revelar>
                ))}
              </div>
            </section>
            )}

            <CarruselProductos listas={{ vendidos }} />
          </div>
        </section>
        </div>
      </div>

      {/* Banda "Somos Tierra": fondo quieto y el dibujo de la cordillera de siempre. */}
      <section data-banda-cordillera className="relative overflow-hidden bg-gradient-to-br from-tierra-ambar/25 via-tierra-crema-oscuro to-tierra-verde/15">
        <div className="cordillera-banda" aria-hidden="true" />
        {/* Velo suave detrás del texto para que se lea sobre el dibujo */}
        <div className="pointer-events-none absolute inset-0 velo-lectura" aria-hidden="true" />
        <div className="relative max-w-6xl mx-auto px-6 py-12 flex flex-col md:flex-row items-center gap-8">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/brand/sello.png" alt="Sello Tierra" className="w-24 h-24 shrink-0 drop-shadow-md" />
          <div className="flex-1 text-center md:text-left">
            <p className="font-serif text-2xl font-semibold uppercase text-tierra-terracota-oscuro">Somos Tierra</p>
            <p className="mt-1 text-tierra-terracota-oscuro/80">
              Vivimos la montaña tanto como vos. Seleccionamos los mejores productos para que cada salida
              sea una experiencia única.
            </p>
          </div>
          <Link href="/sobre-tierra" className="btn-primario whitespace-nowrap">
            Conocenos
          </Link>
        </div>
      </section>
    </div>
  );
}
