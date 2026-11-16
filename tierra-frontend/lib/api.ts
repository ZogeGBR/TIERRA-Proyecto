import { LIMITE_RANKING, normalizarRanking, type TipoRanking } from "./rankings";
import type {
  ProductoResumen,
  ProductoDetalle,
  CheckoutRequest,
  CheckoutResponse,
  CotizacionEnvioRequest,
  CotizacionEnvioResponse,
  PedidoHistorial,
  DatosEntregaGuardados,
  PreferenciaPago,
  Usuario,
  SolicitarCodigoRequest,
  VerificarCodigoRequest,
  LoginEquipoRequest,
  MensajeGenerico,
  FiltrosDeCatalogo,
  Pagina,
  OpcionCategoria,
  OpcionMarca,
  OpcionesDeFiltro
} from "./types";
import type { TipoAlquiler } from "./alquiler";
import { TAMANIO_PAGINA, queryDeFiltros } from "./catalogo";

// Error de la API con el código HTTP a mano.
//
// Hereda de Error y deja el texto en `message` a propósito: todo el código
// que ya hacía `e instanceof Error ? e.message : "..."` sigue funcionando sin
// tocarlo. Lo nuevo es `status`, para que cada pantalla pueda reaccionar al
// tipo de falla (404 -> "no existe", 409 -> "conflicto", 0 -> "sin conexión")
// en vez de mostrar el mismo texto para todo.
//
// status 0 significa que la petición ni siquiera llegó al backend (red caída,
// backend apagado) -- no hay respuesta HTTP que tenga código.
//
// `codigo` viene solo en los errores en los que la pantalla tiene que
// reaccionar distinto según el motivo ("EMAIL_DEL_EQUIPO", "SIN_STOCK",
// "LINK_DE_PAGO_NO_DISPONIBLE"), para no adivinarlo mirando el texto. El
// contrato con el backend se documenta en docs/contratos-fase2.md.
export class ApiError extends Error {
  readonly status: number;
  readonly mensaje: string;
  readonly codigo: string | null;

  constructor(status: number, mensaje: string, codigo: string | null = null) {
    super(mensaje);
    this.name = "ApiError";
    this.status = status;
    this.mensaje = mensaje;
    this.codigo = codigo;
    // Necesario cuando se hereda de Error y el código se compila hacia
    // targets viejos: sin esto `instanceof ApiError` puede dar false.
    Object.setPrototypeOf(this, ApiError.prototype);
  }
}

// Se valida la forma de la página antes de usarla: si el backend cambiara el
// contrato, la pantalla explica qué pasa en vez de romperse con un error de
// JavaScript.
function esPagina(x: unknown): x is Pagina<ProductoResumen> {
  if (typeof x !== "object" || x === null) return false;
  const p = x as Record<string, unknown>;
  return (
    Array.isArray(p.contenido) &&
    typeof p.pagina === "number" &&
    typeof p.totalElementos === "number" &&
    typeof p.totalPaginas === "number"
  );
}

// Estado que usamos para "el backend todavía no tiene este endpoint".
export const NO_DISPONIBLE = 501;

function errorDeFormato(que: string): ApiError {
  return new ApiError(502, `La respuesta del servidor (${que}) no tiene el formato esperado. El backend todavía puede no soportar esta consulta.`);
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

// `publico: true` marca un endpoint público que el backend TODAVÍA NO
// implementa. Mientras tanto, la ruta puede responder:
//   - 401 "Necesitás iniciar sesión", si cae en el `anyRequest().denyAll()`
//     de SecurityConfig;
//   - 404 "La dirección solicitada no existe", si cae bajo una regla pública
//     (por ejemplo /api/alquiler/tipos, que entra en /api/alquiler/**).
// Sin esta marca la persona vería "tu sesión venció" o "la dirección no
// existe", cuando en realidad falta implementar el endpoint. El 404 se
// traduce sólo en los GET: en un POST un 404 puede ser un error real de
// negocio y su mensaje tiene que llegar. Cuando el endpoint se implementa,
// se le saca la marca: sus 401 y 403 pasan a ser errores reales.
async function apiFetch<T>(path: string, options?: RequestInit & { publico?: boolean }): Promise<T> {
  const publico = options?.publico === true;
  if (options) {
    options = { ...options };
    delete (options as { publico?: boolean }).publico;
  }
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
    // fetch solo rechaza cuando no hubo respuesta (red caída, backend
    // apagado, CORS). Sin esto el usuario veía "Failed to fetch", que no
    // le dice nada.
    throw new ApiError(0, "No pudimos conectar con el servidor. Revisá tu conexión e intentá de nuevo.");
  }

  if (!res.ok) {
    const rutaFaltante = res.status === 401 || res.status === 403 || (res.status === 404 && esMetodoSeguro(options?.method));
    if (publico && rutaFaltante) {
      throw new ApiError(NO_DISPONIBLE, "Esta función todavía no está disponible. Probá de nuevo más tarde.");
    }
    const cuerpo = await res.json().catch(() => null);
    throw new ApiError(
      res.status,
      cuerpo?.mensaje ?? `Error ${res.status} al llamar a ${path}`,
      typeof cuerpo?.codigo === "string" ? cuerpo.codigo : null
    );
  }

  // 201/204 sin body
  const texto = await res.text();
  return texto ? JSON.parse(texto) : (undefined as T);
}

export const api = {
  auth: {
    // Siempre responde 200 con el mismo texto (exista o no el email). Ver
    // lib/errores.ts: el frontend tampoco intenta "adivinar" por el error.
    solicitarCodigo: (request: SolicitarCodigoRequest) =>
      apiFetch<MensajeGenerico>("/auth/codigo", { method: "POST", body: JSON.stringify(request) }),
    // 200 con el usuario (y la sesión abierta) o 401 genérico.
    verificarCodigo: (request: VerificarCodigoRequest) =>
      apiFetch<Usuario>("/auth/codigo/verificar", { method: "POST", body: JSON.stringify(request) }),
    // Login con contraseña, solo para el equipo (/equipo).
    loginEquipo: (request: LoginEquipoRequest) =>
      apiFetch<Usuario>("/auth/equipo/login", { method: "POST", body: JSON.stringify(request) }),
    // Responde 204 sin cuerpo, por eso el tipo es void.
    logout: () => apiFetch<void>("/auth/logout", { method: "POST" }),
    // Devuelve 401 si no hay sesión, y apiFetch lo convierte en un ApiError.
    // Quien lo llame tiene que distinguir "no hay sesión" (401) de "falló la red" (0).
    yo: () => apiFetch<Usuario>("/auth/yo")
  },
  productos: {
    // Búsqueda y filtros combinables, con paginación. Contrato en
    // docs/contratos-fase2.md (GET /api/productos).
    listar: async (filtros: FiltrosDeCatalogo): Promise<Pagina<ProductoResumen>> => {
      const query = queryDeFiltros(filtros);
      const respuesta = await apiFetch<unknown>(`/productos?${query ? query + "&" : ""}tamanio=${TAMANIO_PAGINA}`);
      if (!esPagina(respuesta)) throw errorDeFormato("catálogo");
      return respuesta;
    },
    // Talles y colores para los filtros: solo los que tienen stock, así
    // ningún filtro lleva a una lista vacía. Si fallan, el catálogo se
    // muestra igual, sin esos dos filtros.
    opcionesDeFiltro: async (): Promise<OpcionesDeFiltro> => {
      const r = await apiFetch<Partial<OpcionesDeFiltro>>("/productos/filtros");
      const textos = (x: unknown) => (Array.isArray(x) ? x.filter((v): v is string => typeof v === "string") : []);
      return { talles: textos(r?.talles), colores: textos(r?.colores) };
    },
    // Ranking "más vendidos" de la home (ver lib/rankings.ts). Nunca lanza:
    // si el endpoint no existe o falla, devuelve [] y la home oculta la
    // sección en vez de mostrar un orden inventado.
    ranking: async (tipo: TipoRanking): Promise<ProductoResumen[]> => {
      try {
        const ruta = { vendidos: "mas-vendidos" }[tipo];
        return normalizarRanking(await apiFetch<unknown>(`/productos/${ruta}?limite=${LIMITE_RANKING}`, { publico: true }));
      } catch {
        return [];
      }
    },
    detalle: (id: string) => apiFetch<ProductoDetalle>(`/productos/${id}`)
  },
  categorias: {
    listar: async (): Promise<OpcionCategoria[]> => {
      const respuesta = await apiFetch<unknown>("/categorias");
      if (!Array.isArray(respuesta)) throw errorDeFormato("categorías");
      return respuesta as OpcionCategoria[];
    }
  },
  marcas: {
    listar: async (): Promise<OpcionMarca[]> => {
      const respuesta = await apiFetch<unknown>("/marcas");
      if (!Array.isArray(respuesta)) throw errorDeFormato("marcas");
      return respuesta as OpcionMarca[];
    }
  },
  // POST /checkout es la única puerta para crear pedidos y NO abre sesión
  // (tarea 9, decisión 0005). Devuelve el link de pago.
  checkout: {
    confirmar: (request: CheckoutRequest) =>
      apiFetch<CheckoutResponse>("/checkout", { method: "POST", body: JSON.stringify(request) })
  },
  // Costo de envío y cobertura, ANTES de pagar (tarea 10). Informa: el que
  // cobra es el checkout, que vuelve a calcularlo.
  envios: {
    cotizar: (request: CotizacionEnvioRequest) =>
      apiFetch<CotizacionEnvioResponse>("/envios/cotizacion", { method: "POST", body: JSON.stringify(request) })
  },
  // Historial: solo del cliente de la sesión (el backend filtra por la
  // sesión, nunca por un id que mande el frontend).
  pedidos: {
    mios: () => apiFetch<PedidoHistorial[]>("/pedidos/mios")
  },
  // Datos guardados para la próxima compra (tarea 22). No hay endpoint para
  // ESCRIBIR: la única forma de guardar es el checkout con la casilla
  // tildada.
  cuenta: {
    datosEntrega: () => apiFetch<DatosEntregaGuardados>("/cuenta/datos-entrega"),
    borrarDatosEntrega: () => apiFetch<void>("/cuenta/datos-entrega", { method: "DELETE" })
  },
  // Solo la lista de tipos de equipo con su precio por día, para el
  // estimador. SIN disponibilidad ni reservas (decisión 0001): el sistema no
  // la conoce ni la promete, y api.alquiler.reservar se eliminó.
  alquiler: {
    tipos: () => apiFetch<TipoAlquiler[]>("/alquiler/tipos", { publico: true })
  },
  pagos: {
    // Para "Pagar" en el historial (pedido pendiente) y la página de pago
    // fallido: pide un link NUEVO. El checkout ya no lo usa: recibe el link
    // en la respuesta de POST /checkout.
    crearPreferencia: (pedidoId: string) =>
      apiFetch<PreferenciaPago>(`/pagos/pedidos/${pedidoId}/preferencia`, { method: "POST" })
  }
};
