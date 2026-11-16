package com.tierra.ecommerce.exception;

// Mercado Pago no devolvió el link de pago: no se cobró nada. Se responde 503.
// - En el checkout, CheckoutService además cancela el pedido y libera el stock
//   (si eso también falla, lo hace el job de vencimientos).
// - Al volver a pagar un pedido pendiente ("Pagar" en Mis pedidos), el pedido
//   sigue pendiente y se puede reintentar.
public class LinkDePagoNoDisponibleException extends RuntimeException {

    public static final String CODIGO = "LINK_DE_PAGO_NO_DISPONIBLE";
    public static final String MENSAJE = "No pudimos generar el link de pago. No se hizo ningún cobro; probá de nuevo.";

    public LinkDePagoNoDisponibleException(Throwable causa) {
        super(MENSAJE, causa);
    }
}
