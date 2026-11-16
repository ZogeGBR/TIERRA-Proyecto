package com.tierra.ecommerce.service.envio;

import java.math.BigDecimal;

// Quien calcula cuánto cuesta un envío a domicilio. Es el único punto que
// cambia al integrar Andreani (decisión 0006): EnvioService, el checkout, el
// endpoint de cotización y el frontend no se enteran.
//
// Hoy hay una sola implementación, CotizadorEnvioFijo, elegida con
// envios.proveedor = fijo. La de Andreani se agrega como otra implementación,
// elegida con envios.proveedor = andreani.
public interface CotizadorEnvio {

    // Solo se llama para destinos dentro de la zona de cobertura: la
    // cobertura la decide EnvioService antes.
    //
    // Si el proveedor no responde o falla, lanza CotizacionNoDisponibleException.
    // Nunca devuelve un costo inventado: es preferible que la compra no avance
    // a cobrar un envío equivocado.
    BigDecimal cotizar(SolicitudCotizacion solicitud);
}
