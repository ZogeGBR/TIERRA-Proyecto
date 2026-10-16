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
  LoginRequest,
  MensajeResponse
} from "./types";

// Error de una llamada a la API, con el código HTTP además del mensaje.
//
// El código es lo que permite reaccionar distinto según el caso (un 409 de
// stock no se maneja igual que un 503 de Mercado Pago) sin comparar el texto
// del mensaje, que se rompe en silencio el día que alguien lo reescribe en el
// backend. El mensaje sigue siendo el que se muestra: viene redactado para el
// usuario final.
//
// estado = 0 significa que no hubo respuesta: el backend no está levantado o
// no hay conexión.
export class ApiError extends Error {
  readonly estado: number;

  constructor(mensaje: string, estado: number) {
    super(mensaje);
    this.name = "ApiError";
    this.estado = estado;
    // Para que `instanceof ApiError` funcione aunque el código se compile a
    // una versión de JavaScript sin clases nativas.
    Object.setPrototypeOf(this, ApiError.prototype);
  }
}

export const MENSAJE_SIN_CONEXION =
  "No pudimos conectarnos con Tierra. Revisá tu conexión y probá de nuevo.";

// El texto para mostrarle a la persona cuando algo falla. Los mensajes del
// backend ya vienen redactados para el usuario final; cualquier otra cosa
// (un error de programación, por ejemplo) se reemplaza por el texto dado.
export function mensajeDeError(error: unknown, porDefecto: string): string {
  return error instanceof ApiError ? error.message : porDefecto;
}

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

// Devuelve el token, pidiéndole uno nuevo al backend si no hay.
//
// Hace falta porque el token no está siempre: al cerrar sesión, Spring lo
// invalida y borra su cookie. Como las páginas del catálogo son Server
// Components, el navegador puede pasar mucho tiempo sin hablar con el backend,
// y el siguiente POST saldría sin token y sería rechazado con un 403 que al
// usuario le aparece como "no tenés permisos" — confuso y falso.
//
// Cualquier GET sirve para que el backend emita el token. /auth/yo es el más
// barato y responde igual (401) cuando no hay sesión. No hay riesgo de
// recursión: es un método seguro, así que no vuelve a entrar acá.
async function asegurarTokenCsrf(): Promise<string | null> {
  const actual = leerTokenCsrf();
  if (actual) return actual;

  try {
    await fetch(`${getApiUrl()}/auth/yo`, { credentials: "include", cache: "no-store" });
  } catch {
    // Si el backend no responde, seguimos igual: la petición original va a
    // fallar con su propio error, que es el que conviene mostrar.
  }
  return leerTokenCsrf();
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
    const token = await asegurarTokenCsrf();
    if (token) headers["X-XSRF-TOKEN"] = token;
  }

  let res: Response;
  try {
    res = await fetch(`${getApiUrl()}${path}`, {
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
  } catch {
    // fetch sólo falla así cuando no hubo respuesta. Su mensaje propio
    // ("Failed to fetch") no le dice nada a quien está comprando.
    throw new ApiError(MENSAJE_SIN_CONEXION, 0);
  }

  if (!res.ok) {
    const cuerpo = await res.json().catch(() => null);
    throw new ApiError(cuerpo?.mensaje ?? `Error ${res.status} al llamar a ${path}`, res.status);
  }

  // 201/204 sin body
  const texto = await res.text();
  return texto ? JSON.parse(texto) : (undefined as T);
}

export const api = {
  auth: {
    // Clientes (ADR 0005). La respuesta es SIEMPRE el mismo mensaje genérico,
    // exista el email o no: el frontend lo muestra tal cual y no intenta
    // adivinar nada. Sólo un email con formato inválido da error (400).
    solicitarCodigo: (email: string) =>
      apiFetch<MensajeResponse>("/auth/codigo", { method: "POST", body: JSON.stringify({ email }) }),
    // 401 con un mensaje genérico si el código no sirve, por el motivo que sea.
    verificarCodigo: (email: string, codigo: string) =>
      apiFetch<Usuario>("/auth/codigo/verificar", {
        method: "POST",
        body: JSON.stringify({ email, codigo })
      }),
    // Equipo: email y contraseña. 401 si no coinciden, 423 si la cuenta quedó
    // bloqueada por intentos fallidos.
    loginEquipo: (request: LoginRequest) =>
      apiFetch<Usuario>("/auth/equipo/login", { method: "POST", body: JSON.stringify(request) }),
    // Responde 204 sin cuerpo, por eso el tipo es void.
    logout: () => apiFetch<void>("/auth/logout", { method: "POST" }),
    // Devuelve 401 si no hay sesión: un ApiError con estado 401.
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
