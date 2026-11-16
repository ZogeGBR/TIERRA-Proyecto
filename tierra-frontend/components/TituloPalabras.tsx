"use client";

import { useEffect, useRef, useState, type ElementType } from "react";

// Titular que entra palabra por palabra (sube + aparece, escalonado), como en
// el reel de F97. Una palabra puede ir destacada (cursiva y color).
//
// - modo "carga": para lo que ya se ve al abrir la pantalla. Es CSS puro: las
//   palabras arrancan invisibles y se animan solas, sin esperar a JavaScript.
// - modo "scroll": para títulos más abajo. Se ven normales desde el servidor;
//   recién al montarse, si el título está fuera de pantalla, se lo oculta y se
//   revela al entrar (mismo patrón seguro que `Revelar`: sin JS, se lee igual).
// El texto completo sigue siendo un solo título para lectores de pantalla.
export function TituloPalabras({
  texto,
  destacar,
  como: Etiqueta = "h2",
  modo = "carga",
  className = "",
  id
}: {
  texto: string;
  /** Palabra (o frase) del texto que va en cursiva y color de acento. */
  destacar?: string;
  como?: ElementType;
  modo?: "carga" | "scroll";
  className?: string;
  id?: string;
}) {
  const ref = useRef<HTMLElement>(null);
  const [estado, setEstado] = useState<"visible" | "oculto" | "listo">("visible");

  useEffect(() => {
    if (modo !== "scroll") return;
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    if (el.getBoundingClientRect().top < window.innerHeight * 0.9) return; // ya se ve: no se toca
    setEstado("oculto");
    const obs = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setEstado("listo");
          obs.disconnect();
        }
      },
      { threshold: 0.4 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [modo]);

  const partes = destacar && texto.includes(destacar) ? texto.split(destacar) : [texto];
  const palabras: { t: string; acento: boolean }[] = [];
  partes.forEach((trozo, i) => {
    trozo.split(/\s+/).filter(Boolean).forEach((t) => palabras.push({ t, acento: false }));
    if (i < partes.length - 1 && destacar) destacar.split(/\s+/).filter(Boolean).forEach((t) => palabras.push({ t, acento: true }));
  });

  return (
    <Etiqueta ref={ref} id={id} className={className} data-pal={modo === "scroll" ? estado : "carga"}>
      {palabras.map((p, i) => (
        <span key={i}>
          <span
            className={`pal ${p.acento ? "pal-acento" : ""}`}
            style={{ animationDelay: `${Math.min(i, 10) * 70}ms` }}
          >
            {p.t}
          </span>
          {i < palabras.length - 1 ? " " : ""}
        </span>
      ))}
    </Etiqueta>
  );
}
