"use client";

import { useEffect, useRef, useState } from "react";
import { usePrefiereMovimientoReducido } from "@/lib/movimientoReducido";

// Número que "cuenta" hasta su valor al entrar en pantalla. Desde el servidor (y
// sin JavaScript o con "reducir movimiento") ya muestra el valor final.
export function ContadorAnios({ valor, className = "" }: { valor: number; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const reducido = usePrefiereMovimientoReducido();
  const [n, setN] = useState(valor);

  useEffect(() => {
    const el = ref.current;
    if (!el || reducido || typeof IntersectionObserver === "undefined") return;
    let raf = 0;
    const obs = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting) return;
        obs.disconnect();
        const t0 = performance.now();
        const dur = 1400;
        const paso = (t: number) => {
          const p = Math.min(1, (t - t0) / dur);
          setN(Math.round(valor * (1 - Math.pow(1 - p, 3)))); // desacelera al final
          if (p < 1) raf = requestAnimationFrame(paso);
        };
        setN(0);
        raf = requestAnimationFrame(paso);
      },
      { threshold: 0.5 }
    );
    obs.observe(el);
    return () => {
      obs.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [valor, reducido]);

  return (
    <span ref={ref} className={className} aria-label={String(valor)}>
      {n}
    </span>
  );
}
