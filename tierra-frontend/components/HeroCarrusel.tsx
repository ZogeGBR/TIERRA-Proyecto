"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

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
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (enPausa) return;
    timerRef.current = setInterval(() => {
      setIndice((i) => (i + 1) % SLIDES.length);
    }, INTERVALO_MS);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [enPausa]);

  function irA(i: number) {
    setIndice((i + SLIDES.length) % SLIDES.length);
  }

  return (
    <div
      className="absolute inset-0"
      onMouseEnter={() => setEnPausa(true)}
      onMouseLeave={() => setEnPausa(false)}
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

      <div className="absolute bottom-5 left-1/2 -translate-x-1/2 flex gap-2 z-10">
        {SLIDES.map((_, i) => (
          <button
            key={i}
            onClick={() => irA(i)}
            aria-label={`Ver foto ${i + 1}`}
            className={`h-1.5 rounded-full transition-all ${
              i === indice ? "w-6 bg-white" : "w-1.5 bg-white/50 hover:bg-white/80"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
