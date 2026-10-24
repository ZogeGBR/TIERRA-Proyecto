import { LIMITE_RANKING, normalizarRanking } from "./rankings";
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
  OpcionMarca
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
// `codigo` es opcional: hoy el backend no lo manda en los errores, pero se
// lee si aparece (por ejemplo "EMAIL_DEL_EQUIPO", "SIN_STOCK") para no tener
// que adivinar el motivo de un 409 mirando el texto. Ver
// docs/contrato-fase2-frontend.md.
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

// ¿El catálogo se arma con datos de prueba (lib/catalogoDePrueba.ts) en vez de
// pedírselo al backend?
//
// Existe porque el buscador y los filtros se construyeron ANTES de que el
// backend implemente el contrato (tarea H-D del plan). Mientras tanto:
//   - en desarrollo (`npm run dev`) está ACTIVO por defecto, y la pantalla del
//     catálogo muestra un aviso para que nadie lo confunda con datos reales;
//   - en producción (`next build`) está APAGADO por defecto: un sitio
//     publicado nunca muestra datos de prueba por descuido.
// NEXT_PUBLIC_CATALOGO_DE_PRUEBA=1 lo fuerza; =0 lo apaga también en
// desarrollo (usar eso cuando el backend ya soporte el contrato). Next lo
// resuelve al compilar, no en cada pedido.
const FLAG_CATALOGO_DE_PRUEBA = process.env.NEXT_PUBLIC_CATALOGO_DE_PRUEBA;
export const USAR_CATALOGO_DE_PRUEBA =
  FLAG_CATALOGO_DE_PRUEBA === "1" || (FLAG_CATALOGO_DE_PRUEBA !== "0" && process.env.NODE_ENV !== "production");

// El backend actual responde [] a GET /productos sin categoriaId ni marcaId.
// Sin esta comprobación, esa respuesta (válida pero de otro formato) rompería
// la pantalla con un error de JavaScript en vez de explicar qué pasa.
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

// develop (Fase 1) responde una LISTA simple a GET /productos con filtro de
// categoría o marca, no la página {contenido,...} del contrato de Fase 2. Se
// acepta y se envuelve como una única página, para que el catálogo ande con
// cualquiera de los dos formatos.
function comoPagina(x: unknown): Pagina<ProductoResumen> | null {
  if (esPagina(x)) return x;
  if (Array.isArray(x)) {
    return { contenido: x as ProductoResumen[], pagina: 1, tamanio: x.length, totalElementos: x.length, totalPaginas: 1 };
  }
  return null;
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

// `publico: true` marca un endpoint que NO debería pedir sesión. Con la
// seguridad de develop (`anyRequest().denyAll()`), una ruta que todavía no
// existe responde 401 "Necesitás iniciar sesión" aunque sea pública: sin esta
// marca la persona vería "tu sesión venció" cuando en realidad falta
// implementar el endpoint.
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
    if (publico && (res.status === 401 || res.status === 403)) {
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
    listarPorCategoria: (categoriaId: string) =>
      apiFetch<ProductoResumen[]>(`/productos?categoriaId=${categoriaId}`),
    listarPorMarca: (marcaId: string) =>
      apiFetch<ProductoResumen[]>(`/productos?marcaId=${marcaId}`),
    // Búsqueda y filtros combinables, con paginación (contrato en
    // docs/contrato-catalogo.md).
    listar: async (filtros: FiltrosDeCatalogo): Promise<Pagina<ProductoResumen>> => {
      if (USAR_CATALOGO_DE_PRUEBA) {
        // Import dinámico: los datos de prueba quedan en un archivo aparte que
        // el navegador solo descarga si este camino se ejecuta. Con el
        // interruptor apagado (producción) el archivo se genera igual, pero
        // nadie lo pide nunca -- ver la prueba R7 en el E2E del catálogo.
        const { consultarCatalogo } = await import("./catalogoDePrueba");
        return consultarCatalogo(filtros, TAMANIO_PAGINA);
      }
      const query = queryDeFiltros(filtros);
      const respuesta = await apiFetch<unknown>(`/productos?${query ? query + "&" : ""}tamanio=${TAMANIO_PAGINA}`);
      const pagina = comoPagina(respuesta);
      if (!pagina) throw errorDeFormato("catálogo");
      return pagina;
    },
    // Rankings de la home (contrato asumido: ver contrato-fase2-frontend.md).
    // Nunca lanzan: si el endpoint no existe o falla, devuelven [] y la home
    // oculta esa pestaña en vez de mostrar un orden inventado.
    ranking: async (tipo: "vendidos" | "buscados"): Promise<ProductoResumen[]> => {
      try {
        if (USAR_CATALOGO_DE_PRUEBA) {
          // Solo desarrollo sin backend: no hay ventas reales, se simula.
          const { consultarCatalogo } = await import("./catalogoDePrueba");
          const base = consultarCatalogo(
            { orden: tipo === "vendidos" ? "precio_desc" : "nombre", pagina: 1 },
            LIMITE_RANKING
          );
          return normalizarRanking(base.contenido);
        }
        const ruta = tipo === "vendidos" ? "mas-vendidos" : "mas-buscados";
        return normalizarRanking(await apiFetch<unknown>(`/productos/${ruta}?limite=${LIMITE_RANKING}`, { publico: true }));
      } catch {
        return [];
      }
    },
    detalle: async (id: string): Promise<ProductoDetalle> => {
      if (USAR_CATALOGO_DE_PRUEBA) {
        // Solo los productos INVENTADOS tienen detalle de prueba; los reales
        // del seed salen del backend.
        const { detalleDePrueba } = await import("./catalogoDePrueba");
        const inventado = detalleDePrueba(id);
        if (inventado) return inventado;
      }
      return apiFetch<ProductoDetalle>(`/productos/${id}`);
    }
  },
  categorias: {
    listar: async (): Promise<OpcionCategoria[]> => {
      if (USAR_CATALOGO_DE_PRUEBA) return (await import("./catalogoDePrueba")).CATEGORIAS_PRUEBA;
      try {
        const respuesta = await apiFetch<unknown>("/categorias", { publico: true });
        if (!Array.isArray(respuesta)) throw errorDeFormato("categorías");
        return respuesta as OpcionCategoria[];
      } catch (e) {
        // develop no tiene GET /categorias: sin la lista, el catálogo
        // funciona igual pero sin el filtro por categoría.
        if (e instanceof ApiError && (e.status === NO_DISPONIBLE || e.status === 404)) return [];
        throw e;
      }
    }
  },
  marcas: {
    listar: async (): Promise<OpcionMarca[]> => {
      if (USAR_CATALOGO_DE_PRUEBA) return (await import("./catalogoDePrueba")).MARCAS_PRUEBA;
      try {
        const respuesta = await apiFetch<unknown>("/marcas", { publico: true });
        if (!Array.isArray(respuesta)) throw errorDeFormato("marcas");
        return respuesta as OpcionMarca[];
      } catch (e) {
        if (e instanceof ApiError && (e.status === NO_DISPONIBLE || e.status === 404)) return [];
        throw e;
      }
    }
  },
  // POST /checkout es la única puerta para crear pedidos y NO abre sesión
  // (auditoría Fase 2, sección 3.1). Devuelve el link de pago.
  checkout: {
    confirmar: (request: CheckoutRequest) =>
      apiFetch<CheckoutResponse>("/checkout", { method: "POST", body: JSON.stringify(request), publico: true })
  },
  // Costo de envío y cobertura, ANTES de pagar (tarea 10). Informa: el que
  // cobra es el checkout, que vuelve a calcularlo.
  envios: {
    cotizar: (request: CotizacionEnvioRequest) =>
      apiFetch<CotizacionEnvioResponse>("/envios/cotizacion", { method: "POST", body: JSON.stringify(request), publico: true })
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
