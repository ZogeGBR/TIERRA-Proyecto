"use client";

import { useRef, type ReactNode } from "react";

// Inclina apenas su contenido hacia donde está el mouse (profundidad en las
// tarjetas). Máximo 4°, con CSS variables y un cuadro por movimiento. Solo con
// mouse: en pantalla táctil y con "reducir movimiento" (lo apaga el CSS) no hace nada.
export function Inclinar({ children, className = "" }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const raf = useRef(0);

  function mover(e: React.PointerEvent) {
    if (e.pointerType !== "mouse") return;
    const el = ref.current;
    if (!el) return;
    const { clientX, clientY } = e;
    cancelAnimationFrame(raf.current);
    raf.current = requestAnimationFrame(() => {
      const r = el.getBoundingClientRect();
      const px = (clientX - r.left) / r.width - 0.5;
      const py = (clientY - r.top) / r.height - 0.5;
      el.style.setProperty("--ry", `${(px * 8).toFixed(2)}deg`);
      el.style.setProperty("--rx", `${(-py * 8).toFixed(2)}deg`);
    });
  }
  function salir() {
    cancelAnimationFrame(raf.current);
    const el = ref.current;
    if (!el) return;
    el.style.setProperty("--ry", "0deg");
    el.style.setProperty("--rx", "0deg");
  }

  return (
    <div ref={ref} className={`inclinar ${className}`} onPointerMove={mover} onPointerLeave={salir}>
      {children}
    </div>
  );
}
