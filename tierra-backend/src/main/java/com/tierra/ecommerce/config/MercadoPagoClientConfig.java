package com.tierra.ecommerce.config;

import com.mercadopago.MercadoPagoConfig;
import com.mercadopago.client.payment.PaymentClient;
import com.mercadopago.client.payment.PaymentRefundClient;
import com.mercadopago.client.preference.PreferenceClient;
import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.ArrayList;
import java.util.List;

// El SDK de Mercado Pago no expone sus clientes como beans de Spring: son
// clases que se instancian directo. Se centraliza eso acá por tres motivos:
// 1) validar la configuración y fallar al arrancar si algo es inseguro, en
//    vez de descubrirlo cuando un cliente intenta pagar;
// 2) configurar el access token una sola vez para todo el SDK;
// 3) poder inyectar mocks de estos clientes en los tests.
@Configuration
public class MercadoPagoClientConfig {

    private static final Logger log = LoggerFactory.getLogger(MercadoPagoClientConfig.class);

    private final MercadoPagoProperties properties;

    public MercadoPagoClientConfig(MercadoPagoProperties properties) {
        this.properties = properties;
    }

    @PostConstruct
    void inicializarSdk() {
        validarConfiguracion(properties);
        MercadoPagoConfig.setAccessToken(properties.getAccessToken());
        // Nunca se loguea el token: solo en qué modo arrancó.
        log.info("Mercado Pago inicializado en modo {}", properties.isProduccion() ? "PRODUCCIÓN" : "PRUEBA");
    }

    // Estático y sin Spring para poder testearlo directo.
    static void validarConfiguracion(MercadoPagoProperties p) {
        List<String> errores = new ArrayList<>();

        if (esVacio(p.getAccessToken())) {
            errores.add("MP_ACCESS_TOKEN está vacío");
        }

        if (p.isProduccion()) {
            if (!esVacio(p.getAccessToken()) && p.getAccessToken().startsWith("TEST-")) {
                errores.add("MP_PRODUCCION=true pero MP_ACCESS_TOKEN es de prueba (TEST-)");
            }
            if (esVacio(p.getWebhookSecret())) {
                errores.add("MP_PRODUCCION=true requiere MP_WEBHOOK_SECRET: sin él no se puede confirmar ningún pago");
            }
            for (String url : List.of(nulo(p.getUrlExito()), nulo(p.getUrlFallo()), nulo(p.getUrlPendiente()))) {
                if (!url.startsWith("https://")) {
                    errores.add("En producción las URLs de retorno deben ser https:// (se recibió '" + url + "')");
                }
            }
        } else if (!esVacio(p.getAccessToken()) && !p.getAccessToken().startsWith("TEST-")) {
            log.warn("MP_PRODUCCION=false pero el access token no empieza con TEST-. "
                    + "Verificá que sea una credencial de prueba y no la real.");
        }

        if (!errores.isEmpty()) {
            throw new IllegalStateException("Configuración de Mercado Pago inválida: " + String.join("; ", errores));
        }
    }

    private static boolean esVacio(String valor) {
        return valor == null || valor.isBlank();
    }

    private static String nulo(String valor) {
        return valor == null ? "" : valor;
    }

    @Bean
    public PreferenceClient preferenceClient() {
        return new PreferenceClient();
    }

    @Bean
    public PaymentClient paymentClient() {
        return new PaymentClient();
    }

    @Bean
    public PaymentRefundClient paymentRefundClient() {
        return new PaymentRefundClient();
    }
}
