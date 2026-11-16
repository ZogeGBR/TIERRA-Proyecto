package com.tierra.ecommerce.service;

import com.tierra.ecommerce.dto.PedidoHistorialDTO;
import com.tierra.ecommerce.entity.Pedido;
import com.tierra.ecommerce.entity.PedidoItem;
import com.tierra.ecommerce.repository.PedidoItemRepository;
import com.tierra.ecommerce.repository.PedidoRepository;
import com.tierra.ecommerce.util.Ocultar;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.ZoneId;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

// "Mis pedidos" (tarea 19). Siempre los del cliente de la sesión: el id sale
// de la sesión, nunca de algo que mande el navegador (ADR 0005).
@Service
public class HistorialPedidosService {

    // Un cliente de una tienda como esta no llega a tantos pedidos; el tope
    // evita una respuesta sin límite. Si algún día hace falta, se pagina.
    static final int MAXIMO = 50;

    private final PedidoRepository pedidoRepository;
    private final PedidoItemRepository pedidoItemRepository;

    public HistorialPedidosService(PedidoRepository pedidoRepository, PedidoItemRepository pedidoItemRepository) {
        this.pedidoRepository = pedidoRepository;
        this.pedidoItemRepository = pedidoItemRepository;
    }

    // Dos consultas en total, sin importar cuántos pedidos haya: los pedidos y
    // todos sus ítems juntos.
    @Transactional(readOnly = true)
    public List<PedidoHistorialDTO> deCliente(UUID usuarioId) {
        List<Pedido> pedidos = pedidoRepository.findHistorial(usuarioId, PageRequest.of(0, MAXIMO));
        if (pedidos.isEmpty()) return List.of();

        Map<UUID, List<PedidoItem>> itemsPorPedido = pedidoItemRepository
                .findDePedidos(pedidos.stream().map(Pedido::getId).toList())
                .stream()
                .collect(Collectors.groupingBy(i -> i.getPedido().getId()));

        return pedidos.stream()
                .map(p -> aDTO(p, itemsPorPedido.getOrDefault(p.getId(), List.of())))
                .toList();
    }

    private static PedidoHistorialDTO aDTO(Pedido p, List<PedidoItem> items) {
        return new PedidoHistorialDTO(
                p.getId(),
                p.getEstado(),
                p.getCreadoEn().atZone(ZoneId.systemDefault()).toOffsetDateTime(),
                p.getTipoEntrega(),
                p.getDireccionEntrega(),
                p.getContactoNombre(),
                Ocultar.telefono(p.getContactoTelefono()),
                Ocultar.dni(p.getContactoDni()),
                p.getSubtotal(),
                p.getDescuento(),
                p.getCostoEnvio(),
                p.getTotal(),
                items.stream()
                        .map(i -> new PedidoHistorialDTO.Item(i.getNombreProducto(), i.getTalla(), i.getColor(),
                                i.getCantidad(), i.getPrecioUnitario()))
                        .toList());
    }
}
