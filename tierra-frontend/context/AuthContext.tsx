"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { api } from "@/lib/api";
import type { Usuario, LoginRequest } from "@/lib/types";

interface AuthContextValue {
  usuario: Usuario | null;
  /** true sólo mientras se resuelve la sesión inicial. Ver el comentario en el provider. */
  cargando: boolean;
  /** Clientes, paso 1. Devuelve el mensaje genérico del backend, que se muestra tal cual. */
  solicitarCodigo: (email: string) => Promise<string>;
  /** Clientes, paso 2. Abre la sesión si el código sirve. */
  verificarCodigo: (email: string, codigo: string) => Promise<Usuario>;
  /** Equipo de Tierra: email y contraseña, desde /equipo. */
  iniciarSesionEquipo: (datos: LoginRequest) => Promise<Usuario>;
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
  // trae la cookie del token CSRF. Para cuando la persona apriete "iniciar
  // sesión", el token ya está. Si la primera llamada del navegador fuera un
  // POST, no habría token todavía y el backend respondería 403.
  useEffect(() => {
    let cancelado = false;

    api.auth
      .yo()
      .then((u) => {
        if (!cancelado) setUsuario(u);
      })
      .catch(() => {
        // Un 401 acá es lo normal: significa que no hay sesión, no que algo
        // falló. Un error de red (ApiError con estado 0) tampoco cambia qué
        // hacer: mostrar el sitio como visitante.
        if (!cancelado) setUsuario(null);
      })
      .finally(() => {
        if (!cancelado) setCargando(false);
      });

    return () => {
      cancelado = true;
    };
  }, []);

  // En las tres funciones, sin try/catch: el error se propaga para que la
  // pantalla lo muestre. Atraparlo acá lo haría desaparecer en silencio.

  async function solicitarCodigo(email: string): Promise<string> {
    // No cambia la sesión: pedir un código no da acceso a nada.
    const respuesta = await api.auth.solicitarCodigo(email);
    return respuesta.mensaje;
  }

  async function verificarCodigo(email: string, codigo: string): Promise<Usuario> {
    const u = await api.auth.verificarCodigo(email, codigo);
    setUsuario(u);
    return u;
  }

  async function iniciarSesionEquipo(datos: LoginRequest): Promise<Usuario> {
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
