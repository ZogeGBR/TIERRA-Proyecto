package com.tierra.ecommerce.notificacion;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.ObjectProvider;

import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class EnvioCodigoAccesoTest {

    @Test
    void sinNingunaFormaDeEnviarElBackendNoArranca() {
        @SuppressWarnings("unchecked")
        ObjectProvider<EnviadorCodigoAcceso> ninguno = mock(ObjectProvider.class);
        when(ninguno.getIfAvailable()).thenReturn(null);

        IllegalStateException e = assertThrows(IllegalStateException.class,
                () -> new EnvioCodigoAccesoListener(ninguno));
        assertTrue(e.getMessage().contains("dev"));
    }

    @Test
    void elListenerLePasaElCodigoAlEnviador() {
        EnviadorCodigoAcceso enviador = mock(EnviadorCodigoAcceso.class);
        new EnvioCodigoAccesoListener(proveedor(enviador))
                .alConfirmar(new CodigoAccesoSolicitado("a@b.c", "Ana", "123456"));

        verify(enviador).enviar("a@b.c", "Ana", "123456");
    }

    @Test
    void unaFallaAlEnviarNoSePropaga() {
        EnviadorCodigoAcceso enviador = mock(EnviadorCodigoAcceso.class);
        doThrow(new RuntimeException("sin conexión")).when(enviador).enviar(any(), any(), any());

        assertDoesNotThrow(() -> new EnvioCodigoAccesoListener(proveedor(enviador))
                .alConfirmar(new CodigoAccesoSolicitado("a@b.c", "Ana", "123456")));
    }

    @Test
    void elEventoNoMuestraElCodigoAlImprimirse() {
        String texto = new CodigoAccesoSolicitado("a@b.c", "Ana", "123456").toString();
        assertFalse(texto.contains("123456"), texto);
    }

    @Test
    void elEnviadorDeDesarrolloEscribeElCodigoEnUnArchivoPorEmail() throws Exception {
        Path directorio = Files.createTempDirectory("codigos-dev");
        new EnviadorCodigoAccesoDesarrollo(directorio.toString()).enviar("test@tierra.esquel", "Test", "042137");

        Path archivo = directorio.resolve("test@tierra.esquel.txt");
        assertEquals("042137", Files.readString(archivo, StandardCharsets.UTF_8));
    }

    @SuppressWarnings("unchecked")
    private static ObjectProvider<EnviadorCodigoAcceso> proveedor(EnviadorCodigoAcceso enviador) {
        ObjectProvider<EnviadorCodigoAcceso> p = mock(ObjectProvider.class);
        when(p.getIfAvailable()).thenReturn(enviador);
        return p;
    }
}
