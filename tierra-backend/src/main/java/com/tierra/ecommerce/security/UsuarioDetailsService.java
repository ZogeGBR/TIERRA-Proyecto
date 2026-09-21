package com.tierra.ecommerce.security;

import com.tierra.ecommerce.entity.Usuario;
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
        // El email se normaliza igual que al registrar. Sin esto,
        // "Juan@tierra.com" y "juan@tierra.com" serían cuentas distintas:
        // el UNIQUE de PostgreSQL distingue mayúsculas.
        String normalizado = email == null ? "" : email.trim().toLowerCase();

        Usuario usuario = usuarioRepository.findByEmail(normalizado)
                // El mensaje no se usa en la respuesta al cliente: el handler
                // de autenticación devuelve siempre el mismo texto, exista o
                // no el email. Si difirieran, cualquiera podría averiguar qué
                // direcciones están registradas probando una por una.
                .orElseThrow(() -> new UsernameNotFoundException("Credenciales inválidas"));

        return new UsuarioAutenticado(usuario);
    }
}
