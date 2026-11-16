"use client";

import { useEffect, useRef, type CSSProperties, type ReactNode } from "react";

// Hace que su contenido aparezca (fade + subida suave) la primera vez que
// entra en pantalla al hacer scroll.
//
// Cómo evita los dos problemas típicos de este efecto:
//  1. Contenido invisible si JavaScript falla o tarda: desde el servidor el
//     contenido se ve normal. Recién al montarse en el navegador, y solo si
//     el bloque está FUERA de la pantalla, se lo oculta para revelarlo luego.
//  2. Parpadeo de lo que ya está a la vista: si al montarse ya se ve, no se
//     toca.
// Con "reducir movimiento" el CSS lo deja siempre visible (ver globals.css).
export function Revelar({
  children,
  retraso = 0,
  className = ""
}: {
  children: ReactNode;
  /** Milisegundos de espera: sirve para escalonar una grilla. */
  retraso?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const nodo = ref.current;
    if (!nodo) return;
    const el: HTMLDivElement = nodo;
    // Navegador sin IntersectionObserver: se deja todo visible.
    if (typeof IntersectionObserver === "undefined") return;

    const caja = el.getBoundingClientRect();
    if (caja.top < window.innerHeight && caja.bottom > 0) return; // ya se ve

    el.dataset.rev = "oculto";
    function mostrar() {
      el.dataset.rev = "visible";
      observador.disconnect();
      window.removeEventListener("scroll", yaPaso);
    }
    const observador = new IntersectionObserver(
      (entradas) => {
        if (entradas.some((e) => e.isIntersecting)) mostrar();
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.05 }
    );
    // Si la persona SALTA más allá del bloque (tecla Fin, un ancla, recargar a
    // mitad de página), el bloque nunca llega a cruzar la pantalla y el
    // observador no avisa: quedaría invisible al volver a subir. Un bloque que
    // ya quedó completamente por encima de la pantalla se muestra sin animación.
    function yaPaso() {
      if (el.getBoundingClientRect().bottom < 0) mostrar();
    }
    window.addEventListener("scroll", yaPaso, { passive: true });
    observador.observe(el);
    return () => {
      observador.disconnect();
      window.removeEventListener("scroll", yaPaso);
    };
  }, []);

  const estilo = { "--retraso": `${retraso}ms` } as CSSProperties;
  return (
    <div ref={ref} className={className} style={estilo}>
      {children}
    </div>
  );
}
