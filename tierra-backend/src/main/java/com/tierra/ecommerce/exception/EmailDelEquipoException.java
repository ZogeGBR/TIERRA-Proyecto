package com.tierra.ecommerce.exception;

// Se intentó comprar sin sesión con el email de alguien del equipo. Es la
// única fila de la tabla del checkout que responde distinto (ADR 0005): todo
// pedido necesita un dueño, y no puede ser una cuenta del equipo.
public class EmailDelEquipoException extends RuntimeException {

    public static final String CODIGO = "EMAIL_DEL_EQUIPO";

    public EmailDelEquipoException() {
        super("No podemos usar ese email para comprar. Usá otro.");
    }
}
