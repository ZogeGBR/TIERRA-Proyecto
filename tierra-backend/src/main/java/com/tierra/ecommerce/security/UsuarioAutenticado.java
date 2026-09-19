package com.tierra.ecommerce.security;

import com.tierra.ecommerce.entity.Usuario;
import com.tierra.ecommerce.enums.RolUsuario;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;
import java.util.UUID;

// Lo que Spring Security guarda en la sesión para representar a quien
// está autenticado.
//
// Existe en vez de usar el User que trae Spring porque necesitamos el id
// del usuario: es lo que va a leer PedidoService para saber de quién es el
// pedido, en lugar de recibirlo en el cuerpo del request.
//
// NO guarda la entidad Usuario entera a propósito: lo que va acá termina
// serializado en la sesión, y una entidad JPA arrastra proxies de Hibernate
// y relaciones perezosas que no tienen por qué vivir ahí.
public class UsuarioAutenticado implements UserDetails {

    private final UUID id;
    private final String email;
    private final String nombre;
    private final String passwordHash;
    private final RolUsuario rol;
    private final boolean activo;
    private final LocalDateTime bloqueadoHasta;

    public UsuarioAutenticado(Usuario usuario) {
        this.id = usuario.getId();
        this.email = usuario.getEmail();
        this.nombre = usuario.getNombre();
        this.passwordHash = usuario.getPasswordHash();
        this.rol = usuario.getRol();
        this.activo = usuario.isActivo();
        this.bloqueadoHasta = usuario.getBloqueadoHasta();
    }

    public UUID getId() {
        return id;
    }

    public String getNombre() {
        return nombre;
    }

    public RolUsuario getRol() {
        return rol;
    }

    // Spring Security con hasRole("ADMIN") busca la autoridad "ROLE_ADMIN".
    // El prefijo se agrega acá y en ningún otro lado: si se mezclan los dos
    // estilos (hasRole y hasAuthority), las reglas fallan en silencio y el
    // endpoint queda abierto o cerrado sin que nadie entienda por qué.
    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return List.of(new SimpleGrantedAuthority("ROLE_" + rol.name()));
    }

    @Override
    public String getPassword() {
        return passwordHash;
    }

    @Override
    public String getUsername() {
        return email;
    }

    // El bloqueo por intentos fallidos lo aplica Spring solo a través de
    // este método: si devuelve false, el login se rechaza sin llegar a
    // comparar la contraseña.
    @Override
    public boolean isAccountNonLocked() {
        return bloqueadoHasta == null || bloqueadoHasta.isBefore(LocalDateTime.now());
    }

    @Override
    public boolean isEnabled() {
        return activo;
    }

    @Override
    public boolean isAccountNonExpired() {
        return true;
    }

    @Override
    public boolean isCredentialsNonExpired() {
        return true;
    }
}
