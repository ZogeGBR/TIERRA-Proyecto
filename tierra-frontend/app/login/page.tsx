"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Mail, Lock } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

// Sólo se aceptan rutas internas. Sin esta validación, un enlace como
// /login?redirect=https://sitio-falso.com llevaría a la persona a una página
// de phishing justo después de un login legítimo, que es el momento en el que
// menos sospecharía.
function destinoSeguro(valor: string | null): string {
  if (!valor) return "/";
  if (!valor.startsWith("/") || valor.startsWith("//")) return "/";
  return valor;
}

function FormularioLogin() {
  const { usuario, iniciarSesion } = useAuth();
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
      await iniciarSesion({ email, password });
      router.replace(destino);
    } catch (err) {
      // El mensaje viene del backend y está redactado para el usuario final.
      setError(err instanceof Error ? err.message : "No pudimos iniciar sesión. Probá de nuevo.");
      setEnviando(false);
    }
  }

  return (
    <div className="relative min-h-[calc(100vh-1px)] flex items-center justify-center overflow-hidden px-4 py-12">
      {/* Misma foto de marca que el hero de la home — cálida y luminosa,
          en vez de una imagen nueva sin relación con el resto del sitio. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/images/brand/hero.jpg"
        alt=""
        className="absolute inset-0 w-full h-full object-cover"
        style={{ objectPosition: "60% 35%" }}
      />
      {/* Degradé cálido (terracota/crema) en vez del rosa/violeta del
          ejemplo, para que la tarjeta traslúcida siga leyéndose bien con
          la paleta nueva. */}
      <div className="absolute inset-0 bg-gradient-to-b from-tierra-terracota-oscuro/70 via-tierra-terracota-oscuro/50 to-tierra-crema-oscuro/80" />
      {/* Resplandor verde suave en la esquina — el mismo contraste cálido
          + frío de la imagen de referencia (acuarela terracota/verde
          azulado), acá como un detalle sutil detrás de la tarjeta. */}
      <div className="absolute -bottom-24 -right-24 w-96 h-96 rounded-full bg-tierra-verde/40 blur-3xl" />

      <div className="relative w-full max-w-md">
        <div className="bg-white/20 backdrop-blur-xl border border-white/30 rounded-3xl p-8 shadow-2xl">
          <h1 className="font-serif text-3xl font-semibold text-white text-center mb-1">
            Bienvenido
          </h1>
          <p className="text-white/80 text-center mb-8 text-sm">
            Entrá a tu cuenta para ver tus pedidos.
          </p>

          <form onSubmit={manejarEnvio} className="space-y-4">
            <div className="relative">
              <label htmlFor="email" className="sr-only">
                Email
              </label>
              <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/70 pointer-events-none" />
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                placeholder="Email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-white/30 placeholder-white/70 text-white border border-white/40 rounded-full pl-11 pr-5 py-3
                           focus:outline-none focus:ring-2 focus:ring-white/80 focus:bg-white/40 transition-colors"
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
                className="w-full bg-white/30 placeholder-white/70 text-white border border-white/40 rounded-full pl-11 pr-5 py-3
                           focus:outline-none focus:ring-2 focus:ring-white/80 focus:bg-white/40 transition-colors"
              />
            </div>

            {/* El contenedor existe siempre, aunque esté vacío: así el rediseño no
                tiene que inventar dónde va el error, y los lectores de pantalla
                anuncian el mensaje cuando aparece. */}
            <p role="alert" className="text-sm text-amber-100 min-h-[1.25rem] text-center">
              {error}
            </p>

            {/* El botón se deshabilita mientras la petición está en curso, o un
                doble clic manda dos logins. */}
            <button
              type="submit"
              disabled={enviando}
              className="w-full bg-tierra-ambar text-white font-medium rounded-full py-3
                         transition-colors hover:brightness-95 disabled:opacity-60
                         focus:outline-none focus:ring-2 focus:ring-white/80"
            >
              {enviando ? "Entrando…" : "Entrar"}
            </button>
          </form>

          <p className="mt-6 text-center text-white/90 text-sm">
            ¿No tenés cuenta?{" "}
            <Link href="/registro" className="text-white underline font-medium">
              Creá una
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

// useSearchParams obliga a un límite de Suspense en el App Router: sin esto,
// el build falla al intentar prerenderizar la página.
export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-tierra-terracota-oscuro" />}>
      <FormularioLogin />
    </Suspense>
  );
}
