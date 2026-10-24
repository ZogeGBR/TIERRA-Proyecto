import type { Metadata } from "next";
import Link from "next/link";
import { Sprout, Compass, Mountain, Bike, Tent, Shirt, Snowflake, MapPin } from "lucide-react";
import { TituloPalabras } from "@/components/TituloPalabras";
import { Revelar } from "@/components/Revelar";
import { ContadorAnios } from "@/components/ContadorAnios";
import { CaminosColores } from "@/components/CaminosColores";
import { urlWhatsapp } from "@/lib/contacto";

export const metadata: Metadata = {
  title: "Sobre Tierra — Esquel, Patagonia",
  description: "La historia de Tierra: una idea nacida hace 23 años en un pueblo chico y turístico de Esquel, que creció buscando nuevas aventuras."
};

// Los textos cuentan lo que el cliente nos dio (una idea en el Esquel turístico
// y chico de hace 23 años, las ganas de expandirse y de buscar aventuras). Sin
// nombres, fechas ni hechos inventados: si hay más historia, se suma acá.
const CAPITULOS = [
  {
    icono: Sprout,
    etiqueta: "El comienzo",
    titulo: "Una idea en un pueblo chico",
    texto:
      "Todo empezó en Esquel, un pueblo pequeño y turístico al pie de la cordillera. Ahí, rodeados de montaña, nació la idea de Tierra: tener un lugar donde la gente que vive y visita la zona encuentre el equipo para disfrutarla bien.",
    acento: "terracota"
  },
  {
    icono: Compass,
    etiqueta: "Las ganas de más",
    titulo: "Crecer buscando aventuras",
    texto:
      "Con los años, la idea no se quedó quieta. Quisimos expandirnos y salir a buscar nuevas aventuras, igual que quienes nos visitan: más rutas, más deportes y más formas de vivir la montaña.",
    acento: "verde"
  },
  {
    icono: Mountain,
    etiqueta: "Hoy",
    titulo: "Vivimos la montaña tanto como vos",
    texto:
      "Seguimos siendo de acá. Elegimos con cuidado cada producto para que cada salida sea una experiencia única, y ahora también podés encontrarnos en línea, estés donde estés.",
    acento: "ambar"
  }
] as const;

const ACENTO: Record<string, { barra: string; icono: string }> = {
  terracota: { barra: "bg-tierra-terracota", icono: "bg-tierra-terracota/10 text-tierra-terracota" },
  verde: { barra: "bg-tierra-verde", icono: "bg-tierra-verde/10 text-tierra-verde" },
  ambar: { barra: "bg-tierra-ambar", icono: "bg-tierra-ambar/15 text-tierra-terracota" }
};

const QUE_HACEMOS = [
  { icono: Bike, texto: "Running, trekking, bike y esquí", href: "/productos" },
  { icono: Tent, texto: "Camping y accesorios", href: "/productos" },
  { icono: Shirt, texto: "Ropa urbana", href: "/productos" },
  { icono: Snowflake, texto: "Alquiler de equipos de montaña", href: "/alquiler" }
];

export default function SobreTierra() {
  return (
    <div>
      {/* Portada: título por palabra + el número de años, con la cordillera de siempre */}
      <section data-banda-cordillera className="relative overflow-hidden bg-gradient-to-br from-tierra-ambar/25 via-tierra-crema-oscuro to-tierra-verde/15">
        {/* La cordillera cruza TODO el ancho, se funde por arriba y por los costados (sin bordes duros) */}
        <div
          className="cordillera-banda"
          aria-hidden="true"
          style={{
            WebkitMaskImage: "linear-gradient(to bottom, transparent 0%, #000 38%), linear-gradient(to right, rgba(0,0,0,0.35), #000 55%)",
            maskImage: "linear-gradient(to bottom, transparent 0%, #000 38%), linear-gradient(to right, rgba(0,0,0,0.35), #000 55%)",
            WebkitMaskComposite: "source-in",
            maskComposite: "intersect"
          }}
        />
        {/* Fundido inferior hacia el color de la página: la portada no termina en un corte */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-b from-transparent to-tierra-crema" />
        <div className="relative max-w-6xl mx-auto px-6 py-16 md:py-24 grid gap-10 md:grid-cols-[1.3fr_1fr] items-center">
          <div>
            <p className="inline-block rounded-full bg-white/70 px-3 py-1 text-xs font-medium uppercase tracking-wide text-tierra-terracota">
              Sobre Tierra
            </p>
            <TituloPalabras
              como="h1"
              texto="Nacimos en Esquel, entre montañas"
              destacar="entre montañas"
              className="mt-4 font-serif text-4xl md:text-5xl font-semibold leading-tight text-tierra-terracota-oscuro"
            />
            <p className="mt-5 max-w-xl text-lg text-tierra-terracota-oscuro/85">
              Una idea en un pueblo chico y turístico de la Patagonia que, con los años, salió a buscar más aventuras.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link href="/productos" className="btn-primario">Ver el catálogo</Link>
              <a href="#historia" className="btn-secundario">Leer la historia</a>
            </div>
          </div>
          <div className="flex md:justify-center">
            <div className="rounded-3xl bg-white/75 px-8 py-6 text-center shadow-lg backdrop-blur-sm">
              <p className="font-serif text-7xl font-semibold leading-none text-tierra-terracota md:text-8xl">
                <ContadorAnios valor={23} />
              </p>
              <p className="mt-2 text-sm font-medium uppercase tracking-wide text-tierra-terracota-oscuro">años desde la primera idea</p>
            </div>
          </div>
        </div>
      </section>

      {/* Historia en tres capítulos, con una línea que los une */}
      <section id="historia" className="max-w-4xl mx-auto px-6 py-16 scroll-mt-32">
        <TituloPalabras como="h2" modo="scroll" texto="Cómo empezó todo" destacar="empezó" className="font-serif text-2xl md:text-3xl font-semibold text-tierra-terracota-oscuro" />
        <ol className="relative mt-10 space-y-10 border-l-2 border-tierra-crema-oscuro pl-8 md:pl-10">
          {CAPITULOS.map((c, i) => {
            const Icono = c.icono;
            const a = ACENTO[c.acento];
            return (
              <li key={c.titulo} className="relative">
                <span className={`absolute -left-[2.9rem] md:-left-[3.4rem] top-1 flex h-10 w-10 items-center justify-center rounded-full ring-4 ring-tierra-crema ${a.icono}`} aria-hidden="true">
                  <Icono size={18} />
                </span>
                <Revelar retraso={i * 80}>
                  <div className="overflow-hidden rounded-2xl bg-white shadow-sm transition-shadow duration-300 hover:shadow-lg">
                    <div className={`h-1.5 ${a.barra}`} />
                    <div className="p-6">
                      <p className="text-xs font-semibold uppercase tracking-wide text-tierra-terracota">{c.etiqueta}</p>
                      <h3 className="mt-1 font-serif text-xl font-semibold text-tierra-terracota-oscuro">{c.titulo}</h3>
                      <p className="mt-3 leading-relaxed text-tierra-terracota-oscuro/85">{c.texto}</p>
                    </div>
                  </div>
                </Revelar>
              </li>
            );
          })}
        </ol>
      </section>

      {/* Qué hacemos */}
      <section className="bg-tierra-crema-oscuro/50">
        <div className="max-w-6xl mx-auto px-6 py-14">
          <TituloPalabras como="h2" modo="scroll" texto="Lo que encontrás en Tierra" destacar="Tierra" className="font-serif text-2xl md:text-3xl font-semibold text-tierra-terracota-oscuro" />
          <ul className="grilla-anim mt-8 grid grid-cols-2 gap-4 md:grid-cols-4">
            {QUE_HACEMOS.map(({ icono: Icono, texto, href }) => (
              <li key={texto}>
                <Link href={href} className="group flex h-full flex-col items-start gap-3 rounded-2xl bg-white p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-tierra-verde">
                  <span className="flex h-11 w-11 items-center justify-center rounded-full bg-tierra-verde/10 text-tierra-verde transition-transform duration-300 group-hover:scale-110">
                    <Icono size={20} />
                  </span>
                  <span className="font-medium text-tierra-terracota-oscuro">{texto}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Cierre: venite a conocernos */}
      <section className="relative overflow-hidden bg-gradient-to-b from-tierra-crema via-tierra-crema-oscuro/60 to-tierra-ambar/20">
        <CaminosColores />
        <div className="velo-centro pointer-events-none absolute inset-0" aria-hidden="true" />
        <div className="relative max-w-4xl mx-auto px-6 py-24 text-center">
        <TituloPalabras como="h2" modo="scroll" texto="Venite a conocernos" destacar="conocernos" className="font-serif text-2xl md:text-3xl font-semibold text-tierra-terracota-oscuro" />
        <p className="mx-auto mt-4 flex max-w-xl items-center justify-center gap-2 text-tierra-terracota-oscuro/85">
          <MapPin size={16} className="shrink-0 text-tierra-terracota" aria-hidden="true" /> Av. Fontana 482, Esquel 9200 · de lunes a lunes de 9 a 13 hs
        </p>
        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <a href={urlWhatsapp()} target="_blank" rel="noopener noreferrer" className="btn-primario">Escribinos por WhatsApp</a>
          <Link href="/alquiler" className="btn-secundario">Alquilar equipo</Link>
        </div>
        </div>
      </section>
    </div>
  );
}
