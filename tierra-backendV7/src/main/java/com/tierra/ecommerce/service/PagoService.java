package com.tierra.ecommerce.service;

import com.mercadopago.MercadoPagoConfig;
import com.mercadopago.client.preference.*;
import com.mercadopago.resources.preference.Preference;
import com.mercadopago.exceptions.MPApiException;
import com.mercadopago.exceptions.MPException;
import com.tierra.ecommerce.config.MercadoPagoProperties;
import com.tierra.ecommerce.dto.PreferenciaPagoResponse;
import com.tierra.ecommerce.entity.Pago;
import com.tierra.ecommerce.entity.Pedido;
import com.tierra.ecommerce.entity.ReservaStock;
import com.tierra.ecommerce.entity.Ubicacion;
import com.tierra.ecommerce.enums.EstadoPago;
import com.tierra.ecommerce.enums.EstadoPedido;
import com.tierra.ecommerce.enums.MetodoPago;
import com.tierra.ecommerce.exception.RecursoNoEncontradoException;
import com.tierra.ecommerce.repository.PagoRepository;
import com.tierra.ecommerce.repository.PedidoRepository;
import com.tierra.ecommerce.repository.ReservaStockRepository;
import com.tierra.ecommerce.repository.UbicacionRepository;
import jakarta.annotation.PostConstruct;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Collections;
import java.util.List;
import java.util.UUID;

@Service
public class PagoService {

    private final MercadoPagoProperties properties;
    private final PedidoRepository pedidoRepository;
    private final PagoRepository pagoRepository;
    private final InventarioService inventarioService;
    private final ReservaStockRepository reservaStockRepository;
    private final UbicacionRepository ubicacionRepository;

    public PagoService(MercadoPagoProperties properties,
                        PedidoRepository pedidoRepository,
                        PagoRepository pagoRepository,
                        InventarioService inventarioService,
                        ReservaStockRepository reservaStockRepository,
                        UbicacionRepository ubicacionRepository) {
        this.properties = properties;
        this.pedidoRepository = pedidoRepository;
        this.pagoRepository = pagoRepository;
        this.inventarioService = inventarioService;
        this.reservaStockRepository = reservaStockRepository;
        this.ubicacionRepository = ubicacionRepository;
    }

    @PostConstruct
    void inicializarSdk() {
        MercadoPagoConfig.setAccessToken(properties.getAccessToken());
    }

    // Crea una "preferencia" de pago: Mercado Pago devuelve una URL (initPoint) a la
    // que el frontend redirige al usuario. Ahí el usuario elige tarjeta, cuotas, dinero
    // en cuenta, etc. — Tierra nunca ve ni procesa el número de tarjeta.
    @Transactional
    public PreferenciaPagoResponse crearPreferenciaPago(UUID pedidoId) {
        Pedido pedido = pedidoRepository.findById(pedidoId)
                .orElseThrow(() -> new RecursoNoEncontradoException("Pedido no encontrado: " + pedidoId));

        Pago pago = new Pago();
        pago.setPedido(pedido);
        pago.setMetodo(MetodoPago.MERCADO_PAGO);
        pago.setEstado(EstadoPago.PENDIENTE);
        pago.setMonto(pedido.getTotal());
        pagoRepository.save(pago);

        try {
            PreferenceItemRequest item = PreferenceItemRequest.builder()
                    .title("Pedido Tierra #" + pedido.getId())
                    .quantity(1)
                    .unitPrice(pedido.getTotal())
                    .currencyId("ARS")
                    .build();

            PreferenceBackUrlsRequest backUrls = PreferenceBackUrlsRequest.builder()
                    .success(properties.getUrlExito())
                    .failure(properties.getUrlFallo())
                    .pending(properties.getUrlPendiente())
                    .build();

            PreferenceRequest request = PreferenceRequest.builder()
                    .items(List.of(item))
                    .backUrls(backUrls)
                    .externalReference(pedido.getId().toString())
                    .autoReturn("approved")
                    .build();

            PreferenceClient client = new PreferenceClient();
            Preference preference = client.create(request);

            return new PreferenciaPagoResponse(preference.getId(), preference.getInitPoint());

        } catch (MPApiException | MPException e) {
            // TODO: loggear e.getMessage() con detalle para diagnóstico interno
            throw new RuntimeException("No se pudo generar el link de pago. Intentá de nuevo.");
        }
    }

    // Mercado Pago llama a este flujo (vía webhook) para avisar que un pago cambió de
    // estado. Nunca hay que confiar ciegamente en el payload del webhook: siempre se
    // vuelve a consultar el pago por su id contra la API de Mercado Pago antes de
    // marcarlo como aprobado (ver notas en PagoController).
    //
    // A partir de v2: acá es donde el stock realmente se descuenta (si se aprueba) o
    // se libera (si se rechaza) — antes de esto solo estaba reservado.
    @Transactional
    public void confirmarPago(String mpPaymentId, String estadoMp) {
        Pago pago = pagoRepository.findByMpPaymentId(mpPaymentId).orElse(null);
        if (pago == null) {
            return; // notificación de un pago que no es nuestro o ya procesado
        }

        EstadoPago nuevoEstado = switch (estadoMp) {
            case "approved" -> EstadoPago.APROBADO;
            case "rejected" -> EstadoPago.RECHAZADO;
            case "refunded" -> EstadoPago.REEMBOLSADO;
            default -> EstadoPago.PENDIENTE;
        };
        pago.setEstado(nuevoEstado);
        pagoRepository.save(pago);

        if (pago.getPedido() == null) return;
        Pedido pedido = pago.getPedido();

        if (nuevoEstado == EstadoPago.APROBADO) {
            Ubicacion deposito = ubicacionRepository.findFirstByTipo("deposito")
                    .orElseThrow(() -> new RecursoNoEncontradoException(
                            "No hay ninguna ubicación de tipo 'deposito' cargada — crear una antes de vender online"));
            inventarioService.confirmarVentaWeb(pedido, deposito);
            pedido.setEstado(EstadoPedido.PAGADO);
            pedidoRepository.save(pedido);

        } else if (nuevoEstado == EstadoPago.RECHAZADO) {
            for (ReservaStock reserva : reservaStockRepository.findByPedidoId(pedido.getId())) {
                inventarioService.liberarReserva(reserva);
            }
            pedido.setEstado(EstadoPedido.CANCELADO);
            pedidoRepository.save(pedido);
        }
    }
}
