package com.tierra.ecommerce.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

// Datos para crear una cuenta.
//
// NO declara un campo 'rol' a propósito: aunque alguien lo mande en el JSON,
// Jackson lo descarta porque el record no lo tiene. Es la defensa más simple
// contra que cualquiera se cree un administrador desde el formulario público.
public record RegistroRequest(

        @NotBlank(message = "El nombre es obligatorio")
        @Size(max = 150, message = "El nombre no puede superar los 150 caracteres")
        String nombre,

        @NotBlank(message = "El email es obligatorio")
        @Email(message = "El email no tiene un formato válido")
        @Size(max = 150, message = "El email no puede superar los 150 caracteres")
        String email,

        // El máximo de 72 no es arbitrario: BCrypt ignora todo lo que pase de
        // 72 bytes. Sin este límite, dos contraseñas larguísimas que compartan
        // los primeros 72 caracteres serían equivalentes, sin que nadie lo note.
        @NotBlank(message = "La contraseña es obligatoria")
        @Size(min = 8, max = 72, message = "La contraseña debe tener entre 8 y 72 caracteres")
        String password,

        @Size(max = 30, message = "El teléfono no puede superar los 30 caracteres")
        String telefono
) {
    // Normaliza antes de validar. Jackson construye el record y recién
    // después Spring corre las validaciones, así que @Email ve el valor ya
    // limpio: un email pegado con un espacio al final no se rechaza con un
    // "formato inválido" que no le dice nada a nadie.
    //
    // Minúsculas porque el UNIQUE de PostgreSQL distingue mayúsculas: sin
    // esto, "Juan@tierra.com" y "juan@tierra.com" serían dos cuentas.
    //
    // La contraseña NO se toca: los espacios de una contraseña son parte de
    // la contraseña, y recortarlos silenciosamente rompería el login de
    // quien haya elegido una que empiece o termine con uno.
    public RegistroRequest {
        email = email == null ? null : email.trim().toLowerCase();
        nombre = nombre == null ? null : nombre.trim();
        telefono = telefono == null ? null : telefono.trim();
    }
}
