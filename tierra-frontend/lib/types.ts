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
  usuarioId: string;
  tipoEntrega: TipoEntrega;
  direccionEnvioId?: string | null;
  codigoCupon?: string;
  items: ItemPedidoRequest[];
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
