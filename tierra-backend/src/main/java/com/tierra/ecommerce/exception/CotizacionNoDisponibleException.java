package com.tierra.ecommerce.exception;

// El correo no pudo cotizar (no respondió, rechazó el pedido, faltan datos
// del producto). Se responde 503: la compra no avanza con un costo inventado.
public class CotizacionNoDisponibleException extends RuntimeException {

    public static final String MENSAJE = "No pudimos calcular el costo del envío. Probá de nuevo en unos minutos.";

    public CotizacionNoDisponibleException(String detalleInterno, Throwable causa) {
        super(detalleInterno, causa);
    }

    public CotizacionNoDisponibleException(String detalleInterno) {
        super(detalleInterno);
    }
}
