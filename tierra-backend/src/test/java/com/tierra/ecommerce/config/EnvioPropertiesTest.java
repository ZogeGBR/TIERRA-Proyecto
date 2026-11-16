package com.tierra.ecommerce.config;

import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import java.math.BigDecimal;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertThrows;

class EnvioPropertiesTest {

    private static EnvioProperties con(List<String> provincias, BigDecimal costo) {
        EnvioProperties p = new EnvioProperties();
        ReflectionTestUtils.setField(p, "provinciasConCobertura", provincias);
        ReflectionTestUtils.setField(p, "costoFijo", costo);
        return p;
    }

    @Test
    void unaConfiguracionValidaArranca() {
        assertDoesNotThrow(() -> con(List.of("Chubut"), new BigDecimal("12000")).validar());
        assertDoesNotThrow(() -> con(List.of("Chubut"), BigDecimal.ZERO).validar());
    }

    // Mejor que el backend no arranque a que cobre envíos negativos o no
    // tenga ninguna provincia con cobertura sin que nadie lo note.
    @Test
    void sinProvinciasOConCostoNegativoNoArranca() {
        assertThrows(IllegalStateException.class, () -> con(List.of(), new BigDecimal("12000")).validar());
        assertThrows(IllegalStateException.class, () -> con(List.of(" "), new BigDecimal("12000")).validar());
        assertThrows(IllegalStateException.class, () -> con(List.of("Chubut"), new BigDecimal("-1")).validar());
    }
}
