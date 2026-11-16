"use client";

import { usePathname } from "next/navigation";
import { VideoFondo, type FuenteVideo } from "@/components/VideoFondo";

// A diferencia del layout, el template se vuelve a montar en cada navegación:
// así cada pantalla entra con un fundido suave. Solo opacidad (nada de
// transform): un transform en este contenedor rompería los elementos
// `position: fixed` de adentro (la tarjeta del hero) mientras dura la animación.
//
// También marca el tema de la ruta (`data-ruta-tema`). El CSS lo lee con
// `body:has([data-ruta-tema="…"])`, así el header, el footer y el fondo cambian
// de color sin JavaScript extra y vuelven solos al salir de la pantalla.
function temaDeLaRuta(ruta: string): "invierno" | "tierra" | "neutro" {
  if (ruta === "/alquiler" || ruta.startsWith("/alquiler/")) return "invierno";
  if (ruta.startsWith("/productos") || ruta.startsWith("/carrito") || ruta.startsWith("/checkout") || ruta.startsWith("/cuenta")) return "tierra";
  return "neutro";
}

// Dónde va cada video (alternados y sin repetir en pantallas seguidas, para que
// el sitio tenga movimiento sin cargarse): catálogo → ondas; ficha de producto →
// ondas suaves; carrito → cordillera; pago → cordillera tenue.
function franjaDeLaRuta(ruta: string): { fuente: FuenteVideo; nivel: "normal" | "suave" } | null {
  if (ruta === "/productos") return { fuente: "ondas", nivel: "normal" };
  if (ruta.startsWith("/productos/")) return { fuente: "ondas", nivel: "suave" };
  if (ruta === "/carrito") return { fuente: "montana", nivel: "normal" };
  if (ruta === "/checkout") return { fuente: "montana", nivel: "suave" };
  return null;
}

export default function Template({ children }: { children: React.ReactNode }) {
  const ruta = usePathname() ?? "/";
  const franja = franjaDeLaRuta(ruta);
  return (
    <div className="anim-pagina relative isolate" data-ruta-tema={temaDeLaRuta(ruta)}>
      {franja && <VideoFondo fuente={franja.fuente} className={`franja-video franja-video-${franja.nivel}`} />}
      {children}
    </div>
  );
}
