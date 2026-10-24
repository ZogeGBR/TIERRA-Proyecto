"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import type { ItemCarrito } from "@/lib/types";
import { guardarCarrito, leerCarritoGuardado } from "@/lib/carritoGuardado";

interface CartContextValue {
  items: ItemCarrito[];
  agregarItem: (item: ItemCarrito) => void;
  quitarItem: (varianteId: string) => void;
  actualizarCantidad: (varianteId: string, cantidad: number) => void;
  vaciarCarrito: () => void;
  subtotal: number;
  /** false hasta que se leyó el carrito guardado: antes de eso `items` está vacío sin ser cierto. */
  listo: boolean;
}

const CartContext = createContext<CartContextValue | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ItemCarrito[]>([]);
  // Falso hasta que se leyó lo guardado. Sin esto, el primer render (carrito
  // vacío) se escribía en localStorage ANTES de que el estado se cargara, y
  // lo único que evitaba perder el carrito era el orden en que React corre
  // los dos efectos -- correcto pero frágil.
  const [hidratado, setHidratado] = useState(false);

  // Persistencia simple en localStorage: alcanza para un carrito de invitado
  // (el checkout no exige cuenta, así que no hay a quién asignarle un carrito
  // en el backend). La lectura y la escritura están en lib/carritoGuardado,
  // que no lanza ante un valor corrupto o un almacenamiento bloqueado.
  useEffect(() => {
    setItems(leerCarritoGuardado());
    setHidratado(true);
  }, []);

  useEffect(() => {
    if (!hidratado) return;
    guardarCarrito(items);
  }, [items, hidratado]);

  function agregarItem(nuevo: ItemCarrito) {
    setItems((prev) => {
      const existente = prev.find((i) => i.varianteId === nuevo.varianteId);
      if (existente) {
        return prev.map((i) =>
          i.varianteId === nuevo.varianteId ? { ...i, cantidad: i.cantidad + nuevo.cantidad } : i
        );
      }
      return [...prev, nuevo];
    });
  }

  function quitarItem(varianteId: string) {
    setItems((prev) => prev.filter((i) => i.varianteId !== varianteId));
  }

  function actualizarCantidad(varianteId: string, cantidad: number) {
    if (cantidad <= 0) return quitarItem(varianteId);
    setItems((prev) => prev.map((i) => (i.varianteId === varianteId ? { ...i, cantidad } : i)));
  }

  function vaciarCarrito() {
    // Se persiste YA, no solo se limpia el estado. React corre los efectos
    // de los hijos antes que los del padre: una página que vacía el carrito al
    // montarse (como /checkout/exito) lo hacía ANTES de que este provider
    // terminara de leer localStorage, y esa lectura posterior devolvía el
    // carrito viejo y pisaba el vaciado. Escribiendo el vacío primero, la
    // lectura ya encuentra un carrito vacío, en cualquier orden.
    guardarCarrito([]);
    setItems([]);
  }

  const subtotal = items.reduce((acc, i) => acc + i.precioUnitario * i.cantidad, 0);

  return (
    <CartContext.Provider value={{ items, agregarItem, quitarItem, actualizarCantidad, vaciarCarrito, subtotal, listo: hidratado }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart debe usarse dentro de <CartProvider>");
  return ctx;
}
