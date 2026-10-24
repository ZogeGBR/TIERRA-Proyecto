"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Package, ShieldCheck } from "lucide-react";
import { useAuth, esCliente } from "@/context/AuthContext";
import { api, ApiError } from "@/lib/api";
import { textoDeError } from "@/lib/errores";
import { esLinkDePago, numeroDePedido } from "@/lib/pedidoPendiente";
import { etiquetaDeEstado, fechaLarga, sePuedePagar, tonoDeEstado, type TonoEstado } from "@/lib/pedidos";
import type { PedidoHistorial } from "@/lib/types";

const TONOS: Record<TonoEstado, string> = {
  ok: "bg-tierra-verde/10 text-tierra-verde",
  espera: "bg-tierra-ambar/15 text-tierra-ambar",
  malo: "bg-tierra-terracota/10 text-tierra-terracota",
  neutro: "bg-tierra-crema-oscuro text-tierra-terracota-oscuro"
};

function pesos(n: number): string {
  return `$${n.toLocaleString("es-AR")}`;
}

// Historial de pedidos de un cliente con sesión (por código). El DNI y el
// teléfono del destinatario llegan ya ocultos desde el backend: acá solo se
// muestran.
export function ListaPedidos() {
  const { usuario, cargando } = useAuth();
  const router = useRouter();
  const [pedidos, setPedidos] = useState<PedidoHistorial[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pagando, setPagando] = useState<string | null>(null);
  const [errorPago, setErrorPago] = useState<{ id: string; texto: string } | null>(null);

  const cliente = esCliente(usuario);

  // Sin sesión: a /login, y de vuelta acá después de entrar.
  useEffect(() => {
    if (!cargando && !usuario) router.replace("/login?redirect=/cuenta/pedidos");
  }, [cargando, usuario, router]);

  useEffect(() => {
    if (!cliente) return;
    let cancelado = false;
    api.pedidos
      .mios()
      .then((p) => !cancelado && setPedidos(p))
      .catch((e) => {
        if (cancelado) return;
        // 401: la sesión venció mientras tanto -> a /login.
        if (e instanceof ApiError && e.status === 401) router.replace("/login?redirect=/cuenta/pedidos");
        else setError(textoDeError(e, "No pudimos cargar tus pedidos."));
      });
    return () => {
      cancelado = true;
    };
  }, [cliente, router]);

  async function pagar(id: string) {
    if (pagando) return;
    setPagando(id);
    setErrorPago(null);
    try {
      const pref = await api.pagos.crearPreferencia(id);
      if (!esLinkDePago(pref.initPoint)) throw new Error("El link de pago que recibimos no es válido. No se hizo ningún cobro.");
      window.location.href = pref.initPoint;
    } catch (e) {
      setErrorPago({ id, texto: textoDeError(e, "No pudimos abrir el pago. Probá de nuevo.") });
      setPagando(null);
    }
  }

  if (cargando || (usuario && cliente && pedidos === null && !error)) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-10" aria-busy="true">
        <div className="skeleton h-9 w-48 mb-6" />
        <div className="space-y-4">
          <div className="skeleton h-40" />
          <div className="skeleton h-40" />
        </div>
      </div>
    );
  }

  if (usuario && !cliente) {
    return (
      <div className="max-w-xl mx-auto px-6 py-16 text-center">
        <h1 className="font-serif text-2xl font-semibold text-tierra-terracota-oscuro">Mis pedidos</h1>
        <p className="mt-2 text-tierra-terracota-oscuro/70">Esta sección es para clientes. Con una cuenta del equipo no hay historial de compras.</p>
      </div>
    );
  }

  if (!usuario) return null; // se está redirigiendo a /login

  return (
    <div className="max-w-3xl mx-auto px-6 py-10">
      <h1 className="font-serif text-2xl md:text-3xl font-semibold text-tierra-terracota-oscuro mb-2">Mis pedidos</h1>
      <p className="text-sm text-tierra-terracota-oscuro/60 mb-6 flex items-center gap-1.5">
        <ShieldCheck size={14} /> Por tu seguridad, el DNI y el teléfono se muestran ocultos.
      </p>

      {error && (
        <p role="alert" className="text-red-600">
          {error}
        </p>
      )}

      {pedidos && pedidos.length === 0 && (
        <div className="text-center py-12 anim-sube">
          <div className="w-16 h-16 mx-auto rounded-full bg-tierra-crema-oscuro flex items-center justify-center mb-4">
            <Package size={28} className="text-tierra-terracota" />
          </div>
          <p className="text-tierra-terracota-oscuro/70">Todavía no tenés pedidos con este email.</p>
          <Link href="/productos" className="btn-primario mt-4">
            Ver catálogo
          </Link>
        </div>
      )}

      <ul className="space-y-4">
        {pedidos?.map((p, i) => (
          <li
            key={p.id}
            className="bg-white border border-tierra-crema-oscuro rounded-2xl p-5 anim-sube"
            style={{ animationDelay: `${Math.min(i, 6) * 60}ms` }}
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="font-medium text-tierra-terracota-oscuro">Pedido N° {numeroDePedido(p.id)}</p>
                <p className="text-sm text-tierra-terracota-oscuro/60">{fechaLarga(p.creadoEn)}</p>
              </div>
              <span className={`text-xs font-medium px-3 py-1 rounded-full ${TONOS[tonoDeEstado(p.estado)]}`}>{etiquetaDeEstado(p.estado)}</span>
            </div>

            <ul className="mt-3 text-sm divide-y divide-tierra-crema-oscuro">
              {p.items.map((it, j) => (
                <li key={j} className="flex justify-between gap-3 py-1.5">
                  <span>
                    {it.nombreProducto}
                    {[it.talla, it.color].filter(Boolean).length > 0 && (
                      <span className="text-tierra-terracota-oscuro/50"> · {[it.talla, it.color].filter(Boolean).join(" / ")}</span>
                    )}{" "}
                    <span className="text-tierra-terracota-oscuro/60">x{it.cantidad}</span>
                  </span>
                  <span className="shrink-0">{pesos(it.precioUnitario * it.cantidad)}</span>
                </li>
              ))}
            </ul>

            <dl className="mt-3 text-sm text-tierra-terracota-oscuro/80 space-y-0.5">
              <div className="flex gap-2">
                <dt className="text-tierra-terracota-oscuro/50">Entrega:</dt>
                <dd>
                  {p.tipoEntrega === "RETIRO_LOCAL"
                    ? "Retiro en el local"
                    : p.direccionEntrega
                      ? `${p.direccionEntrega.calle}${p.direccionEntrega.numero ? " " + p.direccionEntrega.numero : ""}, ${p.direccionEntrega.ciudad}, ${p.direccionEntrega.provincia}`
                      : "Envío a domicilio"}
                </dd>
              </div>
              <div className="flex gap-2">
                <dt className="text-tierra-terracota-oscuro/50">Destinatario:</dt>
                <dd>
                  {p.contactoNombre}
                  {p.contactoTelefono ? ` · Tel. ${p.contactoTelefono}` : ""}
                  {p.contactoDni ? ` · DNI ${p.contactoDni}` : ""}
                </dd>
              </div>
            </dl>

            <div className="mt-3 pt-3 border-t border-tierra-crema-oscuro flex flex-wrap items-center justify-between gap-3">
              <p className="font-bold text-tierra-terracota-oscuro">Total {pesos(p.total)}</p>
              {sePuedePagar(p.estado) && (
                <button type="button" onClick={() => pagar(p.id)} disabled={pagando !== null} className="btn-naranja !py-2 text-sm">
                  {pagando === p.id ? "Abriendo el pago…" : "Pagar"}
                </button>
              )}
            </div>
            {errorPago?.id === p.id && (
              <p role="alert" className="mt-2 text-sm text-red-600 anim-aviso">
                {errorPago.texto}
              </p>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
