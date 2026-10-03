package com.tierra.ecommerce.exception;

// Alguien intentó comprar como invitado con un email que ya tiene cuenta.
//
// A propósito NO se inicia sesión en su nombre ni se le asocia el pedido:
// no sabemos si es la misma persona escribiendo su propio email o alguien
// más escribiendo el email de otro. La respuesta correcta es pedirle que
// inicie sesión, no crear el pedido de todas formas.
public class CuentaExistenteException extends RuntimeException {
    public CuentaExistenteException(String mensaje) {
        super(mensaje);
    }
}
