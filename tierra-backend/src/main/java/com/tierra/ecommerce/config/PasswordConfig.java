package com.tierra.ecommerce.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

// BCrypt es lento a propósito: cada verificación tarda unos cientos de
// milisegundos, lo que hace inviable probar millones de contraseñas. Esa
// lentitud ES la seguridad.
//
// El factor de costo va a configuración porque es el número que se ajusta
// con el tiempo: cada punto duplica el trabajo. Subirlo no invalida las
// contraseñas viejas — el factor queda embebido en cada hash, así que
// conviven hashes de distinto costo sin problema.
@Configuration
public class PasswordConfig {

    @Bean
    public PasswordEncoder passwordEncoder(@Value("${auth.bcrypt-costo:12}") int costo) {
        return new BCryptPasswordEncoder(costo);
    }
}
