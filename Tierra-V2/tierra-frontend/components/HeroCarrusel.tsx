"use client";

import { useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Pause, Play } from "lucide-react";
import { usePrefiereMovimientoReducido } from "@/lib/movimientoReducido";

// Fotos con licencia confirmada para uso comercial: Pexels y Unsplash
// (plan gratuito, no Unsplash+). Cada una muestra el equipo DE TIERRA
// en uso real —trekking, alta montaña, camping— en vez de fotos de
// catálogo de producto suelto, que es lo que se pidió para este hero.
//
// hero-2.jpg (otra foto de "gente caminando de espaldas en un valle
// verde") se sacó del todo: aunque no quedaba pegada a hero-1 en el
// orden, las dos se parecen tanto que igual se leían como una foto
// repetida. Mejor 5 fotos bien distintas que 6 con dos parecidas.
const SLIDES = [
  { src: "/images/brand/carousel/hero-4.jpg", etiqueta: "Tu carpa, donde quieras", posicion: "50% 55%" },
  { src: "/images/brand/carousel/hero-1.jpg", etiqueta: "Trekking en la Patagonia", posicion: "60% 35%" },
  { src: "/images/brand/carousel/hero-3.jpg", etiqueta: "Alta montaña y nieve", posicion: "50% 30%" },
  { src: "/images/brand/carousel/hero-6.jpg", etiqueta: "Cada salida, una historia", posicion: "50% 45%" },
  { src: "/images/brand/carousel/hero-5.jpg", etiqueta: "Llegá más alto", posicion: "50% 40%" }
];

const INTERVALO_MS = 5500;

export function HeroCarrusel() {
  const [indice, setIndice] = useState(0);
  const [enPausa, setEnPausa] = useState(false);
  // Pausa pedida con el botón (distinta de la pausa al pasar el mouse): quien
  // no puede leer una etiqueta en 5 segundos tiene que poder frenar el
  // carrusel, no solo esperar a que pase.
  const [pausaManual, setPausaManual] = useState(false);
  // Con "reducir movimiento" activado en el sistema, el carrusel NO avanza
  // solo ni hace el zoom lento: queda en la primera foto y se cambia a mano.
  const movimientoReducido = usePrefiereMovimientoReducido();
  const detenido = enPausa || pausaManual || movimientoReducido;
  const inicioToque = useRef<number | null>(null);

  function irA(i: number) {
    setIndice((i + SLIDES.length) % SLIDES.length);
  }

  return (
    <div
      className="absolute inset-0"
      onMouseEnter={() => setEnPausa(true)}
      onMouseLeave={() => setEnPausa(false)}
      onFocus={() => setEnPausa(true)}
      onBlur={() => setEnPausa(false)}
      onKeyDown={(e) => {
        if (e.key === "ArrowLeft") irA(indice - 1);
        if (e.key === "ArrowRight") irA(indice + 1);
      }}
      onPointerDown={(e) => { inicioToque.current = e.clientX; }}
      onPointerUp={(e) => {
        const x0 = inicioToque.current;
        inicioToque.current = null;
        if (x0 === null) return;
        const dx = e.clientX - x0;
        if (Math.abs(dx) > 50) irA(indice + (dx < 0 ? 1 : -1));
      }}
      role="region"
      aria-roledescription="carrusel"
      aria-label="Fotos de Tierra"
    >
      {SLIDES.map((slide, i) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={slide.src}
          src={slide.src}
          alt=""
          className="absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ease-in-out animate-ken-burns"
          style={{
            objectPosition: slide.posicion,
            opacity: i === indice ? 1 : 0,
            animationDelay: `${i * -3}s`
          }}
        />
      ))}

      {/* Etiqueta chica que cambia por foto — da el efecto "editorial" del
          video de referencia. A la derecha para no chocar con la tarjeta
          de texto, que ahora vive del lado izquierdo. */}
      <div className="absolute right-6 top-8 z-10">
        <span
          key={indice}
          className="inline-block bg-white/90 text-tierra-terracota-oscuro text-xs font-medium px-3 py-1.5 rounded-full animate-etiqueta-fade shadow-sm"
        >
          {SLIDES[indice].etiqueta}
        </span>
      </div>

      {/* Flechas: ocultas en mobile, no vale la pena la superposición táctil
          en pantallas chicas cuando ya hay swipe nativo del navegador. */}
      <button
        onClick={() => irA(indice - 1)}
        aria-label="Foto anterior"
        className="hidden md:flex absolute left-4 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-white/70 hover:bg-white items-center justify-center text-tierra-terracota-oscuro transition-colors"
      >
        <ChevronLeft size={20} />
      </button>
      <button
        onClick={() => irA(indice + 1)}
        aria-label="Foto siguiente"
        className="hidden md:flex absolute right-4 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-white/70 hover:bg-white items-center justify-center text-tierra-terracota-oscuro transition-colors"
      >
        <ChevronRight size={20} />
      </button>

      {!movimientoReducido && (
        <button
          onClick={() => setPausaManual((v) => !v)}
          aria-label={pausaManual ? "Reanudar el carrusel" : "Pausar el carrusel"}
          className="absolute bottom-3 right-4 z-10 w-8 h-8 rounded-full bg-white/70 hover:bg-white flex items-center justify-center text-tierra-terracota-oscuro transition-colors"
        >
          {pausaManual ? <Play size={14} /> : <Pause size={14} />}
        </button>
      )}

      {/* Barras de progreso estilo "stories": la de la foto actual se llena en
          el tiempo exacto que falta para el cambio (como en el reel de F97).
          Se frena sola con la pausa y con "reducir movimiento" queda llena. */}
      <div className="absolute bottom-5 left-1/2 -translate-x-1/2 flex gap-2 z-10">
        {SLIDES.map((_, i) => (
          <button
            key={i}
            onClick={() => irA(i)}
            aria-label={`Ver foto ${i + 1}`}
            aria-current={i === indice ? "true" : undefined}
            className="group relative h-6 w-9 flex items-center focus:outline-none"
          >
            <span className="relative block h-1 w-full overflow-hidden rounded-full bg-white/45 transition-[height,background-color] duration-200 group-hover:h-1.5 group-hover:bg-white/70 group-focus-visible:ring-2 group-focus-visible:ring-white">
              <span
                key={`${indice}-${i === indice}`}
                className={`absolute inset-y-0 left-0 block w-full origin-left rounded-full bg-white ${i === indice && !movimientoReducido ? "hero-progreso" : ""}`}
                onAnimationEnd={i === indice ? () => irA(indice + 1) : undefined}
                style={{
                  transform: i < indice || (i === indice && movimientoReducido) ? "scaleX(1)" : i === indice ? undefined : "scaleX(0)",
                  animationDuration: `${INTERVALO_MS}ms`,
                  animationPlayState: detenido ? "paused" : "running"
                }}
              />
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
