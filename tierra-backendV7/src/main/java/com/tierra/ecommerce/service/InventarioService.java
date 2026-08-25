package com.tierra.ecommerce.service;

import com.tierra.ecommerce.entity.*;
import com.tierra.ecommerce.enums.CanalVenta;
import com.tierra.ecommerce.enums.TipoMovimientoInventario;
import com.tierra.ecommerce.exception.RecursoNoEncontradoException;
import com.tierra.ecommerce.exception.StockInsuficienteException;
import com.tierra.ecommerce.repository.MovimientoInventarioRepository;
import com.tierra.ecommerce.repository.ReservaStockRepository;
import com.tierra.ecommerce.repository.VarianteProductoRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

// ÚNICO módulo del código que puede modificar stock_fisico / stock_reservado.
// Ningún otro service hace variante.setStockFisico(...) directamente — todo
// pasa por acá, y cada cambio queda respaldado por un movimiento en
// movimientos_inventario. Si algún día alguien encuentra un
// `varianteRepository.save()` que toca el stock fuera de esta clase,
// es un bug: se rompió la regla que hace que el libro sea confiable.
@Service
public class InventarioService {

    private static final int TTL_RESERVA_MINUTOS = 20;

    private final VarianteProductoRepository varianteRepository;
    private final MovimientoInventarioRepository movimientoRepository;
    private final ReservaStockRepository reservaStockRepository;

    public InventarioService(VarianteProductoRepository varianteRepository,
                              MovimientoInventarioRepository movimientoRepository,
                              ReservaStockRepository reservaStockRepository) {
        this.varianteRepository = varianteRepository;
        this.movimientoRepository = movimientoRepository;
        this.reservaStockRepository = reservaStockRepository;
    }

    // Paso 1 del checkout web: reserva, no descuenta. stock_fisico no se
    // toca; solo sube stock_reservado, y la reserva vence sola en 20 min
    // si nadie confirma el pago (ver ReservaStockLiberadorJob).
    @Transactional
    public ReservaStock reservarStockWeb(UUID varianteId, int cantidad, Pedido pedido) {
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
        reserva.setCanal(CanalVenta.WEB);
        reserva.setExpiraEn(LocalDateTime.now().plusMinutes(TTL_RESERVA_MINUTOS));
        return reservaStockRepository.save(reserva);
    }

    // Paso 2 del checkout web, llamado desde PagoService.confirmarPago
    // cuando Mercado Pago aprueba el pago: convierte las reservas del
    // pedido en un descuento real de stock_fisico, con su movimiento.
    // ubicacionDespacho es de dónde sale físicamente la mercadería (el
    // depósito, normalmente) — movimientos_inventario.ubicacion_id es
    // NOT NULL, así que toda venta necesita una ubicación de origen.
    @Transactional
    public void confirmarVentaWeb(Pedido pedido, Ubicacion ubicacionDespacho) {
        List<ReservaStock> reservas = reservaStockRepository.findByPedidoId(pedido.getId());

        for (ReservaStock reserva : reservas) {
            if (reserva.isLiberada()) continue; // ya vencida o ya confirmada antes

            VarianteProducto variante = varianteRepository.findByIdConBloqueo(reserva.getVariante().getId())
                    .orElseThrow(() -> new RecursoNoEncontradoException("Variante no encontrada"));

            variante.setStockFisico(variante.getStockFisico() - reserva.getCantidad());
            variante.setStockReservado(variante.getStockReservado() - reserva.getCantidad());
            varianteRepository.save(variante);

            registrarMovimiento(variante, ubicacionDespacho, -reserva.getCantidad(),
                    TipoMovimientoInventario.EGRESO_VENTA, CanalVenta.WEB, null, null, pedido);

            reserva.setLiberada(true);
            reservaStockRepository.save(reserva);
        }
    }

    // Libera una reserva sin vender: el carrito se abandonó, el pago
    // falló o venció el TTL. Solo baja stock_reservado — el stock físico
    // nunca se había tocado, así que no hay nada que revertir ahí.
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

    // Venta de mostrador: el producto está físicamente en la mano del
    // cliente, así que no hay reserva previa que confirmar — se descuenta
    // directo de stock_fisico. Puede dejar en negativo el "disponible"
    // de una reserva web activa; eso es aceptable (nunca se rechaza una
    // venta presencial por eso) pero debería alertar al operador — TODO:
    // agregar esa alerta cuando exista un canal de notificaciones internas.
    @Transactional
    public void venderDirectoLocal(UUID varianteId, int cantidad, Ubicacion ubicacion, Usuario vendedor, Pedido pedido) {
        VarianteProducto variante = varianteRepository.findByIdConBloqueo(varianteId)
                .orElseThrow(() -> new RecursoNoEncontradoException("Variante no encontrada: " + varianteId));

        if (variante.getStockFisico() < cantidad) {
            throw new StockInsuficienteException(
                    "No hay stock físico suficiente de %s (talla %s, color %s) en el local"
                            .formatted(variante.getProducto().getNombre(), variante.getTalla(), variante.getColor()));
        }

        variante.setStockFisico(variante.getStockFisico() - cantidad);
        varianteRepository.save(variante);

        registrarMovimiento(variante, ubicacion, -cantidad,
                TipoMovimientoInventario.EGRESO_VENTA, CanalVenta.LOCAL, vendedor, null, pedido);
    }

    // Recepción de mercadería nueva.
    @Transactional
    public void ingresoCompra(UUID varianteId, int cantidad, Ubicacion ubicacion, Usuario usuario) {
        VarianteProducto variante = varianteRepository.findByIdConBloqueo(varianteId)
                .orElseThrow(() -> new RecursoNoEncontradoException("Variante no encontrada: " + varianteId));

        variante.setStockFisico(variante.getStockFisico() + cantidad);
        varianteRepository.save(variante);

        registrarMovimiento(variante, ubicacion, cantidad,
                TipoMovimientoInventario.INGRESO_COMPRA, CanalVenta.ADMIN, usuario, "Recepción de mercadería", null);
    }

    // Ajuste manual desde el panel de administración. usuario y motivo
    // son obligatorios acá (no a nivel de columna NOT NULL en la base,
    // sino como regla de negocio) — es la única forma de que "ajuste" no
    // se convierta en el lugar por donde desaparece mercadería sin dejar rastro.
    @Transactional
    public void ajusteManual(UUID varianteId, int cantidadConSigno, Ubicacion ubicacion, Usuario usuario, String motivo) {
        if (usuario == null || motivo == null || motivo.isBlank()) {
            throw new IllegalArgumentException("Todo ajuste manual de stock requiere usuario y motivo");
        }

        VarianteProducto variante = varianteRepository.findByIdConBloqueo(varianteId)
                .orElseThrow(() -> new RecursoNoEncontradoException("Variante no encontrada: " + varianteId));

        int nuevoStock = variante.getStockFisico() + cantidadConSigno;
        if (nuevoStock < 0) {
            throw new StockInsuficienteException("El ajuste dejaría el stock físico en negativo");
        }

        variante.setStockFisico(nuevoStock);
        varianteRepository.save(variante);

        registrarMovimiento(variante, ubicacion, cantidadConSigno,
                TipoMovimientoInventario.AJUSTE, CanalVenta.ADMIN, usuario, motivo, null);
    }

    private void registrarMovimiento(VarianteProducto variante, Ubicacion ubicacion, int cantidad,
                                      TipoMovimientoInventario tipo, CanalVenta canal,
                                      Usuario usuario, String motivo, Pedido pedido) {
        MovimientoInventario movimiento = new MovimientoInventario();
        movimiento.setVariante(variante);
        movimiento.setUbicacion(ubicacion);
        movimiento.setCantidad(cantidad);
        movimiento.setTipo(tipo);
        movimiento.setCanal(canal);
        movimiento.setUsuario(usuario);
        movimiento.setMotivo(motivo);
        movimiento.setReferenciaPedido(pedido);
        movimientoRepository.save(movimiento);
    }
}
