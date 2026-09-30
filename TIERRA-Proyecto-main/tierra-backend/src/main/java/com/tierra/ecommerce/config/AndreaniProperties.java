package com.tierra.ecommerce.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

// Igual que MercadoPagoProperties: nada de credenciales en el código ni en
// application.yml en texto plano, todo sale de variables de entorno.
//
// A diferencia de Mercado Pago, acá las credenciales no se autogeneran
// desde un panel: Andreani exige ser cliente comercial y pedirlas a través
// de un ejecutivo de cuenta (confirmado en developers.andreani.com). Hasta
// que Tierra las tenga, estas variables van a estar vacías a propósito --
// ver AndreaniClientConfig, que arranca igual pero avisa con un WARN en vez
// de tirar abajo el backend entero por un servicio que todavía no se puede
// probar.
@Component
public class AndreaniProperties {

    @Value("${andreani.base-url}")
    private String baseUrl;

    @Value("${andreani.usuario:}")
    private String usuario;

    @Value("${andreani.password:}")
    private String password;

    // Número de cliente Andreani. Aparece en varios endpoints de la API
    // como parte de la ruta (ej. /v2/{numeroCliente}/...) según la
    // documentación pública de integraciones existentes.
    @Value("${andreani.cliente-numero:}")
    private String clienteNumero;

    // Código de contrato (a veces llamado "operativa"): distingue puerta a
    // puerta de puerta a sucursal, entre otras cosas. Lo asigna Andreani
    // junto con las credenciales.
    @Value("${andreani.contrato:}")
    private String contrato;

    // Código postal del local en Esquel, origen de todos los envíos.
    @Value("${andreani.codigo-postal-origen:}")
    private String codigoPostalOrigen;

    public String getBaseUrl() { return baseUrl; }
    public String getUsuario() { return usuario; }
    public String getPassword() { return password; }
    public String getClienteNumero() { return clienteNumero; }
    public String getContrato() { return contrato; }
    public String getCodigoPostalOrigen() { return codigoPostalOrigen; }
}
