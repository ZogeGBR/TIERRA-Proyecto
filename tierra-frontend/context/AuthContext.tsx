"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { api } from "@/lib/api";
import type { Usuario, RegistroRequest, LoginRequest } from "@/lib/types";

interface AuthContextValue {
  usuario: Usuario | null;
  /** true sólo mientras se resuelve la sesión inicial. Ver el comentario en el provider. */
  cargando: boolean;
  iniciarSesion: (datos: LoginRequest) => Promise<Usuario>;
  registrar: (datos: RegistroRequest) => Promise<Usuario>;
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
        // falló. No hay forma de distinguirlo de un error de red con el
        // apiFetch actual, y tampoco cambia qué hacer: mostrar el sitio
        // como visitante.
        if (!cancelado) setUsuario(null);
      })
      .finally(() => {
        if (!cancelado) setCargando(false);
      });

    return () => {
      cancelado = true;
    };
  }, []);

  async function iniciarSesion(datos: LoginRequest): Promise<Usuario> {
    // Sin try/catch: el error se propaga para que la pantalla lo muestre.
    // Atraparlo acá lo haría desaparecer en silencio, que es justamente el
    // problema que tiene el resto del frontend hoy.
    const u = await api.auth.login(datos);
    setUsuario(u);
    return u;
  }

  async function registrar(datos: RegistroRequest): Promise<Usuario> {
    // El backend deja la sesión iniciada al registrar, así que no hace falta
    // un login posterior.
    const u = await api.auth.registrar(datos);
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
    <AuthContext.Provider value={{ usuario, cargando, iniciarSesion, registrar, cerrarSesion }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth debe usarse dentro de <AuthProvider>");
  return ctx;
}
