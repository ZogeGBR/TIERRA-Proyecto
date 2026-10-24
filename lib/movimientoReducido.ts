"use client";

import { useSyncExternalStore } from "react";

// ¿La persona pidió, en su sistema operativo, menos movimiento?
//
// Es una preferencia de accesibilidad (mareos, migrañas, epilepsia
// fotosensible) y también de quien quiere ahorrar batería. El CSS la respeta
// solo con @media (prefers-reduced-motion), pero lo que mueve JavaScript (el
// carrusel que avanza solo) necesita leerla acá.
//
// useSyncExternalStore en vez de useState + useEffect: se entera si la
// persona cambia la preferencia con el sitio abierto, y en el servidor
// devuelve `false` sin romper la hidratación.
const CONSULTA = "(prefers-reduced-motion: reduce)";

function suscribirse(avisar: () => void): () => void {
  const lista = window.matchMedia(CONSULTA);
  lista.addEventListener("change", avisar);
  return () => lista.removeEventListener("change", avisar);
}

function leer(): boolean {
  return window.matchMedia(CONSULTA).matches;
}

export function usePrefiereMovimientoReducido(): boolean {
  return useSyncExternalStore(suscribirse, leer, () => false);
}
