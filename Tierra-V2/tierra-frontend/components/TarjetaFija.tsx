"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

// La tarjeta del hero queda ESTÁTICA: no se mueve ni un píxel mientras se
// scrollea, y las fotos del carrusel pasan por detrás.
//
// Cómo: `position: fixed` en el lugar donde aparece al cargar la página. Fixed
// (y no sticky) porque nunca se "suelta": el navegador la mantiene en su sitio
// sin recalcular nada al scrollear, y no hay ningún tramo donde se deslice.
//
// Para que no quede flotando encima de Categorías ni de los beneficios, cuando
// las fotos terminan de pasar por detrás (el borde inferior del hero llega al
// borde inferior de la tarjeta) se DESVANECE en su lugar: cambia solo la
// transparencia, nunca la posición.
//
// El lugar inicial se mide con un ancla invisible puesta donde empieza la
// tarjeta, así no depende de cuánto mida el header (cambia con el ancho de
// pantalla y con las fuentes).
const SEPARACION_SUPERIOR = 96; // px entre el borde superior del hero y la tarjeta (pt-24)
const TRAMO_DESVANECIDO = 48; // px de scroll durante los que se desvanece
// React 18 no entiende `inert={true}`; con una cadena vacía sí escribe el atributo.
const INERT = "" as unknown as boolean;

export function TarjetaFija({ children }: { children: ReactNode }) {
  const ancla = useRef<HTMLDivElement>(null);
  const tarjeta = useRef<HTMLDivElement>(null);
  // Posición inicial en pantalla (con scroll 0). Antes de medir, un valor típico de escritorio.
  const [pos, setPos] = useState({ top: 200, left: 0 });
  const [visibilidad, setVisibilidad] = useState(1);

  useEffect(() => {
    function medirLugar() {
      const el = ancla.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      setPos({ top: Math.round(r.top + window.scrollY), left: Math.round(r.left) });
    }
    function calcularVisibilidad() {
      const t = tarjeta.current;
      const hero = document.querySelector("[data-hero]");
      if (!t || !hero) return;
      // Cuánto se pasó el borde inferior del hero del borde inferior de la tarjeta.
      const sobra = t.getBoundingClientRect().bottom - hero.getBoundingClientRect().bottom;
      setVisibilidad(Math.min(1, Math.max(0, 1 - sobra / TRAMO_DESVANECIDO)));
    }

    medirLugar();
    calcularVisibilidad();

    let pendiente = false;
    function alScrollear() {
      if (pendiente) return;
      pendiente = true;
      requestAnimationFrame(() => {
        pendiente = false;
        calcularVisibilidad();
      });
    }
    function alCambiarTamano() {
      // Con scroll distinto de 0 el ancla ya se movió: se mide su lugar natural.
      medirLugar();
      calcularVisibilidad();
    }

    window.addEventListener("scroll", alScrollear, { passive: true });
    window.addEventListener("resize", alCambiarTamano);
    window.addEventListener("load", alCambiarTamano);
    void document.fonts?.ready.then(alCambiarTamano);
    const obs = typeof ResizeObserver !== "undefined" ? new ResizeObserver(alCambiarTamano) : null;
    obs?.observe(document.body);
    return () => {
      window.removeEventListener("scroll", alScrollear);
      window.removeEventListener("resize", alCambiarTamano);
      window.removeEventListener("load", alCambiarTamano);
      obs?.disconnect();
    };
  }, []);

  const oculta = visibilidad <= 0.01;

  return (
    <>
      {/* Ancla: ocupa el lugar natural de la tarjeta dentro del hero. */}
      <div className="absolute inset-x-0 top-0 pointer-events-none" aria-hidden="true">
        <div className="max-w-6xl mx-auto px-6 w-full" style={{ paddingTop: SEPARACION_SUPERIOR }}>
          <div ref={ancla} />
        </div>
      </div>

      <div
        ref={tarjeta}
        // Si está invisible no debe poder recibir clics ni foco.
        aria-hidden={oculta || undefined}
        inert={oculta ? INERT : undefined}
        className="fixed z-20 w-[calc(100vw-3rem)] max-w-md bg-white/65 rounded-3xl p-8 shadow-lg"
        style={{ top: pos.top, left: pos.left, opacity: visibilidad, pointerEvents: oculta ? "none" : "auto" }}
      >
        {children}
      </div>
    </>
  );
}
