import type { ReactNode } from "react";

// El fondo y la tarjeta de las dos pantallas de acceso: /login (clientes, con
// código) y /equipo (equipo de Tierra, con contraseña). Es el diseño del login
// del rediseño, sacado a un componente para que las dos pantallas no se
// separen con el tiempo.

// Clases compartidas de los campos y del botón principal, por el mismo motivo.
export const CLASE_CAMPO =
  "w-full bg-white/30 placeholder-white/70 text-white border border-white/40 rounded-full pl-11 pr-5 py-3 " +
  "focus:outline-none focus:ring-2 focus:ring-white/80 focus:bg-white/40 transition-colors";

export const CLASE_BOTON =
  "w-full bg-tierra-ambar text-white font-medium rounded-full py-3 " +
  "transition-colors hover:brightness-95 disabled:opacity-60 " +
  "focus:outline-none focus:ring-2 focus:ring-white/80";

// Botón secundario con aspecto de enlace: "Reenviar código", "Usar otro email".
export const CLASE_ENLACE =
  "text-white underline font-medium disabled:no-underline disabled:opacity-60 " +
  "focus:outline-none focus:ring-2 focus:ring-white/80 rounded";

interface TarjetaAccesoProps {
  titulo: string;
  subtitulo: ReactNode;
  children: ReactNode;
}

export function TarjetaAcceso({ titulo, subtitulo, children }: TarjetaAccesoProps) {
  return (
    <div className="relative min-h-[calc(100vh-1px)] flex items-center justify-center overflow-hidden px-4 py-12">
      {/* Misma foto de marca que el hero de la home — cálida y luminosa,
          en vez de una imagen nueva sin relación con el resto del sitio. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/images/brand/hero.jpg"
        alt=""
        className="absolute inset-0 w-full h-full object-cover"
        style={{ objectPosition: "60% 35%" }}
      />
      {/* Degradé cálido (terracota/crema) en vez del rosa/violeta del
          ejemplo, para que la tarjeta traslúcida siga leyéndose bien con
          la paleta nueva. */}
      <div className="absolute inset-0 bg-gradient-to-b from-tierra-terracota-oscuro/70 via-tierra-terracota-oscuro/50 to-tierra-crema-oscuro/80" />
      {/* Resplandor verde suave en la esquina — el mismo contraste cálido
          + frío de la imagen de referencia (acuarela terracota/verde
          azulado), acá como un detalle sutil detrás de la tarjeta. */}
      <div className="absolute -bottom-24 -right-24 w-96 h-96 rounded-full bg-tierra-verde/40 blur-3xl" />

      <div className="relative w-full max-w-md">
        <div className="bg-white/20 backdrop-blur-xl border border-white/30 rounded-3xl p-8 shadow-2xl">
          <h1 className="font-serif text-3xl font-semibold text-white text-center mb-1">{titulo}</h1>
          <div className="text-white/80 text-center mb-8 text-sm">{subtitulo}</div>
          {children}
        </div>
      </div>
    </div>
  );
}
