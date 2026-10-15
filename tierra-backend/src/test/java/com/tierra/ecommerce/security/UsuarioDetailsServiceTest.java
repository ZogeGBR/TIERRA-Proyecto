package com.tierra.ecommerce.security;

import com.tierra.ecommerce.entity.Usuario;
import com.tierra.ecommerce.enums.RolUsuario;
import com.tierra.ecommerce.repository.UsuarioRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UsernameNotFoundException;

import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.when;

// Un cliente se rechaza en el login con contraseña EXACTAMENTE como un email
// inexistente: misma excepción y mismo mensaje. Es lo que hace que Spring
// tarde lo mismo en los dos casos (ver UsuarioDetailsService).
@ExtendWith(MockitoExtension.class)
class UsuarioDetailsServiceTest {

    @Mock private UsuarioRepository usuarioRepository;
    @InjectMocks private UsuarioDetailsService servicio;

    @Test
    void unClienteSeRechazaIgualQueUnEmailInexistente() {
        when(usuarioRepository.findByEmail("test@tierra.esquel")).thenReturn(Optional.of(usuario(RolUsuario.CLIENTE)));
        when(usuarioRepository.findByEmail("nadie@tierra.esquel")).thenReturn(Optional.empty());

        UsernameNotFoundException cliente = assertThrows(UsernameNotFoundException.class,
                () -> servicio.loadUserByUsername("test@tierra.esquel"));
        UsernameNotFoundException inexistente = assertThrows(UsernameNotFoundException.class,
                () -> servicio.loadUserByUsername("nadie@tierra.esquel"));

        assertEquals(inexistente.getMessage(), cliente.getMessage());
    }

    @Test
    void elEquipoSiSeCargaParaElLoginConContrasena() {
        when(usuarioRepository.findByEmail("admin@tierra.esquel")).thenReturn(Optional.of(usuario(RolUsuario.ADMIN)));

        UserDetails detalles = servicio.loadUserByUsername("  Admin@Tierra.Esquel ");

        assertEquals("admin@tierra.esquel", detalles.getUsername());
    }

    private static Usuario usuario(RolUsuario rol) {
        Usuario u = new Usuario();
        u.setId(UUID.randomUUID());
        u.setNombre("Alguien");
        u.setEmail(rol == RolUsuario.CLIENTE ? "test@tierra.esquel" : "admin@tierra.esquel");
        u.setPasswordHash(rol == RolUsuario.CLIENTE ? null : "$2b$12$hash");
        u.setRol(rol);
        return u;
    }
}
