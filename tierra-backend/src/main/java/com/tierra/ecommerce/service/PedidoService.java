package com.tierra.ecommerce.service;

import com.tierra.ecommerce.dto.ItemPedidoRequest;
import com.tierra.ecommerce.entity.*;
import com.tierra.ecommerce.enums.EstadoPedido;
import com.tierra.ecommerce.enums.TipoEntrega;
import com.tierra.ecommerce.exception.RecursoNoEncontradoException;
import com.tierra.ecommerce.repository.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.UUID;

// Arma un pedido: copia el contacto y la dirección, calcula el costo del
// envío, reserva el stock y fija los precios. Lo llama solo CheckoutService,
// que es la única puerta para crear pedidos (ADR 0005).
//
// Este service NO descuenta stock: solo lo RESERVA vía InventarioService. El
// descuento real ocurre en PagoService.confirmarPago cuando Mercado Pago
// aprueba, o se libera si el pago falla o el pedido se abandona.
//
// Los cupones no se aplican en la Fase 2: el código que había no contaba los
// usos ni validaba fechas. Vuelven, corregidos, con la tarea 15 (Fase 3).
@Service
public class PedidoService {

    private final PedidoRepository pedidoRepository;
    private final PedidoItemRepository pedidoItemRepository;
    private final VarianteProductoRepository varianteRepository;
    private final ReservaStockRepository reservaStockRepository;
    private final InventarioService inventarioService;
    private final EnvioService envioService;

    public PedidoService(PedidoRepository pedidoRepository,
                         PedidoItemRepository pedidoItemRepository,
                         VarianteProductoRepository varianteRepository,
                         ReservaStockRepository reservaStockRepository,
                         InventarioService inventarioService,
                         EnvioService envioService) {
        this.pedidoRepository = pedidoRepository;
        this.pedidoItemRepository = pedidoItemRepository;
        this.varianteRepository = varianteRepository;
        this.reservaStockRepository = reservaStockRepository;
        this.inventarioService = inventarioService;
        this.envioService = envioService;
    }

    // El cliente llega ya resuelto (de la sesión o del email del checkout). El
    // service no conoce a Spring Security ni al request HTTP: así se prueba
    // sin levantar un contexto web.
    @Transactional
    public Pedido crearPedido(Usuario cliente, NuevoPedido datos) {
        boolean conEnvio = datos.tipoEntrega() == TipoEntrega.ENVIO_DOMICILIO;
        DireccionEntrega direccion = conEnvio ? datos.direccion() : null;

        // El costo del envío se calcula antes de reservar stock: un destino
        // fuera de zona se rechaza sin tocar el inventario. Es el mismo cálculo
        // que muestra la cotización (EnvioService), nunca un monto del request.
        BigDecimal costoEnvio = envioService.costoParaPedido(
                datos.tipoEntrega(),
                direccion == null ? null : direccion.getProvincia(),
                direccion == null ? null : direccion.getCodigoPostal(),
                datos.items());

        Pedido pedido = new Pedido();
        pedido.setUsuario(cliente);
        pedido.setTipoEntrega(datos.tipoEntrega());
        pedido.setDireccionEntrega(direccion);
        pedido.setContactoNombre(datos.contactoNombre());
        pedido.setContactoTelefono(datos.contactoTelefono());
        pedido.setContactoDni(conEnvio ? datos.contactoDni() : null);
        pedido.setEstado(EstadoPedido.PENDIENTE);
        pedido.setSubtotal(BigDecimal.ZERO);
        pedido.setTotal(BigDecimal.ZERO);
        pedido = pedidoRepository.save(pedido);

        BigDecimal subtotal = BigDecimal.ZERO;
        for (ItemPedidoRequest itemReq : datos.items()) {
            VarianteProducto variante = varianteRepository.findById(itemReq.varianteId())
                    .filter(v -> v.getProducto().isActivo())
                    .orElseThrow(() -> new RecursoNoEncontradoException("Variante no encontrada: " + itemReq.varianteId()));

            // Reserva (no descuenta) y lanza StockInsuficienteException si no
            // alcanza. El bloqueo de la fila ocurre adentro.
            inventarioService.reservarStock(itemReq.varianteId(), itemReq.cantidad(), pedido);

            BigDecimal precioUnitario = variante.getProducto().getPrecio().add(variante.getPrecioAdicional());

            PedidoItem pedidoItem = new PedidoItem();
            pedidoItem.setPedido(pedido);
            pedidoItem.setVariante(variante);
            pedidoItem.setCantidad(itemReq.cantidad());
            pedidoItem.setPrecioUnitario(precioUnitario);
            pedidoItem.setNombreProducto(variante.getProducto().getNombre());
            pedidoItem.setTalla(variante.getTalla());
            pedidoItem.setColor(variante.getColor());
            pedidoItemRepository.save(pedidoItem);

            subtotal = subtotal.add(precioUnitario.multiply(BigDecimal.valueOf(itemReq.cantidad())));
        }

        pedido.setSubtotal(subtotal);
        pedido.setDescuento(BigDecimal.ZERO);
        pedido.setCostoEnvio(costoEnvio);
        pedido.setTotal(subtotal.add(costoEnvio).setScale(2, RoundingMode.HALF_UP));
        return pedidoRepository.save(pedido);
    }

    // Cancela un pedido que no se puede pagar porque Mercado Pago no devolvió
    // el link, y libera su stock en el momento (ADR 0005). Sin esto, el stock
    // quedaría retenido veinte minutos por un pedido que nadie puede pagar, y
    // si era la última unidad el mismo comprador vería "sin stock" al
    // reintentar. Es seguro: sin link, nadie puede pagarlo.
    //
    // Solo actúa sobre un pedido PENDIENTE: si por algún motivo ya cambió de
    // estado, no lo toca.
    @Transactional
    public void cancelarSinLinkDePago(UUID pedidoId) {
        Pedido pedido = pedidoRepository.findByIdConBloqueo(pedidoId).orElse(null);
        if (pedido == null || pedido.getEstado() != EstadoPedido.PENDIENTE) {
            return;
        }
        for (ReservaStock reserva : reservaStockRepository.findByPedidoId(pedidoId)) {
            inventarioService.liberarReserva(reserva);
        }
        pedido.setEstado(EstadoPedido.CANCELADO);
        pedidoRepository.save(pedido);
    }
}
