package com.tierra.ecommerce.exception;

// Mercado Pago no devolvió el link de pago. Antes de lanzarla, CheckoutService
// cancela el pedido y libera el stock (si eso también falla, lo hace el job de
// vencimientos): no queda nada que cobrar. Se responde 503.
public class LinkDePagoNoDisponibleException extends RuntimeException {

    public static final String CODIGO = "LINK_DE_PAGO_NO_DISPONIBLE";
    public static final String MENSAJE = "No pudimos generar el link de pago. No se hizo ningún cobro; probá de nuevo.";

    public LinkDePagoNoDisponibleException(Throwable causa) {
        super(MENSAJE, causa);
    }
}
