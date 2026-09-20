"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
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
    <div className="max-w-md mx-auto px-4 py-12">
      <h1 className="text-3xl mb-2 text-tierra-bordo-oscuro">Iniciar sesión</h1>
      <p className="text-tierra-bordo-oscuro/70 mb-8">
        Entrá a tu cuenta para completar tu compra.
      </p>

      <form onSubmit={manejarEnvio} className="bg-white rounded-2xl p-6 space-y-5">
        <div>
          <label htmlFor="email" className="block mb-1 font-medium text-tierra-bordo-oscuro">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full border border-tierra-crema-oscuro rounded-lg px-3 py-2
                       focus:outline-none focus:ring-2 focus:ring-tierra-azul"
          />
        </div>

        <div>
          <label htmlFor="password" className="block mb-1 font-medium text-tierra-bordo-oscuro">
            Contraseña
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full border border-tierra-crema-oscuro rounded-lg px-3 py-2
                       focus:outline-none focus:ring-2 focus:ring-tierra-azul"
          />
        </div>

        {/* El contenedor existe siempre, aunque esté vacío: así el rediseño no
            tiene que inventar dónde va el error, y los lectores de pantalla
            anuncian el mensaje cuando aparece. */}
        <p role="alert" className="text-sm text-red-700 min-h-[1.25rem]">
          {error}
        </p>

        {/* El botón se deshabilita mientras la petición está en curso, o un
            doble clic manda dos logins. */}
        <button type="submit" className="btn-primario w-full" disabled={enviando}>
          {enviando ? "Entrando…" : "Entrar"}
        </button>
      </form>

      <p className="mt-6 text-center text-tierra-bordo-oscuro/80">
        ¿No tenés cuenta?{" "}
        <Link href="/registro" className="text-tierra-azul underline">
          Creá una
        </Link>
      </p>
    </div>
  );
}

// useSearchParams obliga a un límite de Suspense en el App Router: sin esto,
// el build falla al intentar prerenderizar la página.
export default function LoginPage() {
  return (
    <Suspense fallback={<div className="max-w-md mx-auto px-4 py-12">Cargando…</div>}>
      <FormularioLogin />
    </Suspense>
  );
}
