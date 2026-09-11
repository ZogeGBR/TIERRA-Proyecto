import type {
  ProductoResumen,
  ProductoDetalle,
  CrearPedidoRequest,
  PedidoResponse,
  EquipoDisponible,
  CrearReservaRequest,
  ReservaResponse,
  PreferenciaPago
} from "./types";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080/api";

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    // Sin esto, Next.js cachea agresivamente las respuestas de fetch en el
    // servidor (incluso en desarrollo) — un catálogo con stock cambiante
    // nunca debería servir una respuesta vieja guardada en caché.
    cache: "no-store",
    ...options,
    headers: { "Content-Type": "application/json", ...options?.headers }
  });

  if (!res.ok) {
    const cuerpo = await res.json().catch(() => null);
    throw new Error(cuerpo?.mensaje ?? `Error ${res.status} al llamar a ${path}`);
  }

  // 201/204 sin body
  const texto = await res.text();
  return texto ? JSON.parse(texto) : (undefined as T);
}

export const api = {
  productos: {
    listarPorCategoria: (categoriaId: string) =>
      apiFetch<ProductoResumen[]>(`/productos?categoriaId=${categoriaId}`),
    listarPorMarca: (marcaId: string) =>
      apiFetch<ProductoResumen[]>(`/productos?marcaId=${marcaId}`),
    detalle: (id: string) => apiFetch<ProductoDetalle>(`/productos/${id}`)
  },
  pedidos: {
    crear: (request: CrearPedidoRequest) =>
      apiFetch<PedidoResponse>("/pedidos", { method: "POST", body: JSON.stringify(request) })
  },
  alquiler: {
    disponibilidad: (tipoId: string, fechaInicio: string, fechaFin: string) =>
      apiFetch<EquipoDisponible[]>(
        `/alquiler/disponibilidad?tipoId=${tipoId}&fechaInicio=${fechaInicio}&fechaFin=${fechaFin}`
      ),
    reservar: (request: CrearReservaRequest) =>
      apiFetch<ReservaResponse>("/alquiler/reservas", { method: "POST", body: JSON.stringify(request) })
  },
  pagos: {
    crearPreferencia: (pedidoId: string) =>
      apiFetch<PreferenciaPago>(`/pagos/pedidos/${pedidoId}/preferencia`, { method: "POST" })
  }
};
