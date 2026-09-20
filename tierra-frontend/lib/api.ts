import type {
  ProductoResumen,
  ProductoDetalle,
  CrearPedidoRequest,
  PedidoResponse,
  EquipoDisponible,
  CrearReservaRequest,
  ReservaResponse,
  PreferenciaPago,
  Usuario,
  RegistroRequest,
  LoginRequest
} from "./types";

function getApiUrl(): string {
  if (typeof window === "undefined") {
    return process.env.INTERNAL_API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080/api";
  }
  return process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080/api";
}

// El backend emite un token CSRF en la cookie XSRF-TOKEN y espera recibirlo
// de vuelta en un header. Esa cookie es legible desde JavaScript a propósito,
// al revés que la de sesión: un sitio atacante no puede leerla por la política
// de mismo origen, así que no puede falsificar el header aunque el navegador
// mande la cookie de sesión sola.
function leerTokenCsrf(): string | null {
  if (typeof document === "undefined") return null;
  const encontrada = document.cookie
    .split("; ")
    .find((c) => c.startsWith("XSRF-TOKEN="));
  return encontrada ? decodeURIComponent(encontrada.split("=")[1]) : null;
}

function esMetodoSeguro(metodo?: string): boolean {
  const m = (metodo ?? "GET").toUpperCase();
  return m === "GET" || m === "HEAD" || m === "OPTIONS";
}

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options?.headers as Record<string, string> | undefined)
  };

  // Sólo en los métodos que modifican estado. Los seguros no lo necesitan, y
  // exigirlo obligaría a tener un token antes del primer GET — que es
  // justamente el que lo genera.
  if (!esMetodoSeguro(options?.method)) {
    const token = leerTokenCsrf();
    if (token) headers["X-XSRF-TOKEN"] = token;
  }

  const res = await fetch(`${getApiUrl()}${path}`, {
    // Sin esto, Next.js cachea agresivamente las respuestas de fetch en el
    // servidor (incluso en desarrollo) — un catálogo con stock cambiante
    // nunca debería servir una respuesta vieja guardada en caché.
    cache: "no-store",
    // La cookie de sesión viaja entre orígenes distintos (3000 -> 8080) sólo
    // con esto. Sin "include", el navegador la descarta en silencio: el login
    // devuelve 200, el Set-Cookie llega, y la cookie no se guarda.
    credentials: "include",
    ...options,
    headers
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
  auth: {
    registrar: (request: RegistroRequest) =>
      apiFetch<Usuario>("/auth/registro", { method: "POST", body: JSON.stringify(request) }),
    login: (request: LoginRequest) =>
      apiFetch<Usuario>("/auth/login", { method: "POST", body: JSON.stringify(request) }),
    // Responde 204 sin cuerpo, por eso el tipo es void.
    logout: () => apiFetch<void>("/auth/logout", { method: "POST" }),
    // Devuelve 401 si no hay sesión, y apiFetch lo convierte en un Error.
    // Quien lo llame tiene que distinguir "no hay sesión" de "falló la red".
    yo: () => apiFetch<Usuario>("/auth/yo")
  },
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
