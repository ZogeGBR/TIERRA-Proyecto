"use client";

import Link from "next/link";
import { Minus, Plus, X, ShoppingBag } from "lucide-react";
import { useCart } from "@/context/CartContext";

export default function CarritoPage() {
  const { items, actualizarCantidad, quitarItem, subtotal } = useCart();

  if (items.length === 0) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-16 text-center">
        <div className="w-16 h-16 mx-auto rounded-full bg-tierra-crema-oscuro flex items-center justify-center mb-4">
          <ShoppingBag size={28} className="text-tierra-terracota" />
        </div>
        <p className="text-tierra-terracota-oscuro/70">Tu carrito está vacío.</p>
        <Link href="/productos" className="btn-secundario mt-4 inline-flex">
          Ver catálogo
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-6 py-10">
      <h1 className="font-serif text-2xl md:text-3xl font-semibold text-tierra-terracota-oscuro mb-6">
        Carrito de compras
      </h1>

      <div className="bg-white border border-tierra-crema-oscuro rounded-lg divide-y divide-tierra-crema-oscuro overflow-hidden">
        {items.map((item) => (
          <div key={item.varianteId} className="flex items-center gap-4 p-4">
            <div className="w-16 h-16 bg-tierra-crema-oscuro rounded-lg overflow-hidden shrink-0">
              {item.imagen && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={item.imagen} alt={item.nombreProducto} className="w-full h-full object-cover" />
              )}
            </div>

            <div className="flex-1">
              <p className="font-medium text-tierra-terracota-oscuro">{item.nombreProducto}</p>
              <p className="text-xs text-tierra-terracota-oscuro/60">
                {[item.talla, item.color].filter(Boolean).join(" / ")}
              </p>
            </div>

            <div className="flex items-center gap-1 bg-tierra-crema rounded-full p-1">
              <button
                onClick={() => actualizarCantidad(item.varianteId, item.cantidad - 1)}
                aria-label="Restar una unidad"
                className="w-7 h-7 rounded-full bg-white text-tierra-terracota flex items-center justify-center shadow-sm hover:bg-tierra-terracota hover:text-white transition-colors"
              >
                <Minus size={13} />
              </button>
              <span className="w-7 text-center text-sm font-medium text-tierra-terracota-oscuro">{item.cantidad}</span>
              <button
                onClick={() => actualizarCantidad(item.varianteId, item.cantidad + 1)}
                aria-label="Sumar una unidad"
                className="w-7 h-7 rounded-full bg-white text-tierra-terracota flex items-center justify-center shadow-sm hover:bg-tierra-terracota hover:text-white transition-colors"
              >
                <Plus size={13} />
              </button>
            </div>

            <p className="w-24 text-right font-bold text-tierra-terracota-oscuro">
              ${(item.precioUnitario * item.cantidad).toLocaleString("es-AR")}
            </p>

            <button
              onClick={() => quitarItem(item.varianteId)}
              aria-label="Quitar del carrito"
              className="text-tierra-terracota-oscuro/40 hover:text-tierra-terracota transition-colors focus:outline-none focus:ring-2 focus:ring-tierra-terracota/40 rounded"
            >
              <X size={16} />
            </button>
          </div>
        ))}
      </div>

      <div className="mt-6 flex justify-between items-center bg-gradient-to-r from-tierra-crema via-white to-tierra-crema border border-tierra-crema-oscuro rounded-lg px-6 py-4">
        <p className="text-lg text-tierra-terracota-oscuro">
          Subtotal: <span className="font-bold">${subtotal.toLocaleString("es-AR")}</span>
        </p>
        <Link href="/checkout" className="btn-naranja">
          Continuar compra
        </Link>
      </div>
    </div>
  );
}
