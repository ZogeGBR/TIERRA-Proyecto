package com.tierra.ecommerce.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.time.Clock;

// El reloj del sistema como bean, para que los servicios que dependen del
// tiempo (vencimientos, bloqueos) se puedan probar moviendo la hora en los
// tests en lugar de esperar minutos reales.
@Configuration
public class RelojConfig {

    @Bean
    public Clock clock() {
        return Clock.systemDefaultZone();
    }
}
