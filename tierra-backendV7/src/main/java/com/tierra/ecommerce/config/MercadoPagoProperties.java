package com.tierra.ecommerce.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

// El access token NUNCA va en el código ni en application.yml en texto plano:
// se lee de la variable de entorno MP_ACCESS_TOKEN. Usar el token de test
// (TEST-...) en desarrollo y el de producción solo en el servidor real.
@Component
public class MercadoPagoProperties {

    @Value("${mercadopago.access-token}")
    private String accessToken;

    @Value("${mercadopago.url-exito}")
    private String urlExito;

    @Value("${mercadopago.url-fallo}")
    private String urlFallo;

    @Value("${mercadopago.url-pendiente}")
    private String urlPendiente;

    public String getAccessToken() { return accessToken; }
    public String getUrlExito() { return urlExito; }
    public String getUrlFallo() { return urlFallo; }
    public String getUrlPendiente() { return urlPendiente; }
}
