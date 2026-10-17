package com.tierra.ecommerce.security;

import org.springframework.stereotype.Component;

import java.security.SecureRandom;

// Genera los códigos de seis dígitos del acceso por código (ADR 0005).
//
// SecureRandom y no Random: Random es predecible a partir de unas pocas
// salidas, y con eso alguien podría adivinar el próximo código.
// Uniforme entre 000000 y 999999: los ceros a la izquierda cuentan, el código
// es un texto de seis dígitos y no un número.
@Component
public class GeneradorCodigoAcceso {

    private static final int COMBINACIONES = 1_000_000;

    private final SecureRandom random = new SecureRandom();

    public String generar() {
        return String.format("%06d", random.nextInt(COMBINACIONES));
    }
}
