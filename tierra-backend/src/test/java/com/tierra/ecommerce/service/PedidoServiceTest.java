package com.tierra.ecommerce.service;

import com.tierra.ecommerce.dto.ItemPedidoRequest;
import com.tierra.ecommerce.entity.*;
import com.tierra.ecommerce.enums.EstadoPedido;
import com.tierra.ecommerce.enums.TipoEntrega;
import com.tierra.ecommerce.exception.RecursoNoEncontradoException;
import com.tierra.ecommerce.repository.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class PedidoServiceTest {

    @Mock private PedidoRepository pedidoRepository;
    @Mock private PedidoItemRepository pedidoItemRepository;
    @Mock private VarianteProductoRepository varianteRepository;
    @Mock private ReservaStockRepository reservaStockRepository;
    @Mock private InventarioService inventarioService;
    @Mock private EnvioService envioService;
    @InjectMocks private PedidoService pedidoService;

    private Usuario cliente;
    private VarianteProducto variante;
    private List<ItemPedidoRequest> items;
    private DireccionEntrega direccion;

    @BeforeEach
    void setUp() {
        cliente = new Usuario();
        cliente.setId(UUID.randomUUID());
        cliente.setNombre("Juan Perez");
        cliente.setEmail("juan@example.com");

        Producto producto = new Producto();
        producto.setId(UUID.randomUUID());
        producto.setNombre("Carpa");
        producto.setPrecio(BigDecimal.valueOf(50000));
        producto.setActivo(true);
        variante = new VarianteProducto();
        variante.setId(UUID.randomUUID());
        variante.setProducto(producto);
        variante.setPrecioAdicional(BigDecimal.valueOf(2000));
        variante.setTalla("M");
        variante.setColor("Azul");
        items = List.of(new ItemPedidoRequest(variante.getId(), 2));

        direccion = new DireccionEntrega("Av. San Martín", "123", "2", "B", "Esquel", "Chubut", "9200");

        lenient().when(varianteRepository.findById(variante.getId())).thenReturn(Optional.of(variante));
        lenient().when(pedidoRepository.save(any(Pedido.class))).thenAnswer(i -> i.getArgument(0));
        lenient().when(envioService.costoParaPedido(eq(TipoEntrega.RETIRO_LOCAL), any(), any(), any())).thenReturn(BigDecimal.ZERO);
        lenient().when(envioService.costoParaPedido(eq(TipoEntrega.ENVIO_DOMICILIO), any(), any(), any())).thenReturn(new BigDecimal("12000"));
    }

    private NuevoPedido conEnvio() {
        return new NuevoPedido(TipoEntrega.ENVIO_DOMICILIO, direccion, "Ana Destinataria", "2945 123456", "30111222", items);
    }

    private NuevoPedido conRetiro() {
        return new NuevoPedido(TipoEntrega.RETIRO_LOCAL, null, "Ana Destinataria", "2945 123456", null, items);
    }

    // Lo que motiva la V10: el contacto y la dirección quedan copiados en el
    // pedido, no en la cuenta del cliente.
    @Test
    void elContactoYLaDireccionQuedanCopiadosEnElPedido() {
        Pedido pedido = pedidoService.crearPedido(cliente, conEnvio());

        assertEquals("Ana Destinataria", pedido.getContactoNombre());
        assertEquals("2945 123456", pedido.getContactoTelefono());
        assertEquals("30111222", pedido.getContactoDni());
        assertEquals("Av. San Martín", pedido.getDireccionEntrega().getCalle());
        assertEquals("2", pedido.getDireccionEntrega().getPiso());
        assertEquals("B", pedido.getDireccionEntrega().getDepartamento());
        assertEquals("9200", pedido.getDireccionEntrega().getCodigoPostal());
        assertSame(cliente, pedido.getUsuario());
        // La cuenta no se toca: el teléfono y el DNI no pasan al usuario.
        assertNull(cliente.getTelefono());
        assertNull(cliente.getDni());
    }

    @Test
    void conRetiroNoHayDireccionNiDniYNoSeCobraEnvio() {
        Pedido pedido = pedidoService.crearPedido(cliente, conRetiro());

        assertNull(pedido.getDireccionEntrega());
        assertNull(pedido.getContactoDni());
        assertEquals(0, BigDecimal.ZERO.compareTo(pedido.getCostoEnvio()));
        assertEquals(0, new BigDecimal("104000").compareTo(pedido.getTotal()));
    }

    @Test
    void conRetiroSeDescartanDniYDireccionAunqueLleguen() {
        NuevoPedido conDatosDeMas = new NuevoPedido(TipoEntrega.RETIRO_LOCAL, direccion, "Ana", "2945 123456", "30111222", items);

        Pedido pedido = pedidoService.crearPedido(cliente, conDatosDeMas);

        assertNull(pedido.getDireccionEntrega());
        assertNull(pedido.getContactoDni());
    }

    @Test
    void elTotalSumaLosPreciosDeLasVariantesYElEnvioDeEnvioService() {
        Pedido pedido = pedidoService.crearPedido(cliente, conEnvio());

        verify(envioService).costoParaPedido(TipoEntrega.ENVIO_DOMICILIO, "Chubut", "9200", items);
        assertEquals(0, new BigDecimal("104000").compareTo(pedido.getSubtotal()));
        assertEquals(0, new BigDecimal("12000").compareTo(pedido.getCostoEnvio()));
        assertEquals(0, new BigDecimal("116000").compareTo(pedido.getTotal()));
        assertEquals(0, BigDecimal.ZERO.compareTo(pedido.getDescuento()));
        assertEquals(EstadoPedido.PENDIENTE, pedido.getEstado());
        verify(inventarioService).reservarStock(eq(variante.getId()), eq(2), any(Pedido.class));
    }

    // Un destino fuera de zona se rechaza ANTES de reservar stock.
    @Test
    void fueraDeCoberturaSeRechazaSinReservarStock() {
        when(envioService.costoParaPedido(eq(TipoEntrega.ENVIO_DOMICILIO), any(), any(), any()))
                .thenThrow(new IllegalArgumentException("Por ahora enviamos a domicilio solo a ..."));

        assertThrows(IllegalArgumentException.class, () -> pedidoService.crearPedido(cliente, conEnvio()));

        verify(inventarioService, never()).reservarStock(any(), anyInt(), any());
        verify(pedidoRepository, never()).save(any());
    }

    @Test
    void unaVarianteDeUnProductoInactivoNoSePuedeComprar() {
        variante.getProducto().setActivo(false);

        assertThrows(RecursoNoEncontradoException.class, () -> pedidoService.crearPedido(cliente, conRetiro()));
        verify(inventarioService, never()).reservarStock(any(), anyInt(), any());
    }

    // ---------- Cancelar cuando falla el link de pago ----------

    @Test
    void cancelarSinLinkLiberaElStockYCancelaElPedido() {
        Pedido pedido = new Pedido();
        pedido.setId(UUID.randomUUID());
        pedido.setEstado(EstadoPedido.PENDIENTE);
        ReservaStock r1 = new ReservaStock();
        ReservaStock r2 = new ReservaStock();
        when(pedidoRepository.findByIdConBloqueo(pedido.getId())).thenReturn(Optional.of(pedido));
        when(reservaStockRepository.findByPedidoId(pedido.getId())).thenReturn(List.of(r1, r2));

        pedidoService.cancelarSinLinkDePago(pedido.getId());

        verify(inventarioService).liberarReserva(r1);
        verify(inventarioService).liberarReserva(r2);
        assertEquals(EstadoPedido.CANCELADO, pedido.getEstado());
    }

    @Test
    void cancelarSinLinkNoTocaUnPedidoQueYaNoEstaPendiente() {
        Pedido pedido = new Pedido();
        pedido.setId(UUID.randomUUID());
        pedido.setEstado(EstadoPedido.PAGADO);
        when(pedidoRepository.findByIdConBloqueo(pedido.getId())).thenReturn(Optional.of(pedido));

        pedidoService.cancelarSinLinkDePago(pedido.getId());

        assertEquals(EstadoPedido.PAGADO, pedido.getEstado());
        verifyNoInteractions(inventarioService);
        verify(pedidoRepository, never()).save(any());
    }

    // V12: cada ítem guarda lo que se compró, no solo un puntero al producto.
    @Test
    void cadaItemGuardaUnaCopiaDelNombreTalleYColor() {
        pedidoService.crearPedido(cliente, conRetiro());

        org.mockito.ArgumentCaptor<PedidoItem> item = org.mockito.ArgumentCaptor.forClass(PedidoItem.class);
        verify(pedidoItemRepository).save(item.capture());
        assertEquals("Carpa", item.getValue().getNombreProducto());
        assertEquals("M", item.getValue().getTalla());
        assertEquals("Azul", item.getValue().getColor());
        assertEquals(0, new BigDecimal("52000").compareTo(item.getValue().getPrecioUnitario()));
    }
}
