package com.tierra.ecommerce.config;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class CodigoAccesoConfigTest {

    private static final String CLAVE_PROPIA = "una-clave-propia-de-mas-de-32-bytes-ok";
    private static final String CLAVE_DEV = "solo-desarrollo-clave-hmac-de-tierra-no-usar-en-produccion";

    private static CodigoAccesoProperties con(String clave) {
        return new CodigoAccesoProperties(10, 5, 3, 5, 3, 60, clave);
    }

    @Test
    void unaClavePropiaAlcanzaEnCualquierEntorno() {
        assertDoesNotThrow(() -> CodigoAccesoConfig.validarConfiguracion(con(CLAVE_PROPIA), false));
        assertDoesNotThrow(() -> CodigoAccesoConfig.validarConfiguracion(con(CLAVE_PROPIA), true));
    }

    @Test
    void sinClaveNoArranca() {
        IllegalStateException e = assertThrows(IllegalStateException.class,
                () -> CodigoAccesoConfig.validarConfiguracion(con(""), false));
        assertTrue(e.getMessage().contains("CODIGO_ACCESO_CLAVE"));
        assertThrows(IllegalStateException.class,
                () -> CodigoAccesoConfig.validarConfiguracion(con(null), true));
    }

    @Test
    void unaClaveCortaNoArranca() {
        assertThrows(IllegalStateException.class,
                () -> CodigoAccesoConfig.validarConfiguracion(con("corta"), true));
    }

    @Test
    void laClaveDeDesarrolloSoloSirveEnElPerfilDev() {
        assertDoesNotThrow(() -> CodigoAccesoConfig.validarConfiguracion(con(CLAVE_DEV), true));
        IllegalStateException e = assertThrows(IllegalStateException.class,
                () -> CodigoAccesoConfig.validarConfiguracion(con(CLAVE_DEV), false));
        assertTrue(e.getMessage().contains("desarrollo"));
    }

    @Test
    void unParametroEnCeroNoArranca() {
        CodigoAccesoProperties sinVigencia = new CodigoAccesoProperties(0, 5, 3, 5, 3, 60, CLAVE_PROPIA);
        assertThrows(IllegalStateException.class,
                () -> CodigoAccesoConfig.validarConfiguracion(sinVigencia, true));
    }
}
