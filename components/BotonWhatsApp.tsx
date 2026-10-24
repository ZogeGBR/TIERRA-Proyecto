"use client";

import { usePathname } from "next/navigation";
import { MessageCircle } from "lucide-react";
import { urlWhatsapp } from "@/lib/contacto";

// Botón flotante de WhatsApp. No aparece donde ya hay un botón propio de
// WhatsApp (alquiler) ni en el pago, para no distraer.
export function BotonWhatsApp() {
  const ruta = usePathname() ?? "/";
  if (ruta.startsWith("/alquiler") || ruta.startsWith("/checkout")) return null;
  return (
    <a
      href={urlWhatsapp("Hola Tierra! Quería hacerles una consulta.")}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Escribinos por WhatsApp"
      data-boton-whatsapp
      className="boton-whatsapp fixed bottom-5 right-5 z-20 flex h-14 w-14 items-center justify-center rounded-full bg-green-500 text-white shadow-lg transition-transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-green-600 focus:ring-offset-2"
    >
      <MessageCircle size={26} aria-hidden="true" />
    </a>
  );
}
