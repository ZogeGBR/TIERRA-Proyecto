import type { Metadata } from "next";
import Link from "next/link";
import { Clock } from "lucide-react";
import { EstadoCompra } from "@/components/EstadoCompra";
import { numeroDePedido, pedidoDeLaUrl } from "@/lib/pedidoPendiente";
import { LimpiarCompra } from "../LimpiarCompra";

export const metadata: Metadata = {
  title: "Pago en proceso — Tierra",
  robots: { index: false }
};

// A acá vuelve Mercado Pago cuando el pago quedó en revisión (por ejemplo,
// una tarjeta que se está verificando). El pedido ya existe y tiene el stock
// reservado, así que se vacía el carrito igual que en un pago exitoso. Si el
// pago termina rechazado, el backend cancela el pedido por su cuenta.
export default async function CheckoutPendientePage({
  searchParams
}: {
  // Next 15: `searchParams` llega como una promesa.
  searchParams: Promise<{ external_reference?: string | string[] }>;
}) {
  const pedidoId = pedidoDeLaUrl((await searchParams).external_reference);

  return (
    <>
      <LimpiarCompra />
      <EstadoCompra
        tono="pendiente"
        icono={<Clock size={40} />}
        titulo="Tu pago está en proceso"
        acciones={
          <>
            <Link href="/productos" className="btn-primario">
              Seguir comprando
            </Link>
            <Link href="/" className="btn-secundario">
              Volver al inicio
            </Link>
          </>
        }
      >
        <p>Estamos procesando tu pago. Te avisamos por email.</p>
        <p>Evitá volver a pagar mientras tanto, así no se te cobra dos veces.</p>
        {pedidoId && (
          <p>
            Pedido <span className="font-semibold">N° {numeroDePedido(pedidoId)}</span>.
          </p>
        )}
      </EstadoCompra>
    </>
  );
}
