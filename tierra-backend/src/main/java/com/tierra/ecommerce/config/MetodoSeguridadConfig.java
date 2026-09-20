package com.tierra.ecommerce.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;

// Habilita @PreAuthorize y compañía.
//
// Es su propia clase para que se vea. SIN esta anotación, los @PreAuthorize
// se ignoran EN SILENCIO: no hay error ni advertencia en el log, y un endpoint
// que uno cree protegido queda abierto. Es un error que puede pasar
// desapercibido meses.
//
// Verificación obligatoria después de tocar esto: un usuario CLIENTE tiene que
// recibir 403 en un endpoint anotado. Si recibe 200, la anotación no está
// activa.
@Configuration
@EnableMethodSecurity
public class MetodoSeguridadConfig {
}
