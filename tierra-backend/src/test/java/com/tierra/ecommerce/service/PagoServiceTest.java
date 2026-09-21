package com.tierra.ecommerce.service;

import com.mercadopago.client.payment.PaymentClient;
import com.mercadopago.client.payment.PaymentRefundClient;
import com.mercadopago.client.preference.PreferenceClient;
import com.mercadopago.client.preference.PreferenceRequest;
import com.mercadopago.exceptions.MPException;
import com.mercadopago.net.MPResultsResourcesPage;
import com.mercadopago.net.MPSearchRequest;
import com.mercadopago.resources.payment.Payment;
import com.mercadopago.resources.preference.Preference;
import com.tierra.ecommerce.config.MercadoPagoProperties;
import com.tierra.ecommerce.entity.Pago;
import com.tierra.ecommerce.entity.Pedido;
import com.tierra.ecommerce.entity.ReservaStock;
import com.tierra.ecommerce.enums.EstadoPago;
import com.tierra.ecommerce.enums.EstadoPedido;
import com.tierra.ecommerce.exception.PagoNoPermitidoException;
import com.tierra.ecommerce.repository.PagoRepository;
import com.tierra.ecommerce.repository.PedidoRepository;
import com.tierra.ecommerce.repository.ReservaStockRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

// Escenarios de la conciliación con Mercado Pago. La API de MP está mockeada:
// estos tests nunca hacen llamadas reales.
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class PagoServiceTest {

    @Mock PedidoRepository pedidoRepository;
    @Mock PagoRepository pagoRepository;
    @Mock InventarioService inventarioService;
    @Mock ReservaStockRepository reservaStockRepository;
    @Mock PreferenceClient preferenceClient;
    @Mock PaymentClient paymentClient;
    @Mock PaymentRefundClient paymentRefundClient;
    @Mock MercadoPagoProperties properties;

    PagoService pagoService;
    Pedido pedido;
    ReservaStock reserva;
    List<Pago> pagosGuardados;

    @BeforeEach
    void setUp() {
        pagoService = new PagoService(properties, pedidoRepository, pagoRepository, inventarioService,
                reservaStockRepository, preferenceClient, paymentClient, paymentRefundClient);

        pedido = new Pedido();
        pedido.setId(UUID.randomUUID());
        pedido.setEstado(EstadoPedido.PENDIENTE);
        pedido.setTotal(new BigDecimal("15000.00"));

        reserva = new ReservaStock();
        reserva.setPedido(pedido);
        reserva.setCantidad(1);
        reserva.setExpiraEn(LocalDateTime.now().plusMinutes(15));

        pagosGuardados = new ArrayList<>();

        when(pedidoRepository.findByIdConBloqueo(pedido.getId())).thenReturn(Optional.of(pedido));
        when(reservaStockRepository.findByPedidoId(pedido.getId())).thenReturn(List.of(reserva));
        when(pagoRepository.findByMpPaymentId(any())).thenAnswer(inv -> pagosGuardados.stream()
                .filter(p -> inv.getArgument(0).equals(p.getMpPaymentId())).findFirst());
        when(pagoRepository.findFirstByPedido_IdAndEstadoAndMpPaymentIdIsNull(any(), eq(EstadoPago.PENDIENTE)))
                .thenAnswer(inv -> pagosGuardados.stream()
                        .filter(p -> p.getEstado() == EstadoPago.PENDIENTE && p.getMpPaymentId() == null)
                        .findFirst());
        when(pagoRepository.findByPedido_IdAndEstado(any(), any())).thenAnswer(inv -> pagosGuardados.stream()
                .filter(p -> p.getEstado() == inv.getArgument(1)).toList());
        when(pagoRepository.save(any(Pago.class))).thenAnswer(inv -> {
            Pago p = inv.getArgument(0);
            if (!pagosGuardados.contains(p)) pagosGuardados.add(p);
            return p;
        });
        // confirmarVenta real marca las reservas como liberadas (convertidas en venta)
        doAnswer(inv -> { reserva.setLiberada(true); return null; })
                .when(inventarioService).confirmarVenta(any());
        doAnswer(inv -> { ((ReservaStock) inv.getArgument(0)).setLiberada(true); return null; })
                .when(inventarioService).liberarReserva(any());
    }

    // ---------------- helpers ----------------

    Pago pagoPendienteSinVincular() {
        Pago p = new Pago();
        p.setPedido(pedido);
        p.setEstado(EstadoPago.PENDIENTE);
        p.setMonto(pedido.getTotal());
        pagosGuardados.add(p);
        return p;
    }

    Payment mpPayment(long id, String status, String monto) throws Exception {
        Payment payment = mock(Payment.class);
        when(payment.getId()).thenReturn(id);
        when(payment.getStatus()).thenReturn(status);
        when(payment.getExternalReference()).thenReturn(pedido.getId().toString());
        when(payment.getTransactionAmount()).thenReturn(new BigDecimal(monto));
        when(payment.getCurrencyId()).thenReturn("ARS");
        when(paymentClient.get(id)).thenReturn(payment);
        return payment;
    }

    Pago pagoConId(String mpId) {
        return pagosGuardados.stream().filter(p -> mpId.equals(p.getMpPaymentId())).findFirst().orElseThrow();
    }

    // ---------------- webhook ----------------

    @Nested
    class Webhook {

        @Test
        void pagoAprobadoCorrectoConfirmaLaVenta() throws Exception {
            Pago pendiente = pagoPendienteSinVincular();
            mpPayment(111L, "approved", "15000");

            pagoService.confirmarPago("111");

            assertEquals("111", pendiente.getMpPaymentId());
            assertEquals(EstadoPago.APROBADO, pendiente.getEstado());
            assertEquals(EstadoPedido.PAGADO, pedido.getEstado());
            verify(inventarioService).confirmarVenta(pedido);
            verify(paymentRefundClient, never()).refund(anyLong());
        }

        @Test
        void notificacionRepetidaNoVuelveADescontarStock() throws Exception {
            pagoPendienteSinVincular();
            mpPayment(111L, "approved", "15000");

            pagoService.confirmarPago("111");
            pagoService.confirmarPago("111");
            pagoService.confirmarPago("111");

            verify(inventarioService, times(1)).confirmarVenta(any());
            assertEquals(1, pagosGuardados.size());
        }

        @Test
        void montoDistintoSeReembolsaYElPedidoNoSeMarcaPagado() throws Exception {
            pagoPendienteSinVincular();
            mpPayment(111L, "approved", "100");

            pagoService.confirmarPago("111");

            verify(paymentRefundClient).refund(111L);
            verify(inventarioService, never()).confirmarVenta(any());
            assertEquals(EstadoPago.REEMBOLSADO, pagoConId("111").getEstado());
            assertEquals(EstadoPedido.PENDIENTE, pedido.getEstado());
        }

        @Test
        void monedaDistintaSeReembolsa() throws Exception {
            pagoPendienteSinVincular();
            Payment payment = mpPayment(111L, "approved", "15000");
            when(payment.getCurrencyId()).thenReturn("USD");

            pagoService.confirmarPago("111");

            verify(paymentRefundClient).refund(111L);
            assertEquals(EstadoPedido.PENDIENTE, pedido.getEstado());
        }

        @Test
        void rechazoNoCancelaElPedidoYPermiteReintentarConOtraTarjeta() throws Exception {
            pagoPendienteSinVincular();
            mpPayment(111L, "rejected", "15000");
            mpPayment(222L, "approved", "15000");

            pagoService.confirmarPago("111");

            assertEquals(EstadoPago.RECHAZADO, pagoConId("111").getEstado());
            assertEquals(EstadoPedido.PENDIENTE, pedido.getEstado());
            verify(inventarioService, never()).liberarReserva(any());

            pagoService.confirmarPago("222");

            assertEquals(EstadoPago.APROBADO, pagoConId("222").getEstado());
            assertEquals(EstadoPedido.PAGADO, pedido.getEstado());
            assertEquals(2, pagosGuardados.size());
        }

        @Test
        void doblePagoDelMismoPedidoReembolsaElSegundo() throws Exception {
            pagoPendienteSinVincular();
            mpPayment(111L, "approved", "15000");
            mpPayment(222L, "approved", "15000");

            pagoService.confirmarPago("111");
            pagoService.confirmarPago("222");

            verify(inventarioService, times(1)).confirmarVenta(any());
            verify(paymentRefundClient).refund(222L);
            verify(paymentRefundClient, never()).refund(111L);
            assertEquals(EstadoPago.REEMBOLSADO, pagoConId("222").getEstado());
        }

        @Test
        void pagoAprobadoTardioSobrePedidoCanceladoSeReembolsa() throws Exception {
            pedido.setEstado(EstadoPedido.CANCELADO);
            reserva.setLiberada(true);
            mpPayment(111L, "approved", "15000");

            pagoService.confirmarPago("111");

            verify(paymentRefundClient).refund(111L);
            verify(inventarioService, never()).confirmarVenta(any());
            assertEquals(EstadoPago.REEMBOLSADO, pagoConId("111").getEstado());
        }

        @Test
        void siFallaElReembolsoSeLanzaErrorParaQueMercadoPagoReintente() throws Exception {
            pagoPendienteSinVincular();
            mpPayment(111L, "approved", "1");
            when(paymentRefundClient.refund(111L)).thenThrow(new MPException("MP caído"));

            assertThrows(IllegalStateException.class, () -> pagoService.confirmarPago("111"));
            assertEquals(EstadoPedido.PENDIENTE, pedido.getEstado());
        }

        @Test
        void pagoAprobadoNoRetrocedeAPendienteNiRechazado() throws Exception {
            pagoPendienteSinVincular();
            Payment payment = mpPayment(111L, "approved", "15000");
            pagoService.confirmarPago("111");

            when(payment.getStatus()).thenReturn("rejected");
            pagoService.confirmarPago("111");

            assertEquals(EstadoPago.APROBADO, pagoConId("111").getEstado());
            assertEquals(EstadoPedido.PAGADO, pedido.getEstado());
        }

        @Test
        void pagoDeOtroComercioOReferenciaInvalidaSeIgnora() throws Exception {
            Payment payment = mpPayment(111L, "approved", "15000");
            when(payment.getExternalReference()).thenReturn("no-es-un-uuid");

            pagoService.confirmarPago("111");

            assertTrue(pagosGuardados.isEmpty());
            verify(inventarioService, never()).confirmarVenta(any());
            verify(paymentRefundClient, never()).refund(anyLong());
        }

        @Test
        void idNoNumericoSeIgnoraSinConsultarAMercadoPago() throws Exception {
            pagoService.confirmarPago("abc");
            verify(paymentClient, never()).get(anyLong());
        }

        @Test
        void siMercadoPagoNoRespondeSeLanzaErrorParaReintentar() throws Exception {
            when(paymentClient.get(111L)).thenThrow(new MPException("timeout"));
            assertThrows(IllegalStateException.class, () -> pagoService.confirmarPago("111"));
        }
    }

    // ---------------- link de pago ----------------

    @Nested
    class LinkDePago {

        @BeforeEach
        void preferencia() throws Exception {
            Preference preference = mock(Preference.class);
            when(preference.getId()).thenReturn("pref-1");
            when(preference.getInitPoint()).thenReturn("https://mercadopago/checkout");
            when(preferenceClient.create(any(PreferenceRequest.class))).thenReturn(preference);
        }

        @Test
        void generaLinkSeguroYConVencimiento() throws Exception {
            var respuesta = pagoService.crearPreferenciaPago(pedido.getId());

            assertEquals("https://mercadopago/checkout", respuesta.initPoint());
            ArgumentCaptor<PreferenceRequest> captor = ArgumentCaptor.forClass(PreferenceRequest.class);
            verify(preferenceClient).create(captor.capture());
            PreferenceRequest request = captor.getValue();
            assertEquals(pedido.getId().toString(), request.getExternalReference());
            assertEquals(Boolean.TRUE, request.getBinaryMode());
            assertEquals(Boolean.TRUE, request.getExpires());
            assertTrue(request.getExpirationDateTo().toLocalDateTime()
                    .isBefore(reserva.getExpiraEn()), "la preferencia debe vencer antes que la reserva");
        }

        @Test
        void apretarPagarVariasVecesNoCreaPagosPendientesDuplicados() {
            pagoService.crearPreferenciaPago(pedido.getId());
            pagoService.crearPreferenciaPago(pedido.getId());
            pagoService.crearPreferenciaPago(pedido.getId());

            assertEquals(1, pagosGuardados.size());
        }

        @Test
        void pedidoYaPagadoNoSePuedeVolverAPagar() {
            pedido.setEstado(EstadoPedido.PAGADO);
            assertThrows(PagoNoPermitidoException.class, () -> pagoService.crearPreferenciaPago(pedido.getId()));
            assertTrue(pagosGuardados.isEmpty());
        }

        @Test
        void pedidoConReservaVencidaNoSePuedePagar() {
            reserva.setExpiraEn(LocalDateTime.now().plusMinutes(1));
            assertThrows(PagoNoPermitidoException.class, () -> pagoService.crearPreferenciaPago(pedido.getId()));

            reserva.setExpiraEn(LocalDateTime.now().plusMinutes(15));
            reserva.setLiberada(true);
            assertThrows(PagoNoPermitidoException.class, () -> pagoService.crearPreferenciaPago(pedido.getId()));
        }
    }

    // ---------------- vencimientos ----------------

    @Nested
    class Vencimientos {

        @SuppressWarnings("unchecked")
        void mercadoPagoInforma(Payment... payments) throws Exception {
            MPResultsResourcesPage<Payment> pagina = mock(MPResultsResourcesPage.class);
            when(pagina.getResults()).thenReturn(List.of(payments));
            when(paymentClient.search(any(MPSearchRequest.class))).thenReturn(pagina);
        }

        @Test
        void sinPagosEnMercadoPagoCancelaLiberaYExpiraElPagoPendiente() throws Exception {
            Pago pendiente = pagoPendienteSinVincular();
            reserva.setExpiraEn(LocalDateTime.now().minusMinutes(1));
            mercadoPagoInforma();

            pagoService.resolverPedidoVencido(pedido.getId());

            assertEquals(EstadoPedido.CANCELADO, pedido.getEstado());
            assertEquals(EstadoPago.EXPIRADO, pendiente.getEstado());
            verify(inventarioService).liberarReserva(reserva);
        }

        @Test
        void siElWebhookNoLlegoPeroMercadoPagoTieneElPagoAprobadoSeConfirmaLaVenta() throws Exception {
            pagoPendienteSinVincular();
            reserva.setExpiraEn(LocalDateTime.now().minusMinutes(1));
            mercadoPagoInforma(mpPayment(111L, "approved", "15000"));

            pagoService.resolverPedidoVencido(pedido.getId());

            assertEquals(EstadoPedido.PAGADO, pedido.getEstado());
            assertEquals(EstadoPago.APROBADO, pagoConId("111").getEstado());
            verify(inventarioService, never()).liberarReserva(any());
        }

        @Test
        void soloIntentosRechazadosTerminaCanceladoSinNingunPagoPendiente() throws Exception {
            pagoPendienteSinVincular();
            reserva.setExpiraEn(LocalDateTime.now().minusMinutes(1));
            mercadoPagoInforma(mpPayment(111L, "rejected", "15000"));

            pagoService.resolverPedidoVencido(pedido.getId());

            assertEquals(EstadoPedido.CANCELADO, pedido.getEstado());
            assertTrue(pagosGuardados.stream().noneMatch(p -> p.getEstado() == EstadoPago.PENDIENTE));
        }

        @Test
        void siMercadoPagoNoRespondeEsperaAntesDeSoltarElStock() throws Exception {
            pagoPendienteSinVincular();
            reserva.setExpiraEn(LocalDateTime.now().minusMinutes(1));
            when(paymentClient.search(any(MPSearchRequest.class))).thenThrow(new MPException("caído"));

            pagoService.resolverPedidoVencido(pedido.getId());

            assertEquals(EstadoPedido.PENDIENTE, pedido.getEstado());
            verify(inventarioService, never()).liberarReserva(any());
        }

        @Test
        void siMercadoPagoSigueSinResponderPasadaLaGraciaCancelaIgual() throws Exception {
            Pago pendiente = pagoPendienteSinVincular();
            reserva.setExpiraEn(LocalDateTime.now().minusMinutes(PagoService.GRACIA_SIN_CONCILIAR_MINUTOS + 5));
            when(paymentClient.search(any(MPSearchRequest.class))).thenThrow(new MPException("caído"));

            pagoService.resolverPedidoVencido(pedido.getId());

            assertEquals(EstadoPedido.CANCELADO, pedido.getEstado());
            assertEquals(EstadoPago.EXPIRADO, pendiente.getEstado());
        }
    }
}
