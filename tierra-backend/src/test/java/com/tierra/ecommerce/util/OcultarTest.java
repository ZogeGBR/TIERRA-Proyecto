package com.tierra.ecommerce.util;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class OcultarTest {

    @Test
    void delDniQuedanLosUltimosTresNumeros() {
        assertEquals("***.***.222", Ocultar.dni("30111222"));
        assertEquals("***.***.567", Ocultar.dni("1234567"));
        assertEquals("***.***.222", Ocultar.dni("30.111.222"));
    }

    @Test
    void delTelefonoQuedanLosUltimosCuatroNumeros() {
        assertEquals("••• 3456", Ocultar.telefono("+54 9 2945 123456"));
        assertEquals("••• 3456", Ocultar.telefono("2945-12-3456"));
    }

    @Test
    void conPocosNumerosNoSeMuestraNinguno() {
        assertEquals("***.***.***", Ocultar.dni("12"));
        assertEquals("••• ••••", Ocultar.telefono("123"));
    }

    @Test
    void nullSigueSiendoNull() {
        assertNull(Ocultar.dni(null));
        assertNull(Ocultar.telefono(null));
    }

    @Test
    void nuncaQuedaElDatoCompleto() {
        String dni = "30111222";
        String telefono = "+54 9 2945 123456";
        assertFalse(Ocultar.dni(dni).contains("30111"));
        assertFalse(Ocultar.telefono(telefono).contains("2945"));
    }
}
