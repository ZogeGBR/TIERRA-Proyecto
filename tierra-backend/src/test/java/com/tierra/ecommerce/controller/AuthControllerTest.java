package com.tierra.ecommerce.controller;

import com.tierra.ecommerce.dto.MensajeResponse;
import com.tierra.ecommerce.dto.SolicitarCodigoRequest;
import com.tierra.ecommerce.dto.UsuarioResponse;
import com.tierra.ecommerce.dto.VerificarCodigoRequest;
import com.tierra.ecommerce.entity.Usuario;
import com.tierra.ecommerce.enums.RolUsuario;
import com.tierra.ecommerce.exception.CodigoInvalidoException;
import com.tierra.ecommerce.security.SesionAutenticacionService;
import com.tierra.ecommerce.security.UsuarioAutenticado;
import com.tierra.ecommerce.service.AuthService;
import com.tierra.ecommerce.service.CodigoAccesoService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.core.Authentication;

import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertInstanceOf;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AuthControllerTest {

    @Mock private AuthService authService;
    @Mock private CodigoAccesoService codigoAccesoService;
    @Mock private SesionAutenticacionService sesionAutenticacionService;
    @InjectMocks private AuthController controller;

    @Test
    void pedirUnCodigoRespondeSiempreElMismoMensaje() {
        MensajeResponse a = controller.solicitarCodigo(new SolicitarCodigoRequest("test@tierra.esquel"));
        MensajeResponse b = controller.solicitarCodigo(new SolicitarCodigoRequest("nadie@tierra.esquel"));

        assertEquals(AuthController.MENSAJE_CODIGO_SOLICITADO, a.mensaje());
        assertEquals(a, b);
        verify(codigoAccesoService).solicitar("test@tierra.esquel");
        verify(codigoAccesoService).solicitar("nadie@tierra.esquel");
    }

    @Test
    void unCodigoQueNoSirveNoAbreSesion() {
        when(codigoAccesoService.verificar("test@tierra.esquel", "000000")).thenReturn(Optional.empty());

        CodigoInvalidoException e = assertThrows(CodigoInvalidoException.class, () -> controller.verificarCodigo(
                new VerificarCodigoRequest("test@tierra.esquel", "000000"),
                new MockHttpServletRequest(), new MockHttpServletResponse()));

        assertEquals("El código es incorrecto o venció. Pedí uno nuevo.", e.getMessage());
        verify(sesionAutenticacionService, never()).iniciarSesion(any(), any(), any());
    }

    @Test
    void unCodigoCorrectoAbreLaSesionDelCliente() {
        Usuario cliente = new Usuario();
        cliente.setId(UUID.randomUUID());
        cliente.setNombre("Usuario de Prueba");
        cliente.setEmail("test@tierra.esquel");
        cliente.setRol(RolUsuario.CLIENTE);
        when(codigoAccesoService.verificar("test@tierra.esquel", "123456")).thenReturn(Optional.of(cliente));

        UsuarioResponse respuesta = controller.verificarCodigo(
                new VerificarCodigoRequest(" Test@Tierra.Esquel ", " 123456 "),
                new MockHttpServletRequest(), new MockHttpServletResponse());

        assertEquals("test@tierra.esquel", respuesta.email());
        assertEquals(RolUsuario.CLIENTE, respuesta.rol());
        ArgumentCaptor<Authentication> auth = ArgumentCaptor.forClass(Authentication.class);
        verify(sesionAutenticacionService).iniciarSesion(auth.capture(), any(), any());
        UsuarioAutenticado principal = assertInstanceOf(UsuarioAutenticado.class, auth.getValue().getPrincipal());
        assertEquals(cliente.getId(), principal.getId());
        assertEquals("ROLE_CLIENTE", auth.getValue().getAuthorities().iterator().next().getAuthority());
    }
}
