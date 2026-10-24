"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Mail, KeyRound, ArrowLeft } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { PantallaAcceso } from "@/components/PantallaAcceso";
import { destinoSeguro } from "@/lib/destinoSeguro";
import {
  MENSAJE_CODIGO_ENVIADO,
  MENSAJE_CODIGO_INCORRECTO,
  codigoCompleto,
  emailValido,
  normalizarCodigo,
  segundosParaReenviar,
  LARGO_CODIGO
} from "@/lib/codigoAcceso";
import { esErrorDeRed, esErrorDelServidor, textoDeError } from "@/lib/errores";

const CLASE_CAMPO =
  "w-full bg-white/30 placeholder-white/70 text-white border border-white/40 rounded-full pl-11 pr-5 py-3 " +
  "focus:outline-none focus:ring-2 focus:ring-white/80 focus:bg-white/40 transition-colors";

// Ingreso de CLIENTES, en dos pasos y sin contraseña (ADR 0005): primero el
// email, después el código de 6 dígitos que llega a ese email. No hace falta
// para comprar; sirve para ver los pedidos y los datos guardados.
function FormularioLogin() {
  const { usuario, solicitarCodigo, verificarCodigo } = useAuth();
  const router = useRouter();
  const destino = destinoSeguro(useSearchParams().get("redirect"));

  const [paso, setPaso] = useState<"email" | "codigo">("email");
  const [email, setEmail] = useState("");
  const [codigo, setCodigo] = useState("");
  const [error, setError] = useState("");
  const [aviso, setAviso] = useState("");
  const [enviando, setEnviando] = useState(false);
  // Cuándo se pidió el último código (ms) y cuántos segundos faltan para poder
  // pedir otro.
  const [pedidoEn, setPedidoEn] = useState(0);
  const [faltan, setFaltan] = useState(0);
  const campoCodigo = useRef<HTMLInputElement>(null);

  // Si ya hay sesión, esta pantalla no tiene sentido.
  useEffect(() => {
    if (usuario) router.replace(destino);
  }, [usuario, destino, router]);

  // Cuenta regresiva del botón "Reenviar código".
  useEffect(() => {
    if (paso !== "codigo") return;
    const actualizar = () => setFaltan(segundosParaReenviar(pedidoEn, Date.now()));
    actualizar();
    const id = setInterval(actualizar, 1000);
    return () => clearInterval(id);
  }, [paso, pedidoEn]);

  // Al pasar al segundo paso, el cursor queda en el campo del código.
  useEffect(() => {
    if (paso === "codigo") campoCodigo.current?.focus();
  }, [paso]);

  async function pedirCodigo(e?: React.FormEvent) {
    e?.preventDefault();
    if (enviando) return;
    setError("");
    if (!emailValido(email)) {
      setError("Escribí un email válido.");
      return;
    }
    setEnviando(true);
    try {
      await solicitarCodigo(email.trim());
    } catch (err) {
      // Solo un problema de conexión o del servidor se le dice a la persona.
      // Cualquier respuesta 4xx se trata como "enviado": mostrar un error
      // distinto según el email permitiría averiguar quién es cliente.
      if (esErrorDeRed(err) || esErrorDelServidor(err)) {
        setError(textoDeError(err, "No pudimos pedir el código. Probá de nuevo."));
        setEnviando(false);
        return;
      }
    }
    setAviso(MENSAJE_CODIGO_ENVIADO);
    setCodigo("");
    setPedidoEn(Date.now());
    setPaso("codigo");
    setEnviando(false);
  }

  async function verificar(valor: string) {
    if (enviando || !codigoCompleto(valor)) return;
    setError("");
    setEnviando(true);
    try {
      await verificarCodigo(email.trim(), valor);
      router.replace(destino);
    } catch (err) {
      // Siempre el mismo texto: no se distingue código malo, vencido,
      // agotado ni cuenta bloqueada.
      setError(esErrorDeRed(err) || esErrorDelServidor(err) ? textoDeError(err, MENSAJE_CODIGO_INCORRECTO) : MENSAJE_CODIGO_INCORRECTO);
      setCodigo("");
      setEnviando(false);
      campoCodigo.current?.focus();
    }
  }

  function alCambiarCodigo(crudo: string) {
    const limpio = normalizarCodigo(crudo);
    setCodigo(limpio);
    // Al completar los 6 dígitos (a mano o pegando el del mensaje) se envía
    // solo: un toque menos en el celular.
    if (codigoCompleto(limpio)) void verificar(limpio);
  }

  async function reenviar() {
    if (faltan > 0 || enviando) return;
    await pedirCodigo();
  }

  return (
    <PantallaAcceso
      titulo={paso === "email" ? "Ver mis pedidos" : "Revisá tu email"}
      subtitulo={
        paso === "email"
          ? "Sin contraseña: te mandamos un código de 6 dígitos."
          : `Escribí el código de ${LARGO_CODIGO} dígitos que te enviamos.`
      }
    >
      {paso === "email" ? (
        <form key="email" onSubmit={pedirCodigo} className="space-y-4 anim-paso" noValidate>
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
              inputMode="email"
              placeholder="Tu email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              aria-describedby="login-error"
              className={CLASE_CAMPO}
            />
          </div>

          <p id="login-error" role="alert" className="text-sm text-amber-100 min-h-[1.25rem] text-center">
            {error}
          </p>

          {/* El botón se deshabilita mientras la petición está en curso, o un
              doble clic pide dos códigos. */}
          <button
            type="submit"
            disabled={enviando}
            className="w-full bg-tierra-ambar text-white font-medium rounded-full py-3
                       transition-[filter,transform] hover:brightness-95 active:scale-[0.98] disabled:opacity-60
                       focus:outline-none focus:ring-2 focus:ring-white/80"
          >
            {enviando ? "Enviando…" : "Enviarme el código"}
          </button>

          <p className="text-center text-white/80 text-xs">
            Para comprar no necesitás cuenta ni código.
          </p>
        </form>
      ) : (
        <form
          key="codigo"
          onSubmit={(e) => {
            e.preventDefault();
            void verificar(codigo);
          }}
          className="space-y-4 anim-paso"
          noValidate
        >
          <p className="text-sm text-white/90 text-center anim-aviso">{aviso}</p>

          <div className="relative">
            <label htmlFor="codigo" className="sr-only">
              Código de {LARGO_CODIGO} dígitos
            </label>
            <KeyRound size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/70 pointer-events-none" />
            <input
              ref={campoCodigo}
              id="codigo"
              name="codigo"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]*"
              maxLength={LARGO_CODIGO + 6 /* deja pegar "123 456" y recortarlo */}
              placeholder="······"
              value={codigo}
              onChange={(e) => alCambiarCodigo(e.target.value)}
              aria-describedby="login-error"
              className={`${CLASE_CAMPO} text-center text-2xl tracking-[0.5em] pl-11 pr-3`}
            />
          </div>

          <p id="login-error" role="alert" className="text-sm text-amber-100 min-h-[1.25rem] text-center">
            {error}
          </p>

          <button
            type="submit"
            disabled={enviando || !codigoCompleto(codigo)}
            className="w-full bg-tierra-ambar text-white font-medium rounded-full py-3
                       transition-[filter,transform] hover:brightness-95 active:scale-[0.98] disabled:opacity-60
                       focus:outline-none focus:ring-2 focus:ring-white/80"
          >
            {enviando ? "Verificando…" : "Entrar"}
          </button>

          <div className="flex items-center justify-between text-sm text-white/90">
            <button
              type="button"
              onClick={() => {
                setPaso("email");
                setError("");
              }}
              className="inline-flex items-center gap-1 underline underline-offset-2 hover:text-white focus:outline-none focus:ring-2 focus:ring-white/80 rounded"
            >
              <ArrowLeft size={14} /> Cambiar email
            </button>
            <button
              type="button"
              onClick={reenviar}
              disabled={faltan > 0 || enviando}
              className="underline underline-offset-2 hover:text-white disabled:no-underline disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-white/80 rounded"
            >
              {faltan > 0 ? `Reenviar código (${faltan} s)` : "Reenviar código"}
            </button>
          </div>
        </form>
      )}
    </PantallaAcceso>
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
