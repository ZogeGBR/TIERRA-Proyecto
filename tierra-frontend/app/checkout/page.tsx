"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/context/CartContext";
import { api } from "@/lib/api";

type Paso = 1 | 2 | 3;

const COSTO_ENVIO_REFERENCIAL = 12000; // el total real lo calcula el backend; esto es solo para mostrar en pantalla

export default function CheckoutPage() {
  const { items, subtotal, vaciarCarrito } = useCart();
  const router = useRouter();
  const [paso, setPaso] = useState<Paso>(1);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [datosCliente, setDatosCliente] = useState({ nombre: "", email: "", telefono: "" });
  const [datosEnvio, setDatosEnvio] = useState({ calle: "", codigoPostal: "", ciudad: "" });
  const [metodoEnvio, setMetodoEnvio] = useState<"domicilio" | "retiro">("domicilio");

  // NOTA: este checkout asume un usuario y una dirección ya creados (usuarioId,
  // direccionEnvioId) porque así está diseñado el backend hoy (CrearPedidoRequest
  // los pide como UUID existentes). Falta un endpoint de "crear cuenta / dirección
  // exprés durante el checkout" para que este formulario los genere en el paso 1 y 2
  // en vez de simularlos — dejar ese endpoint como siguiente tarea del backend.

  async function confirmarCompra() {
    setCargando(true);
    setError(null);
    try {
      const pedido = await api.pedidos.crear({
        usuarioId: "REEMPLAZAR-CON-USUARIO-LOGUEADO",
        tipoEntrega: metodoEnvio === "domicilio" ? "ENVIO_DOMICILIO" : "RETIRO_LOCAL",
        direccionEnvioId: metodoEnvio === "domicilio" ? "REEMPLAZAR-CON-DIRECCION-CREADA" : null,
        items: items.map((i) => ({ varianteId: i.varianteId, cantidad: i.cantidad }))
      });

      const preferencia = await api.pagos.crearPreferencia(pedido.id);
      vaciarCarrito();
      window.location.href = preferencia.initPoint; // redirige a Mercado Pago
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo completar la compra.");
    } finally {
      setCargando(false);
    }
  }

  return (
    <div className="max-w-5xl mx-auto px-6 py-10">
      <h1 className="font-serif text-2xl md:text-3xl font-semibold text-tierra-bordo-oscuro mb-6">Proceso de compra</h1>

      <div className="flex gap-6 mb-8 text-sm">
        {(["1. Datos del cliente", "2. Datos de envío", "3. Pago"] as const).map((label, i) => (
          <div
            key={label}
            className={`flex items-center gap-2 ${paso === i + 1 ? "text-tierra-bordo font-medium" : "text-tierra-bordo-oscuro/40"}`}
          >
            <span className="w-6 h-6 rounded-full bg-tierra-bordo text-white flex items-center justify-center text-xs">
              {i + 1}
            </span>
            {label}
          </div>
        ))}
      </div>

      <div className="grid md:grid-cols-[1fr_320px] gap-8">
        <div className="bg-white border border-tierra-crema-oscuro rounded-lg p-6">
          {paso === 1 && (
            <div className="space-y-4">
              <input
                placeholder="Nombre completo"
                value={datosCliente.nombre}
                onChange={(e) => setDatosCliente({ ...datosCliente, nombre: e.target.value })}
                className="w-full border border-tierra-crema-oscuro rounded px-3 py-2 transition-colors focus:outline-none focus:border-tierra-azul focus:ring-1 focus:ring-tierra-azul"
              />
              <input
                placeholder="Correo electrónico"
                type="email"
                value={datosCliente.email}
                onChange={(e) => setDatosCliente({ ...datosCliente, email: e.target.value })}
                className="w-full border border-tierra-crema-oscuro rounded px-3 py-2 transition-colors focus:outline-none focus:border-tierra-azul focus:ring-1 focus:ring-tierra-azul"
              />
              <input
                placeholder="Teléfono"
                value={datosCliente.telefono}
                onChange={(e) => setDatosCliente({ ...datosCliente, telefono: e.target.value })}
                className="w-full border border-tierra-crema-oscuro rounded px-3 py-2 transition-colors focus:outline-none focus:border-tierra-azul focus:ring-1 focus:ring-tierra-azul"
              />
              <button
                onClick={() => setPaso(2)}
                className="btn-primario"
              >
                Siguiente
              </button>
            </div>
          )}

          {paso === 2 && (
            <div className="space-y-4">
              <div className="flex gap-3">
                <button
                  onClick={() => setMetodoEnvio("domicilio")}
                  className={`flex-1 border rounded px-3 py-3 text-left transition-colors hover:border-tierra-bordo/50 focus:outline-none focus:ring-2 focus:ring-tierra-bordo/40 ${metodoEnvio === "domicilio" ? "border-tierra-bordo bg-tierra-crema" : "border-tierra-crema-oscuro"}`}
                >
                  Envío a domicilio — ${COSTO_ENVIO_REFERENCIAL.toLocaleString("es-AR")}
                </button>
                <button
                  onClick={() => setMetodoEnvio("retiro")}
                  className={`flex-1 border rounded px-3 py-3 text-left transition-colors hover:border-tierra-bordo/50 focus:outline-none focus:ring-2 focus:ring-tierra-bordo/40 ${metodoEnvio === "retiro" ? "border-tierra-bordo bg-tierra-crema" : "border-tierra-crema-oscuro"}`}
                >
                  Retiro en tienda — Gratis
                </button>
              </div>

              {metodoEnvio === "domicilio" && (
                <>
                  <input
                    placeholder="Calle y número"
                    value={datosEnvio.calle}
                    onChange={(e) => setDatosEnvio({ ...datosEnvio, calle: e.target.value })}
                    className="w-full border border-tierra-crema-oscuro rounded px-3 py-2 transition-colors focus:outline-none focus:border-tierra-azul focus:ring-1 focus:ring-tierra-azul"
                  />
                  <div className="flex gap-3">
                    <input
                      placeholder="Código postal"
                      value={datosEnvio.codigoPostal}
                      onChange={(e) => setDatosEnvio({ ...datosEnvio, codigoPostal: e.target.value })}
                      className="w-1/2 border border-tierra-crema-oscuro rounded px-3 py-2 transition-colors focus:outline-none focus:border-tierra-azul focus:ring-1 focus:ring-tierra-azul"
                    />
                    <input
                      placeholder="Ciudad"
                      value={datosEnvio.ciudad}
                      onChange={(e) => setDatosEnvio({ ...datosEnvio, ciudad: e.target.value })}
                      className="w-1/2 border border-tierra-crema-oscuro rounded px-3 py-2 transition-colors focus:outline-none focus:border-tierra-azul focus:ring-1 focus:ring-tierra-azul"
                    />
                  </div>
                </>
              )}

              <button
                onClick={() => setPaso(3)}
                className="btn-primario"
              >
                Siguiente
              </button>
            </div>
          )}

          {paso === 3 && (
            <div className="space-y-4">
              <p className="text-sm text-tierra-bordo-oscuro/70">
                El pago se completa en Mercado Pago: tarjetas de crédito/débito, cuotas o dinero en cuenta.
                Tierra nunca ve ni guarda el número de tarjeta.
              </p>
              {error && <p className="text-sm text-red-600">{error}</p>}
              <button
                onClick={confirmarCompra}
                disabled={cargando}
                className="btn-naranja px-8"
              >
                {cargando ? "Generando pago..." : "Comprar"}
              </button>
            </div>
          )}
        </div>

        <aside className="bg-white border border-tierra-crema-oscuro rounded-lg p-6 h-fit">
          <p className="font-medium mb-3">Resumen</p>
          {items.map((i) => (
            <div key={i.varianteId} className="flex justify-between text-sm mb-1">
              <span>
                {i.nombreProducto} x{i.cantidad}
              </span>
              <span>${(i.precioUnitario * i.cantidad).toLocaleString("es-AR")}</span>
            </div>
          ))}
          <div className="border-t border-tierra-crema-oscuro mt-3 pt-3 flex justify-between font-bold">
            <span>Vas a pagar un total de:</span>
            <span>
              $
              {(subtotal + (metodoEnvio === "domicilio" ? COSTO_ENVIO_REFERENCIAL : 0)).toLocaleString(
                "es-AR"
              )}
            </span>
          </div>
        </aside>
      </div>
    </div>
  );
}
