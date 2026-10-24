import type { PagoPendiente } from "./pedidoPendiente";

// La decisión de "¿creo un pedido nuevo o reabro el link del que ya hice?"
// vive acá, separada del componente de checkout, porque es la que evita
// pedidos duplicados y dentro de un componente de React no se puede probar
// rama por rama. Todo lo que toca el mundo exterior entra por `deps`.

export interface DependenciasPago {
  // Pago pendiente vigente de ESTA compra, si lo hay (mismo carrito, mismos
  // datos, link sin vencer).
  leerPagoGuardado: () => PagoPendiente | null;
  // Crea el pedido en el backend y devuelve su link de pago (y lo deja
  // guardado para poder reabrirlo).
  crearPedido: () => Promise<PagoPendiente>;
}

export interface ResultadoPago {
  initPoint: string;
  /** true si se reutilizó un pedido anterior en vez de crear otro. */
  reutilizado: boolean;
}

export async function obtenerLinkDePago(deps: DependenciasPago): Promise<ResultadoPago> {
  const guardado = deps.leerPagoGuardado();
  if (guardado) return { initPoint: guardado.initPoint, reutilizado: true };
  const nuevo = await deps.crearPedido();
  return { initPoint: nuevo.initPoint, reutilizado: false };
}
