package com.tierra.ecommerce.service;

import com.tierra.ecommerce.entity.Pedido;
import com.tierra.ecommerce.entity.ReservaStock;
import com.tierra.ecommerce.entity.VarianteProducto;
import com.tierra.ecommerce.exception.RecursoNoEncontradoException;
import com.tierra.ecommerce.exception.StockInsuficienteException;
import com.tierra.ecommerce.repository.ReservaStockRepository;
import com.tierra.ecommerce.repository.VarianteProductoRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

// Único módulo que puede modificar el stock de una variante — inventario
// exclusivo de la venta online (el local usa su propio sistema, Andino, y
// es intencional que no estén sincronizados).
@Service
public class InventarioService {

    private static final int TTL_RESERVA_MINUTOS = 20;

    private final VarianteProductoRepository varianteRepository;
    private final ReservaStockRepository reservaStockRepository;

    public InventarioService(VarianteProductoRepository varianteRepository,
                              ReservaStockRepository reservaStockRepository) {
        this.varianteRepository = varianteRepository;
        this.reservaStockRepository = reservaStockRepository;
    }

    // Paso 1 del checkout: reserva, no descuenta. El stock real no se toca;
    // solo sube stockReservado, y la reserva vence sola en 20 min si nadie
    // confirma el pago (ver ReservaStockLiberadorJob).
    @Transactional
    public ReservaStock reservarStock(UUID varianteId, int cantidad, Pedido pedido) {
        VarianteProducto variante = varianteRepository.findByIdConBloqueo(varianteId)
                .orElseThrow(() -> new RecursoNoEncontradoException("Variante no encontrada: " + varianteId));

        if (variante.getDisponible() < cantidad) {
            throw new StockInsuficienteException(
                    "Stock insuficiente para %s (talla %s, color %s): disponibles %d, se pidieron %d"
                            .formatted(variante.getProducto().getNombre(), variante.getTalla(),
                                    variante.getColor(), variante.getDisponible(), cantidad));
        }

        variante.setStockReservado(variante.getStockReservado() + cantidad);
        varianteRepository.save(variante);

        ReservaStock reserva = new ReservaStock();
        reserva.setVariante(variante);
        reserva.setPedido(pedido);
        reserva.setCantidad(cantidad);
        reserva.setExpiraEn(LocalDateTime.now().plusMinutes(TTL_RESERVA_MINUTOS));
        return reservaStockRepository.save(reserva);
    }

    // Paso 2, llamado desde PagoService.confirmarPago cuando Mercado Pago
    // aprueba el pago: convierte las reservas del pedido en un descuento
    // real de stock.
    @Transactional
    public void confirmarVenta(Pedido pedido) {
        List<ReservaStock> reservas = reservaStockRepository.findByPedidoId(pedido.getId());

        for (ReservaStock reserva : reservas) {
            if (reserva.isLiberada()) continue; // ya vencida o ya confirmada antes

            VarianteProducto variante = varianteRepository.findByIdConBloqueo(reserva.getVariante().getId())
                    .orElseThrow(() -> new RecursoNoEncontradoException("Variante no encontrada"));

            variante.setStock(variante.getStock() - reserva.getCantidad());
            variante.setStockReservado(variante.getStockReservado() - reserva.getCantidad());
            varianteRepository.save(variante);

            reserva.setLiberada(true);
            reservaStockRepository.save(reserva);
        }
    }

    // Libera una reserva sin vender: el carrito se abandonó, el pago falló
    // o venció el TTL. Solo baja stockReservado — el stock real nunca se
    // había tocado.
    @Transactional
    public void liberarReserva(ReservaStock reserva) {
        if (reserva.isLiberada()) return;

        VarianteProducto variante = varianteRepository.findByIdConBloqueo(reserva.getVariante().getId())
                .orElseThrow(() -> new RecursoNoEncontradoException("Variante no encontrada"));

        variante.setStockReservado(Math.max(0, variante.getStockReservado() - reserva.getCantidad()));
        varianteRepository.save(variante);

        reserva.setLiberada(true);
        reservaStockRepository.save(reserva);
    }

    // Ajuste manual de stock (alta de mercadería nueva para vender online,
    // corrección de un error de carga, etc.) — sin panel de administración
    // todavía, pero el método queda listo para cuando exista.
    @Transactional
    public void ajustarStock(UUID varianteId, int cantidadConSigno) {
        VarianteProducto variante = varianteRepository.findByIdConBloqueo(varianteId)
                .orElseThrow(() -> new RecursoNoEncontradoException("Variante no encontrada: " + varianteId));

        int nuevoStock = variante.getStock() + cantidadConSigno;
        if (nuevoStock < 0) {
            throw new StockInsuficienteException("El ajuste dejaría el stock en negativo");
        }
        variante.setStock(nuevoStock);
        varianteRepository.save(variante);
    }
}
