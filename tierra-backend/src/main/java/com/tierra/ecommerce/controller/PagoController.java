package com.tierra.ecommerce.controller;

import com.tierra.ecommerce.dto.PreferenciaPagoResponse;
import com.tierra.ecommerce.security.UsuarioAutenticado;
import com.tierra.ecommerce.service.PagoService;
import com.tierra.ecommerce.service.WebhookSignatureValidator;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/pagos")
public class PagoController {

    private static final Logger log = LoggerFactory.getLogger(PagoController.class);

    private final PagoService pagoService;
    private final WebhookSignatureValidator webhookSignatureValidator;

    public PagoController(PagoService pagoService, WebhookSignatureValidator webhookSignatureValidator) {
        this.pagoService = pagoService;
        this.webhookSignatureValidator = webhookSignatureValidator;
    }

    // SecurityConfig exige sesión para llegar acá, así que el principal nunca
    // llega nulo. De quién es el pedido lo decide la sesión, no el request.
    @PostMapping("/pedidos/{pedidoId}/preferencia")
    public PreferenciaPagoResponse crearPreferencia(@AuthenticationPrincipal UsuarioAutenticado usuario,
                                                    @PathVariable UUID pedidoId) {
        return pagoService.crearPreferenciaPago(pedidoId, usuario.getId());
    }

    // Mercado Pago llama a esta URL cuando cambia el estado de un pago.
    //
    // Dos capas de seguridad, ninguna opcional:
    // 1) Validar la firma (header x-signature, contra x-request-id y data.id)
    //    para confirmar que la notificación viene realmente de Mercado Pago y
    //    no de un tercero pegándole directo a esta URL.
    // 2) Nunca confiar en los datos del body: PagoService vuelve a consultar
    //    el pago contra la API de Mercado Pago con el id antes de actualizar
    //    cualquier cosa.
    //
    // 'data.id' y 'type' llegan por query string en las notificaciones reales
    // (así las configura MP); si faltan, se buscan en el body como respaldo,
    // que es como llegan las notificaciones de prueba mandadas desde el panel.
    @PostMapping("/webhook")
    public ResponseEntity<Void> webhook(
            @RequestParam(name = "data.id", required = false) String dataIdQuery,
            @RequestParam(name = "type", required = false) String typeQuery,
            @RequestHeader(name = "x-signature", required = false) String xSignature,
            @RequestHeader(name = "x-request-id", required = false) String xRequestId,
            @RequestBody(required = false) Map<String, Object> payload) {

        String dataId = dataIdQuery != null ? dataIdQuery : extraerDataIdDelBody(payload);
        String type = typeQuery != null ? typeQuery : extraerTipoDelBody(payload);

        if (!"payment".equals(type)) {
            // Otros tópicos (merchant_order, etc.) no nos interesan acá.
            return ResponseEntity.ok().build();
        }

        if (!webhookSignatureValidator.esValida(dataId, xRequestId, xSignature)) {
            log.warn("Firma inválida en notificación de webhook de Mercado Pago (data.id={})", dataId);
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        pagoService.confirmarPago(dataId);
        return ResponseEntity.ok().build();
    }

    private String extraerDataIdDelBody(Map<String, Object> payload) {
        if (payload == null) return null;
        Object data = payload.get("data");
        if (data instanceof Map<?, ?> dataMap && dataMap.get("id") != null) {
            return dataMap.get("id").toString();
        }
        return null;
    }

    private String extraerTipoDelBody(Map<String, Object> payload) {
        if (payload == null || payload.get("type") == null) return null;
        return payload.get("type").toString();
    }
}
