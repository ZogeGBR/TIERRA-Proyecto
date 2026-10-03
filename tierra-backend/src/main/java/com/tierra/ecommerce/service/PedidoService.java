package com.tierra.ecommerce.service;

import com.tierra.ecommerce.dto.CrearPedidoRequest;
import com.tierra.ecommerce.dto.ItemPedidoRequest;
import com.tierra.ecommerce.dto.PedidoResponseDTO;
import com.tierra.ecommerce.entity.*;
import com.tierra.ecommerce.enums.EstadoPedido;
import com.tierra.ecommerce.exception.RecursoNoEncontradoException;
import com.tierra.ecommerce.repository.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.UUID;

import com.tierra.ecommerce.enums.TipoEntrega;

// A partir de v2: este service YA NO descuenta stock directamente (ese
// era el bug de v1 — se descontaba antes de saber si el pago se iba a
// aprobar). Acá solo se RESERVA vía InventarioService.reservarStockWeb;
// el descuento real ocurre en PagoService.confirmarPago cuando Mercado
// Pago aprueba, o se libera si el pago falla o el pedido se abandona.
@Service
public class PedidoService {

    private final PedidoRepository pedidoRepository;
    private final PedidoItemRepository pedidoItemRepository;
    private final VarianteProductoRepository varianteRepository;
    private final UsuarioRepository usuarioRepository;
    private final DireccionRepository direccionRepository;
    private final CuponRepository cuponRepository;
    private final InventarioService inventarioService;

    public PedidoService(PedidoRepository pedidoRepository,
                          PedidoItemRepository pedidoItemRepository,
                          VarianteProductoRepository varianteRepository,
                          UsuarioRepository usuarioRepository,
                          DireccionRepository direccionRepository,
                          CuponRepository cuponRepository,
                          InventarioService inventarioService) {
        this.pedidoRepository = pedidoRepository;
        this.pedidoItemRepository = pedidoItemRepository;
        this.varianteRepository = varianteRepository;
        this.usuarioRepository = usuarioRepository;
        this.direccionRepository = direccionRepository;
        this.cuponRepository = cuponRepository;
        this.inventarioService = inventarioService;
    }

    // El usuarioId llega como parámetro y no dentro del request: sale de la
    // sesión, no del cuerpo que manda el cliente. El service no conoce a Spring
    // Security — el controller le pasa el id ya resuelto, y así esta clase
    // sigue siendo probable sin levantar un contexto web.
    @Transactional
    public PedidoResponseDTO crearPedido(UUID usuarioId, CrearPedidoRequest request) {
        Usuario usuario = usuarioRepository.findById(usuarioId)
                .orElseThrow(() -> new RecursoNoEncontradoException("Usuario no encontrado"));

        Pedido pedido = new Pedido();
        pedido.setUsuario(usuario);
        pedido.setTipoEntrega(request.tipoEntrega());

        if (request.tipoEntrega() == TipoEntrega.ENVIO_DOMICILIO) {
            if (request.direccionEnvioId() == null) {
                throw new IllegalArgumentException("La dirección de envío es obligatoria para envío a domicilio");
            }
            Direccion direccion = direccionRepository.findById(request.direccionEnvioId())
                    .orElseThrow(() -> new RecursoNoEncontradoException("Dirección de envío no encontrada"));

            // La dirección tiene que ser del usuario de la sesión. Responder
            // "no encontrada" en vez de "no es tuya" es deliberado: no le
            // confirma a nadie que el recurso existe.
            if (!direccion.getUsuario().getId().equals(usuario.getId())) {
                throw new RecursoNoEncontradoException("Dirección de envío no encontrada");
            }

            DireccionEntrega snapshot = new DireccionEntrega(
                    direccion.getCalle(),
                    direccion.getNumero(),
                    direccion.getCiudad(),
                    direccion.getProvincia(),
                    direccion.getCodigoPostal()
            );
            pedido.setDireccionEntrega(snapshot);
        } else {
            pedido.setDireccionEntrega(null);
        }

        pedido.setEstado(EstadoPedido.PENDIENTE);
        pedido.setSubtotal(BigDecimal.ZERO);
        pedido.setTotal(BigDecimal.ZERO);
        pedido = pedidoRepository.save(pedido);

        BigDecimal subtotal = BigDecimal.ZERO;

        for (ItemPedidoRequest itemReq : request.items()) {
            VarianteProducto variante = varianteRepository.findById(itemReq.varianteId())
                    .orElseThrow(() -> new RecursoNoEncontradoException("Variante no encontrada: " + itemReq.varianteId()));

            // Reserva (no descuenta) y lanza StockInsuficienteException si no alcanza.
            // El lock de fila ocurre adentro de reservarStockWeb.
            inventarioService.reservarStock(itemReq.varianteId(), itemReq.cantidad(), pedido);

            BigDecimal precioUnitario = variante.getProducto().getPrecio().add(variante.getPrecioAdicional());

            PedidoItem pedidoItem = new PedidoItem();
            pedidoItem.setPedido(pedido);
            pedidoItem.setVariante(variante);
            pedidoItem.setCantidad(itemReq.cantidad());
            pedidoItem.setPrecioUnitario(precioUnitario);
            pedidoItemRepository.save(pedidoItem);

            subtotal = subtotal.add(precioUnitario.multiply(BigDecimal.valueOf(itemReq.cantidad())));
        }

        BigDecimal descuento = calcularDescuento(request.codigoCupon(), subtotal);

        // Retirar en el local no cuesta nada. Antes se cobraba el envío igual,
        // sin mirar el tipo de entrega, mientras el frontend mostraba el total
        // sin él: el comprador veía un número y pagaba otro.
        //
        // El valor fijo de los envíos a domicilio sigue siendo de relleno. El
        // cálculo real depende de la definición de envíos que falta cerrar con
        // el cliente, y es trabajo de otra tarea.
        BigDecimal costoEnvio = request.tipoEntrega() == TipoEntrega.RETIRO_LOCAL
                ? BigDecimal.ZERO
                : BigDecimal.valueOf(12000); // TODO: cálculo real por código postal / transportista
        BigDecimal total = subtotal.subtract(descuento).add(costoEnvio).setScale(2, RoundingMode.HALF_UP);

        pedido.setSubtotal(subtotal);
        pedido.setDescuento(descuento);
        pedido.setCostoEnvio(costoEnvio);
        pedido.setTotal(total);
        pedido = pedidoRepository.save(pedido);

        return aResponseDTO(pedido);
    }

    private BigDecimal calcularDescuento(String codigoCupon, BigDecimal subtotal) {
        if (codigoCupon == null || codigoCupon.isBlank()) {
            return BigDecimal.ZERO;
        }
        Cupon cupon = cuponRepository.findByCodigo(codigoCupon)
                .orElseThrow(() -> new RecursoNoEncontradoException("Cupón inválido: " + codigoCupon));

        if (cupon.getUsosMaximos() != null && cupon.getUsosActuales() >= cupon.getUsosMaximos()) {
            throw new RecursoNoEncontradoException("El cupón " + codigoCupon + " ya alcanzó el máximo de usos");
        }

        if (cupon.getMontoDescuento() != null) {
            return cupon.getMontoDescuento();
        }
        if (cupon.getPorcentajeDescuento() != null) {
            return subtotal.multiply(cupon.getPorcentajeDescuento())
                    .divide(BigDecimal.valueOf(100), RoundingMode.HALF_UP);
        }
        return BigDecimal.ZERO;
    }

    private PedidoResponseDTO aResponseDTO(Pedido pedido) {
        return new PedidoResponseDTO(
                pedido.getId(), pedido.getTipoEntrega(), pedido.getDireccionEntrega(),
                pedido.getEstado(), pedido.getSubtotal(),
                pedido.getDescuento(), pedido.getCostoEnvio(), pedido.getTotal(), pedido.getCreadoEn()
        );
    }
}
