package com.tierra.ecommerce.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

// Parámetros del acceso de clientes por código (ADR 0005). Todos salen de
// application.yml y se pueden cambiar por variable de entorno sin tocar
// código. Se validan al arrancar en CodigoAccesoConfig.
//
// El largo del código (6 dígitos) NO es configurable a propósito: la
// probabilidad de acierto calculada en el ADR depende de él, y también el
// campo del frontend.
@Component
public class CodigoAccesoProperties {

    @Value("${auth.codigo.vigencia-minutos}")
    private int vigenciaMinutos;

    @Value("${auth.codigo.intentos-maximos}")
    private int intentosMaximos;

    @Value("${auth.codigo.solicitudes-por-15-minutos}")
    private int solicitudesPor15Minutos;

    @Value("${auth.codigo.solicitudes-por-dia}")
    private int solicitudesPorDia;

    @Value("${auth.codigo.agotados-para-bloqueo}")
    private int agotadosParaBloqueo;

    @Value("${auth.codigo.bloqueo-minutos}")
    private int bloqueoMinutos;

    // Clave secreta del HMAC con el que se guardan los códigos. Nunca se
    // loguea. Sin ella el backend no arranca.
    @Value("${auth.codigo.clave-hmac}")
    private String claveHmac;

    public CodigoAccesoProperties() {
    }

    // Para los tests, que construyen la configuración sin Spring.
    public CodigoAccesoProperties(int vigenciaMinutos, int intentosMaximos, int solicitudesPor15Minutos,
                                  int solicitudesPorDia, int agotadosParaBloqueo, int bloqueoMinutos,
                                  String claveHmac) {
        this.vigenciaMinutos = vigenciaMinutos;
        this.intentosMaximos = intentosMaximos;
        this.solicitudesPor15Minutos = solicitudesPor15Minutos;
        this.solicitudesPorDia = solicitudesPorDia;
        this.agotadosParaBloqueo = agotadosParaBloqueo;
        this.bloqueoMinutos = bloqueoMinutos;
        this.claveHmac = claveHmac;
    }

    public int getVigenciaMinutos() { return vigenciaMinutos; }
    public int getIntentosMaximos() { return intentosMaximos; }
    public int getSolicitudesPor15Minutos() { return solicitudesPor15Minutos; }
    public int getSolicitudesPorDia() { return solicitudesPorDia; }
    public int getAgotadosParaBloqueo() { return agotadosParaBloqueo; }
    public int getBloqueoMinutos() { return bloqueoMinutos; }
    public String getClaveHmac() { return claveHmac; }
}
