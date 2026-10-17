package com.tierra.ecommerce.security;

import com.tierra.ecommerce.config.CodigoAccesoProperties;
import org.junit.jupiter.api.Test;

import java.util.HashSet;
import java.util.Set;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class CodigoAccesoHasherTest {

    private static final UUID USUARIO = UUID.fromString("99000000-0000-0000-0000-000000000001");

    private static CodigoAccesoHasher hasherCon(String clave) {
        return new CodigoAccesoHasher(new CodigoAccesoProperties(10, 5, 3, 5, 3, 60, clave));
    }

    private final CodigoAccesoHasher hasher = hasherCon("clave-de-prueba-con-mas-de-32-bytes-de-largo");

    // Valor calculado aparte (Python: hmac.new(clave, b"<uuid>:123456",
    // sha256).hexdigest()). No se calcula con el propio hasher: si tuviera un
    // error en el formato del mensaje, un valor hecho con el mismo código no
    // lo detectaría.
    private static final String HMAC_ESPERADO =
            "65a3855c43698f14e15f8cf17d5560e034139af50441c0b0b6c2f0493496c5ce";

    @Test
    void coincideConUnValorCalculadoPorFuera() {
        assertEquals(HMAC_ESPERADO, hasher.hash(USUARIO, "123456"));
    }

    @Test
    void elResultadoEsHexadecimalDe64CaracteresYNoContieneElCodigo() {
        String hash = hasher.hash(USUARIO, "123456");
        assertTrue(hash.matches("[0-9a-f]{64}"), hash);
        assertFalse(hash.contains("123456"));
    }

    @Test
    void elMismoCodigoParaDosClientesDaValoresDistintos() {
        assertNotEquals(hasher.hash(USUARIO, "123456"), hasher.hash(UUID.randomUUID(), "123456"));
    }

    @Test
    void otraClaveDaOtroValor() {
        CodigoAccesoHasher otro = hasherCon("otra-clave-de-prueba-con-mas-de-32-bytes");
        assertNotEquals(hasher.hash(USUARIO, "123456"), otro.hash(USUARIO, "123456"));
    }

    @Test
    void coincideSoloConElCodigoYElUsuarioCorrectos() {
        String guardado = hasher.hash(USUARIO, "123456");
        assertTrue(hasher.coincide(USUARIO, "123456", guardado));
        assertFalse(hasher.coincide(USUARIO, "123457", guardado));
        assertFalse(hasher.coincide(UUID.randomUUID(), "123456", guardado));
        assertFalse(hasher.coincide(USUARIO, null, guardado));
        assertFalse(hasher.coincide(USUARIO, "123456", null));
    }

    @Test
    void elGeneradorDaSiempreSeisDigitosYNoSeRepiteSiempreIgual() {
        GeneradorCodigoAcceso generador = new GeneradorCodigoAcceso();
        Set<String> vistos = new HashSet<>();
        for (int i = 0; i < 1000; i++) {
            String codigo = generador.generar();
            assertTrue(codigo.matches("\\d{6}"), codigo);
            vistos.add(codigo);
        }
        // Con un millón de combinaciones, mil códigos casi no se repiten. Si
        // salieran pocos distintos, el generador estaría roto.
        assertTrue(vistos.size() > 990, "códigos distintos: " + vistos.size());
    }
}
