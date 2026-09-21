package com.tierra.ecommerce.service;

import com.mercadopago.client.payment.PaymentClient;
import com.mercadopago.client.payment.PaymentRefundClient;
import com.mercadopago.client.preference.PreferenceBackUrlsRequest;
import com.mercadopago.client.preference.PreferenceClient;
import com.mercadopago.client.preference.PreferenceItemRequest;
import com.mercadopago.client.preference.PreferencePaymentMethodsRequest;
import com.mercadopago.client.preference.PreferencePaymentTypeRequest;
import com.mercadopago.client.preference.PreferenceRequest;
import com.mercadopago.exceptions.MPApiException;
import com.mercadopago.exceptions.MPException;
import com.mercadopago.net.MPResultsResourcesPage;
import com.mercadopago.net.MPSearchRequest;
import com.mercadopago.resources.payment.Payment;
import com.mercadopago.resources.preference.Preference;
import com.tierra.ecommerce.config.MercadoPagoProperties;
import com.tierra.ecommerce.dto.PreferenciaPagoResponse;
import com.tierra.ecommerce.entity.Pago;
import com.tierra.ecommerce.entity.Pedido;
import com.tierra.ecommerce.entity.ReservaStock;
import com.tierra.ecommerce.enums.EstadoPago;
import com.tierra.ecommerce.enums.EstadoPedido;
import com.tierra.ecommerce.enums.MetodoPago;
import com.tierra.ecommerce.exception.PagoNoPermitidoException;
import com.tierra.ecommerce.exception.RecursoNoEncontradoException;
import com.tierra.ecommerce.repository.PagoRepository;
import com.tierra.ecommerce.repository.PedidoRepository;
import com.tierra.ecommerce.repository.ReservaStockRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

// Todo el ciclo de vida del cobro con Mercado Pago (Checkout Pro):
//
//   crearPreferenciaPago   -> el usuario va a MP a pagar (Tierra nunca ve la tarjeta)
//   confirmarPago          -> llega el webhook: se consulta el pago real a MP y se concilia
//   resolverPedidoVencido  -> el job de vencimientos cierra lo que nunca se pagó
//
// Reglas de seguridad (ver docs/decisiones/0002-conciliacion-pagos-mercado-pago.md):
// - Nunca se confía en datos que no vengan de la API de Mercado Pago.
// - Un pedido solo pasa a PAGADO si el pago está aprobado, el monto y la moneda
//   coinciden exactamente, el pedido sigue PENDIENTE y su stock sigue reservado.
//   Un pago aprobado que no cumple eso se REEMBOLSA automáticamente.
// - Todo cambio pasa con la fila del pedido bloqueada: dos notificaciones del
//   mismo pedido nunca se procesan en paralelo.
// - Ningún pago queda PENDIENTE para siempre: termina APROBADO, RECHAZADO,
//   REEMBOLSADO o EXPIRADO.
@Service
public class PagoService {

    private static final Logger log = LoggerFactory.getLogger(PagoService.class);

    static final String MONEDA = "ARS";
    // La preferencia vence unos minutos ANTES que la reserva de stock: un pago con
    // tarjeta se resuelve en segundos, así que siempre llega a confirmarse con el
    // stock todavía reservado.
    static final int MARGEN_VENCIMIENTO_PREFERENCIA_MINUTOS = 3;
    // Si al usuario le quedarían menos de estos minutos para pagar, no se genera
    // el link: se le pide que vuelva a armar el pedido.
    static final int TIEMPO_MINIMO_PARA_PAGAR_MINUTOS = 2;
    // Si Mercado Pago no responde, el job espera hasta esto antes de cancelar
    // igual un pedido vencido (y soltar su stock).
    static final int GRACIA_SIN_CONCILIAR_MINUTOS = 30;

    private final MercadoPagoProperties properties;
    private final PedidoRepository pedidoRepository;
    private final PagoRepository pagoRepository;
    private final InventarioService inventarioService;
    private final ReservaStockRepository reservaStockRepository;
    private final PreferenceClient preferenceClient;
    private final PaymentClient paymentClient;
    private final PaymentRefundClient paymentRefundClient;

    public PagoService(MercadoPagoProperties properties,
                       PedidoRepository pedidoRepository,
                       PagoRepository pagoRepository,
                       InventarioService inventarioService,
                       ReservaStockRepository reservaStockRepository,
                       PreferenceClient preferenceClient,
                       PaymentClient paymentClient,
                       PaymentRefundClient paymentRefundClient) {
        this.properties = properties;
        this.pedidoRepository = pedidoRepository;
        this.pagoRepository = pagoRepository;
        this.inventarioService = inventarioService;
        this.reservaStockRepository = reservaStockRepository;
        this.preferenceClient = preferenceClient;
        this.paymentClient = paymentClient;
        this.paymentRefundClient = paymentRefundClient;
    }

    // ------------------------------------------------------------------
    // 1. Link de pago
    // ------------------------------------------------------------------

    // TODO(login): cuando exista autenticación, verificar acá que el pedido
    // pertenece al usuario logueado antes de generar el link.
    @Transactional
    public PreferenciaPagoResponse crearPreferenciaPago(UUID pedidoId) {
        Pedido pedido = pedidoRepository.findByIdConBloqueo(pedidoId)
                .orElseThrow(() -> new RecursoNoEncontradoException("Pedido no encontrado: " + pedidoId));

        if (pedido.getEstado() != EstadoPedido.PENDIENTE) {
            throw new PagoNoPermitidoException("Este pedido ya no se puede pagar.");
        }
        if (pedido.getTotal() == null || pedido.getTotal().signum() <= 0) {
            throw new PagoNoPermitidoException("El pedido no tiene un total válido para cobrar.");
        }

        List<ReservaStock> reservas = reservaStockRepository.findByPedidoId(pedido.getId());
        if (reservas.isEmpty() || reservas.stream().anyMatch(ReservaStock::isLiberada)) {
            throw new PagoNoPermitidoException("Venció el tiempo para pagar este pedido. Volvé a armarlo.");
        }
        LocalDateTime venceReserva = reservas.stream()
                .map(ReservaStock::getExpiraEn)
                .min(Comparator.naturalOrder())
                .orElseThrow();
        LocalDateTime vencePreferencia = venceReserva.minusMinutes(MARGEN_VENCIMIENTO_PREFERENCIA_MINUTOS);
        if (vencePreferencia.isBefore(LocalDateTime.now().plusMinutes(TIEMPO_MINIMO_PARA_PAGAR_MINUTOS))) {
            throw new PagoNoPermitidoException("Venció el tiempo para pagar este pedido. Volvé a armarlo.");
        }

        // Si el usuario aprieta "Pagar" varias veces, se reutiliza el mismo Pago
        // pendiente en vez de crear uno nuevo por cada intento.
        Pago pago = pagoRepository
                .findFirstByPedido_IdAndEstadoAndMpPaymentIdIsNull(pedido.getId(), EstadoPago.PENDIENTE)
                .orElseGet(() -> pagoRepository.save(nuevoPago(pedido)));

        try {
            PreferenceItemRequest item = PreferenceItemRequest.builder()
                    .title("Pedido Tierra #" + pedido.getId())
                    .quantity(1)
                    .unitPrice(pedido.getTotal())
                    .currencyId(MONEDA)
                    .build();

            PreferenceBackUrlsRequest backUrls = PreferenceBackUrlsRequest.builder()
                    .success(properties.getUrlExito())
                    .failure(properties.getUrlFallo())
                    .pending(properties.getUrlPendiente())
                    .build();

            // Solo medios que se resuelven al instante (tarjetas de crédito, débito,
            // prepagas y dinero en cuenta). Rapipago/Pago Fácil y transferencias por
            // cajero quedan afuera: se acreditan en días y el stock se reserva 20 min.
            PreferencePaymentMethodsRequest mediosDePago = PreferencePaymentMethodsRequest.builder()
                    .excludedPaymentTypes(List.of(
                            PreferencePaymentTypeRequest.builder().id("ticket").build(),
                            PreferencePaymentTypeRequest.builder().id("atm").build()))
                    .build();

            PreferenceRequest request = PreferenceRequest.builder()
                    .items(List.of(item))
                    .backUrls(backUrls)
                    .autoReturn("approved")
                    // external_reference = pedidoId: es lo que después permite saber a
                    // qué pedido corresponde cada pago que informa Mercado Pago.
                    .externalReference(pedido.getId().toString())
                    // binary_mode: el pago se aprueba o se rechaza en el momento, nunca
                    // queda "en proceso" días esperando revisión manual.
                    .binaryMode(true)
                    .paymentMethods(mediosDePago)
                    .expires(true)
                    .expirationDateFrom(aOffset(LocalDateTime.now()))
                    .expirationDateTo(aOffset(vencePreferencia))
                    .build();

            Preference preference = preferenceClient.create(request);
            log.info("Preferencia {} creada para el pedido {} (pago {})", preference.getId(), pedido.getId(), pago.getId());
            return new PreferenciaPagoResponse(preference.getId(), preference.getInitPoint());

        } catch (MPApiException | MPException e) {
            log.error("No se pudo crear la preferencia de pago para el pedido {}", pedidoId, e);
            throw new IllegalStateException("No se pudo generar el link de pago. Intentá de nuevo.", e);
        }
    }

    // ------------------------------------------------------------------
    // 2. Webhook
    // ------------------------------------------------------------------

    // Lo llama PagoController después de validar la firma. Nunca recibe el estado
    // del pago: lo consulta a la API de Mercado Pago. Si la consulta falla, lanza
    // excepción -> el webhook responde 500 -> Mercado Pago reintenta más tarde.
    @Transactional
    public void confirmarPago(String mpPaymentId) {
        long idNumerico;
        try {
            idNumerico = Long.parseLong(mpPaymentId);
        } catch (NumberFormatException e) {
            log.warn("El webhook mandó un id de pago no numérico: {}", mpPaymentId);
            return;
        }

        Payment payment;
        try {
            payment = paymentClient.get(idNumerico);
        } catch (MPApiException | MPException e) {
            throw new IllegalStateException("No se pudo consultar el pago " + mpPaymentId + " a Mercado Pago", e);
        }

        Optional<UUID> pedidoId = pedidoIdDe(payment);
        if (pedidoId.isEmpty()) {
            log.warn("El pago de MP {} no tiene un external_reference de Tierra: se ignora", mpPaymentId);
            return;
        }
        Optional<Pedido> pedido = pedidoRepository.findByIdConBloqueo(pedidoId.get());
        if (pedido.isEmpty()) {
            log.warn("El pago de MP {} apunta a un pedido inexistente ({}): se ignora", mpPaymentId, pedidoId.get());
            return;
        }

        procesarPago(mpPaymentId, payment, pedido.get());
    }

    // ------------------------------------------------------------------
    // 3. Vencimientos (lo llama ReservaStockLiberadorJob, un pedido por transacción)
    // ------------------------------------------------------------------

    @Transactional
    public void resolverPedidoVencido(UUID pedidoId) {
        Pedido pedido = pedidoRepository.findByIdConBloqueo(pedidoId).orElse(null);
        if (pedido == null) return;

        if (pedido.getEstado() == EstadoPedido.PENDIENTE) {
            // Antes de soltar el stock, se pregunta a Mercado Pago si hubo algún pago:
            // cubre el caso de un webhook que nunca llegó (MP caído, secret mal
            // configurado, servidor reiniciándose).
            boolean conciliado = conciliarConMercadoPago(pedido);

            if (pedido.getEstado() != EstadoPedido.PENDIENTE) {
                return; // se encontró un pago aprobado y el pedido quedó PAGADO
            }
            if (!conciliado && dentroDeLaGracia(pedido)) {
                return; // MP no respondió: se reintenta en la próxima pasada del job
            }
        } else if (pedido.getEstado() != EstadoPedido.CANCELADO) {
            log.warn("Pedido {} en estado {} con reservas vencidas sin liberar: se revisa manualmente",
                    pedido.getId(), pedido.getEstado());
            return;
        }

        for (ReservaStock reserva : reservaStockRepository.findByPedidoId(pedido.getId())) {
            inventarioService.liberarReserva(reserva);
        }
        if (pedido.getEstado() == EstadoPedido.PENDIENTE) {
            pedido.setEstado(EstadoPedido.CANCELADO);
            pedidoRepository.save(pedido);
        }
        for (Pago pago : pagoRepository.findByPedido_IdAndEstado(pedido.getId(), EstadoPago.PENDIENTE)) {
            pago.setEstado(EstadoPago.EXPIRADO);
            pagoRepository.save(pago);
        }
        log.info("Pedido {} vencido sin pago aprobado: cancelado y stock liberado", pedido.getId());
    }

    // ------------------------------------------------------------------
    // Núcleo de la conciliación (siempre con el pedido ya bloqueado)
    // ------------------------------------------------------------------

    private void procesarPago(String mpPaymentId, Payment payment, Pedido pedido) {
        Pago pago = ubicarOVincularPago(mpPaymentId, pedido);
        if (pago == null) return;

        EstadoPago estadoAntes = pago.getEstado();
        EstadoPago estadoMp = mapearEstado(payment.getStatus());

        if (estadoAntes == estadoMp || estadoAntes == EstadoPago.REEMBOLSADO) {
            // Notificación repetida, o pago ya en estado final: no hay nada que aplicar.
        } else if (estadoAntes == EstadoPago.APROBADO && estadoMp != EstadoPago.REEMBOLSADO) {
            log.warn("Pago {} ya aprobado; se ignora un cambio a {} informado por MP", mpPaymentId, estadoMp);
        } else if (estadoMp == EstadoPago.PENDIENTE) {
            // Un pago que ya se resolvió (rechazado, expirado) nunca vuelve a pendiente.
        } else {
            switch (estadoMp) {
                case APROBADO -> aprobarOReembolsar(mpPaymentId, payment, pedido, pago);
                case REEMBOLSADO -> {
                    pago.setEstado(EstadoPago.REEMBOLSADO);
                    if (estadoAntes == EstadoPago.APROBADO) {
                        log.warn("El pago {} del pedido {} (ya PAGADO) fue reembolsado o contracargado desde "
                                + "Mercado Pago: revisar el pedido manualmente", mpPaymentId, pedido.getId());
                    }
                }
                // Un rechazo NO cancela el pedido: en Checkout Pro el usuario puede
                // reintentar enseguida con otra tarjeta. El stock sigue reservado hasta
                // que se apruebe otro intento o venza el pedido.
                case RECHAZADO -> pago.setEstado(EstadoPago.RECHAZADO);
                default -> { }
            }
        }

        // Un pago que sigue pendiente sobre un pedido que ya no se puede pagar
        // (cancelado o pagado por otro intento) no va a completarse nunca.
        if (pago.getEstado() == EstadoPago.PENDIENTE && pedido.getEstado() != EstadoPedido.PENDIENTE) {
            pago.setEstado(EstadoPago.EXPIRADO);
        }

        if (pago.getEstado() != estadoAntes) {
            pagoRepository.save(pago);
        }
    }

    private void aprobarOReembolsar(String mpPaymentId, Payment payment, Pedido pedido, Pago pago) {
        String motivo = motivoParaNoAprobar(payment, pedido);
        if (motivo == null) {
            inventarioService.confirmarVenta(pedido);
            pedido.setEstado(EstadoPedido.PAGADO);
            pedidoRepository.save(pedido);
            pago.setEstado(EstadoPago.APROBADO);
            log.info("Pago {} aprobado: pedido {} PAGADO", mpPaymentId, pedido.getId());
            return;
        }

        log.error("Pago {} aprobado por MP pero NO corresponde al pedido {} ({}): se reembolsa",
                mpPaymentId, pedido.getId(), motivo);
        try {
            paymentRefundClient.refund(Long.parseLong(mpPaymentId));
        } catch (MPApiException | MPException e) {
            // Sin reembolso no se guarda nada: la excepción hace rollback y el pago
            // se vuelve a intentar en el próximo webhook o pasada del job.
            throw new IllegalStateException("No se pudo reembolsar el pago " + mpPaymentId, e);
        }
        pago.setEstado(EstadoPago.REEMBOLSADO);
    }

    // null = se puede aprobar. Cualquier otro valor explica por qué no.
    private String motivoParaNoAprobar(Payment payment, Pedido pedido) {
        if (pedido.getEstado() != EstadoPedido.PENDIENTE) {
            return "el pedido está " + pedido.getEstado(); // doble pago o pago tardío
        }
        if (!MONEDA.equals(payment.getCurrencyId())) {
            return "moneda " + payment.getCurrencyId();
        }
        BigDecimal monto = payment.getTransactionAmount();
        if (monto == null || pedido.getTotal() == null || monto.compareTo(pedido.getTotal()) != 0) {
            return "monto " + monto + " distinto del total " + pedido.getTotal();
        }
        List<ReservaStock> reservas = reservaStockRepository.findByPedidoId(pedido.getId());
        if (reservas.isEmpty() || reservas.stream().anyMatch(ReservaStock::isLiberada)) {
            return "el stock reservado ya fue liberado";
        }
        return null;
    }

    private Pago ubicarOVincularPago(String mpPaymentId, Pedido pedido) {
        Optional<Pago> yaVinculado = pagoRepository.findByMpPaymentId(mpPaymentId);
        if (yaVinculado.isPresent()) {
            Pago pago = yaVinculado.get();
            if (pago.getPedido() == null || !pedido.getId().equals(pago.getPedido().getId())) {
                log.error("El pago de MP {} está vinculado a otro pedido distinto de su external_reference {}",
                        mpPaymentId, pedido.getId());
                return null;
            }
            return pago;
        }

        // Primer aviso de este pago: se usa el Pago pendiente que dejó
        // crearPreferenciaPago; si ya se usó (por ejemplo, un intento anterior
        // rechazado), se registra este intento como un Pago nuevo del pedido.
        Pago pago = pagoRepository
                .findFirstByPedido_IdAndEstadoAndMpPaymentIdIsNull(pedido.getId(), EstadoPago.PENDIENTE)
                .orElseGet(() -> nuevoPago(pedido));
        pago.setMpPaymentId(mpPaymentId);
        return pagoRepository.save(pago);
    }

    private boolean conciliarConMercadoPago(Pedido pedido) {
        try {
            MPSearchRequest busqueda = MPSearchRequest.builder()
                    .offset(0)
                    .limit(50)
                    .filters(Map.of("external_reference", pedido.getId().toString()))
                    .build();
            MPResultsResourcesPage<Payment> resultados = paymentClient.search(busqueda);
            if (resultados != null && resultados.getResults() != null) {
                for (Payment payment : resultados.getResults()) {
                    if (payment.getId() == null) continue;
                    if (!pedido.getId().toString().equals(payment.getExternalReference())) continue;
                    procesarPago(String.valueOf(payment.getId()), payment, pedido);
                }
            }
            return true;
        } catch (MPApiException | MPException e) {
            log.warn("No se pudo conciliar el pedido {} con Mercado Pago: se reintenta", pedido.getId(), e);
            return false;
        }
    }

    private boolean dentroDeLaGracia(Pedido pedido) {
        LocalDateTime vencimiento = reservaStockRepository.findByPedidoId(pedido.getId()).stream()
                .map(ReservaStock::getExpiraEn)
                .min(Comparator.naturalOrder())
                .orElse(pedido.getCreadoEn().plusMinutes(InventarioService.TTL_RESERVA_MINUTOS));
        return LocalDateTime.now().isBefore(vencimiento.plusMinutes(GRACIA_SIN_CONCILIAR_MINUTOS));
    }

    private Pago nuevoPago(Pedido pedido) {
        Pago pago = new Pago();
        pago.setPedido(pedido);
        pago.setMetodo(MetodoPago.MERCADO_PAGO);
        pago.setEstado(EstadoPago.PENDIENTE);
        pago.setMonto(pedido.getTotal());
        return pago;
    }

    private Optional<UUID> pedidoIdDe(Payment payment) {
        String ref = payment.getExternalReference();
        if (ref == null || ref.isBlank()) return Optional.empty();
        try {
            return Optional.of(UUID.fromString(ref));
        } catch (IllegalArgumentException e) {
            return Optional.empty();
        }
    }

    private static java.time.OffsetDateTime aOffset(LocalDateTime fecha) {
        return fecha.atZone(ZoneId.systemDefault()).toOffsetDateTime();
    }

    static EstadoPago mapearEstado(String estadoMp) {
        if (estadoMp == null) return EstadoPago.PENDIENTE;
        return switch (estadoMp) {
            case "approved" -> EstadoPago.APROBADO;
            case "rejected", "cancelled" -> EstadoPago.RECHAZADO;
            case "refunded", "charged_back" -> EstadoPago.REEMBOLSADO;
            default -> EstadoPago.PENDIENTE; // pending, in_process, authorized, in_mediation
        };
    }
}
