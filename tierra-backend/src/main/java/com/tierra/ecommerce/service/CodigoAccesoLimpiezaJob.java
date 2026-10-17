package com.tierra.ecommerce.service;

import com.tierra.ecommerce.repository.CodigoAccesoRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.Clock;
import java.time.LocalDateTime;

// Borra una vez por día los códigos de acceso de más de 48 horas. El límite
// de solicitudes mira solo las últimas 24, así que no hace falta guardarlos
// más, y una tabla de códigos viejos es información que no aporta nada.
@Component
public class CodigoAccesoLimpiezaJob {

    private static final Logger log = LoggerFactory.getLogger(CodigoAccesoLimpiezaJob.class);
    static final int HORAS_A_CONSERVAR = 48;

    private final CodigoAccesoRepository codigoAccesoRepository;
    private final Clock reloj;

    public CodigoAccesoLimpiezaJob(CodigoAccesoRepository codigoAccesoRepository, Clock reloj) {
        this.codigoAccesoRepository = codigoAccesoRepository;
        this.reloj = reloj;
    }

    // Todos los días a las 4:15, una hora de poco tráfico.
    @Scheduled(cron = "0 15 4 * * *")
    public void limpiar() {
        int borrados = codigoAccesoRepository.borrarAnterioresA(
                LocalDateTime.now(reloj).minusHours(HORAS_A_CONSERVAR));
        if (borrados > 0) {
            log.info("Limpieza de códigos de acceso: {} borrados", borrados);
        }
    }
}
