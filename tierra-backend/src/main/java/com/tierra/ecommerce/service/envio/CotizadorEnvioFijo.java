package com.tierra.ecommerce.service.envio;

import com.tierra.ecommerce.config.EnvioProperties;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;

// Un mismo costo para cualquier destino dentro de la zona, configurable con
// ENVIO_COSTO_FIJO. Es el cotizador mientras no estén las credenciales de
// Andreani (decisión 0006).
@Component
@ConditionalOnProperty(name = "envios.proveedor", havingValue = "fijo", matchIfMissing = true)
public class CotizadorEnvioFijo implements CotizadorEnvio {

    private final EnvioProperties properties;

    public CotizadorEnvioFijo(EnvioProperties properties) {
        this.properties = properties;
    }

    @Override
    public BigDecimal cotizar(SolicitudCotizacion solicitud) {
        return properties.getCostoFijo();
    }
}
