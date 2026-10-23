package com.tierra.ecommerce.security;

import com.tierra.ecommerce.entity.Usuario;
import com.tierra.ecommerce.enums.RolUsuario;
import com.tierra.ecommerce.repository.UsuarioRepository;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

// De dónde saca Spring Security los usuarios. Al existir este bean,
// desaparece del log el "Using generated security password": la
// autoconfiguración deja de crear el usuario en memoria.
@Service
public class UsuarioDetailsService implements UserDetailsService {

    private final UsuarioRepository usuarioRepository;

    public UsuarioDetailsService(UsuarioRepository usuarioRepository) {
        this.usuarioRepository = usuarioRepository;
    }

    @Override
    @Transactional(readOnly = true)
    public UserDetails loadUserByUsername(String email) throws UsernameNotFoundException {
        // El email se normaliza igual que en el resto del sistema. Sin esto,
        // "Juan@tierra.com" y "juan@tierra.com" serían cuentas distintas:
        // el UNIQUE de PostgreSQL distingue mayúsculas.
        String normalizado = email == null ? "" : email.trim().toLowerCase();

        Usuario usuario = usuarioRepository.findByEmail(normalizado)
                // El mensaje no se usa en la respuesta al cliente: el handler
                // de autenticación devuelve siempre el mismo texto, exista o
                // no el email. Si difirieran, cualquiera podría averiguar qué
                // direcciones están registradas probando una por una.
                .orElseThrow(() -> new UsernameNotFoundException("Credenciales inválidas"));

        // Los clientes no entran con contraseña: tienen el acceso por código
        // (ADR 0005). Se los rechaza EXACTAMENTE como a un email inexistente,
        // y acá y no en el controller por una razón concreta: ante esta
        // excepción Spring hace una comparación BCrypt de relleno, así que un
        // cliente tarda lo mismo que un email que no existe. Rechazarlo en
        // otro lugar dejaría una diferencia de tiempo que alcanza para
        // distinguir quién es cliente.
        if (usuario.getRol() == RolUsuario.CLIENTE) {
            throw new UsernameNotFoundException("Credenciales inválidas");
        }

        return new UsuarioAutenticado(usuario);
    }
}
