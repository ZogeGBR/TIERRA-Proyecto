package com.tierra.ecommerce.service;

import com.tierra.ecommerce.dto.PedidoHistorialDTO;
import com.tierra.ecommerce.entity.DireccionEntrega;
import com.tierra.ecommerce.entity.Pedido;
import com.tierra.ecommerce.entity.PedidoItem;
import com.tierra.ecommerce.enums.EstadoPedido;
import com.tierra.ecommerce.enums.TipoEntrega;
import com.tierra.ecommerce.repository.PedidoItemRepository;
import com.tierra.ecommerce.repository.PedidoRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Pageable;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class HistorialPedidosServiceTest {

    @Mock private PedidoRepository pedidoRepository;
    @Mock private PedidoItemRepository pedidoItemRepository;
    @InjectMocks private HistorialPedidosService service;

    private final UUID cliente = UUID.randomUUID();

    private static Pedido pedido(TipoEntrega tipo) {
        Pedido p = new Pedido();
        p.setId(UUID.randomUUID());
        p.setEstado(EstadoPedido.PAGADO);
        p.setCreadoEn(LocalDateTime.of(2026, 11, 16, 10, 30));
        p.setTipoEntrega(tipo);
        p.setContactoNombre("Ana Destinataria");
        p.setContactoTelefono("+54 9 2945 123456");
        p.setContactoDni(tipo == TipoEntrega.ENVIO_DOMICILIO ? "30111222" : null);
        if (tipo == TipoEntrega.ENVIO_DOMICILIO) {
            p.setDireccionEntrega(new DireccionEntrega("San Martín", "123", "2", "B", "Esquel", "Chubut", "9200"));
        }
        p.setSubtotal(new BigDecimal("89990"));
        p.setDescuento(BigDecimal.ZERO);
        p.setCostoEnvio(new BigDecimal("12000"));
        p.setTotal(new BigDecimal("101990"));
        return p;
    }

    private static PedidoItem item(Pedido p, String nombre, String talla, String color) {
        PedidoItem i = new PedidoItem();
        i.setPedido(p);
        i.setNombreProducto(nombre);
        i.setTalla(talla);
        i.setColor(color);
        i.setCantidad(2);
        i.setPrecioUnitario(new BigDecimal("44995"));
        return i;
    }

    @Test
    void elDniYElTelefonoSalenOcultosYLaDireccionCompleta() {
        Pedido p = pedido(TipoEntrega.ENVIO_DOMICILIO);
        when(pedidoRepository.findHistorial(eq(cliente), any())).thenReturn(List.of(p));
        when(pedidoItemRepository.findDePedidos(any())).thenReturn(List.of(item(p, "Mochila", "Único", "Verde")));

        PedidoHistorialDTO dto = service.deCliente(cliente).get(0);

        assertEquals("***.***.222", dto.contactoDni());
        assertEquals("••• 3456", dto.contactoTelefono());
        assertEquals("Ana Destinataria", dto.contactoNombre());
        assertEquals("2", dto.direccionEntrega().getPiso());
        assertEquals("B", dto.direccionEntrega().getDepartamento());
        assertEquals(0, new BigDecimal("101990").compareTo(dto.total()));
        assertEquals(EstadoPedido.PAGADO, dto.estado());
        // Con zona horaria: el navegador no tiene que adivinarla.
        assertNotNull(dto.creadoEn().getOffset());
        assertEquals(LocalDateTime.of(2026, 11, 16, 10, 30), dto.creadoEn().toLocalDateTime());
    }

    @Test
    void losItemsSonLaCopiaGuardadaYVanConSuPedido() {
        Pedido a = pedido(TipoEntrega.RETIRO_LOCAL);
        Pedido b = pedido(TipoEntrega.ENVIO_DOMICILIO);
        when(pedidoRepository.findHistorial(eq(cliente), any())).thenReturn(List.of(a, b));
        when(pedidoItemRepository.findDePedidos(any())).thenReturn(List.of(
                item(a, "Carpa", null, null), item(b, "Campera", "M", "Azul"), item(b, "Gorro", "Único", "Rojo")));

        List<PedidoHistorialDTO> historial = service.deCliente(cliente);

        assertEquals(List.of("Carpa"), historial.get(0).items().stream().map(PedidoHistorialDTO.Item::nombreProducto).toList());
        assertEquals(List.of("Campera", "Gorro"), historial.get(1).items().stream().map(PedidoHistorialDTO.Item::nombreProducto).toList());
        PedidoHistorialDTO.Item campera = historial.get(1).items().get(0);
        assertEquals("M", campera.talla());
        assertEquals("Azul", campera.color());
        assertEquals(2, campera.cantidad());
        // Con retiro no hay DNI ni dirección.
        assertNull(historial.get(0).contactoDni());
        assertNull(historial.get(0).direccionEntrega());
    }

    @Test
    void todosLosItemsSePidenEnUnaSolaConsulta() {
        Pedido a = pedido(TipoEntrega.RETIRO_LOCAL);
        Pedido b = pedido(TipoEntrega.RETIRO_LOCAL);
        when(pedidoRepository.findHistorial(eq(cliente), any())).thenReturn(List.of(a, b));
        when(pedidoItemRepository.findDePedidos(any())).thenReturn(List.of());

        service.deCliente(cliente);

        @SuppressWarnings("unchecked")
        ArgumentCaptor<Collection<UUID>> ids = ArgumentCaptor.forClass(Collection.class);
        verify(pedidoItemRepository, times(1)).findDePedidos(ids.capture());
        assertEquals(List.of(a.getId(), b.getId()), List.copyOf(ids.getValue()));
    }

    @Test
    void pideComoMaximoCincuentaYSoloDelClienteDeLaSesion() {
        when(pedidoRepository.findHistorial(eq(cliente), any())).thenReturn(List.of());

        service.deCliente(cliente);

        ArgumentCaptor<Pageable> pagina = ArgumentCaptor.forClass(Pageable.class);
        verify(pedidoRepository).findHistorial(eq(cliente), pagina.capture());
        assertEquals(0, pagina.getValue().getPageNumber());
        assertEquals(50, pagina.getValue().getPageSize());
    }

    @Test
    void sinPedidosDevuelveUnaListaVaciaSinBuscarItems() {
        when(pedidoRepository.findHistorial(eq(cliente), any())).thenReturn(List.of());

        assertTrue(service.deCliente(cliente).isEmpty());
        verifyNoInteractions(pedidoItemRepository);
    }
}
