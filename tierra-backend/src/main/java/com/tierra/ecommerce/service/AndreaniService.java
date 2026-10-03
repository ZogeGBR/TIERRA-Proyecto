package com.tierra.ecommerce.service;

import com.tierra.ecommerce.config.AndreaniProperties;
import com.tierra.ecommerce.dto.CotizacionEnvioRequest;
import com.tierra.ecommerce.dto.CotizacionEnvioResponse;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

// ESTADO: andamiaje, no integración terminada. Ver
// docs/decisiones/0005-checkout-invitado-cuenta-implicita.md, sección
// Andreani, para el detalle completo de por qué se frena acá.
//
// En resumen: para tener credenciales de sandbox hay que ser cliente
// comercial de Andreani (lo confirma developers.andreani.com -- se piden a
// través de un ejecutivo de cuenta, no hay autoservicio). Sin eso, nada de
// lo de acá se puede probar contra el servidor real todavía.
//
// Lo que SÍ está firme: la configuración (AndreaniProperties), el cliente
// HTTP (AndreaniClientConfig) y la forma general de esta clase. Lo que
// falta confirmar: el endpoint y el formato exacto de autenticación, y el
// endpoint y formato exacto de cotización -- los de acá son la mejor
// información disponible hoy (de integraciones públicas de terceros), no
// una lectura de la documentación oficial completa.
@Service
public class AndreaniService {

    private final RestClient andreaniRestClient;
    private final AndreaniProperties properties;

    public AndreaniService(RestClient andreaniRestClient, AndreaniProperties properties) {
        this.andreaniRestClient = andreaniRestClient;
        this.properties = properties;
    }

    // Falla clara en vez de una excepción confusa de red: si alguien llama
    // a este service sin que existan credenciales, es mejor un mensaje que
    // diga exactamente qué falta.
    private void exigirCredenciales() {
        if (esVacio(properties.getUsuario()) || esVacio(properties.getPassword())) {
            throw new IllegalStateException(
                    "No hay credenciales de Andreani configuradas (ANDREANI_USUARIO / ANDREANI_PASSWORD). "
                    + "Hace falta pedirlas al ejecutivo de cuenta de Andreani antes de poder cotizar.");
        }
    }

    // TODO: confirmar contra el catálogo OpenAPI real cuál es el endpoint
    // de autenticación y qué devuelve exactamente (todo indica que es un
    // token que después va en el header Authorization del resto de los
    // llamados, con algún tiempo de vida que también hay que confirmar).
    public String autenticar() {
        exigirCredenciales();
        throw new UnsupportedOperationException(
                "TODO: confirmar el endpoint y el formato de login de Andreani contra el catálogo OpenAPI "
                + "real (developers-sandbox.andreani.com) una vez que existan credenciales para probarlo.");
    }

    // TODO: mismo comentario que autenticar() -- el path usado acá
    // ('/v1/tarifas') aparece en más de una integración de terceros
    // encontrada en la búsqueda, pero no está confirmado contra la
    // documentación oficial completa. No invocar en producción sin
    // verificarlo primero.
    public CotizacionEnvioResponse cotizar(CotizacionEnvioRequest request) {
        exigirCredenciales();
        throw new UnsupportedOperationException(
                "TODO: implementar la llamada real a POST /v1/tarifas (o el endpoint que confirme la "
                + "documentación) una vez que haya credenciales de sandbox para probarlo. El cliente HTTP "
                + "(andreaniRestClient) y la configuración (AndreaniProperties) ya están listos para usarse acá.");
    }

    private static boolean esVacio(String valor) {
        return valor == null || valor.isBlank();
    }
}
