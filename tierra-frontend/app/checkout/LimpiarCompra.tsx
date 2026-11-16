"use client";

import { useEffect } from "react";
import { useCart } from "@/context/CartContext";
import { borrarPagoPendiente } from "@/lib/pedidoPendiente";

// No dibuja nada: solo, al aparecer, vacía el carrito y se olvida del pedido
// pendiente. Se monta únicamente en las páginas donde la compra ya no se va
// a reintentar (éxito y pago en proceso). El carrito NO se vacía antes de
// pagar justamente para no perderlo si la persona abandona Mercado Pago.
export function LimpiarCompra() {
  const { vaciarCarrito } = useCart();

  useEffect(() => {
    vaciarCarrito();
    borrarPagoPendiente();
    // Lista vacía a propósito: vaciarCarrito cambia de identidad en cada
    // render del CartProvider, y vaciar el carrito lo vuelve a renderizar.
    // Con esa función como dependencia esto entraría en un bucle.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
