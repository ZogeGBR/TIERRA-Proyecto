"use client";

import { useEffect, useRef, useState } from "react";

// Caminos de colores que serpentean por el fondo de una sección: se "dibujan"
// solos al entrar en pantalla y después se mecen apenas. Es un SVG decorativo
// (aria-hidden, sin interacción): solo anima `stroke-dashoffset` una vez y
// `transform` en bucle lento. Con "reducir movimiento" quedan dibujados y quietos
// (lo resuelve el CSS global). Sin JavaScript también se ven completos.
const CAMINOS = [
  { d: "M-20 300 C 160 220, 260 360, 430 280 S 700 150, 860 230 S 1100 330, 1230 190", color: "#B8571F", ancho: 9, op: 0.45, retraso: 0 },
  { d: "M-20 120 C 140 60, 300 200, 480 130 S 760 20, 930 110 S 1110 90, 1230 40", color: "#2B5F4E", ancho: 7, op: 0.45, retraso: 250 },
  { d: "M-20 360 C 200 330, 330 250, 520 330 S 800 390, 980 320 S 1130 250, 1230 300", color: "#E08A2B", ancho: 11, op: 0.45, retraso: 500 },
  { d: "M-20 210 C 180 160, 280 270, 470 210 S 720 110, 900 180 S 1120 230, 1230 120", color: "#8FB39D", ancho: 6, op: 0.7, retraso: 750 },
  { d: "M300 -10 C 360 80, 280 160, 380 240 S 330 340, 420 410", color: "#EAD9BE", ancho: 12, op: 0.9, retraso: 1000 }
];

export function CaminosColores({ className = "" }: { className?: string }) {
  const ref = useRef<SVGSVGElement>(null);
  const [visto, setVisto] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const obs = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setVisto(true);
          obs.disconnect();
        }
      },
      { threshold: 0.25 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <svg
      ref={ref}
      aria-hidden="true"
      data-caminos
      data-visto={visto ? "si" : "no"}
      className={`caminos-colores ${className}`}
      viewBox="0 0 1200 420"
      preserveAspectRatio="xMidYMid slice"
      fill="none"
    >
      <g className="caminos-mece">
        {CAMINOS.map((c, i) => (
          <path
            key={i}
            d={c.d}
            pathLength={1}
            stroke={c.color}
            strokeWidth={c.ancho}
            strokeLinecap="round"
            opacity={c.op}
            className="camino"
            style={{ animationDelay: `${c.retraso}ms` }}
          />
        ))}
        {/* Paradas en el camino */}
        {[[430, 280, "#B8571F"], [930, 110, "#2B5F4E"], [980, 320, "#E08A2B"], [470, 210, "#8FB39D"]].map(([x, y, color], i) => (
          <circle key={i} cx={x as number} cy={y as number} r={9} fill={color as string} className="camino-parada" style={{ animationDelay: `${1200 + i * 220}ms` }} />
        ))}
      </g>
    </svg>
  );
}
