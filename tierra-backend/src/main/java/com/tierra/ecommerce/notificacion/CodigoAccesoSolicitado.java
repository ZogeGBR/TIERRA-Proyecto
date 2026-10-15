package com.tierra.ecommerce.notificacion;

// Evento que publica CodigoAccesoService cuando generó un código. Lo escucha
// EnvioCodigoAccesoListener, que lo envía recién cuando la transacción
// confirma.
//
// toString() oculta el código a propósito: el que genera Java para un record
// incluye todos los campos, y cualquier log que imprima el evento dejaría el
// código a la vista de quien lea los logs.
public record CodigoAccesoSolicitado(String email, String nombre, String codigo) {

    @Override
    public String toString() {
        return "CodigoAccesoSolicitado[email=" + email + ", codigo=******]";
    }
}
