"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { api, ApiError } from "@/lib/api";
import type { Usuario, LoginEquipoRequest } from "@/lib/types";

// Modelo de acceso de la Fase 2 (ADR 0005):
//  - Los CLIENTES no tienen contraseña: piden un código de 6 dígitos a su
//    email y lo verifican. Sirve para ver su historial y sus datos guardados.
//  - El EQUIPO (Daniel, Flor, F97) entra con contraseña, en /equipo.
//  - Comprar NO requiere ninguna de las dos cosas.
interface AuthContextValue {
  usuario: Usuario | null;
  /** true sólo mientras se resuelve la sesión inicial. Ver el comentario en el provider. */
  cargando: boolean;
  /** Pide el código. Siempre "funciona" desde el punto de vista de la pantalla. */
  solicitarCodigo: (email: string) => Promise<void>;
  /** Verifica el código y deja la sesión abierta. Lanza ApiError si no sirve. */
  verificarCodigo: (email: string, codigo: string) => Promise<Usuario>;
  /** Login con contraseña, solo equipo. */
  iniciarSesionEquipo: (datos: LoginEquipoRequest) => Promise<Usuario>;
  cerrarSesion: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [cargando, setCargando] = useState(true);

  // Al montar, le preguntamos al backend si esta persona ya tiene sesión.
  //
  // El usuario NO se guarda en localStorage a propósito: la sesión vive en la
  // cookie httpOnly, y duplicarla del lado del cliente crearía dos fuentes de
  // verdad que se desincronizan — la cookie puede vencer y el localStorage
  // seguiría diciendo que hay alguien logueado.
  //
  // Esta llamada tiene un efecto secundario útil: es un GET, y su respuesta
  // trae la cookie del token CSRF. Para cuando la persona apriete "pedir
  // código", el token ya está. Si la primera llamada del navegador fuera un
  // POST, no habría token todavía y el backend respondería 403.
  useEffect(() => {
    let cancelado = false;

    api.auth
      .yo()
      .then((u) => {
        if (!cancelado) setUsuario(u);
      })
      .catch((e) => {
        // Un 401 es lo normal: significa "no hay sesión". Cualquier otra cosa
        // (red caída, 500) tampoco cambia qué hacer acá -- mostrar el sitio
        // como visitante --, pero ahora se distingue para poder verlo en la
        // consola en vez de tragarlo.
        if (!(e instanceof ApiError && e.status === 401)) {
          console.warn("No se pudo comprobar la sesión:", e);
        }
        if (!cancelado) setUsuario(null);
      })
      .finally(() => {
        if (!cancelado) setCargando(false);
      });

    return () => {
      cancelado = true;
    };
  }, []);

  async function solicitarCodigo(email: string): Promise<void> {
    // Sin try/catch: un error de red o un 5xx tiene que llegar a la pantalla.
    // Lo que NO debe hacer la pantalla es distinguir "el email no existe" (el
    // backend responde siempre lo mismo y el frontend no debe adivinar).
    await api.auth.solicitarCodigo({ email });
  }

  async function verificarCodigo(email: string, codigo: string): Promise<Usuario> {
    const u = await api.auth.verificarCodigo({ email, codigo });
    setUsuario(u);
    return u;
  }

  async function iniciarSesionEquipo(datos: LoginEquipoRequest): Promise<Usuario> {
    const u = await api.auth.loginEquipo(datos);
    setUsuario(u);
    return u;
  }

  async function cerrarSesion(): Promise<void> {
    try {
      await api.auth.logout();
    } finally {
      // Pase lo que pase del lado del servidor, localmente la sesión se
      // termina: si el logout falló, dejar al usuario como logueado sería
      // peor — vería su nombre en pantalla y todas las llamadas darían 401.
      setUsuario(null);
    }
  }

  return (
    <AuthContext.Provider
      value={{ usuario, cargando, solicitarCodigo, verificarCodigo, iniciarSesionEquipo, cerrarSesion }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth debe usarse dentro de <AuthProvider>");
  return ctx;
}

/** ¿Es una cuenta de cliente (entra con código)? El resto es del equipo. */
export function esCliente(u: Usuario | null): boolean {
  return u?.rol === "CLIENTE";
}
