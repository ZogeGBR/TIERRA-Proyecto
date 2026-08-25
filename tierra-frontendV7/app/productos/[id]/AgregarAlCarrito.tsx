"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/context/CartContext";
import type { ProductoDetalle } from "@/lib/types";

export function AgregarAlCarrito({ producto }: { producto: ProductoDetalle }) {
  const { agregarItem } = useCart();
  const router = useRouter();
  const [varianteId, setVarianteId] = useState(producto.variantes[0]?.id ?? "");
  const [cantidad, setCantidad] = useState(1);
  const [mensaje, setMensaje] = useState<string | null>(null);

  const variante = producto.variantes.find((v) => v.id === varianteId);

  function handleAgregar() {
    if (!variante) return;
    if (variante.stock < cantidad) {
      setMensaje(`Solo quedan ${variante.stock} unidades de esta variante.`);
      return;
    }

    agregarItem({
      varianteId: variante.id,
      productoId: producto.id,
      nombreProducto: producto.nombre,
      talla: variante.talla,
      color: variante.color,
      precioUnitario: producto.precio,
      cantidad,
      imagen: producto.imagenes[0] ?? null
    });

    setMensaje("Agregado al carrito.");
  }

  if (producto.variantes.length === 0) {
    return <p className="mt-6 text-tierra-bordo-oscuro/60">Sin variantes disponibles por ahora.</p>;
  }

  return (
    <div className="mt-6">
      <label className="block text-sm font-medium text-tierra-bordo-oscuro mb-1">Talla / color</label>
      <select
        value={varianteId}
        onChange={(e) => setVarianteId(e.target.value)}
        className="border border-tierra-crema-oscuro rounded px-3 py-2 w-full"
      >
        {producto.variantes.map((v) => (
          <option key={v.id} value={v.id} disabled={v.stock === 0}>
            {[v.talla, v.color].filter(Boolean).join(" / ") || v.sku} {v.stock === 0 ? "(sin stock)" : ""}
          </option>
        ))}
      </select>

      <div className="mt-4 flex items-center gap-3">
        <input
          type="number"
          min={1}
          max={variante?.stock ?? 1}
          value={cantidad}
          onChange={(e) => setCantidad(Number(e.target.value))}
          className="border border-tierra-crema-oscuro rounded px-3 py-2 w-20"
        />
        <button
          onClick={handleAgregar}
          className="flex-1 bg-tierra-azul text-white py-3 rounded-full font-medium"
        >
          Agregar al carrito
        </button>
      </div>

      {mensaje && <p className="mt-2 text-sm text-tierra-bordo-oscuro">{mensaje}</p>}

      <button
        onClick={() => router.push("/carrito")}
        className="mt-3 text-sm text-tierra-azul underline"
      >
        Ir al carrito
      </button>
    </div>
  );
}
