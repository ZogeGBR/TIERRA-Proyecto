import type { ReactNode } from "react";

// Marco común de /login y /equipo: la foto de marca de fondo, el degradé
// cálido y la tarjeta traslúcida. Solo presentación.
export function PantallaAcceso({ titulo, subtitulo, children }: { titulo: string; subtitulo: string; children: ReactNode }) {
  return (
    <div className="relative min-h-[calc(100vh-1px)] flex items-center justify-center overflow-hidden px-4 py-12">
      {/* Misma foto de marca que el hero de la home. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/images/brand/hero.jpg"
        alt=""
        className="absolute inset-0 w-full h-full object-cover"
        style={{ objectPosition: "60% 35%" }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-tierra-terracota-oscuro/70 via-tierra-terracota-oscuro/50 to-tierra-crema-oscuro/80" />
      <div className="absolute -bottom-24 -right-24 w-96 h-96 rounded-full bg-tierra-verde/40 blur-3xl" />

      <div className="relative w-full max-w-md anim-sube">
        <div className="bg-white/20 backdrop-blur-xl border border-white/30 rounded-3xl p-8 shadow-2xl">
          <h1 className="font-serif text-3xl font-semibold text-white text-center mb-1">{titulo}</h1>
          <p className="text-white/80 text-center mb-8 text-sm">{subtitulo}</p>
          {children}
        </div>
      </div>
    </div>
  );
}
