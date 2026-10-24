"use client";

import { useEffect, useRef, useState } from "react";
import { usePrefiereMovimientoReducido } from "@/lib/movimientoReducido";

// Video decorativo de fondo (ondas de acuarela o cordillera emergiendo).
//
// Mismas reglas que el fondo de la home: el servidor y el primer render muestran
// solo la imagen fija; el <video> entra recién cuando ya se sabe que la persona
// no pidió menos movimiento ni ahorro de datos (así no se descarga de más). Se
// pausa fuera de pantalla. Pantallas anchas usan 1920 px; el resto, 1280 px.
export type FuenteVideo = "ondas" | "montana";
const BASES: Record<FuenteVideo, { base: string; poster: string }> = {
  ondas: { base: "/video/ondas-tierra", poster: "/video/ondas-tierra-poster.jpg" },
  montana: { base: "/video/cordillera", poster: "/video/cordillera-poster.jpg" }
};

export function VideoFondo({ fuente, className = "" }: { fuente: FuenteVideo; className?: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  const reducido = usePrefiereMovimientoReducido();
  const [listo, setListo] = useState(false);
  const [ahorro, setAhorro] = useState(false);
  const [hd, setHd] = useState(false);

  useEffect(() => {
    const conexion = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
    setAhorro(Boolean(conexion?.saveData));
    setHd(window.innerWidth >= 1300);
    setListo(true);
  }, []);

  const conVideo = listo && !reducido && !ahorro;

  useEffect(() => {
    const v = ref.current;
    if (!v || !conVideo) return;
    if (typeof IntersectionObserver === "undefined") {
      void v.play().catch(() => {});
      return;
    }
    const obs = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) void v.play().catch(() => {});
        else v.pause();
      },
      { threshold: 0 }
    );
    obs.observe(v);
    return () => obs.disconnect();
  }, [conVideo, hd]);

  const { base, poster } = BASES[fuente];
  const sufijo = fuente === "ondas" ? (hd ? "-hd" : "-v2") : hd ? "-hd" : "-v2";
  return (
    <div className={`video-fondo ${className}`} aria-hidden="true" data-video-fondo={fuente}>
      {conVideo ? (
        <video key={sufijo} ref={ref} className="video-fondo-medio" autoPlay muted loop playsInline preload="metadata" poster={poster} tabIndex={-1}>
          <source src={`${base}${sufijo}.webm`} type="video/webm" />
          <source src={`${base}${sufijo}.mp4`} type="video/mp4" />
        </video>
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={poster} alt="" className="video-fondo-medio" />
      )}
    </div>
  );
}
