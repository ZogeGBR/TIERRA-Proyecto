"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Mail, KeyRound } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { mensajeDeError } from "@/lib/api";
import { destinoSeguro } from "@/lib/navegacion";
import { TarjetaAcceso, CLASE_BOTON, CLASE_CAMPO, CLASE_ENLACE } from "@/components/TarjetaAcceso";

// Acceso de clientes por código (ADR 0005), en dos pasos en la misma pantalla:
// primero el email, después el código de seis dígitos que llega por correo.
// Los clientes no tienen contraseña. El equipo de Tierra entra por /equipo.

const LARGO_CODIGO = 6;

// Cuánto hay que esperar para pedir otro código. El backend además limita a 3
// cada 15 minutos; esto evita que alguien apriete "reenviar" varias veces
// seguidas, agote ese límite sin querer y se quede sin poder entrar.
const ESPERA_REENVIO_SEGUNDOS = 60;

type Paso = "email" | "codigo";

function formatoEspera(segundos: number): string {
  const m = Math.floor(segundos / 60);
  const s = segundos % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function FormularioLogin() {
  const { usuario, solicitarCodigo, verificarCodigo } = useAuth();
  const router = useRouter();
  const destino = destinoSeguro(useSearchParams().get("redirect"));

  const [paso, setPaso] = useState<Paso>("email");
  const [email, setEmail] = useState("");
  const [codigo, setCodigo] = useState("");

  // El mensaje que devuelve el backend al pedir el código. Es SIEMPRE el
  // mismo, exista el email o no, y se muestra tal cual: el frontend no tiene
  // forma de saber si el email es de un cliente, y no debe intentarlo.
  const [aviso, setAviso] = useState("");
  const [reenviado, setReenviado] = useState(false);
  const [error, setError] = useState("");
  const [enviando, setEnviando] = useState(false);

  // Cuándo se habilita "Reenviar código". Se guarda el momento y no un
  // contador que baja de a un segundo: el navegador frena los temporizadores
  // de las pestañas en segundo plano, y quien va a buscar el código a otra
  // pestaña volvería a encontrar una cuenta regresiva atrasada.
  const [reenvioDesde, setReenvioDesde] = useState(0);
  const [ahora, setAhora] = useState(() => Date.now());
  const espera = Math.max(0, Math.ceil((reenvioDesde - ahora) / 1000));

  const campoCodigo = useRef<HTMLInputElement>(null);

  // Si ya hay sesión, esta pantalla no tiene sentido.
  useEffect(() => {
    if (usuario) router.replace(destino);
  }, [usuario, destino, router]);

  // Cuenta regresiva del botón "Reenviar código".
  useEffect(() => {
    if (!reenvioDesde) return;
    const intervalo = setInterval(() => {
      const t = Date.now();
      setAhora(t);
      if (t >= reenvioDesde) clearInterval(intervalo);
    }, 1000);
    return () => clearInterval(intervalo);
  }, [reenvioDesde]);

  async function pedirCodigo(): Promise<boolean> {
    setError("");
    setEnviando(true);
    try {
      const mensaje = await solicitarCodigo(email.trim());
      setAviso(mensaje);
      setCodigo("");
      const t = Date.now();
      setAhora(t);
      setReenvioDesde(t + ESPERA_REENVIO_SEGUNDOS * 1000);
      return true;
    } catch (err) {
      // Sólo puede fallar por un email con formato inválido (el backend lo
      // explica) o por la conexión. Ninguno de los dos revela nada.
      setError(mensajeDeError(err, "No pudimos pedir el código. Probá de nuevo."));
      return false;
    } finally {
      setEnviando(false);
    }
  }

  async function enviarEmail(e: React.FormEvent) {
    e.preventDefault();
    setReenviado(false);
    if (await pedirCodigo()) setPaso("codigo");
  }

  async function reenviar() {
    if (await pedirCodigo()) {
      setReenviado(true);
      campoCodigo.current?.focus();
    }
  }

  function usarOtroEmail() {
    setPaso("email");
    setCodigo("");
    setAviso("");
    setReenviado(false);
    setError("");
  }

  async function enviarCodigo(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    // Se controla antes de mandar porque cada verificación fallida gasta uno
    // de los 5 intentos del código: un número de menos no tiene que costar
    // un intento.
    if (codigo.length !== LARGO_CODIGO) {
      setError(`El código tiene ${LARGO_CODIGO} números.`);
      campoCodigo.current?.focus();
      return;
    }

    setEnviando(true);
    try {
      await verificarCodigo(email.trim(), codigo);
      // El botón queda en "Entrando…" hasta que cambia la página.
      router.replace(destino);
    } catch (err) {
      setError(mensajeDeError(err, "No pudimos verificar el código. Probá de nuevo."));
      setCodigo("");
      setEnviando(false);
      campoCodigo.current?.focus();
    }
  }

  // El área de error existe siempre, aunque esté vacía: así los lectores de
  // pantalla anuncian el mensaje cuando aparece.
  const areaError = (
    <p role="alert" className="text-sm text-amber-100 min-h-[1.25rem] text-center">
      {error}
    </p>
  );

  if (paso === "email") {
    return (
      <TarjetaAcceso
        titulo="Bienvenido"
        subtitulo={
          <p>
            Escribí el email con el que compraste y te mandamos un código para entrar.
            No hace falta contraseña.
          </p>
        }
      >
        <form onSubmit={enviarEmail} className="space-y-4">
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
              autoComplete="email"
              placeholder="Email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={CLASE_CAMPO}
            />
          </div>

          {areaError}

          {/* Deshabilitado mientras la petición está en curso: un doble clic
              pediría dos códigos, y el segundo invalida al primero. */}
          <button type="submit" disabled={enviando} className={CLASE_BOTON}>
            {enviando ? "Enviando…" : "Enviarme un código"}
          </button>
        </form>

        <p className="mt-6 text-center text-white/90 text-sm">
          ¿Todavía no compraste? No hace falta crear una cuenta: se crea sola con tu
          primera compra.{" "}
          <Link href="/" className="text-white underline font-medium">
            Ver la tienda
          </Link>
        </p>
      </TarjetaAcceso>
    );
  }

  return (
    <TarjetaAcceso
      titulo="Revisá tu email"
      subtitulo={
        <p id="aviso-codigo" role="status">
          {aviso}
        </p>
      }
    >
      <form onSubmit={enviarCodigo} noValidate className="space-y-4">
        <p className="text-center text-white/90 text-sm">
          Código para <span className="font-medium text-white break-all">{email.trim()}</span>
          {" · "}
          <button type="button" onClick={usarOtroEmail} disabled={enviando} className={CLASE_ENLACE}>
            Usar otro email
          </button>
        </p>

        <div className="relative">
          <label htmlFor="codigo" className="sr-only">
            Código de {LARGO_CODIGO} números
          </label>
          <KeyRound
            size={18}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-white/70 pointer-events-none"
          />
          {/* inputMode muestra el teclado numérico en el celular, y
              one-time-code le permite ofrecer el código que acaba de llegar.
              Se usa texto y no type="number" para conservar los ceros a la
              izquierda: el código es un texto de seis dígitos, no un número.
              Sin maxLength a propósito: el navegador cortaría un código pegado
              con espacios ("123 456") antes de limpiarlo, y quedaría
              incompleto. El largo lo controla el onChange. */}
          <input
            ref={campoCodigo}
            id="codigo"
            name="codigo"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder={`Código de ${LARGO_CODIGO} números`}
            autoFocus
            aria-describedby="aviso-codigo"
            value={codigo}
            onChange={(e) => setCodigo(e.target.value.replace(/\D/g, "").slice(0, LARGO_CODIGO))}
            className={`${CLASE_CAMPO} tracking-[0.3em]`}
          />
        </div>

        {areaError}

        <button type="submit" disabled={enviando} className={CLASE_BOTON}>
          {enviando ? "Entrando…" : "Entrar"}
        </button>
      </form>

      <div className="mt-6 text-center text-white/90 text-sm space-y-1">
        <p>
          ¿No te llegó?{" "}
          <button
            type="button"
            onClick={reenviar}
            disabled={enviando || espera > 0}
            className={CLASE_ENLACE}
          >
            {espera > 0 ? `Reenviar código (${formatoEspera(espera)})` : "Reenviar código"}
          </button>
        </p>
        {/* Cierto exista o no la cuenta: si existía, el código anterior quedó
            invalidado; si no, nunca hubo uno. El párrafo existe siempre para
            que el lector de pantalla anuncie el texto cuando aparece. */}
        <p role="status">{reenviado ? "Pediste un código nuevo: el anterior ya no sirve." : ""}</p>
      </div>
    </TarjetaAcceso>
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
