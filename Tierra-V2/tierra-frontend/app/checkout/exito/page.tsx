import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { EstadoCompra } from "@/components/EstadoCompra";
import { numeroDePedido, pedidoDeLaUrl } from "@/lib/pedidoPendiente";
import { LimpiarCompra } from "../LimpiarCompra";

export const metadata: Metadata = {
  title: "Pago recibido — Tierra",
  // Página transaccional: no tiene nada que hacer en un buscador.
  robots: { index: false }
};

// A acá vuelve Mercado Pago después de un pago aprobado.
//
// OJO con lo que dice: llegar a esta URL NO prueba que se haya pagado
// (cualquiera puede escribirla a mano). La confirmación real es la
// notificación que Mercado Pago le manda al backend. Por eso se dice
// "recibimos tu pago y lo estamos acreditando" y no "pago aprobado". Tampoco
// se promete un email: el módulo de emails todavía no existe.
export default function CheckoutExitoPage({
  searchParams
}: {
  searchParams: { external_reference?: string | string[] };
}) {
  const pedidoId = pedidoDeLaUrl(searchParams.external_reference);

  return (
    <>
      <LimpiarCompra />
      <EstadoCompra
        tono="exito"
        icono={<CheckCircle2 size={40} className="anim-circulo" />}
        titulo="¡Gracias por tu compra!"
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
        <p>¡Listo! Recibimos tu pago. Te mandamos la confirmación por email.</p>
        {pedidoId && (
          <p>
            Tu pedido <span className="font-semibold">N° {numeroDePedido(pedidoId)}</span> quedó registrado. Guardá
            el número por si necesitás consultarnos por él.
          </p>
        )}
      </EstadoCompra>
    </>
  );
}
