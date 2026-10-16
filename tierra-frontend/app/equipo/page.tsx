"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Mail, Lock } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { mensajeDeError } from "@/lib/api";
import { destinoSeguro } from "@/lib/navegacion";
import { TarjetaAcceso, CLASE_BOTON, CLASE_CAMPO } from "@/components/TarjetaAcceso";

// Acceso del equipo de Tierra con email y contraseña (ADR 0005). Los clientes
// no tienen contraseña: si un cliente prueba acá, recibe el mismo error que un
// email inexistente.

function FormularioEquipo() {
  const { usuario, iniciarSesionEquipo } = useAuth();
  const router = useRouter();
  const destino = destinoSeguro(useSearchParams().get("redirect"));

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [enviando, setEnviando] = useState(false);

  // Si ya hay sesión, esta pantalla no tiene sentido.
  useEffect(() => {
    if (usuario) router.replace(destino);
  }, [usuario, destino, router]);

  async function manejarEnvio(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setEnviando(true);
    try {
      await iniciarSesionEquipo({ email, password });
      router.replace(destino);
    } catch (err) {
      // El backend distingue credenciales incorrectas (401) de cuenta
      // bloqueada por intentos (423) y explica cada caso en el mensaje.
      setError(mensajeDeError(err, "No pudimos iniciar sesión. Probá de nuevo."));
      setPassword("");
      setEnviando(false);
    }
  }

  return (
    <TarjetaAcceso titulo="Acceso del equipo" subtitulo={<p>Solo para el equipo de Tierra.</p>}>
      <form onSubmit={manejarEnvio} className="space-y-4">
        <div className="relative">
          <label htmlFor="email" className="sr-only">
            Email
          </label>
          <Mail
            size={18}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-white/70 pointer-events-none"
          />
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
          <Lock
            size={18}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-white/70 pointer-events-none"
          />
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

        {/* El contenedor existe siempre, aunque esté vacío: los lectores de
            pantalla anuncian el mensaje cuando aparece. */}
        <p role="alert" className="text-sm text-amber-100 min-h-[1.25rem] text-center">
          {error}
        </p>

        {/* Deshabilitado mientras la petición está en curso, o un doble clic
            manda dos logins y puede sumar dos intentos fallidos. */}
        <button type="submit" disabled={enviando} className={CLASE_BOTON}>
          {enviando ? "Entrando…" : "Entrar"}
        </button>
      </form>

      <p className="mt-6 text-center text-white/90 text-sm">
        ¿Sos cliente?{" "}
        <Link href="/login" className="text-white underline font-medium">
          Entrá con un código
        </Link>
      </p>
    </TarjetaAcceso>
  );
}

// useSearchParams obliga a un límite de Suspense en el App Router: sin esto,
// el build falla al intentar prerenderizar la página.
export default function EquipoPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-tierra-terracota-oscuro" />}>
      <FormularioEquipo />
    </Suspense>
  );
}
