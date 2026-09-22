package com.tierra.ecommerce.service;

import com.tierra.ecommerce.entity.ReservaStock;
import com.tierra.ecommerce.repository.PedidoRepository;
import com.tierra.ecommerce.repository.ReservaStockRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.UUID;

// Sin esto, un carrito abandonado (usuario cierra la pestaña antes de
// pagar) deja stock_reservado bloqueado para siempre y el pedido y su pago
// en PENDIENTE. Corre cada minuto y resuelve todo lo vencido.
//
// Para pedidos no libera el stock a ciegas: PagoService#resolverPedidoVencido
// primero le pregunta a Mercado Pago si hubo un pago aprobado (por si el
// webhook no llegó). Cada pedido se resuelve en su propia transacción: si uno
// falla, se loguea y se reintenta en la próxima pasada sin frenar al resto.
@Component
public class ReservaStockLiberadorJob {

    private static final Logger log = LoggerFactory.getLogger(ReservaStockLiberadorJob.class);

    private final ReservaStockRepository reservaStockRepository;
    private final PedidoRepository pedidoRepository;
    private final InventarioService inventarioService;
    private final PagoService pagoService;

    public ReservaStockLiberadorJob(ReservaStockRepository reservaStockRepository,
                                    PedidoRepository pedidoRepository,
                                    InventarioService inventarioService,
                                    PagoService pagoService) {
        this.reservaStockRepository = reservaStockRepository;
        this.pedidoRepository = pedidoRepository;
        this.inventarioService = inventarioService;
        this.pagoService = pagoService;
    }

    @Scheduled(fixedRate = 60_000)
    public void liberarVencidas() {
        LocalDateTime ahora = LocalDateTime.now();

        for (UUID pedidoId : reservaStockRepository.findPedidosConReservasVencidas(ahora)) {
            resolver(pedidoId);
        }

        for (ReservaStock reserva : reservaStockRepository.findVencidasNoLiberadasSinPedido(ahora)) {
            try {
                inventarioService.liberarReserva(reserva);
            } catch (Exception e) {
                log.error("No se pudo liberar la reserva {}", reserva.getId(), e);
            }
        }

        // Pedidos pendientes que ya no tienen stock reservado (por ejemplo, creados
        // antes de esta versión): se cierran igual para que no quede nada colgado.
        LocalDateTime limite = ahora.minusMinutes(
                InventarioService.TTL_RESERVA_MINUTOS + PagoService.GRACIA_SIN_CONCILIAR_MINUTOS);
        for (UUID pedidoId : pedidoRepository.findPendientesSinReservasActivas(limite)) {
            resolver(pedidoId);
        }
    }

    private void resolver(UUID pedidoId) {
        try {
            pagoService.resolverPedidoVencido(pedidoId);
        } catch (Exception e) {
            log.error("No se pudo resolver el pedido vencido {}: se reintenta en la próxima pasada", pedidoId, e);
        }
    }
}
