package com.tierra.ecommerce.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.Arrays;
import java.util.List;

// Sin esto, el navegador bloquea los pedidos del frontend (puerto 3000) al
// backend (puerto 8080) por ser de origen distinto — es una regla del
// navegador, no algo que se pueda saltear del lado del cliente.
//
// Pasó de ser un WebMvcConfigurer a exponer un CorsConfigurationSource por
// dos motivos. Uno: con Spring Security activo, la configuración de MVC no
// se aplica sola a la cadena de filtros de seguridad, y las peticiones de
// verificación previa morían antes de llegar a ningún controller. Dos: así
// hay UNA sola definición de CORS en el proyecto, en vez de dos que se
// pueden contradecir.
@Configuration
public class WebConfig {

    @Bean
    public CorsConfigurationSource corsConfigurationSource(
            @Value("${cors.origenes-permitidos}") String origenes) {

        CorsConfiguration config = new CorsConfiguration();

        // Lista explícita, nunca comodín: con allowCredentials en true la
        // especificación de CORS prohíbe el "*", y el navegador rechaza la
        // respuesta entera si lo encuentra.
        config.setAllowedOrigins(Arrays.stream(origenes.split(","))
                .map(String::trim)
                .filter(o -> !o.isEmpty())
                .toList());

        config.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        config.setAllowedHeaders(List.of("*"));

        // La clave del login por sesión: sin esto el navegador descarta la
        // cookie en silencio. El login devuelve 200, el Set-Cookie viaja, y
        // la cookie no se guarda. No falla nada visiblemente, simplemente
        // la request siguiente llega sin sesión.
        config.setAllowCredentials(true);

        // Cuánto puede cachear el navegador la verificación previa, para no
        // repetirla en cada request.
        config.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/api/**", config);
        return source;
    }
}
