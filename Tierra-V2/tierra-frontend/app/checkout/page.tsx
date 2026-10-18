"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ShoppingBag, Store, Truck, Check, ArrowLeft } from "lucide-react";
import { useAuth, esCliente } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";
import { api, ApiError } from "@/lib/api";
import { obtenerLinkDePago } from "@/lib/iniciarPago";
import {
  borrarPagoPendiente,
  esLinkDePago,
  firmaDeCompra,
  guardarPagoPendiente,
  leerPagoPendiente,
  vencimientoDe
} from "@/lib/pedidoPendiente";
import { codigoPostalValido, estadoDeCobertura, OPCIONES_PROVINCIA } from "@/lib/cobertura";
import { esEmailNoUsable, textoDeError } from "@/lib/errores";
import {
  DATOS_VACIOS,
  hayErrores,
  validarContacto,
  validarEntrega,
  type DatosCheckout,
  type ErroresCheckout
} from "@/lib/validacionCheckout";
import type { DatosEntregaGuardados, DireccionCheckoutRequest, TipoEntrega } from "@/lib/types";
import { Campo } from "@/components/checkout/Campo";
import { ResumenCompra } from "@/components/checkout/ResumenCompra";

type Paso = 1 | 2 | 3;

type EstadoCotizacion =
  | { estado: "inactiva" }
  | { estado: "calculando" }
  | { estado: "ok"; costo: number }
  | { estado: "fuera"; mensaje: string | null }
  | { estado: "error"; mensaje: string };

const ETIQUETAS_PASOS = ["Tus datos", "Entrega", "Pago"] as const;

function pesos(n: number): string {
  return `$${n.toLocaleString("es-AR")}`;
}

// Checkout SIN cuenta (auditoría Fase 2, sección 3.1): se compra con nombre,
// email y teléfono, sin contraseña y sin que el checkout abra sesión. El pedido
// guarda los datos de contacto y la dirección; la cuenta (si existe) no se toca.
export default function CheckoutPage() {
  const { usuario, cargando: cargandoSesion, cerrarSesion } = useAuth();
  const { items, subtotal, listo: carritoListo } = useCart();

  // Solo una cuenta de CLIENTE cuenta como "sesión" en el checkout. Con sesión
  // del equipo se trata como si no la hubiera (el backend hace lo mismo).
  const cliente = esCliente(usuario);

  const [paso, setPaso] = useState<Paso>(1);
  const [datos, setDatos] = useState<DatosCheckout>(DATOS_VACIOS);
  const [entrega, setEntrega] = useState<TipoEntrega>("ENVIO_DOMICILIO");
  const [guardarDatos, setGuardarDatos] = useState(false);
  const [mostrarErrores, setMostrarErrores] = useState(false);
  const [tocados, setTocados] = useState<ReadonlySet<string>>(new Set());
  const [errorServidor, setErrorServidor] = useState<{ campo: keyof DatosCheckout; texto: string } | null>(null);

  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<{ texto: string; revisarCarrito: boolean } | null>(null);

  const [cotizacion, setCotizacion] = useState<EstadoCotizacion>({ estado: "inactiva" });
  const [reintentoCotizacion, setReintentoCotizacion] = useState(0);
  const contadorCotizacion = useRef(0);

  const [datosGuardados, setDatosGuardados] = useState<DatosEntregaGuardados | null>(null);
  const [confirmandoBorrado, setConfirmandoBorrado] = useState(false);
  const [errorBorrado, setErrorBorrado] = useState("");

  const tituloPaso = useRef<HTMLHeadingElement>(null);
  const primeraVez = useRef(true);

  // --- Datos de la sesión de cliente: nombre y email precargados -----------
  const idClienteCargado = useRef<string | null>(null);
  useEffect(() => {
    if (!cliente || !usuario) {
      idClienteCargado.current = null;
      return;
    }
    if (idClienteCargado.current === usuario.id) return;
    idClienteCargado.current = usuario.id;

    // Solo se completa lo que todavía está vacío: si la persona ya empezó a
    // escribir mientras cargaba la sesión, no se le pisa.
    setDatos((d) => ({
      ...d,
      nombre: d.nombre || usuario.nombre,
      email: usuario.email
    }));

    // Datos guardados para la próxima compra (tarea 22): se piden al
    // backend y precargan el formulario. Todo sigue siendo editable.
    let cancelado = false;
    api.cuenta
      .datosEntrega()
      .then((g) => {
        if (cancelado || !g) return;
        const hayAlgo = Boolean(g.telefono || g.dni || g.direccion);
        if (!hayAlgo) return;
        setDatosGuardados(g);
        setDatos((d) => ({
          ...d,
          // Lo guardado gana sobre el nombre de la cuenta (que puede ser un
          // marcador, como la parte local del email).
          nombre: g.nombre || d.nombre || "",
          telefono: d.telefono || g.telefono || "",
          dni: d.dni || g.dni || "",
          calle: d.calle || g.direccion?.calle || "",
          numero: d.numero || g.direccion?.numero || "",
          ciudad: d.ciudad || g.direccion?.ciudad || "",
          provincia: d.provincia || g.direccion?.provincia || "",
          codigoPostal: d.codigoPostal || g.direccion?.codigoPostal || ""
        }));
      })
      .catch((e) => {
        // 404 = no hay datos guardados, que es lo normal. Cualquier otra cosa
        // tampoco impide comprar: el formulario simplemente arranca vacío.
        if (!(e instanceof ApiError && e.status === 404)) console.warn("No se pudieron leer los datos guardados:", e);
      });
    return () => {
      cancelado = true;
    };
  }, [cliente, usuario]);

  // --- Cobertura y costo de envío, mientras se completa la dirección -------
  const itemsPedido = useMemo(() => items.map((i) => ({ varianteId: i.varianteId, cantidad: i.cantidad })), [items]);
  const clavesItems = itemsPedido.map((i) => `${i.varianteId}x${i.cantidad}`).join(",");
  const cobertura = estadoDeCobertura(datos.provincia);

  useEffect(() => {
    const puedeCotizar =
      entrega === "ENVIO_DOMICILIO" && cobertura === "dentro" && codigoPostalValido(datos.codigoPostal) && itemsPedido.length > 0;
    if (!puedeCotizar) {
      setCotizacion({ estado: "inactiva" });
      return;
    }
    setCotizacion({ estado: "calculando" });
    const numero = ++contadorCotizacion.current;
    // Espera un instante después de la última tecla: no se pide una cotización
    // por cada dígito del código postal.
    const timer = setTimeout(async () => {
      try {
        const r = await api.envios.cotizar({
          tipoEntrega: "ENVIO_DOMICILIO",
          provincia: datos.provincia,
          codigoPostal: datos.codigoPostal.trim(),
          items: itemsPedido
        });
        if (numero !== contadorCotizacion.current) return; // llegó tarde: ya hay otra consulta
        setCotizacion(
          r.cubierto && r.costo !== null ? { estado: "ok", costo: r.costo } : { estado: "fuera", mensaje: r.mensaje }
        );
      } catch (e) {
        if (numero !== contadorCotizacion.current) return;
        setCotizacion({ estado: "error", mensaje: textoDeError(e, "No pudimos calcular el envío. Probá de nuevo.") });
      }
    }, 450);
    return () => {
      clearTimeout(timer);
      // Es un contador, no un nodo del DOM: se quiere el valor de ESTE momento.
      // eslint-disable-next-line react-hooks/exhaustive-deps
      contadorCotizacion.current++; // invalida cualquier respuesta en camino
    };
    // `clavesItems` representa a itemsPedido (que cambia de identidad en cada render del carrito).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entrega, cobertura, datos.provincia, datos.codigoPostal, clavesItems, reintentoCotizacion]);

  // Al volver con "atrás" desde Mercado Pago, el navegador puede restaurar
  // esta página tal cual estaba -- con el botón en "Generando pago..." y
  // deshabilitado para siempre. `persisted` es true justo en ese caso.
  useEffect(() => {
    function alMostrarPagina(e: PageTransitionEvent) {
      if (e.persisted) setEnviando(false);
    }
    window.addEventListener("pageshow", alMostrarPagina);
    return () => window.removeEventListener("pageshow", alMostrarPagina);
  }, []);

  // Al cambiar de paso, el foco va al título del paso (lectores de pantalla y
  // teclado). No en la primera carga.
  useEffect(() => {
    if (primeraVez.current) {
      primeraVez.current = false;
      return;
    }
    tituloPaso.current?.focus();
  }, [paso]);

  // --- Validación -----------------------------------------------------------
  const erroresContacto = validarContacto(datos, cliente);
  const erroresEntrega = validarEntrega(datos, entrega);
  const erroresTodos: ErroresCheckout = { ...erroresContacto, ...erroresEntrega };

  function errorDe(campo: keyof DatosCheckout): string | undefined {
    if (errorServidor?.campo === campo) return errorServidor.texto;
    return mostrarErrores || tocados.has(campo) ? erroresTodos[campo] : undefined;
  }
  function tocar(campo: string) {
    setTocados((prev) => (prev.has(campo) ? prev : new Set(prev).add(campo)));
  }
  function cambiar(campo: keyof DatosCheckout, valor: string) {
    setDatos((d) => ({ ...d, [campo]: valor }));
    if (errorServidor?.campo === campo) setErrorServidor(null);
  }
  function propsCampo(campo: keyof DatosCheckout) {
    return {
      value: datos[campo],
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => cambiar(campo, e.target.value),
      onBlur: () => tocar(campo),
      error: errorDe(campo)
    };
  }

  const esRetiro = entrega === "RETIRO_LOCAL";
  const costoEnvio: number | null = esRetiro ? 0 : cotizacion.estado === "ok" ? cotizacion.costo : null;
  const fueraDeZona = !esRetiro && (cobertura === "fuera" || cotizacion.estado === "fuera");

  function irAlPaso(destino: Paso) {
    setMostrarErrores(false);
    setError(null);
    setPaso(destino);
  }

  function siguienteDesdeDatos() {
    if (hayErrores(erroresContacto)) {
      setMostrarErrores(true);
      return;
    }
    irAlPaso(2);
  }

  function siguienteDesdeEntrega() {
    if (hayErrores(erroresEntrega) || (!esRetiro && cotizacion.estado !== "ok")) {
      setMostrarErrores(true);
      return;
    }
    irAlPaso(3);
  }

  // --- Datos guardados: borrar ---------------------------------------------
  async function borrarDatosGuardados() {
    setErrorBorrado("");
    try {
      await api.cuenta.borrarDatosEntrega();
      setDatosGuardados(null);
      setConfirmandoBorrado(false);
      // El formulario queda vacío (menos nombre y email, que son de la cuenta).
      setDatos({ ...DATOS_VACIOS, nombre: usuario?.nombre ?? "", email: usuario?.email ?? "" });
      setTocados(new Set());
    } catch (e) {
      setErrorBorrado(textoDeError(e, "No pudimos borrar tus datos. Probá de nuevo."));
    }
  }

  async function salirDeLaCuenta() {
    await cerrarSesion();
    setDatos(DATOS_VACIOS);
    setDatosGuardados(null);
    setGuardarDatos(false);
  }

  // --- Comprar ---------------------------------------------------------------
  // "Comprar" crea el pedido (que reserva stock) y manda a Mercado Pago. El
  // carrito NO se vacía acá: se vacía recién en /checkout/exito, así quien
  // abandona el pago no pierde lo que había elegido. Si vuelve y toca
  // "Comprar" otra vez, se reabre el MISMO link (lib/iniciarPago).
  async function confirmarCompra() {
    if (enviando) return; // el botón también se deshabilita, pero un doble clic rápido llega antes
    if (hayErrores(erroresContacto) || hayErrores(erroresEntrega)) {
      setMostrarErrores(true);
      setPaso(hayErrores(erroresContacto) ? 1 : 2);
      return;
    }
    setEnviando(true);
    setError(null);
    setErrorServidor(null);

    const direccion: DireccionCheckoutRequest | null = esRetiro
      ? null
      : {
          calle: datos.calle.trim(),
          numero: datos.numero.trim() || undefined,
          ciudad: datos.ciudad.trim(),
          provincia: datos.provincia,
          codigoPostal: datos.codigoPostal.trim()
        };
    const emailEfectivo = cliente && usuario ? usuario.email : datos.email.trim();
    const firma = firmaDeCompra(itemsPedido, entrega, direccion, emailEfectivo);

    try {
      const { initPoint } = await obtenerLinkDePago({
        leerPagoGuardado: () => leerPagoPendiente(firma),
        crearPedido: async () => {
          const res = await api.checkout.confirmar({
            nombre: datos.nombre.trim(),
            email: emailEfectivo,
            telefono: datos.telefono.trim(),
            dni: esRetiro ? undefined : datos.dni.replace(/\D/g, ""),
            tipoEntrega: entrega,
            direccion,
            guardarDatos: cliente && guardarDatos ? true : undefined,
            items: itemsPedido
          });
          const pago = { pedidoId: res.pedidoId, initPoint: res.initPoint, venceEn: vencimientoDe(res.expiraEn) };
          guardarPagoPendiente({ ...pago, firma });
          return pago;
        }
      });

      if (!esLinkDePago(initPoint)) {
        borrarPagoPendiente();
        throw new Error("El link de pago que recibimos no es válido. No se hizo ningún cobro; probá de nuevo.");
      }
      window.location.href = initPoint; // redirige a Mercado Pago
      // Sin setEnviando(false): la página se va a Mercado Pago, y dejar el
      // botón habilitado ahí invitaría a un doble clic.
    } catch (e) {
      if (esEmailNoUsable(e)) {
        // El email es del equipo: no se puede comprar con él. Se vuelve al
        // paso donde se escribe, con el motivo pegado al campo.
        setErrorServidor({ campo: "email", texto: e instanceof Error ? e.message : "No podemos usar ese email para comprar. Usá otro." });
        irAlPaso(1);
      } else {
        setError({
          texto: textoDeError(e, "No pudimos completar la compra. Probá de nuevo."),
          // Un 409 suele ser stock agotado o un pedido que ya no se puede pagar.
          revisarCarrito: e instanceof ApiError && e.status === 409
        });
      }
      setEnviando(false);
    }
  }

  // --- Pantallas de espera / carrito vacío ----------------------------------
  // Mientras no se sabe si hay sesión ni qué hay en el carrito, no se dibuja
  // ningún paso: quien ya está logueado vería un instante el formulario vacío
  // (y podría empezar a escribir en él) antes de que se complete.
  if (cargandoSesion || !carritoListo) {
    return (
      <div className="max-w-5xl mx-auto px-6 py-10" aria-busy="true">
        <div className="skeleton h-9 w-64 mb-6" />
        <div className="grid md:grid-cols-[1fr_320px] gap-8">
          <div className="skeleton h-80" />
          <div className="skeleton h-56" />
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="max-w-xl mx-auto px-6 py-16 text-center anim-sube">
        <div className="w-16 h-16 mx-auto rounded-full bg-tierra-crema-oscuro flex items-center justify-center mb-4">
          <ShoppingBag size={28} className="text-tierra-terracota" />
        </div>
        <h1 className="font-serif text-2xl font-semibold text-tierra-terracota-oscuro">Tu carrito está vacío</h1>
        <p className="mt-2 text-tierra-terracota-oscuro/70">Elegí algo del catálogo para empezar la compra.</p>
        <Link href="/productos" className="btn-primario mt-6">
          Ver catálogo
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-6 py-10">
      <h1 className="font-serif text-2xl md:text-3xl font-semibold text-tierra-terracota-oscuro mb-6">Proceso de compra</h1>

      {/* Indicador de pasos: se puede volver a los ya completados. */}
      <ol className="flex items-center gap-2 mb-8 text-sm" aria-label="Pasos de la compra">
        {ETIQUETAS_PASOS.map((etiqueta, i) => {
          const numero = (i + 1) as Paso;
          const completado = paso > numero;
          const actual = paso === numero;
          return (
            <li key={etiqueta} className="flex items-center gap-2 flex-1 last:flex-none" aria-current={actual ? "step" : undefined}>
              <button
                type="button"
                onClick={() => completado && irAlPaso(numero)}
                disabled={!completado}
                className={`flex items-center gap-2 rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-tierra-terracota/50 ${
                  actual ? "text-tierra-terracota font-medium" : completado ? "text-tierra-verde cursor-pointer" : "text-tierra-terracota-oscuro/40 cursor-default"
                }`}
              >
                <span
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs transition-colors duration-300 ${
                    actual ? "bg-tierra-terracota text-white" : completado ? "bg-tierra-verde text-white" : "bg-tierra-crema-oscuro text-tierra-terracota-oscuro/60"
                  }`}
                >
                  {completado ? <Check size={14} /> : numero}
                </span>
                <span className="hidden sm:inline">{etiqueta}</span>
              </button>
              {i < ETIQUETAS_PASOS.length - 1 && (
                <span className="flex-1 h-0.5 rounded bg-tierra-crema-oscuro overflow-hidden" aria-hidden="true">
                  <span
                    className="block h-full bg-tierra-verde origin-left transition-transform duration-500"
                    style={{ transform: `scaleX(${paso > numero ? 1 : 0})` }}
                  />
                </span>
              )}
            </li>
          );
        })}
      </ol>

      <div className="grid md:grid-cols-[1fr_320px] gap-8 items-start">
        <div className="bg-white border border-tierra-crema-oscuro rounded-2xl p-6 overflow-hidden">
          {/* `key` re-dispara la animación de entrada en cada cambio de paso. */}
          <div key={paso} className="anim-paso">
            {paso === 1 && (
              <section className="space-y-4" aria-labelledby="titulo-paso">
                <h2 id="titulo-paso" ref={tituloPaso} tabIndex={-1} className="font-serif text-xl text-tierra-terracota-oscuro focus:outline-none">
                  Tus datos
                </h2>

                {cliente && usuario && (
                  <p className="text-sm text-tierra-terracota-oscuro/70">
                    ¿No sos {usuario.nombre.split(" ")[0]}?{" "}
                    <button type="button" onClick={salirDeLaCuenta} className="text-tierra-verde underline">
                      Cerrá sesión
                    </button>
                  </p>
                )}

                {datosGuardados && (
                  <div className="rounded-lg bg-tierra-verde/10 text-tierra-verde text-sm px-3 py-2 anim-aviso">
                    <p>Completamos el formulario con tus datos guardados. Podés cambiarlos.</p>
                    {!confirmandoBorrado ? (
                      <button type="button" onClick={() => setConfirmandoBorrado(true)} className="mt-1 underline">
                        Borrar mis datos guardados
                      </button>
                    ) : (
                      <div className="mt-2 text-tierra-terracota-oscuro">
                        <p>¿Borrar tus datos guardados? Tus pedidos no se tocan.</p>
                        <div className="mt-2 flex gap-2">
                          <button type="button" onClick={borrarDatosGuardados} className="btn-primario !py-1.5 !px-4 text-sm">
                            Sí, borrar
                          </button>
                          <button type="button" onClick={() => setConfirmandoBorrado(false)} className="btn-secundario !py-1.5 !px-4 text-sm">
                            Cancelar
                          </button>
                        </div>
                        {errorBorrado && (
                          <p role="alert" className="mt-1 text-sm text-red-600">
                            {errorBorrado}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )}

                <Campo id="nombre" etiqueta="Nombre completo" name="name" autoComplete="name" {...propsCampo("nombre")} />
                <Campo
                  id="email"
                  etiqueta="Correo electrónico"
                  name="email"
                  type="email"
                  autoComplete="email"
                  inputMode="email"
                  readOnly={cliente}
                  ayuda="Te mandamos la confirmación a este email. Con él vas a poder ver tus pedidos cuando quieras, sin contraseña."
                  {...propsCampo("email")}
                />
                <Campo id="telefono" etiqueta="Teléfono de contacto" name="tel" type="tel" autoComplete="tel" inputMode="tel" {...propsCampo("telefono")} />

                <button type="button" onClick={siguienteDesdeDatos} className="btn-primario">
                  Siguiente
                </button>
              </section>
            )}

            {paso === 2 && (
              <section className="space-y-4" aria-labelledby="titulo-paso">
                <h2 id="titulo-paso" ref={tituloPaso} tabIndex={-1} className="font-serif text-xl text-tierra-terracota-oscuro focus:outline-none">
                  ¿Cómo lo recibís?
                </h2>

                <div role="radiogroup" aria-label="Forma de entrega" className="grid sm:grid-cols-2 gap-3">
                  {(
                    [
                      { valor: "ENVIO_DOMICILIO", titulo: "Envío a domicilio", icono: <Truck size={18} />, detalle: costoEnvio !== null && !esRetiro ? pesos(costoEnvio) : "Se calcula con tu dirección" },
                      { valor: "RETIRO_LOCAL", titulo: "Retiro en el local", icono: <Store size={18} />, detalle: "Gratis · Esquel" }
                    ] as const
                  ).map((op) => {
                    const elegido = entrega === op.valor;
                    return (
                      <button
                        key={op.valor}
                        type="button"
                        role="radio"
                        aria-checked={elegido}
                        onClick={() => setEntrega(op.valor)}
                        className={`text-left rounded-xl border px-4 py-3 transition-[border-color,background-color,transform] active:scale-[0.99] focus:outline-none focus-visible:ring-2 focus-visible:ring-tierra-terracota/50 ${
                          elegido ? "border-tierra-terracota bg-tierra-crema" : "border-tierra-crema-oscuro hover:border-tierra-terracota/50"
                        }`}
                      >
                        <span className="flex items-center gap-2 font-medium text-tierra-terracota-oscuro">
                          {op.icono} {op.titulo}
                        </span>
                        <span className="block text-sm text-tierra-terracota-oscuro/70 mt-0.5">{op.detalle}</span>
                      </button>
                    );
                  })}
                </div>

                {!esRetiro && (
                  <div className="space-y-4 anim-sube">
                    <Campo
                      id="dni"
                      etiqueta="DNI"
                      name="dni"
                      inputMode="numeric"
                      autoComplete="off"
                      ayuda="Lo pide el correo para entregar el envío."
                      {...propsCampo("dni")}
                    />
                    <div className="grid grid-cols-3 gap-3">
                      <Campo id="calle" etiqueta="Calle" name="street-address" autoComplete="street-address" className="col-span-2" {...propsCampo("calle")} />
                      <Campo id="numero" etiqueta="Número" name="numero" inputMode="numeric" autoComplete="off" className="col-span-1" {...propsCampo("numero")} />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <Campo id="ciudad" etiqueta="Ciudad" name="address-level2" autoComplete="address-level2" {...propsCampo("ciudad")} />
                      <div>
                        <label htmlFor="provincia" className="block text-sm font-medium text-tierra-terracota-oscuro mb-1">
                          Provincia
                        </label>
                        <select
                          id="provincia"
                          name="address-level1"
                          autoComplete="address-level1"
                          value={datos.provincia}
                          onChange={(e) => cambiar("provincia", e.target.value)}
                          onBlur={() => tocar("provincia")}
                          aria-invalid={errorDe("provincia") ? true : undefined}
                          aria-describedby={errorDe("provincia") ? "provincia-error" : undefined}
                          className={`w-full text-base border rounded-lg px-3 py-2.5 bg-white focus:outline-none focus:ring-2 ${
                            errorDe("provincia") ? "border-red-500 focus:ring-red-300" : "border-tierra-crema-oscuro focus:border-tierra-verde focus:ring-tierra-verde/30"
                          }`}
                        >
                          <option value="">Elegí…</option>
                          {OPCIONES_PROVINCIA.map((p) => (
                            <option key={p} value={p}>
                              {p}
                            </option>
                          ))}
                        </select>
                        {errorDe("provincia") && (
                          <p id="provincia-error" className="mt-1 text-sm text-red-600 anim-aviso">
                            {errorDe("provincia")}
                          </p>
                        )}
                      </div>
                      <Campo id="cp" etiqueta="Código postal" name="postal-code" autoComplete="postal-code" inputMode="numeric" maxLength={4} {...propsCampo("codigoPostal")} />
                    </div>

                    {/* Estado de la cobertura / cotización, EN el momento de completar la dirección. */}
                    <div aria-live="polite" className="min-h-[1.5rem]">
                      {cotizacion.estado === "calculando" && <p className="text-sm text-tierra-terracota-oscuro/70 anim-aviso">Calculando el envío…</p>}
                      {cotizacion.estado === "ok" && (
                        <p className="text-sm text-tierra-verde anim-aviso">
                          Envío a tu domicilio: <strong>{pesos(cotizacion.costo)}</strong>
                        </p>
                      )}
                      {cotizacion.estado === "error" && (
                        <p className="text-sm text-red-600 anim-aviso" role="alert">
                          {cotizacion.mensaje}{" "}
                          <button type="button" onClick={() => setReintentoCotizacion((n) => n + 1)} className="underline">
                            Reintentar
                          </button>
                        </p>
                      )}
                      {fueraDeZona && (
                        <div className="rounded-lg bg-tierra-ambar/10 border border-tierra-ambar/40 px-3 py-2 text-sm text-tierra-terracota-oscuro anim-aviso">
                          <p>
                            {cotizacion.estado === "fuera" && cotizacion.mensaje
                              ? cotizacion.mensaje
                              : "Todavía no enviamos a esa provincia. Podés retirar tu compra en el local, sin costo."}
                          </p>
                          <button type="button" onClick={() => setEntrega("RETIRO_LOCAL")} className="mt-2 btn-secundario !py-1.5 !px-4 text-sm">
                            Retirar en el local
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {esRetiro && <p className="text-sm text-tierra-terracota-oscuro/70 anim-sube">Retirás en nuestro local de Esquel. No hace falta DNI ni dirección.</p>}

                <div className="flex gap-3 pt-1">
                  <button type="button" onClick={() => irAlPaso(1)} className="btn-secundario">
                    <ArrowLeft size={16} /> Atrás
                  </button>
                  <button type="button" onClick={siguienteDesdeEntrega} className="btn-primario">
                    Siguiente
                  </button>
                </div>
              </section>
            )}

            {paso === 3 && (
              <section className="space-y-4" aria-labelledby="titulo-paso">
                <h2 id="titulo-paso" ref={tituloPaso} tabIndex={-1} className="font-serif text-xl text-tierra-terracota-oscuro focus:outline-none">
                  Pago
                </h2>

                <div className="text-sm text-tierra-terracota-oscuro/80 space-y-1">
                  <p>
                    <strong>{datos.nombre}</strong> · {cliente && usuario ? usuario.email : datos.email}
                  </p>
                  <p>
                    {esRetiro
                      ? "Retiro en el local de Esquel."
                      : `Envío a ${datos.calle}${datos.numero ? ` (${datos.numero})` : ""}, ${datos.ciudad}, ${datos.provincia} (${datos.codigoPostal}).`}
                  </p>
                </div>

                <p className="text-sm text-tierra-terracota-oscuro/70">
                  El pago se completa en Mercado Pago: tarjetas de crédito/débito o dinero en cuenta. Tierra nunca ve ni guarda el número de tarjeta.
                </p>

                {cliente && (
                  <label className="flex items-start gap-2 text-sm text-tierra-terracota-oscuro cursor-pointer">
                    <input
                      type="checkbox"
                      checked={guardarDatos}
                      onChange={(e) => setGuardarDatos(e.target.checked)}
                      className="mt-0.5 h-4 w-4 accent-tierra-verde"
                    />
                    <span>Guardar mis datos para la próxima compra</span>
                  </label>
                )}

                {error && (
                  <div className="text-sm text-red-600 anim-aviso" role="alert">
                    <p>{error.texto}</p>
                    {error.revisarCarrito && (
                      <Link href="/carrito" className="underline">
                        Revisar mi carrito
                      </Link>
                    )}
                  </div>
                )}

                <div className="flex gap-3 pt-1">
                  <button type="button" onClick={() => irAlPaso(2)} disabled={enviando} className="btn-secundario">
                    <ArrowLeft size={16} /> Atrás
                  </button>
                  <button type="button" onClick={confirmarCompra} disabled={enviando} className="btn-naranja px-8">
                    {enviando ? "Generando pago…" : "Comprar"}
                  </button>
                </div>
              </section>
            )}
          </div>
        </div>

        <ResumenCompra items={items} subtotal={subtotal} costoEnvio={costoEnvio} esRetiro={esRetiro} enviosPendiente={!esRetiro && cotizacion.estado === "calculando"} />
      </div>
    </div>
  );
}
