"use client";

import { useEffect, useRef } from "react";

// Hilo de color arriba de todo que se llena a medida que se baja por la
// página (como la barra de progreso del reel). Un solo elemento: solo cambia
// su `transform` y se actualiza una vez por cuadro, no en cada evento de scroll.
export function BarraProgreso() {
  const barra = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = barra.current;
    if (!el) return;
    let pendiente = false;
    const pintar = () => {
      pendiente = false;
      const alto = document.documentElement.scrollHeight - window.innerHeight;
      const p = alto > 0 ? Math.min(1, Math.max(0, window.scrollY / alto)) : 0;
      el.style.transform = `scaleX(${p})`;
      el.style.opacity = p > 0.005 ? "1" : "0";
    };
    const alScroll = () => {
      if (!pendiente) {
        pendiente = true;
        requestAnimationFrame(pintar);
      }
    };
    pintar();
    window.addEventListener("scroll", alScroll, { passive: true });
    window.addEventListener("resize", alScroll);
    return () => {
      window.removeEventListener("scroll", alScroll);
      window.removeEventListener("resize", alScroll);
    };
  }, []);

  return <div ref={barra} aria-hidden="true" data-barra-progreso className="barra-progreso" />;
}
