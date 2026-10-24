"use client";

import { useEffect, useMemo, useState } from "react";
import { Minus, Plus, Send, Copy, Check, Snowflake } from "lucide-react";
import { api } from "@/lib/api";
import { Nieve } from "@/components/Nieve";
import { WHATSAPP_NUMERO } from "@/lib/contacto";
import { textoDeError } from "@/lib/errores";
import {
  armarMensajeConsulta,
  diasDeAlquiler,
  enlaceWhatsapp,
  estimarPrecio,
  type LineaAlquiler,
  type TipoAlquiler
} from "@/lib/alquiler";

// Número de WhatsApp de Tierra Rental: lo da el cliente (decisión 0001) y se
// configura por variable de entorno, no en el código.
const WHATSAPP = process.env.NEXT_PUBLIC_WHATSAPP_ALQUILER || WHATSAPP_NUMERO;

function hoyISO(): string {
  // Fecha local de la persona (no UTC): a las 22 hs en Argentina, UTC ya es
  // "mañana" y el calendario no dejaría elegir hoy.
  const d = new Date();
  const mes = String(d.getMonth() + 1).padStart(2, "0");
  const dia = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mes}-${dia}`;
}

// Estimador de precio de alquiler. NO es una reserva y NO muestra
// disponibilidad: Tierra confirma por WhatsApp y el retiro se resuelve en el
// local (decisión 0001).
export default function AlquilerPage() {
  const [tipos, setTipos] = useState<TipoAlquiler[] | null>(null);
  const [errorCarga, setErrorCarga] = useState<string | null>(null);
  const [cantidades, setCantidades] = useState<Record<string, number>>({});
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [copiado, setCopiado] = useState(false);
  // "Hoy" se calcula recién en el navegador: la página se genera estática en el build y, si se
  // calculara al renderizar, la fecha del servidor no coincidiría con la de la persona (error de hidratación).
  const [hoy, setHoy] = useState("");
  useEffect(() => { setHoy(hoyISO()); }, []);
  const [nombre, setNombre] = useState("");

  useEffect(() => {
    let cancelado = false;
    api.alquiler
      .tipos()
      .then((t) => !cancelado && setTipos(t))
      .catch((e) => !cancelado && setErrorCarga(textoDeError(e, "No pudimos cargar los equipos.")));
    return () => {
      cancelado = true;
    };
  }, []);

  const lineas: LineaAlquiler[] = useMemo(
    () => (tipos ?? []).map((t) => ({ tipo: t, cantidad: cantidades[t.id] ?? 0 })).filter((l) => l.cantidad > 0),
    [tipos, cantidades]
  );
  const dias = diasDeAlquiler(desde, hasta);
  const fechasInvertidas = desde !== "" && hasta !== "" && dias === null;
  const estimado = dias !== null && lineas.length > 0 ? estimarPrecio(lineas, dias) : null;
  const mensaje = estimado !== null && dias !== null ? armarMensajeConsulta(lineas, desde, hasta, dias, estimado, nombre) : null;
  const enlace = mensaje ? enlaceWhatsapp(WHATSAPP, mensaje) : null;

  function cambiar(id: string, delta: number) {
    setCantidades((c) => ({ ...c, [id]: Math.max(0, Math.min(20, (c[id] ?? 0) + delta)) }));
  }

  async function copiar() {
    if (!mensaje) return;
    try {
      await navigator.clipboard.writeText(mensaje);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      // Sin permiso para el portapapeles: el texto sigue visible para copiarlo a mano.
    }
  }

  const clasesFecha =
    "w-full text-base border border-tierra-crema-oscuro rounded-lg px-3 py-2.5 bg-white focus:outline-none focus:border-tierra-verde focus:ring-2 focus:ring-tierra-verde/30";

  return (
    <div className="tema-invierno" data-tema="invierno">
    <Nieve className="z-20" />
    <div className="tema-invierno-contenido max-w-4xl mx-auto px-6 py-10">
      <h1 className="titulo-hielo font-serif text-2xl md:text-3xl font-semibold text-tierra-terracota-oscuro mb-2 anim-sube">
        <Snowflake size={24} className="copo-gira inline-block align-[-3px] mr-2 text-tierra-verde" aria-hidden="true" />
        Alquiler de equipo de invierno
      </h1>
      <p className="text-tierra-terracota-oscuro/70 mb-6">
        Calculá un precio estimado y consultanos la disponibilidad por WhatsApp. La reserva y el retiro se resuelven en el local.
      </p>

      <div className="grid md:grid-cols-[1fr_320px] gap-8 items-start">
        <div className="space-y-6">
          <section className="bg-white border border-tierra-crema-oscuro rounded-2xl p-6" aria-labelledby="t-equipo">
            <h2 id="t-equipo" className="font-serif text-lg text-tierra-terracota-oscuro mb-4">
              1. ¿Qué equipo necesitás?
            </h2>

            {errorCarga && (
              <p role="alert" className="text-sm text-red-600">
                {errorCarga}
              </p>
            )}
            {!tipos && !errorCarga && (
              <div className="space-y-3" aria-busy="true">
                <div className="skeleton h-14" />
                <div className="skeleton h-14" />
                <div className="skeleton h-14" />
              </div>
            )}
            {tipos && tipos.length === 0 && <p className="text-tierra-terracota-oscuro/70">Todavía no hay equipos cargados. Escribinos y te contamos.</p>}
            {tipos && tipos.length > 0 && (
              <ul className="grilla-anim divide-y divide-tierra-crema-oscuro">
                {tipos.map((t) => {
                  const cantidad = cantidades[t.id] ?? 0;
                  return (
                    <li key={t.id} className="flex items-center justify-between gap-4 py-3">
                      <div>
                        <p className="font-medium text-tierra-terracota-oscuro flex items-center gap-2">
                          <Snowflake size={15} className="text-tierra-verde" /> {t.nombre}
                        </p>
                        <p className="text-sm text-tierra-terracota-oscuro/60">${t.precioDia.toLocaleString("es-AR")} por día, cada uno</p>
                      </div>
                      <div className="flex items-center gap-1 bg-tierra-crema rounded-full p-1">
                        <button
                          type="button"
                          onClick={() => cambiar(t.id, -1)}
                          disabled={cantidad === 0}
                          aria-label={`Restar un ${t.nombre}`}
                          className="w-8 h-8 rounded-full bg-white text-tierra-terracota flex items-center justify-center shadow-sm hover:bg-tierra-terracota hover:text-white transition-colors disabled:opacity-40 disabled:hover:bg-white disabled:hover:text-tierra-terracota"
                        >
                          <Minus size={14} />
                        </button>
                        <span key={cantidad} className={`w-8 text-center text-sm font-medium ${cantidad > 0 ? "anim-saltito" : ""}`} aria-live="polite">
                          {cantidad}
                        </span>
                        <button
                          type="button"
                          onClick={() => cambiar(t.id, 1)}
                          aria-label={`Sumar un ${t.nombre}`}
                          className="w-8 h-8 rounded-full bg-white text-tierra-terracota flex items-center justify-center shadow-sm hover:bg-tierra-terracota hover:text-white transition-colors"
                        >
                          <Plus size={14} />
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <section className="bg-white border border-tierra-crema-oscuro rounded-2xl p-6" aria-labelledby="t-fechas">
            <h2 id="t-fechas" className="font-serif text-lg text-tierra-terracota-oscuro mb-4">
              2. ¿Para qué fechas?
            </h2>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="desde" className="block text-sm font-medium text-tierra-terracota-oscuro mb-1">
                  Retiro
                </label>
                <input id="desde" type="date" min={hoy || undefined} value={desde} onChange={(e) => setDesde(e.target.value)} className={clasesFecha} />
              </div>
              <div>
                <label htmlFor="hasta" className="block text-sm font-medium text-tierra-terracota-oscuro mb-1">
                  Devolución
                </label>
                <input id="hasta" type="date" min={desde || hoy || undefined} value={hasta} onChange={(e) => setHasta(e.target.value)} className={clasesFecha} aria-invalid={fechasInvertidas || undefined} />
              </div>
            </div>
            <div className="mt-4">
              <label htmlFor="nombre-alquiler" className="block text-sm font-medium text-tierra-terracota-oscuro mb-1">
                Tu nombre <span className="font-normal text-tierra-terracota-oscuro/60">(opcional)</span>
              </label>
              <input id="nombre-alquiler" type="text" maxLength={60} autoComplete="name" value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Para saber con quién coordinar" className={clasesFecha} />
            </div>
            {fechasInvertidas && (
              <p role="alert" className="mt-2 text-sm text-red-600 anim-aviso">
                La devolución no puede ser antes del retiro.
              </p>
            )}
          </section>
        </div>

        <aside className="bg-white border border-tierra-crema-oscuro rounded-2xl p-6 md:sticky md:top-6" aria-label="Precio estimado">
          <p className="text-xs uppercase tracking-wide text-tierra-terracota/80 font-medium">Precio estimado</p>
          {estimado !== null && dias !== null ? (
            <div className="anim-sube" key={`${estimado}-${dias}`}>
              <p className="mt-1 font-serif text-3xl font-semibold text-tierra-terracota-oscuro">${estimado.toLocaleString("es-AR")}</p>
              <p className="text-sm text-tierra-terracota-oscuro/70 mt-1">
                {lineas.reduce((a, l) => a + l.cantidad, 0)} equipo(s) · {dias} {dias === 1 ? "día" : "días"}
              </p>
            </div>
          ) : (
            <p className="mt-2 text-sm text-tierra-terracota-oscuro/70">Elegí equipo y fechas para ver el estimado.</p>
          )}

          <p className="mt-4 text-xs text-tierra-terracota-oscuro/60">
            Es solo un estimado: no es una reserva ni asegura disponibilidad. El precio final y la disponibilidad se confirman con Tierra.
          </p>

          <div className="mt-4 space-y-2">
            {mensaje && enlace ? (
              <a href={enlace} target="_blank" rel="noopener noreferrer" className="btn-primario w-full anim-sube" data-enviar-alquiler>
                <Send size={16} /> Enviar por WhatsApp
              </a>
            ) : (
              <button type="button" disabled className="btn-primario w-full" data-enviar-alquiler>
                <Send size={16} /> Enviar por WhatsApp
              </button>
            )}
            {!mensaje && <p className="text-xs text-tierra-terracota-oscuro/70">Elegí equipo y fechas para poder enviar el pedido y coordinar con Tierra.</p>}
            {mensaje && <p className="text-xs text-tierra-terracota-oscuro/70 anim-sube">Se abre WhatsApp con el pedido armado; la reserva y el retiro se confirman con Tierra.</p>}
            {mensaje && (
              <button type="button" onClick={copiar} className="btn-secundario w-full text-sm anim-sube">
                {copiado ? <Check size={15} /> : <Copy size={15} />} {copiado ? "Copiado" : "Copiar el mensaje"}
              </button>
            )}
          </div>
        </aside>
      </div>
    </div>
    </div>
  );
}
