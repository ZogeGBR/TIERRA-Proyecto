package com.tierra.ecommerce.dto;

import java.math.BigDecimal;

// cubierto = false: el destino está fuera de la zona de envío a domicilio.
// costo es null en ese caso y mensaje explica que se puede retirar en el local.
public record CotizacionEnvioResponse(boolean cubierto, BigDecimal costo, String mensaje) {

    public static CotizacionEnvioResponse cubierto(BigDecimal costo) {
        return new CotizacionEnvioResponse(true, costo, null);
    }

    public static CotizacionEnvioResponse fueraDeCobertura(String mensaje) {
        return new CotizacionEnvioResponse(false, null, mensaje);
    }
}
