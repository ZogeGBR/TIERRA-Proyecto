package com.tierra.ecommerce.service;

import com.tierra.ecommerce.dto.RegistroRequest;
import com.tierra.ecommerce.dto.UsuarioResponse;
import com.tierra.ecommerce.entity.Usuario;
import com.tierra.ecommerce.enums.RolUsuario;
import com.tierra.ecommerce.exception.EmailYaRegistradoException;
import com.tierra.ecommerce.repository.UsuarioRepository;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

// Alta de cuentas. La verificación de credenciales la hace Spring Security
// a través de UsuarioDetailsService; acá sólo se crean usuarios.
@Service
public class AuthService {

    private final UsuarioRepository usuarioRepository;
    private final PasswordEncoder passwordEncoder;

    public AuthService(UsuarioRepository usuarioRepository, PasswordEncoder passwordEncoder) {
        this.usuarioRepository = usuarioRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Transactional
    public UsuarioResponse registrar(RegistroRequest request) {
        String email = normalizarEmail(request.email());

        // El UNIQUE de la base es la garantía real; esta consulta existe para
        // poder devolver un 409 con un mensaje entendible en vez de un error
        // de restricción violada.
        if (usuarioRepository.findByEmail(email).isPresent()) {
            // Decir que el email ya existe filtra información: confirma qué
            // direcciones están registradas. Es inevitable acá — si no, la
            // persona no entiende por qué falla. La mitigación estándar es
            // responder siempre lo mismo y avisar por email, y eso necesita
            // el módulo de notificaciones (fase 3). Deuda consciente.
            throw new EmailYaRegistradoException("Ya existe una cuenta con ese email");
        }

        Usuario usuario = new Usuario();
        usuario.setNombre(request.nombre().trim());
        usuario.setEmail(email);
        usuario.setPasswordHash(passwordEncoder.encode(request.password()));
        usuario.setTelefono(vacioComoNulo(request.telefono()));

        // El rol se fija acá y nunca se toma del request. Ver RegistroRequest.
        usuario.setRol(RolUsuario.CLIENTE);

        usuario = usuarioRepository.save(usuario);
        return aResponse(usuario);
    }

    // Minúsculas y sin espacios: el UNIQUE de PostgreSQL distingue mayúsculas,
    // así que sin normalizar, "Juan@tierra.com" y "juan@tierra.com" serían dos
    // cuentas distintas y el login fallaría según cómo se tipeara.
    public static String normalizarEmail(String email) {
        return email == null ? "" : email.trim().toLowerCase();
    }

    private static String vacioComoNulo(String valor) {
        if (valor == null || valor.isBlank()) {
            return null;
        }
        return valor.trim();
    }

    public static UsuarioResponse aResponse(Usuario usuario) {
        return new UsuarioResponse(
                usuario.getId(),
                usuario.getNombre(),
                usuario.getEmail(),
                usuario.getRol()
        );
    }
}
