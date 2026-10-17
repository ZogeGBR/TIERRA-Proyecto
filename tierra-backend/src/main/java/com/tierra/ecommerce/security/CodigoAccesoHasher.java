package com.tierra.ecommerce.security;

import com.tierra.ecommerce.config.CodigoAccesoProperties;
import org.springframework.stereotype.Component;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.security.MessageDigest;
import java.util.HexFormat;
import java.util.UUID;

// Cómo se guarda un código de acceso: HMAC-SHA256 con una clave del
// servidor, nunca el código en sí (ADR 0005).
//
// Por qué no un hash sin clave, ni BCrypt: hay solo un millón de códigos
// posibles. Contra un hash sin clave se prueban todos en segundos, y BCrypt
// solo lo alarga un poco. Con HMAC, una copia de la base SIN la clave no
// revela nada, y la clave vive en una variable de entorno, no en la base.
//
// El id del usuario va dentro del HMAC: el mismo código para dos clientes da
// valores distintos, y una fila copiada de una cuenta a otra no sirve.
@Component
public class CodigoAccesoHasher {

    private static final String ALGORITMO = "HmacSHA256";

    private final SecretKeySpec clave;

    public CodigoAccesoHasher(CodigoAccesoProperties properties) {
        // La validez de la clave (presente, 32 bytes, no la de desarrollo
        // fuera de dev) la controla CodigoAccesoConfig al arrancar.
        this.clave = new SecretKeySpec(properties.getClaveHmac().getBytes(StandardCharsets.UTF_8), ALGORITMO);
    }

    public String hash(UUID usuarioId, String codigo) {
        try {
            // Un Mac por llamada: no es seguro compartirlo entre hilos.
            Mac mac = Mac.getInstance(ALGORITMO);
            mac.init(clave);
            byte[] resultado = mac.doFinal((usuarioId + ":" + codigo).getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(resultado);
        } catch (GeneralSecurityException e) {
            // HmacSHA256 está garantizado en toda JVM: si falla, es un error
            // del entorno y no algo que el usuario pueda resolver.
            throw new IllegalStateException("No se pudo calcular el HMAC del código de acceso", e);
        }
    }

    // Comparación de tiempo constante, igual que la firma del webhook de
    // Mercado Pago: un equals común corta en el primer carácter distinto, y
    // midiendo cuánto tarda se puede ir adivinando el valor guardado.
    public boolean coincide(UUID usuarioId, String codigo, String hashGuardado) {
        if (codigo == null || hashGuardado == null) {
            return false;
        }
        byte[] calculado = hash(usuarioId, codigo).getBytes(StandardCharsets.US_ASCII);
        byte[] guardado = hashGuardado.getBytes(StandardCharsets.US_ASCII);
        return MessageDigest.isEqual(calculado, guardado);
    }
}
