package com.tierra.ecommerce.service;

import com.tierra.ecommerce.dto.CheckoutRequest;
import com.tierra.ecommerce.dto.CheckoutResponse;
import com.tierra.ecommerce.dto.ItemPedidoRequest;
import com.tierra.ecommerce.dto.PreferenciaPagoResponse;
import com.tierra.ecommerce.entity.Pedido;
import com.tierra.ecommerce.entity.Usuario;
import com.tierra.ecommerce.enums.RolUsuario;
import com.tierra.ecommerce.enums.TipoEntrega;
import com.tierra.ecommerce.exception.EmailDelEquipoException;
import com.tierra.ecommerce.exception.LinkDePagoNoDisponibleException;
import com.tierra.ecommerce.repository.UsuarioRepository;
import com.tierra.ecommerce.security.UsuarioAutenticado;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.SimpleTransactionStatus;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class CheckoutServiceTest {

    @Mock private UsuarioRepository usuarioRepository;
    @Mock private PedidoService pedidoService;
    @Mock private PagoService pagoService;
    @Mock private PlatformTransactionManager transactionManager;

    private CheckoutService checkoutService;

    private static final String EMAIL = "ana@example.com";
    private static final OffsetDateTime VENCE = OffsetDateTime.parse("2026-11-16T12:20:00Z");
    private final List<ItemPedidoRequest> items = List.of(new ItemPedidoRequest(UUID.randomUUID(), 1));

    @BeforeEach
    void setUp() {
        checkoutService = new CheckoutService(usuarioRepository, pedidoService, pagoService, transactionManager);
        lenient().when(transactionManager.getTransaction(any())).thenReturn(new SimpleTransactionStatus());
        lenient().when(pedidoService.crearPedido(any(), any())).thenAnswer(i -> {
            Pedido p = new Pedido();
            p.setId(UUID.randomUUID());
            p.setUsuario(i.getArgument(0));
            p.setTotal(new BigDecimal("62000"));
            return p;
        });
        lenient().when(pagoService.crearPreferenciaPago(any(), any()))
                .thenReturn(new PreferenciaPagoResponse("pref-1", "https://www.mercadopago.com.ar/checkout/x", VENCE));
    }

    private static Usuario usuario(String email, RolUsuario rol) {
        Usuario u = new Usuario();
        u.setId(UUID.randomUUID());
        u.setNombre("Alguien");
        u.setEmail(email);
        u.setRol(rol);
        return u;
    }

    private CheckoutRequest conRetiro(String email) {
        return new CheckoutRequest("Ana Pérez", email, "2945 123456", null, TipoEntrega.RETIRO_LOCAL, null, items);
    }

    private CheckoutRequest conEnvio(String dni, CheckoutRequest.DireccionCheckout direccion) {
        return new CheckoutRequest("Ana Pérez", EMAIL, "2945 123456", dni, TipoEntrega.ENVIO_DOMICILIO, direccion, items);
    }

    private static CheckoutRequest.DireccionCheckout direccion() {
        return new CheckoutRequest.DireccionCheckout("Av. San Martín", "123", "2", "B", "Esquel", "Chubut", "9200");
    }

    private Usuario duenioDelPedido() {
        ArgumentCaptor<Usuario> captor = ArgumentCaptor.forClass(Usuario.class);
        verify(pedidoService).crearPedido(captor.capture(), any());
        return captor.getValue();
    }

    private NuevoPedido datosDelPedido() {
        ArgumentCaptor<NuevoPedido> captor = ArgumentCaptor.forClass(NuevoPedido.class);
        verify(pedidoService).crearPedido(any(), captor.capture());
        return captor.getValue();
    }

    // ---------- La tabla de la ADR 0005, fila por fila ----------

    @Test
    void sinSesionYEmailNuevoSeCreaElClienteSinContrasenia() {
        Usuario creado = usuario(EMAIL, RolUsuario.CLIENTE);
        when(usuarioRepository.findByEmail(EMAIL)).thenReturn(Optional.empty(), Optional.of(creado));

        CheckoutResponse respuesta = checkoutService.comprar(conRetiro(EMAIL), null);

        verify(usuarioRepository).insertarClienteSiNoExiste(any(UUID.class), eq("Ana Pérez"), eq(EMAIL));
        assertSame(creado, duenioDelPedido());
        assertEquals("https://www.mercadopago.com.ar/checkout/x", respuesta.initPoint());
        assertEquals(VENCE, respuesta.expiraEn());
        assertEquals(0, new BigDecimal("62000").compareTo(respuesta.total()));
    }

    @Test
    void sinSesionYEmailDeUnClienteElPedidoSeAsociaSinTocarLaCuenta() {
        Usuario existente = usuario(EMAIL, RolUsuario.CLIENTE);
        existente.setNombre("Nombre original");
        existente.setTelefono("1111 111111");
        when(usuarioRepository.findByEmail(EMAIL)).thenReturn(Optional.of(existente));

        checkoutService.comprar(conRetiro(EMAIL), null);

        assertSame(existente, duenioDelPedido());
        verify(usuarioRepository, never()).insertarClienteSiNoExiste(any(), any(), any());
        verify(usuarioRepository, never()).save(any());
        assertEquals("Nombre original", existente.getNombre());
        assertEquals("1111 111111", existente.getTelefono());
    }

    @Test
    void sinSesionYEmailDelEquipoResponde409SinCrearPedido() {
        when(usuarioRepository.findByEmail("admin@tierra.esquel"))
                .thenReturn(Optional.of(usuario("admin@tierra.esquel", RolUsuario.ADMIN)));

        assertThrows(EmailDelEquipoException.class,
                () -> checkoutService.comprar(conRetiro("admin@tierra.esquel"), null));

        verify(pedidoService, never()).crearPedido(any(), any());
        verifyNoInteractions(pagoService);
    }

    @Test
    void conSesionDeClienteElEmailEscritoSeIgnora() {
        Usuario deLaSesion = usuario("cliente@example.com", RolUsuario.CLIENTE);
        when(usuarioRepository.findById(deLaSesion.getId())).thenReturn(Optional.of(deLaSesion));

        checkoutService.comprar(conRetiro("otra.persona@example.com"), new UsuarioAutenticado(deLaSesion));

        assertSame(deLaSesion, duenioDelPedido());
        verify(usuarioRepository, never()).findByEmail(anyString());
        verify(usuarioRepository, never()).insertarClienteSiNoExiste(any(), any(), any());
    }

    @Test
    void conSesionDelEquipoEsComoSiNoHubieraSesion() {
        Usuario operador = usuario("operador@tierra.esquel", RolUsuario.OPERADOR);
        Usuario cliente = usuario(EMAIL, RolUsuario.CLIENTE);
        when(usuarioRepository.findByEmail(EMAIL)).thenReturn(Optional.of(cliente));

        checkoutService.comprar(conRetiro(EMAIL), new UsuarioAutenticado(operador));

        assertSame(cliente, duenioDelPedido());
        verify(usuarioRepository, never()).findById(any());
    }

    // ---------- Casos que la tabla no muestra ----------

    @Test
    void comprarDosVecesConElMismoEmailUsaElMismoCliente() {
        Usuario creado = usuario(EMAIL, RolUsuario.CLIENTE);
        when(usuarioRepository.findByEmail(EMAIL)).thenReturn(Optional.empty(), Optional.of(creado), Optional.of(creado));

        checkoutService.comprar(conRetiro(EMAIL), null);
        checkoutService.comprar(conRetiro(EMAIL), null);

        verify(usuarioRepository, times(1)).insertarClienteSiNoExiste(any(), any(), any());
        ArgumentCaptor<Usuario> captor = ArgumentCaptor.forClass(Usuario.class);
        verify(pedidoService, times(2)).crearPedido(captor.capture(), any());
        assertSame(captor.getAllValues().get(0), captor.getAllValues().get(1));
    }

    // Dos compras simultáneas con un email nuevo: la otra lo insertó primero,
    // el INSERT ... ON CONFLICT no hace nada y se usa el que ya está.
    @Test
    void siOtraCompraCreoElClienteAntesSeUsaEse() {
        Usuario delOtro = usuario(EMAIL, RolUsuario.CLIENTE);
        when(usuarioRepository.findByEmail(EMAIL)).thenReturn(Optional.empty(), Optional.of(delOtro));
        when(usuarioRepository.insertarClienteSiNoExiste(any(), any(), any())).thenReturn(0);

        checkoutService.comprar(conRetiro(EMAIL), null);

        assertSame(delOtro, duenioDelPedido());
    }

    // Que exista o no una cuenta con ese email no cambia la respuesta: el
    // checkout no revela qué emails tienen cuenta.
    @Test
    void laRespuestaTieneLaMismaFormaConEmailNuevoOExistente() {
        when(usuarioRepository.findByEmail("nuevo@example.com"))
                .thenReturn(Optional.empty(), Optional.of(usuario("nuevo@example.com", RolUsuario.CLIENTE)));
        when(usuarioRepository.findByEmail(EMAIL)).thenReturn(Optional.of(usuario(EMAIL, RolUsuario.CLIENTE)));

        CheckoutResponse nuevo = checkoutService.comprar(conRetiro("nuevo@example.com"), null);
        CheckoutResponse existente = checkoutService.comprar(conRetiro(EMAIL), null);

        assertEquals(nuevo.initPoint(), existente.initPoint());
        assertEquals(nuevo.expiraEn(), existente.expiraEn());
        assertEquals(0, nuevo.total().compareTo(existente.total()));
        assertNotNull(nuevo.pedidoId());
        assertNotNull(existente.pedidoId());
    }

    @Test
    void elEmailSeNormalizaAntesDeBuscar() {
        when(usuarioRepository.findByEmail(EMAIL)).thenReturn(Optional.of(usuario(EMAIL, RolUsuario.CLIENTE)));

        checkoutService.comprar(conRetiro("  Ana@Example.COM "), null);

        verify(usuarioRepository).findByEmail(EMAIL);
    }

    @Test
    void unClienteInactivoIgualRecibeElPedido() {
        Usuario inactivo = usuario(EMAIL, RolUsuario.CLIENTE);
        inactivo.setActivo(false);
        when(usuarioRepository.findByEmail(EMAIL)).thenReturn(Optional.of(inactivo));

        checkoutService.comprar(conRetiro(EMAIL), null);

        assertSame(inactivo, duenioDelPedido());
        assertFalse(inactivo.isActivo());
    }

    // ---------- Si Mercado Pago falla ----------

    @Test
    void siFallaElLinkDePagoSeCancelaElPedidoYResponde503() {
        when(usuarioRepository.findByEmail(EMAIL)).thenReturn(Optional.of(usuario(EMAIL, RolUsuario.CLIENTE)));
        when(pagoService.crearPreferenciaPago(any(), any())).thenThrow(new IllegalStateException("MP caído"));

        assertThrows(LinkDePagoNoDisponibleException.class, () -> checkoutService.comprar(conRetiro(EMAIL), null));

        ArgumentCaptor<UUID> pedido = ArgumentCaptor.forClass(UUID.class);
        verify(pedidoService).cancelarSinLinkDePago(pedido.capture());
        assertNotNull(pedido.getValue());
        // El pedido se confirmó ANTES de pedir el link: la llamada a Mercado
        // Pago no ocurre con el stock bloqueado.
        var orden = inOrder(transactionManager, pagoService);
        orden.verify(transactionManager).commit(any());
        orden.verify(pagoService).crearPreferenciaPago(any(), any());
    }

    @Test
    void siTambienFallaLaCancelacionIgualResponde503() {
        when(usuarioRepository.findByEmail(EMAIL)).thenReturn(Optional.of(usuario(EMAIL, RolUsuario.CLIENTE)));
        when(pagoService.crearPreferenciaPago(any(), any())).thenThrow(new IllegalStateException("MP caído"));
        doThrow(new IllegalStateException("base caída")).when(pedidoService).cancelarSinLinkDePago(any());

        assertThrows(LinkDePagoNoDisponibleException.class, () -> checkoutService.comprar(conRetiro(EMAIL), null));
    }

    @Test
    void siFallaElPedidoNoSePideLinkDePago() {
        when(usuarioRepository.findByEmail(EMAIL)).thenReturn(Optional.of(usuario(EMAIL, RolUsuario.CLIENTE)));
        when(pedidoService.crearPedido(any(), any())).thenThrow(new IllegalArgumentException("sin stock"));

        assertThrows(IllegalArgumentException.class, () -> checkoutService.comprar(conRetiro(EMAIL), null));

        verifyNoInteractions(pagoService);
        verify(pedidoService, never()).cancelarSinLinkDePago(any());
        verify(transactionManager).rollback(any());
    }

    // ---------- Reglas según el tipo de entrega ----------

    @Test
    void conEnvioPasanElDniSoloConNumerosYLaDireccionCompleta() {
        when(usuarioRepository.findByEmail(EMAIL)).thenReturn(Optional.of(usuario(EMAIL, RolUsuario.CLIENTE)));

        checkoutService.comprar(conEnvio("30.111.222", direccion()), null);

        NuevoPedido datos = datosDelPedido();
        assertEquals(TipoEntrega.ENVIO_DOMICILIO, datos.tipoEntrega());
        assertEquals("30111222", datos.contactoDni());
        assertEquals("2", datos.direccion().getPiso());
        assertEquals("B", datos.direccion().getDepartamento());
        assertEquals("9200", datos.direccion().getCodigoPostal());
        assertEquals("Ana Pérez", datos.contactoNombre());
        assertEquals("2945 123456", datos.contactoTelefono());
    }

    @Test
    void numeroPisoYDepartamentoSonOpcionales() {
        NuevoPedido datos = CheckoutService.validarYArmar(conEnvio("30111222",
                new CheckoutRequest.DireccionCheckout(" Ruta 40 km 1800 ", "", "  ", null, "Esquel", "Chubut", "9200")));

        assertEquals("Ruta 40 km 1800", datos.direccion().getCalle());
        assertNull(datos.direccion().getNumero());
        assertNull(datos.direccion().getPiso());
        assertNull(datos.direccion().getDepartamento());
    }

    @Test
    void conEnvioSinDniSeRechazaAntesDeTocarLaBase() {
        IllegalArgumentException e = assertThrows(IllegalArgumentException.class,
                () -> checkoutService.comprar(conEnvio(null, direccion()), null));

        assertTrue(e.getMessage().contains("DNI"));
        verifyNoInteractions(usuarioRepository, pedidoService, pagoService, transactionManager);
    }

    @Test
    void conEnvioUnDniDeLargoInvalidoSeRechaza() {
        assertThrows(IllegalArgumentException.class, () -> CheckoutService.validarYArmar(conEnvio("123456", direccion())));
        assertThrows(IllegalArgumentException.class, () -> CheckoutService.validarYArmar(conEnvio("123456789", direccion())));
    }

    @Test
    void conEnvioSinDireccionOIncompletaSeRechaza() {
        assertThrows(IllegalArgumentException.class, () -> CheckoutService.validarYArmar(conEnvio("30111222", null)));
        assertThrows(IllegalArgumentException.class, () -> CheckoutService.validarYArmar(conEnvio("30111222",
                new CheckoutRequest.DireccionCheckout("Av. San Martín", "123", null, null, "Esquel", "Chubut", " "))));
    }

    @Test
    void conRetiroSeIgnoranDniYDireccion() {
        CheckoutRequest r = new CheckoutRequest("Ana Pérez", EMAIL, "2945 123456", "30111222",
                TipoEntrega.RETIRO_LOCAL, direccion(), items);

        NuevoPedido datos = CheckoutService.validarYArmar(r);

        assertNull(datos.contactoDni());
        assertNull(datos.direccion());
    }

    @Test
    void elTelefonoTieneQueTenerEntre8Y15Numeros() {
        CheckoutRequest corto = new CheckoutRequest("Ana", EMAIL, "123-4567", null, TipoEntrega.RETIRO_LOCAL, null, items);
        CheckoutRequest largo = new CheckoutRequest("Ana", EMAIL, "+54 9 2945 1234 56789", null, TipoEntrega.RETIRO_LOCAL, null, items);
        CheckoutRequest bien = new CheckoutRequest("Ana", EMAIL, "+54 9 2945 12-3456", null, TipoEntrega.RETIRO_LOCAL, null, items);

        assertThrows(IllegalArgumentException.class, () -> CheckoutService.validarYArmar(corto));
        assertThrows(IllegalArgumentException.class, () -> CheckoutService.validarYArmar(largo));
        assertEquals("+54 9 2945 12-3456", CheckoutService.validarYArmar(bien).contactoTelefono());
    }
}
