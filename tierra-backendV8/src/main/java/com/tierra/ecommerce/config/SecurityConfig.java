package com.tierra.ecommerce.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.web.SecurityFilterChain;

// TEMPORAL: deja toda la API abierta sin login mientras no exista un
// flujo de autenticación real. spring-boot-starter-security, sin esta
// clase, protege TODO por defecto con un usuario y contraseña generados
// en cada arranque (se ve en el log como "Using generated security
// password") — eso bloquea al frontend, que no tiene forma de mandar esa
// contraseña. Cuando se implemente login de verdad (JWT o sesiones),
// esta clase se reemplaza por reglas reales: público el catálogo,
// autenticado el resto.
@Configuration
public class SecurityConfig {

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .csrf(csrf -> csrf.disable())
            .authorizeHttpRequests(auth -> auth.anyRequest().permitAll());
        return http.build();
    }
}
