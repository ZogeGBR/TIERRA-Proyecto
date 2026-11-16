import type { Metadata } from "next";
import { ListaPedidos } from "./ListaPedidos";

export const metadata: Metadata = {
  title: "Mis pedidos — Tierra",
  // Página personal: no tiene nada que hacer en un buscador.
  robots: { index: false }
};

export default function MisPedidosPage() {
  return <ListaPedidos />;
}
