package com.tierra.ecommerce.controller;

import com.tierra.ecommerce.dto.CotizacionEnvioRequest;
import com.tierra.ecommerce.dto.CotizacionEnvioResponse;
import com.tierra.ecommerce.service.EnvioService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

// Público: el costo del envío se muestra antes de pagar, con o sin sesión.
// Informa, no cobra: el checkout lo vuelve a calcular (EnvioService).
@RestController
@RequestMapping("/api/envios")
public class EnvioController {

    private final EnvioService envioService;

    public EnvioController(EnvioService envioService) {
        this.envioService = envioService;
    }

    @PostMapping("/cotizacion")
    public CotizacionEnvioResponse cotizar(@Valid @RequestBody CotizacionEnvioRequest request) {
        return envioService.cotizar(request.tipoEntrega(), request.provincia(), request.codigoPostal(), request.items());
    }
}
