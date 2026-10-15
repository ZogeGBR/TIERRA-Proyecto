package com.tierra.ecommerce.notificacion;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;

// SOLO PARA DESARROLLO. Existe porque todavía no hay módulo de emails: en vez
// de mandar el código, lo escribe en el log y en un archivo por email, de
// donde lo leen los scripts de verificación (probar-codigo.ps1).
//
// Es la ÚNICA parte del sistema que puede mostrar un código: @Profile("dev")
// garantiza que no exista fuera del perfil de desarrollo.
@Component
@Profile("dev")
public class EnviadorCodigoAccesoDesarrollo implements EnviadorCodigoAcceso {

    private static final Logger log = LoggerFactory.getLogger(EnviadorCodigoAccesoDesarrollo.class);

    private final Path directorio;

    public EnviadorCodigoAccesoDesarrollo(@Value("${auth.codigo.directorio-desarrollo}") String directorio) {
        this.directorio = Path.of(directorio).toAbsolutePath().normalize();
        // Se informa al arrancar porque la ruta depende de desde dónde se
        // lance el backend (consola en tierra-backend o VS Code en la raíz).
        log.info("[DEV] Los códigos de acceso se escriben en {}", this.directorio);
    }

    @Override
    public void enviar(String email, String nombre, String codigo) {
        log.warn("[DEV] Código de acceso para {}: {}", email, codigo);
        try {
            Files.createDirectories(directorio);
            Files.writeString(directorio.resolve(email + ".txt"), codigo, StandardCharsets.UTF_8);
        } catch (IOException e) {
            throw new UncheckedIOException("No se pudo escribir el código de desarrollo en " + directorio, e);
        }
    }
}
