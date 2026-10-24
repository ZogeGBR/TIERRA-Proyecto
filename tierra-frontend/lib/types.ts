// Estos tipos reflejan 1 a 1 los DTOs de tierra-backend (paquete dto/).
// Si cambia un DTO en el backend, hay que actualizar el tipo acá.

export interface ProductoResumen {
  id: string;
  // Tarea 8 (V10): el backend lo va a sumar. Mientras no exista, las rutas
  // usan el id (ver lib/rutas.ts).
  slug?: string;
  nombre: string;
  marca: string;
  categoria: string;
  precio: number;
  imagenPrincipal: string | null;
}

export interface VarianteProducto {
  id: string;
  sku: string;
  talla: string | null;
  color: string | null;
  stock: number;
  controlaStock?: boolean;
}

export interface ProductoDetalle {
  id: string;
  slug?: string;
  nombre: string;
  descripcion: string | null;
  marca: string;
  categoria: string;
  genero: string;
  precio: number;
  variantes: VarianteProducto[];
  imagenes: string[];
}

// --- Autenticación ---

export type RolUsuario = "CLIENTE" | "ADMIN" | "OPERADOR";

// Lo que devuelven /auth/registro, /auth/login y /auth/yo: siempre la misma
// forma, así el frontend tiene un solo tipo de usuario.
export interface Usuario {
  id: string;
  nombre: string;
  email: string;
  rol: RolUsuario;
}

// --- Acceso (ADR 0005: los clientes entran por código, el equipo con contraseña) ---

export interface SolicitarCodigoRequest {
  email: string;
}

export interface VerificarCodigoRequest {
  email: string;
  codigo: string;
}

export interface LoginEquipoRequest {
  email: string;
  password: string;
}

// Respuesta de POST /auth/codigo: SIEMPRE el mismo texto, exista o no el
// email (la regla de la sección 3.2 de la auditoría: responder distinto
// permitiría averiguar qué emails son clientes).
export interface MensajeGenerico {
  mensaje: string;
}

export interface ItemPedidoRequest {
  varianteId: string;
  cantidad: number;
}

export type TipoEntrega = "ENVIO_DOMICILIO" | "RETIRO_LOCAL";

export interface DireccionEntrega {
  calle: string;
  numero?: string | null;
  ciudad: string;
  provincia: string;
  codigoPostal: string;
}

// --- Checkout sin cuenta (auditoría Fase 2, sección 3.1) ---
// Se compra sin sesión y sin contraseña. Los datos de contacto y la dirección
// viajan EN el pedido (no en la cuenta): escribir el email de otra persona no
// modifica nada de ella.

export interface DireccionCheckoutRequest {
  calle: string;
  numero?: string;
  ciudad: string;
  provincia: string;
  codigoPostal: string;
}

export interface CheckoutRequest {
  // Siempre obligatorios.
  nombre: string;
  email: string;
  telefono: string;
  // Solo con envío a domicilio.
  dni?: string;
  tipoEntrega: TipoEntrega;
  direccion?: DireccionCheckoutRequest | null;
  codigoCupon?: string;
  // Solo se tiene en cuenta con sesión de cliente (tarea 22); sin sesión el
  // backend lo ignora.
  guardarDatos?: boolean;
  items: ItemPedidoRequest[];
}

// La respuesta es la misma sea el cliente nuevo o existente: si difiriera, el
// checkout serviría para averiguar quién compró en Tierra.
export interface CheckoutResponse {
  pedidoId: string;
  total: number;
  initPoint: string; // link de pago de Mercado Pago
  expiraEn: string; // ISO: cuándo vence el link
}

// --- Cotización de envío (tarea 10) ---

export interface CotizacionEnvioRequest {
  tipoEntrega: TipoEntrega;
  provincia?: string;
  codigoPostal?: string;
  items: ItemPedidoRequest[];
}

export interface CotizacionEnvioResponse {
  // false = fuera de la zona de cobertura: solo se ofrece retiro en el local.
  cubierto: boolean;
  costo: number | null;
  mensaje: string | null;
}

// --- Historial de pedidos (tarea 19) ---
// El DNI y el teléfono llegan YA ocultos desde el backend ("***.***.123",
// "••• 4567"): el dato completo nunca viaja al navegador.

export interface ItemHistorial {
  nombreProducto: string;
  talla: string | null;
  color: string | null;
  cantidad: number;
  precioUnitario: number;
}

export interface PedidoHistorial {
  id: string;
  estado: string;
  creadoEn: string;
  tipoEntrega: TipoEntrega;
  direccionEntrega: DireccionEntrega | null;
  contactoNombre: string;
  contactoTelefono: string | null; // oculto
  contactoDni: string | null; // oculto
  subtotal: number;
  descuento: number;
  costoEnvio: number;
  total: number;
  items: ItemHistorial[];
}

// --- Datos guardados para la próxima compra (tarea 22) ---

export interface DatosEntregaGuardados {
  nombre: string;
  telefono: string | null;
  dni: string | null;
  direccion: DireccionEntrega | null;
}

export interface PreferenciaPago {
  preferenceId: string;
  initPoint: string;
}

// Ítem del carrito en el frontend: no existe como tal en el backend,
// se arma en el momento de crear el pedido (CrearPedidoRequest).
export interface ItemCarrito {
  varianteId: string;
  productoId: string;
  nombreProducto: string;
  talla: string | null;
  color: string | null;
  precioUnitario: number;
  cantidad: number;
  imagen: string | null;
}

// --- Catálogo: búsqueda, filtros y paginación ---
//
// Estos tipos son el CONTRATO que el backend tiene que cumplir para GET
// /api/productos (tarea H-D del plan). Hoy el backend no lo cumple: devuelve
// una lista vacía si no se le pasa categoriaId o marcaId, y no sabe de texto,
// precio, género, orden ni páginas. La implementación de referencia
// (ejecutable) está en lib/catalogoDePrueba.ts; el detalle, en
// docs/contrato-catalogo.md.

// Mismos valores que el enum GeneroProducto del backend.
export type GeneroProducto = "HOMBRE" | "MUJER" | "UNISEX" | "NINO";

export type OrdenCatalogo = "nombre" | "precio_asc" | "precio_desc";

export interface FiltrosDeCatalogo {
  q?: string; // texto libre
  categoriaId?: string; // incluye las categorías hijas
  marcaId?: string;
  genero?: GeneroProducto;
  precioMin?: number; // inclusive, en pesos
  precioMax?: number; // inclusive, en pesos
  orden: OrdenCatalogo;
  pagina: number; // desde 1
}

// Respuesta paginada. Nombres en español y página desde 1, a propósito: si el
// backend devuelve el Page crudo de Spring (content, number desde 0,
// totalElements...), la traducción va en un solo lugar: api.productos.listar.
export interface Pagina<T> {
  contenido: T[];
  pagina: number;
  tamanio: number;
  totalElementos: number;
  totalPaginas: number; // 0 si no hay resultados
}

// Para armar los filtros: GET /api/categorias y GET /api/marcas.
export interface OpcionCategoria {
  id: string;
  nombre: string;
  padreId: string | null;
}

export interface OpcionMarca {
  id: string;
  nombre: string;
}
