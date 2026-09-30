package com.tierra.ecommerce.service;

import com.tierra.ecommerce.dto.CrearPedidoRequest;
import com.tierra.ecommerce.dto.ItemPedidoRequest;
import com.tierra.ecommerce.dto.PedidoResponseDTO;
import com.tierra.ecommerce.entity.*;
import com.tierra.ecommerce.enums.TipoEntrega;
import com.tierra.ecommerce.exception.RecursoNoEncontradoException;
import com.tierra.ecommerce.repository.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class PedidoServiceTest {

    @Mock
    private PedidoRepository pedidoRepository;
    @Mock
    private PedidoItemRepository pedidoItemRepository;
    @Mock
    private VarianteProductoRepository varianteRepository;
    @Mock
    private UsuarioRepository usuarioRepository;
    @Mock
    private DireccionRepository direccionRepository;
    @Mock
    private CuponRepository cuponRepository;
    @Mock
    private InventarioService inventarioService;

    @InjectMocks
    private PedidoService pedidoService;

    private Usuario usuario;
    private Direccion direccion;
    private VarianteProducto variante;
    private UUID usuarioId;
    private UUID direccionId;
    private UUID varianteId;

    @BeforeEach
    void setUp() {
        usuarioId = UUID.randomUUID();
        direccionId = UUID.randomUUID();
        varianteId = UUID.randomUUID();

        usuario = new Usuario();
        usuario.setId(usuarioId);
        usuario.setNombre("Juan Perez");
        usuario.setEmail("juan@example.com");

        direccion = new Direccion();
        direccion.setId(direccionId);
        direccion.setUsuario(usuario);
        direccion.setCalle("Av. San Martín");
        direccion.setNumero("123");
        direccion.setCiudad("Esquel");
        direccion.setProvincia("Chubut");
        direccion.setCodigoPostal("9200");

        Producto producto = new Producto();
        producto.setId(UUID.randomUUID());
        producto.setNombre("Carpa");
        producto.setPrecio(BigDecimal.valueOf(50000));

        variante = new VarianteProducto();
        variante.setId(varianteId);
        variante.setProducto(producto);
        variante.setPrecioAdicional(BigDecimal.ZERO);
    }

    @Test
    void crearPedido_conEnvioDomicilio_copiaDireccionSnapshot() {
        when(usuarioRepository.findById(usuarioId)).thenReturn(Optional.of(usuario));
        when(direccionRepository.findById(direccionId)).thenReturn(Optional.of(direccion));
        when(varianteRepository.findById(varianteId)).thenReturn(Optional.of(variante));
        when(pedidoRepository.save(any(Pedido.class))).thenAnswer(invocation -> invocation.getArgument(0));

        CrearPedidoRequest request = new CrearPedidoRequest(
                TipoEntrega.ENVIO_DOMICILIO,
                direccionId,
                null,
                List.of(new ItemPedidoRequest(varianteId, 1))
        );

        PedidoResponseDTO response = pedidoService.crearPedido(usuarioId, request);

        assertNotNull(response);
        assertEquals(TipoEntrega.ENVIO_DOMICILIO, response.tipoEntrega());
        assertNotNull(response.direccionEntrega());
        assertEquals("Av. San Martín", response.direccionEntrega().getCalle());
        assertEquals("123", response.direccionEntrega().getNumero());
        assertEquals("Esquel", response.direccionEntrega().getCiudad());
        assertEquals("Chubut", response.direccionEntrega().getProvincia());
        assertEquals("9200", response.direccionEntrega().getCodigoPostal());

        ArgumentCaptor<Pedido> captor = ArgumentCaptor.forClass(Pedido.class);
        verify(pedidoRepository, atLeastOnce()).save(captor.capture());
        Pedido guardado = captor.getValue();
        assertEquals(TipoEntrega.ENVIO_DOMICILIO, guardado.getTipoEntrega());
        assertNotNull(guardado.getDireccionEntrega());
        assertEquals("Av. San Martín", guardado.getDireccionEntrega().getCalle());
    }

    @Test
    void crearPedido_conRetiroLocal_sinDireccion() {
        when(usuarioRepository.findById(usuarioId)).thenReturn(Optional.of(usuario));
        when(varianteRepository.findById(varianteId)).thenReturn(Optional.of(variante));
        when(pedidoRepository.save(any(Pedido.class))).thenAnswer(invocation -> invocation.getArgument(0));

        CrearPedidoRequest request = new CrearPedidoRequest(
                TipoEntrega.RETIRO_LOCAL,
                null,
                null,
                List.of(new ItemPedidoRequest(varianteId, 1))
        );

        PedidoResponseDTO response = pedidoService.crearPedido(usuarioId, request);

        assertNotNull(response);
        assertEquals(TipoEntrega.RETIRO_LOCAL, response.tipoEntrega());
        assertNull(response.direccionEntrega());
        verify(direccionRepository, never()).findById(any());
    }

    @Test
    void crearPedido_conEnvioDomicilio_sinDireccion_lanzaIllegalArgumentException() {
        when(usuarioRepository.findById(usuarioId)).thenReturn(Optional.of(usuario));

        CrearPedidoRequest request = new CrearPedidoRequest(
                TipoEntrega.ENVIO_DOMICILIO,
                null,
                null,
                List.of(new ItemPedidoRequest(varianteId, 1))
        );

        assertThrows(IllegalArgumentException.class, () -> pedidoService.crearPedido(usuarioId, request));
    }

    @Test
    void crearPedido_conRetiroLocal_noCobraEnvio() {
        when(usuarioRepository.findById(usuarioId)).thenReturn(Optional.of(usuario));
        when(varianteRepository.findById(varianteId)).thenReturn(Optional.of(variante));
        when(pedidoRepository.save(any(Pedido.class))).thenAnswer(invocation -> invocation.getArgument(0));

        CrearPedidoRequest request = new CrearPedidoRequest(
                TipoEntrega.RETIRO_LOCAL,
                null,
                null,
                List.of(new ItemPedidoRequest(varianteId, 1))
        );

        PedidoResponseDTO response = pedidoService.crearPedido(usuarioId, request);

        // Antes se cobraba el envío igual, sin mirar el tipo de entrega,
        // mientras el frontend mostraba el total sin él.
        assertEquals(0, BigDecimal.ZERO.compareTo(response.costoEnvio()));
        assertEquals(0, response.subtotal().compareTo(response.total()));
    }

    @Test
    void crearPedido_conEnvioDomicilio_cobraEnvio() {
        when(usuarioRepository.findById(usuarioId)).thenReturn(Optional.of(usuario));
        when(direccionRepository.findById(direccionId)).thenReturn(Optional.of(direccion));
        when(varianteRepository.findById(varianteId)).thenReturn(Optional.of(variante));
        when(pedidoRepository.save(any(Pedido.class))).thenAnswer(invocation -> invocation.getArgument(0));

        CrearPedidoRequest request = new CrearPedidoRequest(
                TipoEntrega.ENVIO_DOMICILIO,
                direccionId,
                null,
                List.of(new ItemPedidoRequest(varianteId, 1))
        );

        PedidoResponseDTO response = pedidoService.crearPedido(usuarioId, request);

        assertTrue(response.costoEnvio().compareTo(BigDecimal.ZERO) > 0);
        assertEquals(0, response.subtotal().add(response.costoEnvio()).compareTo(response.total()));
    }

    // Este test pasó a cubrir un caso real. Antes el usuarioId venía dentro
    // del request, así que un atacante podía mandar el id de la víctima junto
    // con una dirección suya y la comparación daba verdadero. Ahora el id sale
    // de la sesión: lo único que puede mandar es la dirección, y no es suya.
    @Test
    void crearPedido_conDireccionDeOtroUsuario_lanzaRecursoNoEncontradoException() {
        Usuario otroUsuario = new Usuario();
        otroUsuario.setId(UUID.randomUUID());
        direccion.setUsuario(otroUsuario);

        when(usuarioRepository.findById(usuarioId)).thenReturn(Optional.of(usuario));
        when(direccionRepository.findById(direccionId)).thenReturn(Optional.of(direccion));

        CrearPedidoRequest request = new CrearPedidoRequest(
                TipoEntrega.ENVIO_DOMICILIO,
                direccionId,
                null,
                List.of(new ItemPedidoRequest(varianteId, 1))
        );

        assertThrows(RecursoNoEncontradoException.class, () -> pedidoService.crearPedido(usuarioId, request));
    }
}
