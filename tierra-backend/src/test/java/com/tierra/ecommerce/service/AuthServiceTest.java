package com.tierra.ecommerce.service;

import com.tierra.ecommerce.dto.LoginRequest;
import com.tierra.ecommerce.entity.Usuario;
import com.tierra.ecommerce.enums.RolUsuario;
import com.tierra.ecommerce.exception.CredencialesInvalidasException;
import com.tierra.ecommerce.repository.UsuarioRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;

import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

// El login con contraseña es solo del equipo. Lo que se rompe con facilidad:
// que un intento con el email de un cliente toque sus contadores, que son los
// del acceso por código (un solo canal por cuenta, ADR 0005).
@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock private UsuarioRepository usuarioRepository;
    @Mock private AuthenticationManager authenticationManager;

    private AuthService servicio;

    @BeforeEach
    void setUp() {
        servicio = new AuthService(usuarioRepository, authenticationManager, 5, 15);
        when(authenticationManager.authenticate(any())).thenThrow(new BadCredentialsException("x"));
    }

    @Test
    void elEmailDeUnClienteDaElMismoErrorQueUnoInexistenteYNoTocaSusContadores() {
        Usuario cliente = usuario(RolUsuario.CLIENTE, "test@tierra.esquel");
        cliente.setIntentosFallidos(2);
        when(usuarioRepository.findByEmail("test@tierra.esquel")).thenReturn(Optional.of(cliente));
        when(usuarioRepository.findByEmail("nadie@tierra.esquel")).thenReturn(Optional.empty());

        CredencialesInvalidasException conCliente = assertThrows(CredencialesInvalidasException.class,
                () -> servicio.autenticar(new LoginRequest("test@tierra.esquel", "tierra2026")));
        CredencialesInvalidasException inexistente = assertThrows(CredencialesInvalidasException.class,
                () -> servicio.autenticar(new LoginRequest("nadie@tierra.esquel", "tierra2026")));

        assertEquals(inexistente.getMessage(), conCliente.getMessage());
        assertEquals(2, cliente.getIntentosFallidos());
        assertNull(cliente.getBloqueadoHasta());
        verify(usuarioRepository, never()).save(any());
    }

    @Test
    void unaContrasenaIncorrectaDelEquipoSumaUnIntento() {
        Usuario operador = usuario(RolUsuario.OPERADOR, "mostrador@tierra.esquel");
        when(usuarioRepository.findByEmail("mostrador@tierra.esquel")).thenReturn(Optional.of(operador));

        assertThrows(CredencialesInvalidasException.class,
                () -> servicio.autenticar(new LoginRequest("mostrador@tierra.esquel", "mal")));

        assertEquals(1, operador.getIntentosFallidos());
        verify(usuarioRepository).save(operador);
    }

    @Test
    void elQuintoIntentoFallidoDelEquipoBloquea() {
        Usuario operador = usuario(RolUsuario.OPERADOR, "mostrador@tierra.esquel");
        operador.setIntentosFallidos(4);
        when(usuarioRepository.findByEmail("mostrador@tierra.esquel")).thenReturn(Optional.of(operador));

        assertThrows(CredencialesInvalidasException.class,
                () -> servicio.autenticar(new LoginRequest("mostrador@tierra.esquel", "mal")));

        assertEquals(5, operador.getIntentosFallidos());
        assertNotNull(operador.getBloqueadoHasta());
    }

    private static Usuario usuario(RolUsuario rol, String email) {
        Usuario u = new Usuario();
        u.setId(UUID.randomUUID());
        u.setNombre("Alguien");
        u.setEmail(email);
        u.setRol(rol);
        return u;
    }
}
