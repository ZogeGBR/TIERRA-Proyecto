package com.tierra.ecommerce.service;

import com.tierra.ecommerce.dto.CrearVentaLocalRequest;
import com.tierra.ecommerce.dto.ItemVentaLocalRequest;
import com.tierra.ecommerce.dto.PagoVentaLocalRequest;
import com.tierra.ecommerce.dto.VentaLocalResponseDTO;
import com.tierra.ecommerce.entity.*;
import com.tierra.ecommerce.enums.CanalVenta;
import com.tierra.ecommerce.enums.EstadoPago;
import com.tierra.ecommerce.enums.EstadoPedido;
import com.tierra.ecommerce.exception.RecursoNoEncontradoException;
import com.tierra.ecommerce.exception.SesionCajaInvalidaException;
import com.tierra.ecommerce.repository.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;

// Venta de mostrador: el producto está físicamente en la mano del
// cliente, así que a diferencia de PedidoService (canal web) esto NO
// pasa por una reserva — se descuenta stock directo a través de
// InventarioService.venderDirectoLocal, en la misma transacción que crea
// el pedido. La consistencia entre canales sale gratis: no hay dos
// inventarios que sincronizar, hay una sola base y una sola transacción.
@Service
public class VentaLocalService {

    private final SesionCajaRepository sesionCajaRepository;
    private final VarianteProductoRepository varianteRepository;
    private final PedidoRepository pedidoRepository;
    private final PedidoItemRepository pedidoItemRepository;
    private final PagoRepository pagoRepository;
    private final InventarioService inventarioService;

    public VentaLocalService(SesionCajaRepository sesionCajaRepository,
                              VarianteProductoRepository varianteRepository,
                              PedidoRepository pedidoRepository,
                              PedidoItemRepository pedidoItemRepository,
                              PagoRepository pagoRepository,
                              InventarioService inventarioService) {
        this.sesionCajaRepository = sesionCajaRepository;
        this.varianteRepository = varianteRepository;
        this.pedidoRepository = pedidoRepository;
        this.pedidoItemRepository = pedidoItemRepository;
        this.pagoRepository = pagoRepository;
        this.inventarioService = inventarioService;
    }

    @Transactional
    public VentaLocalResponseDTO registrarVenta(CrearVentaLocalRequest request) {
        SesionCaja sesion = sesionCajaRepository.findById(request.sesionCajaId())
                .orElseThrow(() -> new RecursoNoEncontradoException("Sesión de caja no encontrada"));

        if (sesion.getEstado().name().equals("CERRADA")) {
            throw new SesionCajaInvalidaException("No se puede vender con la caja cerrada");
        }

        Pedido pedido = new Pedido();
        pedido.setCanal(CanalVenta.LOCAL);
        pedido.setUbicacion(sesion.getUbicacion());
        pedido.setSesionCaja(sesion);
        pedido.setEstado(EstadoPedido.PAGADO); // en el local se cobra antes de emitir el ticket
        pedido.setSubtotal(BigDecimal.ZERO);
        pedido.setTotal(BigDecimal.ZERO);
        pedido = pedidoRepository.save(pedido);

        BigDecimal subtotal = BigDecimal.ZERO;

        for (ItemVentaLocalRequest itemReq : request.items()) {
            VarianteProducto variante = varianteRepository.findById(itemReq.varianteId())
                    .orElseThrow(() -> new RecursoNoEncontradoException("Variante no encontrada: " + itemReq.varianteId()));

            // Descuenta directo — sin reserva previa — y registra el movimiento.
            inventarioService.venderDirectoLocal(
                    itemReq.varianteId(), itemReq.cantidad(), sesion.getUbicacion(), sesion.getUsuario(), pedido);

            BigDecimal precioUnitario = variante.getProducto().getPrecio().add(variante.getPrecioAdicional());

            PedidoItem pedidoItem = new PedidoItem();
            pedidoItem.setPedido(pedido);
            pedidoItem.setVariante(variante);
            pedidoItem.setCantidad(itemReq.cantidad());
            pedidoItem.setPrecioUnitario(precioUnitario);
            pedidoItemRepository.save(pedidoItem);

            subtotal = subtotal.add(precioUnitario.multiply(BigDecimal.valueOf(itemReq.cantidad())));
        }

        registrarPagos(request.pagos(), pedido, subtotal);

        pedido.setSubtotal(subtotal);
        pedido.setTotal(subtotal);
        pedido = pedidoRepository.save(pedido);

        return new VentaLocalResponseDTO(pedido.getId(), pedido.getEstado(), pedido.getTotal());
    }

    // Permite medios combinados (ej. efectivo + tarjeta) en una sola venta.
    // El cobro con tarjeta en sí ocurre en la terminal Point, fuera del
    // software — acá solo se registra que hubo un cobro por tal monto.
    private void registrarPagos(List<PagoVentaLocalRequest> pagosReq, Pedido pedido, BigDecimal totalEsperado) {
        BigDecimal sumaPagos = pagosReq.stream().map(PagoVentaLocalRequest::monto).reduce(BigDecimal.ZERO, BigDecimal::add);
        if (sumaPagos.compareTo(totalEsperado) < 0) {
            throw new IllegalArgumentException("Los pagos registrados (%s) no cubren el subtotal (%s)"
                    .formatted(sumaPagos, totalEsperado));
        }

        for (PagoVentaLocalRequest pagoReq : pagosReq) {
            Pago pago = new Pago();
            pago.setPedido(pedido);
            pago.setMetodo(pagoReq.metodo());
            pago.setEstado(EstadoPago.APROBADO); // presencial: ya se cobró antes de registrar
            pago.setMonto(pagoReq.monto());
            pagoRepository.save(pago);
        }
    }
}
