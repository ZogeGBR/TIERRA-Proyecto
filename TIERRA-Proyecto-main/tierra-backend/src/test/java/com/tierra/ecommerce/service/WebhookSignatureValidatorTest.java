package com.tierra.ecommerce.service;

import com.tierra.ecommerce.config.MercadoPagoProperties;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class WebhookSignatureValidatorTest {

    private static final String SECRET = "test_secret_12345";
    private static final String DATA_ID = "123456789";
    private static final String REQUEST_ID = "req-abc-123";
    private static final String TS = "1700000000";

    // Firma calculada de forma independiente (Python, hmac + sha256) para el
    // manifest "id:{data_id};request-id:{request_id};ts:{ts};" con el
    // SECRET de arriba. No se recalcula con el propio validador: si el
    // validador tuviera un bug en el manifest o el algoritmo, un valor
    // calculado con el mismo código no lo detectaría.
    private static final String HMAC_ESPERADO =
            "967c2934d4237662741d9f8133203e015fa252a7f07a32d10e06f9a4033277b5";

    private MercadoPagoProperties properties;
    private WebhookSignatureValidator validator;

    @BeforeEach
    void setUp() {
        properties = new MercadoPagoProperties();
        setSecret(SECRET);
        validator = new WebhookSignatureValidator(properties);
    }

    @Test
    void firmaValidaSeAcepta() {
        String header = "ts=" + TS + ",v1=" + HMAC_ESPERADO;
        assertTrue(validator.esValida(DATA_ID, REQUEST_ID, header));
    }

    @Test
    void hashIncorrectoSeRechaza() {
        String header = "ts=" + TS + ",v1=0000000000000000000000000000000000000000000000000000000000000000";
        assertFalse(validator.esValida(DATA_ID, REQUEST_ID, header));
    }

    @Test
    void requestIdDistintoInvalidaLaFirma() {
        // Mismo header, pero el request-id no es el que se firmó: el manifest
        // reconstruido da otro hash y no matchea.
        String header = "ts=" + TS + ",v1=" + HMAC_ESPERADO;
        assertFalse(validator.esValida(DATA_ID, "otro-request-id", header));
    }

    @Test
    void sinSecretConfiguradoSeRechazaAunqueLaFirmaSeaCorrecta() {
        setSecret("");
        String header = "ts=" + TS + ",v1=" + HMAC_ESPERADO;
        assertFalse(validator.esValida(DATA_ID, REQUEST_ID, header));
    }

    @Test
    void headerMalformadoSeRechaza() {
        assertFalse(validator.esValida(DATA_ID, REQUEST_ID, "esto-no-tiene-el-formato-esperado"));
    }

    @Test
    void sinDataIdSeRechaza() {
        String header = "ts=" + TS + ",v1=" + HMAC_ESPERADO;
        assertFalse(validator.esValida(null, REQUEST_ID, header));
    }

    // MercadoPagoProperties solo tiene setters implícitos vía @Value (Spring
    // los completa al arrancar el contexto). En este test unitario no hay
    // contexto de Spring, así que se setea el campo por reflection en vez de
    // agregarle a la clase de producción un constructor o setters que solo
    // existirían para el test.
    private void setSecret(String secret) {
        try {
            var campo = MercadoPagoProperties.class.getDeclaredField("webhookSecret");
            campo.setAccessible(true);
            campo.set(properties, secret);
        } catch (ReflectiveOperationException e) {
            throw new RuntimeException(e);
        }
    }
}
