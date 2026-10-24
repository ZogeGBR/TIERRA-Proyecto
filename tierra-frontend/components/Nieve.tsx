"use client";

import { useEffect, useRef } from "react";
import { usePrefiereMovimientoReducido } from "@/lib/movimientoReducido";

// Nevada animada en un <canvas> que cubre a su contenedor.
//
// - Tres capas de profundidad (lejos / medio / cerca): los copos lejanos son
//   chicos, lentos y tenues; los cercanos, grandes, rápidos y más suaves.
// - Cada copo se mece de costado (seno) y cae a velocidad propia; al salir por
//   abajo reaparece arriba en otra posición, sin saltos visibles.
// - Los copos se pintan desde "sprites" (un círculo con degradé por capa)
//   generados una vez: dibujar miles de degradés por cuadro sería caro.
// - Se frena si el bloque no se ve (IntersectionObserver) y el navegador ya
//   pausa requestAnimationFrame con la pestaña en segundo plano.
// - Con "reducir movimiento" se dibuja UN cuadro quieto, sin bucle.
// - pointer-events: none y aria-hidden: nunca tapa botones ni formularios.

type Copo = { x: number; y: number; r: number; vy: number; amp: number; frec: number; fase: number; capa: number };

const CAPAS = [
  { rMin: 1.3, rMax: 2.2, vMin: 14, vMax: 26, alfa: 0.8, peso: 0.5 },
  { rMin: 2.6, rMax: 4.0, vMin: 28, vMax: 48, alfa: 0.95, peso: 0.32 },
  { rMin: 5.0, rMax: 8.0, vMin: 52, vMax: 84, alfa: 0.85, peso: 0.18 }
];
const VIENTO = 9; // px/s de deriva hacia un costado

function crearSprite(suavidad: number): HTMLCanvasElement {
  const tam = 64;
  const c = document.createElement("canvas");
  c.width = c.height = tam;
  const g = c.getContext("2d")!;
  const d = g.createRadialGradient(tam / 2, tam / 2, 0, tam / 2, tam / 2, tam / 2);
  d.addColorStop(0, "rgba(255,255,255,1)");
  d.addColorStop(suavidad, "rgba(255,255,255,0.85)");
  d.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = d;
  g.fillRect(0, 0, tam, tam);
  return c;
}

export function Nieve({ className = "" }: { className?: string }) {
  const lienzo = useRef<HTMLCanvasElement>(null);
  const reducido = usePrefiereMovimientoReducido();

  useEffect(() => {
    const cv = lienzo.current;
    const padre = cv?.parentElement;
    if (!cv || !padre) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    const lienzoEl: HTMLCanvasElement = cv;
    const contexto: CanvasRenderingContext2D = ctx;

    const sprites = [crearSprite(0.35), crearSprite(0.15), crearSprite(0.02)];
    let ancho = 0;
    let alto = 0;
    let copos: Copo[] = [];
    let raf = 0;
    let visible = true;
    let t = 0;
    let anterior = performance.now();

    function nuevo(capa: number, inicio: boolean): Copo {
      const c = CAPAS[capa];
      return {
        x: Math.random() * ancho,
        y: inicio ? Math.random() * alto : -c.rMax * 2,
        r: c.rMin + Math.random() * (c.rMax - c.rMin),
        vy: c.vMin + Math.random() * (c.vMax - c.vMin),
        amp: 6 + Math.random() * 18,
        frec: 0.4 + Math.random() * 0.9,
        fase: Math.random() * Math.PI * 2,
        capa
      };
    }

    function armar() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      ancho = padre!.clientWidth;
      alto = padre!.clientHeight;
      lienzoEl.width = Math.max(1, Math.round(ancho * dpr));
      lienzoEl.height = Math.max(1, Math.round(alto * dpr));
      contexto.setTransform(dpr, 0, 0, dpr, 0, 0);
      // Cantidad según el área, con tope: en celular, menos copos.
      const total = Math.round(Math.min(200, Math.max(45, (ancho * Math.min(alto, 1100)) / 7000)));
      copos = [];
      CAPAS.forEach((c, i) => {
        const n = Math.round(total * c.peso);
        for (let k = 0; k < n; k++) copos.push(nuevo(i, true));
      });
    }

    function dibujar() {
      contexto.clearRect(0, 0, ancho, alto);
      for (const f of copos) {
        const c = CAPAS[f.capa];
        const x = f.x + Math.sin(t * f.frec + f.fase) * f.amp;
        contexto.globalAlpha = c.alfa;
        const lado = f.r * 2;
        contexto.drawImage(sprites[f.capa], x - f.r, f.y - f.r, lado, lado);
      }
      contexto.globalAlpha = 1;
    }

    function cuadro(ahora: number) {
      const dt = Math.min(ahora - anterior, 64) / 1000;
      anterior = ahora;
      if (visible) {
        t += dt;
        for (let i = 0; i < copos.length; i++) {
          const f = copos[i];
          f.y += f.vy * dt;
          f.x += VIENTO * dt * (0.5 + f.capa * 0.5);
          if (f.y - f.r > alto) copos[i] = nuevo(f.capa, false);
          else if (f.x - f.amp > ancho) f.x = -f.amp;
        }
        dibujar();
      }
      raf = requestAnimationFrame(cuadro);
    }

    armar();
    dibujar();
    const obsTamano = typeof ResizeObserver !== "undefined" ? new ResizeObserver(() => { armar(); dibujar(); }) : null;
    obsTamano?.observe(padre);
    if (reducido) {
      return () => obsTamano?.disconnect();
    }
    const obsVista =
      typeof IntersectionObserver !== "undefined" ? new IntersectionObserver(([e]) => (visible = e.isIntersecting), { threshold: 0 }) : null;
    obsVista?.observe(padre);
    raf = requestAnimationFrame(cuadro);
    return () => {
      cancelAnimationFrame(raf);
      obsTamano?.disconnect();
      obsVista?.disconnect();
    };
  }, [reducido]);

  return <canvas ref={lienzo} aria-hidden="true" data-nieve className={`pointer-events-none absolute inset-0 h-full w-full ${className}`} />;
}
