package com.tierra.ecommerce.service;

import com.tierra.ecommerce.dto.*;
import com.tierra.ecommerce.entity.Direccion;
import com.tierra.ecommerce.entity.Usuario;
import com.tierra.ecommerce.enums.TipoEntrega;
import com.tierra.ecommerce.exception.CuentaExistenteException;
import com.tierra.ecommerce.repository.DireccionRepository;
import com.tierra.ecommerce.repository.UsuarioRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

// Ver docs/decisiones/0005-checkout-invitado-cuenta-implicita.md para el
// contexto completo. Mismo patrón que PedidoServiceTest: PedidoService se
// mockea acá porque su propio comportamiento (reserva de stock, cálculo de
// envío, cupón) ya está cubierto en PedidoServiceTest -- acá sólo interesa
// que CheckoutService lo llame con los datos correctos.
@ExtendWith(MockitoExtension.class)
class CheckoutServiceTest {

    @Mock
    private UsuarioRepository usuarioRepository;
    @Mock
    private DireccionRepository direccionRepository;
    @Mock
    private PasswordEncoder passwordEncoder;
    @Mock
    private PedidoService pedidoService;

    @InjectMocks
    private CheckoutService checkoutService;

    private UUID varianteId;
    private List<ItemPedidoRequest> items;
    private PedidoResponseDTO pedidoRespuesta;

    @BeforeEach
    void setUp() {
        varianteId = UUID.randomUUID();
        items = List.of(new ItemPedidoRequest(varianteId, 1));
        pedidoRespuesta = new PedidoResponseDTO(
                UUID.randomUUID(), TipoEntrega.RETIRO_LOCAL, null, null,
                BigDecimal.TEN, BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.TEN, LocalDateTime.now());
    }

    // --- Sin sesión, email nuevo: crea la cuenta implícita ---

    @Test
    void procesar_sinSesion_emailNuevo_creaCuentaImplicitaYAbreSesion() {
        when(usuarioRepository.findByEmail("juan@example.com")).thenReturn(Optional.empty());
        when(passwordEncoder.encode(anyString())).thenReturn("hash-bcrypt-simulado");
        when(usuarioRepository.save(any(Usuario.class))).thenAnswer(invocation -> {
            Usuario u = invocation.getArgument(0);
            u.setId(UUID.randomUUID());
            return u;
        });
        when(pedidoService.crearPedido(any(UUID.class), any(CrearPedidoRequest.class))).thenReturn(pedidoRespuesta);

        CheckoutRequest request = new CheckoutRequest(
                "Juan Pérez", "juan@example.com", "30123456", null,
                TipoEntrega.RETIRO_LOCAL, null, null, items);

        ResultadoCheckout resultado = checkoutService.procesar(null, request);

        assertFalse(resultado.sesionYaExistia());
        assertNotNull(resultado.usuario().getId());
        assertEquals("juan@example.com", resultado.usuario().getEmail());

        // La contraseña nunca es la que escribió nadie: se generó sola y se
        // hasheó antes de guardarse. No hay forma de leerla de vuelta.
        ArgumentCaptor<Usuario> captor = ArgumentCaptor.forClass(Usuario.class);
        verify(usuarioRepository).save(captor.capture());
        assertEquals("hash-bcrypt-simulado", captor.getValue().getPasswordHash());
        assertEquals("30123456", captor.getValue().getDni());

        verify(pedidoService).crearPedido(eq(resultado.usuario().getId()), any(CrearPedidoRequest.class));
    }

    // --- Sin sesión, email ya registrado: rechaza, no crea nada ---

    @Test
    void procesar_sinSesion_emailYaExiste_lanzaCuentaExistenteException_yNoCreaPedido() {
        Usuario existente = new Usuario();
        existente.setId(UUID.randomUUID());
        existente.setEmail("juan@example.com");
        when(usuarioRepository.findByEmail("juan@example.com")).thenReturn(Optional.of(existente));

        CheckoutRequest request = new CheckoutRequest(
                "Juan Pérez", "juan@example.com", "30123456", null,
                TipoEntrega.RETIRO_LOCAL, null, null, items);

        assertThrows(CuentaExistenteException.class, () -> checkoutService.procesar(null, request));

        // Ni se guarda un usuario nuevo ni se crea el pedido: el checkout
        // se corta ahí, no sigue "por las dudas" con la cuenta existente.
        verify(usuarioRepository, never()).save(any());
        verify(pedidoService, never()).crearPedido(any(), any());
    }

    // --- Con sesión: usa el usuario de la sesión, ignora el resto ---

    @Test
    void procesar_conSesion_usaUsuarioDeLaSesion_noValidaEmailNiCreaCuenta() {
        UUID usuarioIdSesion = UUID.randomUUID();
        Usuario usuarioSesion = new Usuario();
        usuarioSesion.setId(usuarioIdSesion);
        usuarioSesion.setEmail("existente@tierra.esquel");
        when(usuarioRepository.findById(usuarioIdSesion)).thenReturn(Optional.of(usuarioSesion));
        when(pedidoService.crearPedido(eq(usuarioIdSesion), any(CrearPedidoRequest.class))).thenReturn(pedidoRespuesta);

        // nombre/email/dni vacíos a propósito: es exactamente lo que manda
        // el frontend cuando ya hay sesión (ver checkout/page.tsx) y tienen
        // que ser irrelevantes -- no se debe intentar crear ni validar nada
        // con ellos.
        CheckoutRequest request = new CheckoutRequest(
                null, null, null, null,
                TipoEntrega.RETIRO_LOCAL, null, null, items);

        ResultadoCheckout resultado = checkoutService.procesar(usuarioIdSesion, request);

        assertTrue(resultado.sesionYaExistia());
        assertEquals(usuarioIdSesion, resultado.usuario().getId());
        verify(usuarioRepository, never()).findByEmail(any());
        verify(usuarioRepository, never()).save(any());
    }

    // --- Validaciones de campos obligatorios para cuenta nueva ---

    @Test
    void procesar_sinSesion_sinNombre_lanzaIllegalArgumentException() {
        CheckoutRequest request = new CheckoutRequest(
                null, "juan@example.com", "30123456", null,
                TipoEntrega.RETIRO_LOCAL, null, null, items);

        assertThrows(IllegalArgumentException.class, () -> checkoutService.procesar(null, request));
        verify(usuarioRepository, never()).save(any());
    }

    @Test
    void procesar_sinSesion_sinDni_lanzaIllegalArgumentException() {
        CheckoutRequest request = new CheckoutRequest(
                "Juan Pérez", "juan@example.com", null, null,
                TipoEntrega.RETIRO_LOCAL, null, null, items);

        assertThrows(IllegalArgumentException.class, () -> checkoutService.procesar(null, request));
        verify(usuarioRepository, never()).save(any());
    }

    // --- Dirección para envío a domicilio ---

    @Test
    void procesar_envioDomicilio_sinDireccion_lanzaIllegalArgumentException() {
        when(usuarioRepository.findByEmail("juan@example.com")).thenReturn(Optional.empty());
        when(passwordEncoder.encode(anyString())).thenReturn("hash");
        when(usuarioRepository.save(any(Usuario.class))).thenAnswer(invocation -> {
            Usuario u = invocation.getArgument(0);
            u.setId(UUID.randomUUID());
            return u;
        });

        CheckoutRequest request = new CheckoutRequest(
                "Juan Pérez", "juan@example.com", "30123456", null,
                TipoEntrega.ENVIO_DOMICILIO, null, null, items);

        assertThrows(IllegalArgumentException.class, () -> checkoutService.procesar(null, request));
        verify(direccionRepository, never()).save(any());
    }

    @Test
    void procesar_envioDomicilio_primeraDireccionDelUsuario_quedaComoPredeterminada() {
        UUID usuarioIdSesion = UUID.randomUUID();
        Usuario usuarioSesion = new Usuario();
        usuarioSesion.setId(usuarioIdSesion);
        when(usuarioRepository.findById(usuarioIdSesion)).thenReturn(Optional.of(usuarioSesion));
        when(direccionRepository.existsByUsuarioId(usuarioIdSesion)).thenReturn(false);
        when(direccionRepository.save(any(Direccion.class))).thenAnswer(invocation -> {
            Direccion d = invocation.getArgument(0);
            d.setId(UUID.randomUUID());
            return d;
        });
        when(pedidoService.crearPedido(eq(usuarioIdSesion), any(CrearPedidoRequest.class))).thenReturn(pedidoRespuesta);

        DireccionCheckoutRequest direccion = new DireccionCheckoutRequest(
                "Av. Fontana", "482", "Esquel", "Chubut", "9200");
        CheckoutRequest request = new CheckoutRequest(
                null, null, null, null,
                TipoEntrega.ENVIO_DOMICILIO, direccion, null, items);

        checkoutService.procesar(usuarioIdSesion, request);

        ArgumentCaptor<Direccion> captor = ArgumentCaptor.forClass(Direccion.class);
        verify(direccionRepository).save(captor.capture());
        assertTrue(captor.getValue().isEsPredeterminada());
        assertEquals("Av. Fontana", captor.getValue().getCalle());
    }

    @Test
    void procesar_envioDomicilio_segundaDireccionDelUsuario_noQuedaComoPredeterminada() {
        UUID usuarioIdSesion = UUID.randomUUID();
        Usuario usuarioSesion = new Usuario();
        usuarioSesion.setId(usuarioIdSesion);
        when(usuarioRepository.findById(usuarioIdSesion)).thenReturn(Optional.of(usuarioSesion));
        when(direccionRepository.existsByUsuarioId(usuarioIdSesion)).thenReturn(true);
        when(direccionRepository.save(any(Direccion.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(pedidoService.crearPedido(eq(usuarioIdSesion), any(CrearPedidoRequest.class))).thenReturn(pedidoRespuesta);

        DireccionCheckoutRequest direccion = new DireccionCheckoutRequest(
                "Otra calle", null, "Esquel", "Chubut", "9200");
        CheckoutRequest request = new CheckoutRequest(
                null, null, null, null,
                TipoEntrega.ENVIO_DOMICILIO, direccion, null, items);

        checkoutService.procesar(usuarioIdSesion, request);

        ArgumentCaptor<Direccion> captor = ArgumentCaptor.forClass(Direccion.class);
        verify(direccionRepository).save(captor.capture());
        assertFalse(captor.getValue().isEsPredeterminada());
    }
}
