import type { ReactNode } from "react";

// Marco común de /login y /equipo: la pintura de montañas de fondo, el velo
// verde-azulado y la tarjeta traslúcida. Solo presentación.
export function PantallaAcceso({ titulo, subtitulo, children }: { titulo: string; subtitulo: string; children: ReactNode }) {
  return (
    <div className="relative min-h-[calc(100vh-1px)] flex items-center justify-center overflow-hidden px-4 py-12">
      {/* Pintura de montañas (verdes, azules y picos naranja): panorama en pantallas anchas, versión vertical en el celular. */}
      <picture>
        <source media="(min-width: 768px)" srcSet="/images/brand/login-montanas-ancho.jpg" />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/images/brand/login-montanas.jpg"
          alt=""
          data-fondo-login
          className="absolute inset-0 w-full h-full object-cover"
          style={{ objectPosition: "50% 40%" }}
        />
      </picture>
      {/* Velo verde-azulado suave para que la tarjeta y el texto se lean sin tapar la pintura. */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#0b3b3a]/45 via-[#0b3b3a]/25 to-[#0b3b3a]/55" />
      {/* Dos luces de color que flotan despacio detrás de la tarjeta (solo transform). */}
      <div aria-hidden="true" className="orbe orbe-a absolute -bottom-24 -right-24 w-96 h-96 rounded-full bg-tierra-ambar/30 blur-3xl" />
      <div aria-hidden="true" className="orbe orbe-b absolute -top-28 -left-24 w-80 h-80 rounded-full bg-tierra-verde/30 blur-3xl" />

      <div className="relative w-full max-w-md anim-sube">
        <div className="bg-[#0b3b3a]/35 backdrop-blur-xl border border-white/30 rounded-3xl p-8 shadow-2xl">
          <h1 className="font-serif text-3xl font-semibold text-white text-center mb-1">{titulo}</h1>
          <p className="text-white/80 text-center mb-8 text-sm">{subtitulo}</p>
          {children}
        </div>
      </div>
    </div>
  );
}
