"use client";

import Link from "next/link";
import { Minus, Plus, X } from "lucide-react";
import { useCart } from "@/context/CartContext";

export default function CarritoPage() {
  const { items, actualizarCantidad, quitarItem, subtotal } = useCart();

  if (items.length === 0) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-16 text-center">
        <p className="text-tierra-bordo-oscuro/70">Tu carrito está vacío.</p>
        <Link href="/productos" className="btn-secundario mt-4 inline-flex">
          Ver catálogo
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-6 py-10">
      <h1 className="font-serif text-2xl md:text-3xl font-semibold text-tierra-bordo-oscuro mb-6">
        Carrito de compras
      </h1>

      <div className="bg-white border border-tierra-crema-oscuro rounded-lg divide-y divide-tierra-crema-oscuro">
        {items.map((item) => (
          <div key={item.varianteId} className="flex items-center gap-4 p-4">
            <div className="w-16 h-16 bg-tierra-crema-oscuro rounded overflow-hidden shrink-0">
              {item.imagen && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={item.imagen} alt={item.nombreProducto} className="w-full h-full object-cover" />
              )}
            </div>

            <div className="flex-1">
              <p className="font-medium text-tierra-bordo-oscuro">{item.nombreProducto}</p>
              <p className="text-xs text-tierra-bordo-oscuro/60">
                {[item.talla, item.color].filter(Boolean).join(" / ")}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => actualizarCantidad(item.varianteId, item.cantidad - 1)}
                aria-label="Restar una unidad"
                className="btn-icono"
              >
                <Minus size={14} />
              </button>
              <span className="w-6 text-center">{item.cantidad}</span>
              <button
                onClick={() => actualizarCantidad(item.varianteId, item.cantidad + 1)}
                aria-label="Sumar una unidad"
                className="btn-icono"
              >
                <Plus size={14} />
              </button>
            </div>

            <p className="w-24 text-right font-medium">
              ${(item.precioUnitario * item.cantidad).toLocaleString("es-AR")}
            </p>

            <button
              onClick={() => quitarItem(item.varianteId)}
              aria-label="Quitar del carrito"
              className="text-tierra-bordo-oscuro/40 hover:text-tierra-bordo transition-colors focus:outline-none focus:ring-2 focus:ring-tierra-bordo/40 rounded"
            >
              <X size={16} />
            </button>
          </div>
        ))}
      </div>

      <div className="mt-6 flex justify-between items-center">
        <p className="text-lg">
          Subtotal: <span className="font-bold">${subtotal.toLocaleString("es-AR")}</span>
        </p>
        <Link href="/checkout" className="btn-naranja">
          Continuar compra
        </Link>
      </div>
    </div>
  );
}
