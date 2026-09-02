"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import type { ItemCarrito } from "@/lib/types";

interface CartContextValue {
  items: ItemCarrito[];
  agregarItem: (item: ItemCarrito) => void;
  quitarItem: (varianteId: string) => void;
  actualizarCantidad: (varianteId: string, cantidad: number) => void;
  vaciarCarrito: () => void;
  subtotal: number;
}

const CartContext = createContext<CartContextValue | undefined>(undefined);
const STORAGE_KEY = "tierra_carrito";

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ItemCarrito[]>([]);

  // Persistencia simple en localStorage: alcanza para un carrito de invitado.
  // Si más adelante hay login, conviene sincronizar esto con el usuario en el backend.
  useEffect(() => {
    const guardado = window.localStorage.getItem(STORAGE_KEY);
    if (guardado) setItems(JSON.parse(guardado));
  }, []);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items]);

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
    setItems([]);
  }

  const subtotal = items.reduce((acc, i) => acc + i.precioUnitario * i.cantidad, 0);

  return (
    <CartContext.Provider value={{ items, agregarItem, quitarItem, actualizarCantidad, vaciarCarrito, subtotal }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart debe usarse dentro de <CartProvider>");
  return ctx;
}
