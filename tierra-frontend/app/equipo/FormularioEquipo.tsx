"use client";

import { ApiError } from "@/lib/api";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Mail, Lock } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { PantallaAcceso } from "@/components/PantallaAcceso";
import { destinoSeguro } from "@/lib/destinoSeguro";
import { textoDeError } from "@/lib/errores";

const CLASE_CAMPO =
  "w-full bg-white/30 placeholder-white/70 text-white border border-white/40 rounded-full pl-11 pr-5 py-3 " +
  "focus:outline-none focus:ring-2 focus:ring-white/80 focus:bg-white/40 transition-colors";

export function FormularioEquipo() {
  const { usuario, iniciarSesionEquipo } = useAuth();
  const router = useRouter();
  const destino = destinoSeguro(useSearchParams().get("redirect"));

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    if (usuario) router.replace(destino);
  }, [usuario, destino, router]);

  async function entrar(e: React.FormEvent) {
    e.preventDefault();
    if (enviando) return;
    setError("");
    setEnviando(true);
    try {
      await iniciarSesionEquipo({ email, password });
      router.replace(destino);
    } catch (err) {
      // Un cliente que prueba su email acá recibe el mismo error genérico que
      // un email inexistente (el backend no cuenta el intento): este canal es
      // solo del equipo.
      // 401 acá significa "datos incorrectos", no "se venció tu sesión" (que es
      // lo que diría el texto general para un 401).
      setError(
        err instanceof ApiError && err.status === 401
          ? "Email o contraseña incorrectos."
          : textoDeError(err, "No pudimos iniciar sesión. Probá de nuevo.")
      );
      setEnviando(false);
    }
  }

  return (
    <PantallaAcceso titulo="Acceso del equipo" subtitulo="Solo para el equipo de Tierra.">
      <form onSubmit={entrar} className="space-y-4">
        <div className="relative">
          <label htmlFor="email" className="sr-only">
            Email
          </label>
          <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/70 pointer-events-none" />
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="username"
            placeholder="Email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={CLASE_CAMPO}
          />
        </div>

        <div className="relative">
          <label htmlFor="password" className="sr-only">
            Contraseña
          </label>
          <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/70 pointer-events-none" />
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            placeholder="Contraseña"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={CLASE_CAMPO}
          />
        </div>

        <p role="alert" className="text-sm text-amber-100 min-h-[1.25rem] text-center">
          {error}
        </p>

        <button
          type="submit"
          disabled={enviando}
          className="w-full bg-tierra-ambar text-white font-medium rounded-full py-3
                     transition-[filter,transform] hover:brightness-95 active:scale-[0.98] disabled:opacity-60
                     focus:outline-none focus:ring-2 focus:ring-white/80"
        >
          {enviando ? "Entrando…" : "Entrar"}
        </button>
      </form>
    </PantallaAcceso>
  );
}
