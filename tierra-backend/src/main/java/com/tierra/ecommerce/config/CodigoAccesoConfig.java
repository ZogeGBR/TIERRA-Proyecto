package com.tierra.ecommerce.config;

import jakarta.annotation.PostConstruct;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.env.Environment;
import org.springframework.core.env.Profiles;
import org.springframework.scheduling.annotation.EnableAsync;

import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;

// Valida la configuración del acceso por código al arrancar: un error claro
// en el deploy es mejor que un sistema que parece funcionar y no protege
// nada. Mismo criterio que MercadoPagoClientConfig.
//
// @EnableAsync vive acá porque el único uso asíncrono del sistema es el
// envío del código (ver EnvioCodigoAccesoListener). Sin esta anotación,
// @Async se ignora EN SILENCIO y el envío pasa a ser síncrono: la respuesta
// tardaría más cuando el email es de un cliente, y el tiempo delataría lo
// que el mensaje genérico oculta.
@Configuration
@EnableAsync
public class CodigoAccesoConfig {

    // Prefijo de la clave fija que trae application-dev.yml. Fuera del perfil
    // dev, una clave que empiece así se rechaza: es pública, está en el repo.
    static final String PREFIJO_CLAVE_DESARROLLO = "solo-desarrollo-";
    static final int BYTES_MINIMOS_CLAVE = 32;

    private final CodigoAccesoProperties properties;
    private final Environment environment;

    public CodigoAccesoConfig(CodigoAccesoProperties properties, Environment environment) {
        this.properties = properties;
        this.environment = environment;
    }

    @PostConstruct
    void validar() {
        validarConfiguracion(properties, environment.acceptsProfiles(Profiles.of("dev")));
    }

    // Estático y sin Spring para poder testearlo directo.
    static void validarConfiguracion(CodigoAccesoProperties p, boolean perfilDev) {
        List<String> errores = new ArrayList<>();

        String clave = p.getClaveHmac();
        if (clave == null || clave.isBlank()) {
            errores.add("falta CODIGO_ACCESO_CLAVE (clave del HMAC de los códigos, al menos "
                    + BYTES_MINIMOS_CLAVE + " bytes)");
        } else {
            if (clave.getBytes(StandardCharsets.UTF_8).length < BYTES_MINIMOS_CLAVE) {
                errores.add("CODIGO_ACCESO_CLAVE tiene que tener al menos " + BYTES_MINIMOS_CLAVE + " bytes");
            }
            if (!perfilDev && clave.startsWith(PREFIJO_CLAVE_DESARROLLO)) {
                errores.add("CODIGO_ACCESO_CLAVE es la clave de desarrollo, que es pública: "
                        + "fuera del perfil dev hace falta una clave propia");
            }
        }

        if (p.getVigenciaMinutos() <= 0) errores.add("auth.codigo.vigencia-minutos tiene que ser mayor a 0");
        if (p.getIntentosMaximos() <= 0) errores.add("auth.codigo.intentos-maximos tiene que ser mayor a 0");
        if (p.getSolicitudesPor15Minutos() <= 0) errores.add("auth.codigo.solicitudes-por-15-minutos tiene que ser mayor a 0");
        if (p.getSolicitudesPorDia() <= 0) errores.add("auth.codigo.solicitudes-por-dia tiene que ser mayor a 0");
        if (p.getAgotadosParaBloqueo() <= 0) errores.add("auth.codigo.agotados-para-bloqueo tiene que ser mayor a 0");
        if (p.getBloqueoMinutos() <= 0) errores.add("auth.codigo.bloqueo-minutos tiene que ser mayor a 0");

        if (!errores.isEmpty()) {
            throw new IllegalStateException("Configuración del acceso por código inválida: "
                    + String.join("; ", errores));
        }
    }
}
