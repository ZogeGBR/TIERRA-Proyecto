package com.tierra.ecommerce.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

// Sin esto, el navegador bloquea los pedidos del frontend (puerto 3000)
// al backend (puerto 8080) por ser de origen distinto — es una regla de
// seguridad del navegador, no algo que se pueda saltear del lado del
// cliente. Solo localhost:3000 mientras es desarrollo local; hay que
// reemplazarlo por el dominio real de producción más adelante.
@Configuration
public class WebConfig implements WebMvcConfigurer {

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/api/**")
                .allowedOrigins("http://localhost:3000")
                .allowedMethods("GET", "POST", "PUT", "DELETE", "OPTIONS")
                .allowedHeaders("*");
    }
}
