"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";
import { api } from "@/lib/api";

type Paso = 1 | 2 | 3;

const COSTO_ENVIO_REFERENCIAL = 12000; // el total real lo calcula el backend; esto es solo para mostrar en pantalla

// Checkout con cuenta implícita (ver docs/decisiones/0005 en el backend):
// si no hay sesión, el Paso 1 pide nombre/email/DNI y el backend crea la
// cuenta en silencio al confirmar, dejando la sesión iniciada -- para quien
// compra, es indistinguible de comprar como invitado. Si ya hay sesión
// (alguien que volvió), el Paso 1 se salta directamente.
export default function CheckoutPage() {
  const { usuario, establecerUsuario } = useAuth();
  const { items, subtotal, vaciarCarrito } = useCart();
  const router = useRouter();

  const yaTieneSesion = usuario !== null;
  const [paso, setPaso] = useState<Paso>(yaTieneSesion ? 2 : 1);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [emailYaRegistrado, setEmailYaRegistrado] = useState(false);

  const [datosCliente, setDatosCliente] = useState({ nombre: "", email: "", dni: "", telefono: "" });
  const [datosEnvio, setDatosEnvio] = useState({
    calle: "",
    numero: "",
    ciudad: "",
    provincia: "",
    codigoPostal: ""
  });
  const [metodoEnvio, setMetodoEnvio] = useState<"domicilio" | "retiro">("domicilio");

  async function confirmarCompra() {
    setCargando(true);
    setError(null);
    setEmailYaRegistrado(false);
    try {
      const resultado = await api.checkout.confirmar({
        nombre: datosCliente.nombre,
        email: datosCliente.email,
        dni: datosCliente.dni,
        telefono: datosCliente.telefono || undefined,
        tipoEntrega: metodoEnvio === "domicilio" ? "ENVIO_DOMICILIO" : "RETIRO_LOCAL",
        direccion:
          metodoEnvio === "domicilio"
            ? {
                calle: datosEnvio.calle,
                numero: datosEnvio.numero || undefined,
                ciudad: datosEnvio.ciudad,
                provincia: datosEnvio.provincia,
                codigoPostal: datosEnvio.codigoPostal
              }
            : null,
        items: items.map((i) => ({ varianteId: i.varianteId, cantidad: i.cantidad }))
      });

      // El backend puede haber creado la cuenta recién ahora: el contexto
      // tiene que enterarse sin que la persona tenga que loguearse aparte.
      establecerUsuario(resultado.usuario);

      const preferencia = await api.pagos.crearPreferencia(resultado.pedido.id);
      vaciarCarrito();
      window.location.href = preferencia.initPoint; // redirige a Mercado Pago
    } catch (e) {
      const mensaje = e instanceof Error ? e.message : "No se pudo completar la compra.";
      // El backend responde este mensaje específico cuando el email ya
      // tiene una cuenta -- no se puede seguir como invitado con ese email,
      // hay que ofrecer login en vez de repetir el error genérico.
      if (mensaje.toLowerCase().includes("ya existe una cuenta")) {
        setEmailYaRegistrado(true);
      }
      setError(mensaje);
    } finally {
      setCargando(false);
    }
  }

  const pasos = yaTieneSesion
    ? (["1. Datos de envío", "2. Pago"] as const)
    : (["1. Datos del cliente", "2. Datos de envío", "3. Pago"] as const);
  const pasoVisual = yaTieneSesion ? paso - 1 : paso;

  return (
    <div className="max-w-5xl mx-auto px-6 py-10">
      <h1 className="font-serif text-2xl md:text-3xl font-semibold text-tierra-terracota-oscuro mb-6">Proceso de compra</h1>

      {usuario && (
        <p className="text-sm text-tierra-terracota-oscuro/70 mb-4">
          Comprando como <span className="font-medium">{usuario.nombre}</span> ({usuario.email})
        </p>
      )}

      <div className="flex gap-6 mb-8 text-sm">
        {pasos.map((label, i) => {
          const numeroPaso = i + 1;
          const yaCompletado = pasoVisual > numeroPaso;
          return (
            <button
              key={label}
              type="button"
              onClick={() => yaCompletado && setPaso((yaTieneSesion ? numeroPaso + 1 : numeroPaso) as Paso)}
              disabled={!yaCompletado}
              className={`flex items-center gap-2 rounded transition-colors ${
                pasoVisual === numeroPaso ? "text-tierra-terracota font-medium" : "text-tierra-terracota-oscuro/40"
              } ${yaCompletado ? "hover:text-tierra-terracota cursor-pointer" : "cursor-default"}`}
              title={yaCompletado ? "Volver a este paso" : undefined}
            >
              <span className="w-6 h-6 rounded-full bg-tierra-terracota text-white flex items-center justify-center text-xs">
                {numeroPaso}
              </span>
              {label}
            </button>
          );
        })}
      </div>

      <div className="grid md:grid-cols-[1fr_320px] gap-8">
        <div className="bg-white border border-tierra-crema-oscuro rounded-lg p-6">
          {paso === 1 && !yaTieneSesion && (
            <div className="space-y-4">
              <input
                placeholder="Nombre completo"
                value={datosCliente.nombre}
                onChange={(e) => setDatosCliente({ ...datosCliente, nombre: e.target.value })}
                className="w-full border border-tierra-crema-oscuro rounded px-3 py-2 transition-colors focus:outline-none focus:border-tierra-verde focus:ring-1 focus:ring-tierra-verde"
              />
              <input
                placeholder="Correo electrónico"
                type="email"
                value={datosCliente.email}
                onChange={(e) => setDatosCliente({ ...datosCliente, email: e.target.value })}
                className="w-full border border-tierra-crema-oscuro rounded px-3 py-2 transition-colors focus:outline-none focus:border-tierra-verde focus:ring-1 focus:ring-tierra-verde"
              />
              <input
                placeholder="DNI"
                value={datosCliente.dni}
                onChange={(e) => setDatosCliente({ ...datosCliente, dni: e.target.value })}
                className="w-full border border-tierra-crema-oscuro rounded px-3 py-2 transition-colors focus:outline-none focus:border-tierra-verde focus:ring-1 focus:ring-tierra-verde"
              />
              <input
                placeholder="Teléfono (opcional)"
                value={datosCliente.telefono}
                onChange={(e) => setDatosCliente({ ...datosCliente, telefono: e.target.value })}
                className="w-full border border-tierra-crema-oscuro rounded px-3 py-2 transition-colors focus:outline-none focus:border-tierra-verde focus:ring-1 focus:ring-tierra-verde"
              />
              <p className="text-xs text-tierra-terracota-oscuro/60">
                No hace falta que crees una cuenta antes: con estos datos queda lista para la próxima vez.
              </p>
              <button
                onClick={() => setPaso(2)}
                disabled={!datosCliente.nombre || !datosCliente.email || !datosCliente.dni}
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
                  className={`flex-1 border rounded px-3 py-3 text-left transition-colors hover:border-tierra-terracota/50 focus:outline-none focus:ring-2 focus:ring-tierra-terracota/40 ${metodoEnvio === "domicilio" ? "border-tierra-terracota bg-tierra-crema" : "border-tierra-crema-oscuro"}`}
                >
                  Envío a domicilio — ${COSTO_ENVIO_REFERENCIAL.toLocaleString("es-AR")}
                </button>
                <button
                  onClick={() => setMetodoEnvio("retiro")}
                  className={`flex-1 border rounded px-3 py-3 text-left transition-colors hover:border-tierra-terracota/50 focus:outline-none focus:ring-2 focus:ring-tierra-terracota/40 ${metodoEnvio === "retiro" ? "border-tierra-terracota bg-tierra-crema" : "border-tierra-crema-oscuro"}`}
                >
                  Retiro en el local — Gratis
                </button>
              </div>

              {metodoEnvio === "domicilio" && (
                <>
                  <div className="flex gap-3">
                    <input
                      placeholder="Calle"
                      value={datosEnvio.calle}
                      onChange={(e) => setDatosEnvio({ ...datosEnvio, calle: e.target.value })}
                      className="w-2/3 border border-tierra-crema-oscuro rounded px-3 py-2 transition-colors focus:outline-none focus:border-tierra-verde focus:ring-1 focus:ring-tierra-verde"
                    />
                    <input
                      placeholder="Número"
                      value={datosEnvio.numero}
                      onChange={(e) => setDatosEnvio({ ...datosEnvio, numero: e.target.value })}
                      className="w-1/3 border border-tierra-crema-oscuro rounded px-3 py-2 transition-colors focus:outline-none focus:border-tierra-verde focus:ring-1 focus:ring-tierra-verde"
                    />
                  </div>
                  <div className="flex gap-3">
                    <input
                      placeholder="Código postal"
                      value={datosEnvio.codigoPostal}
                      onChange={(e) => setDatosEnvio({ ...datosEnvio, codigoPostal: e.target.value })}
                      className="w-1/3 border border-tierra-crema-oscuro rounded px-3 py-2 transition-colors focus:outline-none focus:border-tierra-verde focus:ring-1 focus:ring-tierra-verde"
                    />
                    <input
                      placeholder="Ciudad"
                      value={datosEnvio.ciudad}
                      onChange={(e) => setDatosEnvio({ ...datosEnvio, ciudad: e.target.value })}
                      className="w-1/3 border border-tierra-crema-oscuro rounded px-3 py-2 transition-colors focus:outline-none focus:border-tierra-verde focus:ring-1 focus:ring-tierra-verde"
                    />
                    <input
                      placeholder="Provincia"
                      value={datosEnvio.provincia}
                      onChange={(e) => setDatosEnvio({ ...datosEnvio, provincia: e.target.value })}
                      className="w-1/3 border border-tierra-crema-oscuro rounded px-3 py-2 transition-colors focus:outline-none focus:border-tierra-verde focus:ring-1 focus:ring-tierra-verde"
                    />
                  </div>
                </>
              )}

              <div className="flex gap-3">
                {!yaTieneSesion && (
                  <button onClick={() => setPaso(1)} className="btn-secundario">
                    Atrás
                  </button>
                )}
                <button
                  onClick={() => setPaso(3)}
                  disabled={
                    metodoEnvio === "domicilio" &&
                    (!datosEnvio.calle || !datosEnvio.ciudad || !datosEnvio.provincia || !datosEnvio.codigoPostal)
                  }
                  className="btn-primario"
                >
                  Siguiente
                </button>
              </div>
            </div>
          )}

          {paso === 3 && (
            <div className="space-y-4">
              <p className="text-sm text-tierra-terracota-oscuro/70">
                El pago se completa en Mercado Pago: tarjetas de crédito/débito o dinero en cuenta.
                Tierra nunca ve ni guarda el número de tarjeta.
              </p>
              {error && (
                <div className="text-sm text-red-600" role="alert">
                  <p>{error}</p>
                  {emailYaRegistrado && (
                    <Link href="/login?redirect=/checkout" className="text-tierra-verde underline">
                      Iniciar sesión con ese email
                    </Link>
                  )}
                </div>
              )}
              <div className="flex gap-3">
                <button onClick={() => setPaso(2)} className="btn-secundario">
                  Atrás
                </button>
                <button onClick={confirmarCompra} disabled={cargando} className="btn-naranja px-8">
                  {cargando ? "Generando pago..." : "Comprar"}
                </button>
              </div>
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
