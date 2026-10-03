"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { User, Mail, Phone, Lock } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

// Ver el comentario equivalente en app/login/page.tsx.
function destinoSeguro(valor: string | null): string {
  if (!valor) return "/";
  if (!valor.startsWith("/") || valor.startsWith("//")) return "/";
  return valor;
}

// El backend exige 8 como mínimo. Se repite acá para poder avisar antes de
// mandar la petición, pero la validación que vale es la del servidor: esta
// es comodidad, no seguridad.
const LARGO_MINIMO_PASSWORD = 8;

const inputClase =
  "w-full bg-white/30 placeholder-white/70 text-white border border-white/40 rounded-full pl-11 pr-5 py-3 " +
  "focus:outline-none focus:ring-2 focus:ring-white/80 focus:bg-white/40 transition-colors";

const iconoClase = "absolute left-4 top-1/2 -translate-y-1/2 text-white/70 pointer-events-none";

function FormularioRegistro() {
  const { usuario, registrar } = useAuth();
  const router = useRouter();
  const destino = destinoSeguro(useSearchParams().get("redirect"));

  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [telefono, setTelefono] = useState("");
  const [password, setPassword] = useState("");
  const [repetirPassword, setRepetirPassword] = useState("");
  const [error, setError] = useState("");
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    if (usuario) router.replace(destino);
  }, [usuario, destino, router]);

  async function manejarEnvio(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    // Las dos comprobaciones que el backend no puede hacer por nosotros: él
    // recibe una sola contraseña y no sabe qué escribió la persona la segunda
    // vez.
    if (password !== repetirPassword) {
      setError("Las contraseñas no coinciden.");
      return;
    }
    if (password.length < LARGO_MINIMO_PASSWORD) {
      setError(`La contraseña tiene que tener al menos ${LARGO_MINIMO_PASSWORD} caracteres.`);
      return;
    }

    setEnviando(true);
    try {
      // El backend deja la sesión iniciada, así que después de esto la persona
      // ya está dentro.
      await registrar({ nombre, email, password, telefono: telefono || undefined });
      router.replace(destino);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No pudimos crear la cuenta. Probá de nuevo.");
      setEnviando(false);
    }
  }

  return (
    <div className="relative min-h-[calc(100vh-1px)] flex items-center justify-center overflow-hidden px-4 py-12">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/images/brand/hero.jpg"
        alt=""
        className="absolute inset-0 w-full h-full object-cover"
        style={{ objectPosition: "60% 35%" }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-tierra-terracota-oscuro/70 via-tierra-terracota-oscuro/50 to-tierra-crema-oscuro/80" />
      <div className="absolute -bottom-24 -left-24 w-96 h-96 rounded-full bg-tierra-verde/40 blur-3xl" />

      <div className="relative w-full max-w-md">
        <div className="bg-white/20 backdrop-blur-xl border border-white/30 rounded-3xl p-8 shadow-2xl">
          <h1 className="font-serif text-3xl font-semibold text-white text-center mb-1">
            Creá tu cuenta
          </h1>
          <p className="text-white/80 text-center mb-8 text-sm">
            Vas a poder comprar y seguir tus pedidos.
          </p>

          <form onSubmit={manejarEnvio} className="space-y-4">
            <div className="relative">
              <label htmlFor="nombre" className="sr-only">
                Nombre y apellido
              </label>
              <User size={18} className={iconoClase} />
              <input
                id="nombre"
                name="nombre"
                type="text"
                autoComplete="name"
                placeholder="Nombre y apellido"
                required
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                className={inputClase}
              />
            </div>

            <div className="relative">
              <label htmlFor="email" className="sr-only">
                Email
              </label>
              <Mail size={18} className={iconoClase} />
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                placeholder="Email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={inputClase}
              />
            </div>

            <div className="relative">
              <label htmlFor="telefono" className="sr-only">
                Teléfono (opcional)
              </label>
              <Phone size={18} className={iconoClase} />
              <input
                id="telefono"
                name="telefono"
                type="tel"
                autoComplete="tel"
                placeholder="Teléfono (opcional)"
                value={telefono}
                onChange={(e) => setTelefono(e.target.value)}
                className={inputClase}
              />
            </div>

            <div className="relative">
              <label htmlFor="password" className="sr-only">
                Contraseña
              </label>
              <Lock size={18} className={iconoClase} />
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                placeholder="Contraseña"
                required
                minLength={LARGO_MINIMO_PASSWORD}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={inputClase}
              />
              <p className="mt-1 text-xs text-white/70 pl-2">Al menos {LARGO_MINIMO_PASSWORD} caracteres.</p>
            </div>

            <div className="relative">
              <label htmlFor="repetirPassword" className="sr-only">
                Repetir contraseña
              </label>
              <Lock size={18} className={iconoClase} />
              <input
                id="repetirPassword"
                name="repetirPassword"
                type="password"
                autoComplete="new-password"
                placeholder="Repetir contraseña"
                required
                value={repetirPassword}
                onChange={(e) => setRepetirPassword(e.target.value)}
                className={inputClase}
              />
            </div>

            <p role="alert" className="text-sm text-amber-100 min-h-[1.25rem] text-center">
              {error}
            </p>

            <button
              type="submit"
              disabled={enviando}
              className="w-full bg-tierra-ambar text-white font-medium rounded-full py-3
                         transition-colors hover:brightness-95 disabled:opacity-60
                         focus:outline-none focus:ring-2 focus:ring-white/80"
            >
              {enviando ? "Creando cuenta…" : "Crear cuenta"}
            </button>
          </form>

          <p className="mt-6 text-center text-white/90 text-sm">
            ¿Ya tenés cuenta?{" "}
            <Link href="/login" className="text-white underline font-medium">
              Iniciá sesión
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function RegistroPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-tierra-terracota-oscuro" />}>
      <FormularioRegistro />
    </Suspense>
  );
}
