"use client";

import { useEffect, useRef } from "react";
import { usePrefiereMovimientoReducido } from "@/lib/movimientoReducido";

// Resplandor suave que acompaña al cursor (solo con mouse): da vida al fondo
// sin mover nada del contenido. Un único elemento que se desplaza con
// `transform` (nada de repintar), con inercia para que no vaya "pegado".
// En pantallas táctiles, con "reducir movimiento" o sin mouse, no existe.
export function LuzCursor() {
  const luz = useRef<HTMLDivElement>(null);
  const reducido = usePrefiereMovimientoReducido();

  useEffect(() => {
    const el = luz.current;
    if (!el || reducido) return;
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    let x = window.innerWidth / 2, y = window.innerHeight / 3;
    let ox = x, oy = y;
    let raf = 0;
    let visible = false;
    const cuadro = () => {
      x += (ox - x) * 0.14;
      y += (oy - y) * 0.14;
      el.style.transform = `translate3d(${x - 260}px, ${y - 260}px, 0)`;
      raf = Math.abs(ox - x) + Math.abs(oy - y) > 0.5 ? requestAnimationFrame(cuadro) : 0;
    };
    const mover = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      ox = e.clientX;
      oy = e.clientY;
      if (!visible) {
        visible = true;
        x = ox;
        y = oy;
        el.style.opacity = "1";
      }
      if (!raf) raf = requestAnimationFrame(cuadro);
    };
    const salir = () => {
      visible = false;
      el.style.opacity = "0";
    };
    window.addEventListener("pointermove", mover, { passive: true });
    document.documentElement.addEventListener("pointerleave", salir);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", mover);
      document.documentElement.removeEventListener("pointerleave", salir);
    };
  }, [reducido]);

  return <div ref={luz} aria-hidden="true" data-luz-cursor className="luz-cursor" />;
}
