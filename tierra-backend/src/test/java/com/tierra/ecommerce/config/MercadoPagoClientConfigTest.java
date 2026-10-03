package com.tierra.ecommerce.config;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class MercadoPagoClientConfigTest {

    private MercadoPagoProperties props(String token, String secret, boolean produccion, String url) {
        MercadoPagoProperties p = new MercadoPagoProperties();
        set(p, "accessToken", token);
        set(p, "webhookSecret", secret);
        set(p, "produccion", produccion);
        set(p, "urlExito", url);
        set(p, "urlFallo", url);
        set(p, "urlPendiente", url);
        return p;
    }

    @Test
    void desarrolloConTokenDePruebaYSinSecretArranca() {
        assertDoesNotThrow(() -> MercadoPagoClientConfig.validarConfiguracion(
                props("TEST-123", "", false, "http://localhost:3000/checkout/exito")));
    }

    @Test
    void sinAccessTokenNoArranca() {
        assertThrows(IllegalStateException.class, () -> MercadoPagoClientConfig.validarConfiguracion(
                props("", "", false, "http://localhost:3000")));
    }

    @Test
    void produccionSinWebhookSecretNoArranca() {
        var e = assertThrows(IllegalStateException.class, () -> MercadoPagoClientConfig.validarConfiguracion(
                props("APP_USR-123", "", true, "https://tierra.com.ar/checkout")));
        assertTrue(e.getMessage().contains("MP_WEBHOOK_SECRET"));
    }

    @Test
    void produccionConTokenDePruebaNoArranca() {
        assertThrows(IllegalStateException.class, () -> MercadoPagoClientConfig.validarConfiguracion(
                props("TEST-123", "secreto", true, "https://tierra.com.ar/checkout")));
    }

    @Test
    void produccionConUrlsSinHttpsNoArranca() {
        assertThrows(IllegalStateException.class, () -> MercadoPagoClientConfig.validarConfiguracion(
                props("APP_USR-123", "secreto", true, "http://tierra.com.ar/checkout")));
    }

    @Test
    void produccionCompletaArranca() {
        assertDoesNotThrow(() -> MercadoPagoClientConfig.validarConfiguracion(
                props("APP_USR-123", "secreto", true, "https://tierra.com.ar/checkout")));
    }

    // Los campos se completan con @Value al arrancar Spring; acá no hay contexto.
    private static void set(Object target, String campo, Object valor) {
        try {
            var f = MercadoPagoProperties.class.getDeclaredField(campo);
            f.setAccessible(true);
            f.set(target, valor);
        } catch (ReflectiveOperationException e) {
            throw new RuntimeException(e);
        }
    }
}
