package com.tierra.ecommerce.controller;

import com.tierra.ecommerce.dto.DatosEntregaResponse;
import com.tierra.ecommerce.security.UsuarioAutenticado;
import com.tierra.ecommerce.service.DatosEntregaService;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

// La cuenta del cliente (rol CLIENTE, ver SecurityConfig). Por ahora, solo
// los datos guardados para la próxima compra (tarea 22). Leer y borrar: se
// escriben únicamente desde el checkout (ADR 0005).
@RestController
@RequestMapping("/api/cuenta")
public class CuentaController {

    private final DatosEntregaService datosEntregaService;

    public CuentaController(DatosEntregaService datosEntregaService) {
        this.datosEntregaService = datosEntregaService;
    }

    @GetMapping("/datos-entrega")
    public DatosEntregaResponse datosEntrega(@AuthenticationPrincipal UsuarioAutenticado sesion) {
        return datosEntregaService.obtener(sesion.getId());
    }

    @DeleteMapping("/datos-entrega")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void borrarDatosEntrega(@AuthenticationPrincipal UsuarioAutenticado sesion) {
        datosEntregaService.borrar(sesion.getId());
    }
}
