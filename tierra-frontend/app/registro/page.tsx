"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
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
    <div className="max-w-md mx-auto px-4 py-12">
      <h1 className="text-3xl mb-2 text-tierra-bordo-oscuro">Crear cuenta</h1>
      <p className="text-tierra-bordo-oscuro/70 mb-8">
        Con tu cuenta vas a poder comprar y seguir tus pedidos.
      </p>

      <form onSubmit={manejarEnvio} className="bg-white rounded-2xl p-6 space-y-5">
        <div>
          <label htmlFor="nombre" className="block mb-1 font-medium text-tierra-bordo-oscuro">
            Nombre y apellido
          </label>
          <input
            id="nombre"
            name="nombre"
            type="text"
            autoComplete="name"
            required
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            className="w-full border border-tierra-crema-oscuro rounded-lg px-3 py-2
                       focus:outline-none focus:ring-2 focus:ring-tierra-azul"
          />
        </div>

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
          <label htmlFor="telefono" className="block mb-1 font-medium text-tierra-bordo-oscuro">
            Teléfono <span className="font-normal text-tierra-bordo-oscuro/60">(opcional)</span>
          </label>
          <input
            id="telefono"
            name="telefono"
            type="tel"
            autoComplete="tel"
            value={telefono}
            onChange={(e) => setTelefono(e.target.value)}
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
            autoComplete="new-password"
            required
            minLength={LARGO_MINIMO_PASSWORD}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full border border-tierra-crema-oscuro rounded-lg px-3 py-2
                       focus:outline-none focus:ring-2 focus:ring-tierra-azul"
          />
          <p className="mt-1 text-sm text-tierra-bordo-oscuro/60">
            Al menos {LARGO_MINIMO_PASSWORD} caracteres.
          </p>
        </div>

        <div>
          <label
            htmlFor="repetirPassword"
            className="block mb-1 font-medium text-tierra-bordo-oscuro"
          >
            Repetir contraseña
          </label>
          <input
            id="repetirPassword"
            name="repetirPassword"
            type="password"
            autoComplete="new-password"
            required
            value={repetirPassword}
            onChange={(e) => setRepetirPassword(e.target.value)}
            className="w-full border border-tierra-crema-oscuro rounded-lg px-3 py-2
                       focus:outline-none focus:ring-2 focus:ring-tierra-azul"
          />
        </div>

        <p role="alert" className="text-sm text-red-700 min-h-[1.25rem]">
          {error}
        </p>

        <button type="submit" className="btn-primario w-full" disabled={enviando}>
          {enviando ? "Creando cuenta…" : "Crear cuenta"}
        </button>
      </form>

      <p className="mt-6 text-center text-tierra-bordo-oscuro/80">
        ¿Ya tenés cuenta?{" "}
        <Link href="/login" className="text-tierra-azul underline">
          Iniciá sesión
        </Link>
      </p>
    </div>
  );
}

export default function RegistroPage() {
  return (
    <Suspense fallback={<div className="max-w-md mx-auto px-4 py-12">Cargando…</div>}>
      <FormularioRegistro />
    </Suspense>
  );
}
