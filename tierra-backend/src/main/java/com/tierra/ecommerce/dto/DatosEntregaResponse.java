package com.tierra.ecommerce.dto;

import com.tierra.ecommerce.entity.DireccionEntrega;

// GET /api/cuenta/datos-entrega (tarea 22). Completos, sin ocultar nada: los
// guardó el mismo cliente con su sesión (ADR 0005). Sin datos guardados,
// telefono, dni y direccion vienen en null; nombre es siempre el de la cuenta.
public record DatosEntregaResponse(String nombre, String telefono, String dni, DireccionEntrega direccion) {}
