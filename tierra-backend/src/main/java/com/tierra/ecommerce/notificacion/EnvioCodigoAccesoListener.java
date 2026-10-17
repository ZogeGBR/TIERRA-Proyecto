package com.tierra.ecommerce.notificacion;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

// Envía el código DESPUÉS de que la transacción confirma y FUERA del hilo de
// la petición (ADR 0005). Las dos cosas importan:
//
// - Después de confirmar: si la transacción falla, no se envía un código que
//   no quedó guardado.
// - Fuera del hilo: si el envío fuera síncrono, la respuesta a "pedir código"
//   tardaría cientos de milisegundos más cuando el email es de un cliente, y
//   el tiempo delataría lo que el mensaje genérico oculta.
//
// @Async necesita @EnableAsync (está en CodigoAccesoConfig).
@Component
public class EnvioCodigoAccesoListener {

    private static final Logger log = LoggerFactory.getLogger(EnvioCodigoAccesoListener.class);

    private final EnviadorCodigoAcceso enviador;

    public EnvioCodigoAccesoListener(ObjectProvider<EnviadorCodigoAcceso> enviadores) {
        EnviadorCodigoAcceso disponible = enviadores.getIfAvailable();
        if (disponible == null) {
            throw new IllegalStateException(
                    "No hay forma de enviar los códigos de acceso a los clientes. Fuera del perfil 'dev' "
                    + "hace falta el envío real por email, que llega con el módulo de notificaciones "
                    + "(Fase 3). Para desarrollar, arrancá con SPRING_PROFILES_ACTIVE=dev.");
        }
        this.enviador = disponible;
    }

    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void alConfirmar(CodigoAccesoSolicitado evento) {
        try {
            enviador.enviar(evento.email(), evento.nombre(), evento.codigo());
        } catch (RuntimeException e) {
            // Nunca se loguea el código. El cliente puede pedir otro: el
            // mensaje genérico ya le avisa que puede tardar.
            log.error("No se pudo enviar un código de acceso", e);
        }
    }
}
