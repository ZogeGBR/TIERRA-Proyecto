// Estos tipos reflejan 1 a 1 los DTOs de tierra-backend (paquete dto/).
// Si cambia un DTO en el backend, hay que actualizar el tipo acá.

export interface ProductoResumen {
  id: string;
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

export interface RegistroRequest {
  nombre: string;
  email: string;
  password: string;
  telefono?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
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

export interface CrearPedidoRequest {
  // Sin usuarioId: de quién es el pedido lo decide la sesión en el backend.
  // Mandarlo desde acá no serviría de nada, el servidor lo ignora.
  tipoEntrega: TipoEntrega;
  direccionEnvioId?: string | null;
  codigoCupon?: string;
  items: ItemPedidoRequest[];
}

// --- Checkout con cuenta implícita (0005) ---
// A diferencia de CrearPedidoRequest, este es el que usa la pantalla de
// checkout real: funciona con o sin sesión iniciada. Si no hay sesión, el
// backend crea la cuenta con estos datos y la deja logueada.

export interface DireccionCheckoutRequest {
  calle: string;
  numero?: string;
  ciudad: string;
  provincia: string;
  codigoPostal: string;
}

export interface CheckoutRequest {
  // Los tres siguientes no hacen falta si ya hay sesión -- el backend los
  // ignora en ese caso. El frontend igual los manda siempre (más simple
  // que bifurcar el armado del request); ver checkout/page.tsx.
  nombre?: string;
  email?: string;
  dni?: string;
  telefono?: string;
  tipoEntrega: TipoEntrega;
  direccion?: DireccionCheckoutRequest | null;
  codigoCupon?: string;
  items: ItemPedidoRequest[];
}

export interface CheckoutResponse {
  usuario: Usuario;
  pedido: PedidoResponse;
}

export interface PedidoResponse {
  id: string;
  tipoEntrega: TipoEntrega;
  direccionEntrega?: DireccionEntrega | null;
  estado: string;
  subtotal: number;
  descuento: number;
  costoEnvio: number;
  total: number;
  creadoEn: string;
}

export interface EquipoDisponible {
  id: string;
  tipo: string;
  marca: string | null;
  modelo: string | null;
  talla: string | null;
  precioDia: number;
  depositoGarantia: number;
}

export interface CrearReservaRequest {
  usuarioId: string;
  fechaInicio: string; // formato ISO yyyy-MM-dd
  fechaFin: string;
  equipos: { equipoId: string }[];
}

export interface ReservaResponse {
  id: string;
  estado: string;
  fechaInicio: string;
  fechaFin: string;
  precioTotal: number;
  depositoTotal: number;
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
