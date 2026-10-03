package com.tierra.ecommerce.service;

import com.tierra.ecommerce.config.MercadoPagoProperties;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.HashMap;
import java.util.HexFormat;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

// Valida la firma que Mercado Pago manda en el header x-signature de cada
// notificacion de webhook, para confirmar que la notificacion viene
// realmente de MP y no de un tercero que le pega directo a la URL.
//
// Formato documentado por MP:
//   x-signature: "ts=1704908010,v1=618c85345248dd820d5fa46a71ea7ee9c065dcc70e88a3e9dd4285ce9e26ef29"
//   x-request-id: "<id que manda MP en cada intento>"
//   manifest a firmar: "id:{data.id};request-id:{x-request-id};ts:{ts};"
// El {data.id} del manifest es el id que viene en el QUERY STRING de la URL
// de notificacion (?data.id=...&type=payment), no el del body del POST.
//
// Sin secret configurado (MP_WEBHOOK_SECRET vacio) esto rechaza SIEMPRE:
// nunca hay que interpretar "no puedo validar" como "asumo que es valido".
@Component
public class WebhookSignatureValidator {

    private static final Logger log = LoggerFactory.getLogger(WebhookSignatureValidator.class);
    private static final String ALGORITMO = "HmacSHA256";
    private static final Pattern PAR_HEADER = Pattern.compile("([a-zA-Z0-9]+)=([^,]+)");

    private final MercadoPagoProperties properties;

    public WebhookSignatureValidator(MercadoPagoProperties properties) {
        this.properties = properties;
    }

    public boolean esValida(String dataId, String requestId, String xSignature) {
        String secret = properties.getWebhookSecret();
        if (secret == null || secret.isBlank()) {
            log.warn("MP_WEBHOOK_SECRET no configurado: se rechaza la notificacion del webhook.");
            return false;
        }
        if (esVacio(dataId) || esVacio(requestId) || esVacio(xSignature)) {
            log.warn("Notificacion de webhook incompleta: falta data.id, x-request-id o x-signature.");
            return false;
        }

        Map<String, String> partes = parsearHeaderFirma(xSignature);
        String ts = partes.get("ts");
        String v1 = partes.get("v1");
        if (ts == null || v1 == null) {
            log.warn("Header x-signature con formato inesperado.");
            return false;
        }

        String manifest = "id:" + dataId.toLowerCase() + ";request-id:" + requestId + ";ts:" + ts + ";";

        try {
            Mac mac = Mac.getInstance(ALGORITMO);
            mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), ALGORITMO));
            byte[] calculado = mac.doFinal(manifest.getBytes(StandardCharsets.UTF_8));
            byte[] esperado = HexFormat.of().parseHex(v1);
            return MessageDigest.isEqual(calculado, esperado);
        } catch (Exception e) {
            // Incluye NoSuchAlgorithmException/InvalidKeyException (no deberian pasar,
            // HmacSHA256 es estandar) e IllegalArgumentException si v1 no es hex valido.
            log.error("No se pudo validar la firma del webhook", e);
            return false;
        }
    }

    private Map<String, String> parsearHeaderFirma(String xSignature) {
        Map<String, String> partes = new HashMap<>();
        Matcher m = PAR_HEADER.matcher(xSignature);
        while (m.find()) {
            partes.put(m.group(1).trim(), m.group(2).trim());
        }
        return partes;
    }

    private boolean esVacio(String valor) {
        return valor == null || valor.isBlank();
    }
}
