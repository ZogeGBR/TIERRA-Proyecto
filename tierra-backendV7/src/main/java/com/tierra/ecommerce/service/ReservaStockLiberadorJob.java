package com.tierra.ecommerce.service;

import com.tierra.ecommerce.entity.ReservaStock;
import com.tierra.ecommerce.repository.ReservaStockRepository;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;

// Sin esto, un carrito abandonado (usuario cierra la pestaña antes de
// pagar) deja stock_reservado bloqueado para siempre — el "disponible"
// del catálogo iría bajando aunque nadie compre. Corre cada minuto y
// libera todo lo que venció sin confirmarse.
@Component
public class ReservaStockLiberadorJob {

    private final ReservaStockRepository reservaStockRepository;
    private final InventarioService inventarioService;

    public ReservaStockLiberadorJob(ReservaStockRepository reservaStockRepository,
                                     InventarioService inventarioService) {
        this.reservaStockRepository = reservaStockRepository;
        this.inventarioService = inventarioService;
    }

    @Scheduled(fixedRate = 60_000)
    public void liberarVencidas() {
        for (ReservaStock reserva : reservaStockRepository.findVencidasNoLiberadas(LocalDateTime.now())) {
            inventarioService.liberarReserva(reserva);
        }
    }
}
