package com.tierra.ecommerce.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

// El access token NUNCA va en el código ni en application.yml en texto plano:
// se lee de la variable de entorno MP_ACCESS_TOKEN. Usar el token de test
// en desarrollo y el de producción solo en el servidor real.
// La configuración se valida al arrancar en MercadoPagoClientConfig.
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

    // Clave para validar la firma (header x-signature) de las notificaciones
    // del webhook. Puede venir vacía en desarrollo local: WebhookSignatureValidator
    // rechaza todo si está vacía. En producción es obligatoria.
    @Value("${mercadopago.webhook-secret}")
    private String webhookSecret;

    // true solo en el servidor que cobra de verdad. Activa los chequeos
    // estrictos de arranque (secret obligatorio, URLs https, token no TEST-).
    @Value("${mercadopago.produccion}")
    private boolean produccion;

    public String getAccessToken() { return accessToken; }
    public String getUrlExito() { return urlExito; }
    public String getUrlFallo() { return urlFallo; }
    public String getUrlPendiente() { return urlPendiente; }
    public String getWebhookSecret() { return webhookSecret; }
    public boolean isProduccion() { return produccion; }
}
