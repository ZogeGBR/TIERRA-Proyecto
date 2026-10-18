"use client";

import { useEffect, useRef, useState } from "react";
import { usePrefiereMovimientoReducido } from "@/lib/movimientoReducido";

// Fondo de ondas de acuarela en movimiento (detrás del panel beige de la home).
//
// Encuadre: solo se ve una franja arriba y otra abajo del panel beige. Antes un
// único video cubría TODO el bloque (que es muy alto y angosto), así que se
// ampliaba más de 2× y se veía pixelado. Ahora hay una franja por lado y cada
// video se escala por el ANCHO de la pantalla (1 píxel de video = 1 píxel de
// pantalla) y se recorta solo hacia arriba y abajo: la imagen se ve más
// "alejada" y nítida.
//
// Calidad: pantallas anchas usan la versión de 1920 px; el resto, la de 1280.
// Sin movimiento: con "reducir movimiento" o ahorro de datos se muestra solo la
// imagen fija y el video ni se descarga. Cada video se pausa fuera de pantalla.
// Si el video no carga, queda debajo la textura estática de siempre.
type Calidad = "hd" | "sd";

function Franja({ lado, calidad }: { lado: "arriba" | "abajo"; calidad: Calidad }) {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    // La franja de abajo arranca a mitad del bucle: así las dos no son espejo una de la otra.
    function desfasar() {
      if (lado === "abajo" && v && Number.isFinite(v.duration) && v.duration > 0) v.currentTime = v.duration / 2;
    }
    v.addEventListener("loadedmetadata", desfasar, { once: true });

    if (typeof IntersectionObserver === "undefined") {
      void v.play().catch(() => {});
      return () => v.removeEventListener("loadedmetadata", desfasar);
    }
    const obs = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) void v.play().catch(() => {});
        else v.pause();
      },
      { threshold: 0 }
    );
    obs.observe(v);
    return () => {
      obs.disconnect();
      v.removeEventListener("loadedmetadata", desfasar);
    };
  }, [lado, calidad]);

  const base = calidad === "hd" ? "/video/ondas-acuarela-hd" : "/video/ondas-acuarela-v2";
  return (
    <div className={`fondo-ondas-franja fondo-ondas-${lado}`}>
      <video
        // key: al cambiar de calidad el navegador tiene que recargar las fuentes.
        key={calidad}
        ref={ref}
        className="fondo-ondas-medio"
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
        poster="/video/ondas-acuarela-poster.jpg"
        tabIndex={-1}
      >
        <source src={`${base}.webm`} type="video/webm" />
        <source src={`${base}.mp4`} type="video/mp4" />
      </video>
    </div>
  );
}

export function FondoOndas() {
  const reducido = usePrefiereMovimientoReducido();
  const [ahorroDeDatos, setAhorroDeDatos] = useState(false);
  const [calidad, setCalidad] = useState<Calidad>("sd");
  // El servidor no sabe si la persona pidió menos movimiento, si ahorra datos ni
  // qué ancho de pantalla tiene. Si dibujara el <video>, el navegador empezaría
  // a bajarlo antes de hidratar. Por eso arranca con la imagen fija y el video
  // entra recién cuando ya se sabe qué corresponde.
  const [listo, setListo] = useState(false);

  useEffect(() => {
    const conexion = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
    setAhorroDeDatos(Boolean(conexion?.saveData));
    setCalidad(window.innerWidth >= 1300 ? "hd" : "sd");
    setListo(true);
  }, []);

  const mostrarImagen = reducido || ahorroDeDatos || !listo;

  return (
    <div className="fondo-ondas" aria-hidden="true">
      {mostrarImagen ? (
        <>
          {(["arriba", "abajo"] as const).map((lado) => (
            <div key={lado} className={`fondo-ondas-franja fondo-ondas-${lado}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/video/ondas-acuarela-poster.jpg" alt="" className="fondo-ondas-medio" />
            </div>
          ))}
        </>
      ) : (
        <>
          <Franja lado="arriba" calidad={calidad} />
          <Franja lado="abajo" calidad={calidad} />
        </>
      )}
    </div>
  );
}
