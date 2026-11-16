package com.tierra.ecommerce.util;

import java.text.Normalizer;
import java.util.Locale;

public final class Textos {

    private Textos() {
    }

    // Sin tildes ni diéresis y en minúscula: "Neuquén", "NEUQUEN " y
    // "neuquen" quedan iguales. Lo usan la búsqueda del catálogo y la
    // cobertura de envíos.
    public static String normalizar(String texto) {
        String sinMarcas = Normalizer.normalize(texto, Normalizer.Form.NFD).replaceAll("\\p{M}", "");
        return sinMarcas.toLowerCase(Locale.ROOT).trim();
    }
}
