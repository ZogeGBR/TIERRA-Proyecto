package com.tierra.ecommerce.controller;

import com.tierra.ecommerce.dto.PreferenciaPagoResponse;
import com.tierra.ecommerce.service.PagoService;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/pagos")
public class PagoController {

    private final PagoService pagoService;

    public PagoController(PagoService pagoService) {
        this.pagoService = pagoService;
    }

    @PostMapping("/pedidos/{pedidoId}/preferencia")
    public PreferenciaPagoResponse crearPreferencia(@PathVariable UUID pedidoId) {
        return pagoService.crearPreferenciaPago(pedidoId);
    }

    // Mercado Pago llama a esta URL cuando cambia el estado de un pago.
    // IMPORTANTE (pendiente de implementar antes de producción):
    // 1) Validar la firma del webhook (header x-signature) para confirmar que la
    //    notificación viene realmente de Mercado Pago y no de un tercero.
    // 2) Nunca confiar en los datos del body: usar el id recibido para volver a
    //    consultar el pago contra la API de Mercado Pago y recién ahí actualizar el estado.
    @PostMapping("/webhook")
    public void webhook(@RequestBody Map<String, Object> payload) {
        Object data = payload.get("data");
        if (data instanceof Map<?, ?> dataMap && dataMap.get("id") != null) {
            String mpPaymentId = dataMap.get("id").toString();
            // Placeholder: acá va la consulta real a la API de pagos de Mercado Pago
            // (com.mercadopago.client.payment.PaymentClient.get(paymentId)) para
            // obtener el estado verdadero antes de llamar a confirmarPago.
            pagoService.confirmarPago(mpPaymentId, "approved");
        }
    }
}
