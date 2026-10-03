package com.tierra.ecommerce.config;

import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.client.RestClient;

// Cliente HTTP para la API de Andreani. RestClient (Spring 6.1+, ya
// incluido en spring-boot-starter-web -- no hace falta ninguna dependencia
// nueva) en vez de WebClient: este backend es MVC clásico, no reactivo, y
// WebClient traería toda la cadena de WebFlux para un solo cliente HTTP
// síncrono.
//
// A diferencia de MercadoPagoClientConfig, acá la validación al arrancar
// NO tira abajo el backend si faltan credenciales: Andreani las entrega
// recién cuando Tierra es cliente comercial y las pide a través de un
// ejecutivo de cuenta (developers.andreani.com lo dice explícito). Frenar
// todo el backend por un servicio que hoy nadie puede probar sería peor
// que avisar y seguir.
@Configuration
public class AndreaniClientConfig {

    private static final Logger log = LoggerFactory.getLogger(AndreaniClientConfig.class);

    private final AndreaniProperties properties;

    public AndreaniClientConfig(AndreaniProperties properties) {
        this.properties = properties;
    }

    @PostConstruct
    void verificarConfiguracion() {
        if (esVacio(properties.getBaseUrl())) {
            throw new IllegalStateException(
                    "ANDREANI_BASE_URL está vacío. Sin esto no hay ni siquiera a dónde apuntar el cliente HTTP.");
        }

        if (esVacio(properties.getUsuario()) || esVacio(properties.getPassword())) {
            log.warn("Faltan credenciales de Andreani (ANDREANI_USUARIO / ANDREANI_PASSWORD). "
                    + "El cliente HTTP queda armado y apuntando a {}, pero ninguna llamada real va a "
                    + "funcionar hasta que Tierra las consiga con su ejecutivo de cuenta de Andreani.",
                    properties.getBaseUrl());
        } else {
            log.info("Cliente de Andreani configurado, apuntando a {}", properties.getBaseUrl());
        }
    }

    @Bean
    public RestClient andreaniRestClient(AndreaniProperties properties) {
        return RestClient.builder()
                .baseUrl(properties.getBaseUrl())
                .build();
    }

    private static boolean esVacio(String valor) {
        return valor == null || valor.isBlank();
    }
}
