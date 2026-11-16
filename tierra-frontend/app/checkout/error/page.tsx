import type { Metadata } from "next";
import Link from "next/link";
import { XCircle } from "lucide-react";
import { EstadoCompra } from "@/components/EstadoCompra";
import { VolverAPagar } from "@/components/checkout/VolverAPagar";

export const metadata: Metadata = {
  title: "No se pudo completar el pago — Tierra",
  robots: { index: false }
};

// A acá vuelve Mercado Pago cuando el pago falló o se canceló. A propósito NO
// se vacía el carrito ni se olvida el pedido pendiente: la persona tiene que
// poder intentarlo de nuevo sin volver a elegir todo.
export default function CheckoutErrorPage() {
  return (
    <EstadoCompra
      tono="error"
      icono={<XCircle size={40} />}
      titulo="No pudimos completar el pago"
      acciones={
        <>
          <VolverAPagar />
          <Link href="/carrito" className="btn-secundario">
            Ver mi carrito
          </Link>
        </>
      }
    >
      <p>El pago no se completó. No se hizo ningún cobro. Tu carrito sigue como lo dejaste.</p>
      <p>Podés volver a pagar, con el mismo u otro medio de pago, sin armar la compra de nuevo.</p>
    </EstadoCompra>
  );
}
