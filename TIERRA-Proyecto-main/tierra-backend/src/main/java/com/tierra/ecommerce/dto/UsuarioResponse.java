package com.tierra.ecommerce.dto;

import com.tierra.ecommerce.enums.RolUsuario;

import java.util.UUID;

// Lo que el backend devuelve sobre el usuario autenticado. Es la respuesta
// de registro, login y /api/auth/yo: siempre la misma forma, para que el
// frontend tenga un solo tipo.
//
// No incluye passwordHash (obvio) ni dni (campo huérfano del módulo de
// alquiler congelado) ni los contadores de intentos fallidos, que son
// internos y no le interesan a nadie del otro lado.
public record UsuarioResponse(
        UUID id,
        String nombre,
        String email,
        RolUsuario rol
) {}
