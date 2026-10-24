"use client";

import { TituloPalabras } from "@/components/TituloPalabras";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Pause, Play } from "lucide-react";
import { ProductCard } from "@/components/ProductCard";
import { PESTANIAS, pestaniasConProductos, type TipoRanking } from "@/lib/rankings";
import { usePrefiereMovimientoReducido } from "@/lib/movimientoReducido";
import type { ProductoResumen } from "@/lib/types";

// Carrusel de "Más vendidos" / "Más buscados" de la home.
//
// - Solo se muestran las pestañas que tienen productos; si no hay ninguna,
//   no se dibuja nada (la home no queda con un hueco ni con datos inventados).
// - Se desplaza SOLO, de forma continua y suave (como el carrusel del inicio).
//   Se frena mientras el mouse está encima, hay foco adentro, se arrastra con
//   el dedo o el mouse, o se aprieta el botón de pausa (que existe para quien
//   no puede o no quiere leer algo en movimiento).
// - Con "reducir movimiento" no se mueve solo: queda un scroll horizontal
//   común (con scroll-snap, flechas y teclado).
// - Fluidez: cada cuadro solo cambia `transform` (lo resuelve la GPU, sin
//   recalcular la página) y el avance se calcula con el tiempo real
//   transcurrido, no con "píxeles por cuadro": a 60 o a 144 Hz va a la misma
//   velocidad.
// - El bucle es infinito sin saltos: la lista se repite, y cuando se recorrió
//   exactamente un ancho de lista se vuelve al inicio (se ve idéntico).
const VELOCIDAD_PX_POR_SEG = 40;
const MIN_TARJETAS_POR_LISTA = 8; // con pocas tarjetas la lista se repite hasta llenar

export function CarruselProductos({ listas }: { listas: Record<TipoRanking, ProductoResumen[]> }) {
  // Sin ningún ranking no se dibuja nada (la home sigue sin el carrusel).
  if (pestaniasConProductos(listas).length === 0) return null;
  return <CarruselConProductos listas={listas} />;
}

function CarruselConProductos({ listas }: { listas: Record<TipoRanking, ProductoResumen[]> }) {
  const visibles = pestaniasConProductos(listas);
  const [activa, setActiva] = useState<TipoRanking>(visibles[0]?.tipo ?? "vendidos");
  const pista = useRef<HTMLDivElement>(null);
  const [puedeIr, setPuedeIr] = useState({ atras: false, adelante: false });
  const reducido = usePrefiereMovimientoReducido();
  const id = useId();

  // --- Movimiento continuo ---
  const marco = useRef<HTMLDivElement>(null);
  const cinta = useRef<HTMLDivElement>(null);
  const posicion = useRef(0); // px recorridos dentro de una lista
  const anchoLista = useRef(0);
  const arrastre = useRef<{ x: number; pos: number } | null>(null);
  const restante = useRef(0); // px que faltan para llegar al destino de una flecha (se consumen suavemente)
  const inercia = useRef(0); // px/s que quedan tras soltar un arrastre (se frena sola)
  const factor = useRef(1); // 0 = frenado, 1 = velocidad normal; cambia con suavidad, sin tirones
  const ultimoMov = useRef<{ x: number; t: number } | null>(null);
  const huboArrastre = useRef(false); // para que el clic que sigue a un arrastre no abra el producto
  const [pausaManual, setPausaManual] = useState(false);
  const [encima, setEncima] = useState(false); // mouse o foco adentro
  const [arrastrando, setArrastrando] = useState(false);
  const enPausa = pausaManual || encima || arrastrando;
  const enPausaRef = useRef(false);
  enPausaRef.current = enPausa;

  const medir = useCallback(() => {
    const el = pista.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    setPuedeIr({ atras: el.scrollLeft > 4, adelante: el.scrollLeft < max - 4 });
  }, []);

  // Al cambiar de pestaña se vuelve al principio y se vuelven a medir las flechas.
  useEffect(() => {
    const el = pista.current;
    if (el) el.scrollLeft = 0;
    medir();
  }, [activa, medir]);

  useEffect(() => {
    const el = pista.current;
    if (!el) return;
    medir();
    const obs = typeof ResizeObserver !== "undefined" ? new ResizeObserver(medir) : null;
    obs?.observe(el);
    return () => obs?.disconnect();
  }, [medir, visibles.length]);

  // Si la pestaña activa dejó de tener productos, se usa la primera que tenga.
  const tipo = visibles.some((p) => p.tipo === activa) ? activa : visibles[0].tipo;
  const productos = listas[tipo] ?? [];

  // Lista que se repite: los mismos productos hasta tener al menos
  // MIN_TARJETAS_POR_LISTA (si no, con 3 productos habría huecos en pantalla).
  const lista: ProductoResumen[] = [];
  if (productos.length > 0) {
    while (lista.length < MIN_TARJETAS_POR_LISTA) lista.push(...productos);
  }

  const seMueveSolo = !reducido;

  // Bucle de animación. Un solo requestAnimationFrame; se detiene solo cuando
  // la pestaña del navegador está en segundo plano (el navegador lo pausa).
  useEffect(() => {
    if (!seMueveSolo) return;
    const el = cinta.current;
    if (!el) return;
    let raf = 0;
    let anterior = performance.now();
    let visible = true;

    const obs =
      typeof IntersectionObserver !== "undefined"
        ? new IntersectionObserver(([e]) => (visible = e.isIntersecting), { threshold: 0 })
        : null;
    if (marco.current) obs?.observe(marco.current);

    function aplicar() {
      const ancho = anchoLista.current;
      if (ancho > 0) {
        // Módulo: vuelve al inicio sin salto porque la segunda lista es idéntica.
        posicion.current = ((posicion.current % ancho) + ancho) % ancho;
      }
      el!.style.transform = `translate3d(${-posicion.current}px,0,0)`;
    }

    function cuadro(ahora: number) {
      // Tope de 64 ms: si la pestaña estuvo dormida no se "salta" de golpe.
      const dt = Math.min(ahora - anterior, 64) / 1000;
      anterior = ahora;
      if (visible) {
        // Frenar y arrancar con suavidad (al pasar el mouse o al soltar), no de golpe.
        const meta = enPausaRef.current ? 0 : 1;
        factor.current += (meta - factor.current) * (1 - Math.exp(-dt * 5));
        posicion.current += VELOCIDAD_PX_POR_SEG * factor.current * dt;
        // Empujón de las flechas: se recorre con desaceleración exponencial.
        if (restante.current !== 0) {
          const d = restante.current * (1 - Math.exp(-dt * 7));
          posicion.current += d;
          restante.current -= d;
          if (Math.abs(restante.current) < 0.4) {
            posicion.current += restante.current;
            restante.current = 0;
          }
        }
        // Inercia tras arrastrar con el dedo o el mouse.
        if (!arrastre.current && Math.abs(inercia.current) > 6) {
          posicion.current += inercia.current * dt;
          inercia.current *= Math.exp(-dt * 3.2);
        }
      }
      aplicar();
      raf = requestAnimationFrame(cuadro);
    }
    // El ancho de una lista solo cambia al cambiar de pestaña o de tamaño de pantalla.
    const medirAncho = () => {
      anchoLista.current = el.scrollWidth / 2;
    };
    medirAncho();
    const obsTamano = typeof ResizeObserver !== "undefined" ? new ResizeObserver(medirAncho) : null;
    obsTamano?.observe(el);
    raf = requestAnimationFrame(cuadro);
    return () => {
      cancelAnimationFrame(raf);
      obs?.disconnect();
      obsTamano?.disconnect();
    };
  }, [seMueveSolo, tipo]);

  // Al cambiar de pestaña o de modo, se arranca desde el principio.
  useEffect(() => {
    posicion.current = 0;
    if (cinta.current) cinta.current.style.transform = "translate3d(0,0,0)";
  }, [tipo, seMueveSolo]);

  function empujar(dir: -1 | 1) {
    // Un "pasito" de ~3 tarjetas. El bucle de animación lo recorre con una
    // desaceleración suave (acumulable: apretar dos veces seguidas suma).
    restante.current += dir * 212 * 3;
    inercia.current = 0;
  }

  function alPresionar(e: React.PointerEvent) {
    if (!seMueveSolo) return;
    arrastre.current = { x: e.clientX, pos: posicion.current };
    ultimoMov.current = { x: e.clientX, t: performance.now() };
    inercia.current = 0;
    restante.current = 0;
    huboArrastre.current = false;
  }
  function alMover(e: React.PointerEvent) {
    const a = arrastre.current;
    if (!a) return;
    const dx = e.clientX - a.x;
    if (!huboArrastre.current && Math.abs(dx) > 6) {
      huboArrastre.current = true;
      setArrastrando(true);
      (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
    }
    if (huboArrastre.current) {
      posicion.current = a.pos - dx;
      const u = ultimoMov.current;
      const ahora = performance.now();
      if (u && ahora > u.t) {
        const v = -((e.clientX - u.x) / (ahora - u.t)) * 1000; // px/s, signo de avance
        inercia.current = inercia.current * 0.6 + Math.max(-2500, Math.min(2500, v)) * 0.4;
      }
      ultimoMov.current = { x: e.clientX, t: ahora };
    }
  }
  function alSoltar() {
    arrastre.current = null;
    ultimoMov.current = null;
    if (!huboArrastre.current) inercia.current = 0;
    setArrastrando(false);
  }


  function mover(dir: -1 | 1) {
    if (seMueveSolo) {
      empujar(dir);
      return;
    }
    const el = pista.current;
    if (!el) return;
    el.scrollBy({ left: dir * el.clientWidth * 0.85, behavior: "auto" });
  }

  return (
    <section className="seccion" aria-labelledby={`${id}-titulo`}>
      <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
        <TituloPalabras como="h2" modo="scroll" id={`${id}-titulo`} texto="Lo que más se elige" destacar="más se elige" className="font-serif text-2xl md:text-3xl font-semibold text-tierra-terracota-oscuro" />

        <div className="flex items-center gap-3">
          {visibles.length > 1 && (
            <div role="tablist" aria-label="Tipo de ranking" className="inline-flex rounded-full bg-white/70 p-1 shadow-sm">
              {visibles.map((p) => {
                const elegida = p.tipo === tipo;
                return (
                  <button
                    key={p.tipo}
                    id={`${id}-tab-${p.tipo}`}
                    role="tab"
                    type="button"
                    aria-selected={elegida}
                    aria-controls={`${id}-panel`}
                    onClick={() => setActiva(p.tipo)}
                    className={`rounded-full px-4 py-1.5 text-sm font-medium transition-[background-color,color] duration-200
                                focus:outline-none focus:ring-2 focus:ring-tierra-verde ${
                                  elegida
                                    ? "bg-tierra-terracota text-white"
                                    : "text-tierra-terracota-oscuro hover:bg-tierra-crema"
                                }`}
                  >
                    {p.etiqueta}
                  </button>
                );
              })}
            </div>
          )}

          {seMueveSolo && (
            <button
              type="button"
              onClick={() => setPausaManual((v) => !v)}
              aria-pressed={pausaManual}
              aria-label={pausaManual ? "Reanudar el movimiento del carrusel" : "Pausar el movimiento del carrusel"}
              className="w-10 h-10 rounded-full bg-white shadow-md flex items-center justify-center text-tierra-terracota-oscuro
                         transition-transform hover:scale-105 active:scale-95
                         focus:outline-none focus:ring-2 focus:ring-tierra-verde"
            >
              {pausaManual ? <Play size={16} aria-hidden="true" /> : <Pause size={16} aria-hidden="true" />}
            </button>
          )}

          <div className="hidden sm:flex gap-2">
            {([-1, 1] as const).map((dir) => {
              // En movimiento continuo no hay principio ni fin: las flechas siempre sirven.
              const deshabilitada = seMueveSolo ? false : dir === -1 ? !puedeIr.atras : !puedeIr.adelante;
              return (
                <button
                  key={dir}
                  type="button"
                  onClick={() => mover(dir)}
                  disabled={deshabilitada}
                  aria-label={dir === -1 ? "Anteriores" : "Siguientes"}
                  className="w-10 h-10 rounded-full bg-white shadow-md flex items-center justify-center text-tierra-terracota-oscuro
                             transition-[opacity,transform] hover:scale-105 active:scale-95 disabled:opacity-35 disabled:hover:scale-100
                             focus:outline-none focus:ring-2 focus:ring-tierra-verde"
                >
                  {dir === -1 ? <ChevronLeft size={18} aria-hidden="true" /> : <ChevronRight size={18} aria-hidden="true" />}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div
        id={`${id}-panel`}
        role="tabpanel"
        aria-labelledby={visibles.length > 1 ? `${id}-tab-${tipo}` : `${id}-titulo`}
      >
        {seMueveSolo ? (
          <div
            ref={marco}
            key={`m-${tipo}`}
            className="carrusel-productos carrusel-continuo anim-sube"
            onMouseEnter={() => setEncima(true)}
            onMouseLeave={() => setEncima(false)}
            onFocusCapture={() => setEncima(true)}
            onBlurCapture={(e) => {
              if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setEncima(false);
            }}
            onPointerDown={alPresionar}
            onPointerMove={alMover}
            onPointerUp={alSoltar}
            onPointerCancel={alSoltar}
            // Si se arrastró, el clic que sigue no debe abrir el producto.
            onClickCapture={(e) => {
              if (huboArrastre.current) {
                e.preventDefault();
                e.stopPropagation();
                huboArrastre.current = false;
              }
            }}
          >
            <div ref={cinta} className="carrusel-cinta">
              {[0, 1].map((copia) => (
                <div
                  key={copia}
                  className="flex shrink-0"
                  // La copia es solo para cerrar el bucle: no se lee ni se enfoca.
                  aria-hidden={copia === 1 || undefined}
                  inert={copia === 1 ? true : undefined}
                >
                  {lista.map((p, i) => (
                    <div key={`${p.id}-${i}`} className="w-48 shrink-0 mr-5 [&>*]:h-full">
                      <ProductCard producto={p} />
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div
            ref={pista}
            onScroll={medir}
            // key: al cambiar de pestaña las tarjetas entran con la animación de siempre.
            key={tipo}
            className="carrusel-productos flex gap-5 overflow-x-auto snap-x snap-mandatory pb-4 -mx-1 px-1 anim-sube"
          >
            {productos.map((p) => (
              <div key={p.id} className="w-48 shrink-0 snap-start [&>*]:h-full">
                <ProductCard producto={p} />
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
