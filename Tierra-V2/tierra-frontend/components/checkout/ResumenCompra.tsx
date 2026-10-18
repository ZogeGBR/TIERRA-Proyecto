import type { ItemCarrito } from "@/lib/types";

function pesos(n: number): string {
  return `$${n.toLocaleString("es-AR")}`;
}

// Resumen del pedido (columna derecha en pantallas grandes, debajo en el
// celular). `costoEnvio` en null significa "todavía no se puede calcular".
export function ResumenCompra({
  items,
  subtotal,
  costoEnvio,
  esRetiro,
  enviosPendiente
}: {
  items: ItemCarrito[];
  subtotal: number;
  costoEnvio: number | null;
  esRetiro: boolean;
  /** true si falta algo de la dirección para saber el envío. */
  enviosPendiente: boolean;
}) {
  const total = costoEnvio === null ? null : subtotal + costoEnvio;
  return (
    <aside className="bg-white border border-tierra-crema-oscuro rounded-2xl p-6 h-fit md:sticky md:top-6" aria-label="Resumen de tu compra">
      <p className="font-medium text-tierra-terracota-oscuro mb-3">Resumen</p>
      <ul className="grilla-anim space-y-2">
        {items.map((i) => (
          <li key={i.varianteId} className="flex justify-between gap-3 text-sm">
            <span className="text-tierra-terracota-oscuro/90">
              {i.nombreProducto}
              {[i.talla, i.color].filter(Boolean).length > 0 && (
                <span className="text-tierra-terracota-oscuro/50"> · {[i.talla, i.color].filter(Boolean).join(" / ")}</span>
              )}{" "}
              <span className="text-tierra-terracota-oscuro/60">x{i.cantidad}</span>
            </span>
            <span className="shrink-0">{pesos(i.precioUnitario * i.cantidad)}</span>
          </li>
        ))}
      </ul>

      <dl className="border-t border-tierra-crema-oscuro mt-4 pt-3 space-y-1 text-sm">
        <div className="flex justify-between">
          <dt>Subtotal</dt>
          <dd>{pesos(subtotal)}</dd>
        </div>
        <div className="flex justify-between">
          <dt>Envío</dt>
          <dd>
            {esRetiro ? "Gratis (retiro)" : costoEnvio !== null ? pesos(costoEnvio) : enviosPendiente ? "A calcular" : "—"}
          </dd>
        </div>
        <div className="flex justify-between font-bold text-base pt-2">
          <dt>Total</dt>
          <dd key={total ?? "x"} className={total !== null ? "anim-saltito" : undefined}>
            {total !== null ? pesos(total) : "—"}
          </dd>
        </div>
      </dl>
      {total === null && !esRetiro && (
        <p className="mt-2 text-xs text-tierra-terracota-oscuro/60">
          El envío se calcula cuando completás provincia y código postal.
        </p>
      )}
    </aside>
  );
}
