"use client";

import { useEffect, useState } from "react";
import { Clock } from "lucide-react";
import { borrarPagoPendiente, esLinkDePago, leerCualquierPagoPendiente } from "@/lib/pedidoPendiente";

// Aviso del carrito cuando quedó un pago sin terminar (la persona cerró
// Mercado Pago o volvió con "atrás"). Como el carrito no se vacía hasta que el
// pago se acredita, la compra sigue ahí: se puede retomar el pago o empezar
// de nuevo.
export function PagoSinTerminar() {
  const [link, setLink] = useState<string | null>(null);

  useEffect(() => {
    const pendiente = leerCualquierPagoPendiente();
    if (pendiente && esLinkDePago(pendiente.initPoint)) setLink(pendiente.initPoint);
  }, []);

  if (!link) return null;

  return (
    <div role="status" className="mb-6 rounded-xl border border-tierra-ambar/40 bg-tierra-ambar/10 p-4 anim-sube">
      <p className="flex items-center gap-2 font-medium text-tierra-terracota-oscuro">
        <Clock size={18} /> Tenés un pago sin terminar
      </p>
      <p className="mt-1 text-sm text-tierra-terracota-oscuro/80">
        Tu compra quedó reservada por unos minutos. Podés retomar el pago donde lo dejaste.
      </p>
      <div className="mt-3 flex flex-wrap gap-3">
        <a href={link} className="btn-primario !py-2 text-sm">
          Volver a pagar
        </a>
        <button
          type="button"
          onClick={() => {
            borrarPagoPendiente();
            setLink(null);
          }}
          className="btn-secundario !py-2 text-sm"
        >
          Empezar de nuevo
        </button>
      </div>
    </div>
  );
}
