"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { RotateCcw } from "lucide-react";
import { esLinkDePago, leerCualquierPagoPendiente } from "@/lib/pedidoPendiente";

// Botón "Volver a pagar" de la página de pago fallido.
//
// Reabre el MISMO link de Mercado Pago que se guardó al comprar, mientras no
// haya vencido: el link admite varios intentos, así que no se crea otro
// pedido ni se reserva el stock otra vez, y no hace falta ni hablar con el
// backend. Si el link ya venció (o se abrió esta página en otro navegador,
// donde no hay nada guardado), se ofrece volver al checkout: el carrito sigue
// intacto.
export function VolverAPagar() {
  // undefined = todavía no se miró (el servidor no tiene sessionStorage).
  const [link, setLink] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    const pendiente = leerCualquierPagoPendiente();
    setLink(pendiente && esLinkDePago(pendiente.initPoint) ? pendiente.initPoint : null);
  }, []);

  if (link === undefined) return <span className="skeleton inline-block h-12 w-44 rounded-full" aria-hidden="true" />;

  if (link) {
    return (
      <a href={link} className="btn-primario">
        <RotateCcw size={16} /> Volver a pagar
      </a>
    );
  }

  return (
    <Link href="/checkout" className="btn-primario">
      Volver al checkout
    </Link>
  );
}
