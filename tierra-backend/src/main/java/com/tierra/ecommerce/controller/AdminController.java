package com.tierra.ecommerce.controller;

import com.tierra.ecommerce.dto.UsuarioResponse;
import com.tierra.ecommerce.security.UsuarioAutenticado;
import com.tierra.ecommerce.service.AuthService;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

// Esqueleto del panel de administración.
//
// El panel se construye en la fase 3. Esto existe ahora por dos motivos:
// deja escrito el patrón de permisos para que la fase 3 lo siga en vez de
// inventarlo, y hace que las dos capas de autorización sean VERIFICABLES.
// Sin un endpoint protegido no hay forma de comprobar que las reglas andan,
// y una regla de seguridad que nadie probó es una suposición.
@RestController
@RequestMapping("/api/admin")
public class AdminController {

    // Accesible para Administrador y Operador, por la regla de URL de
    // SecurityConfig: todo lo que cuelga de /api/admin exige uno de los dos.
    //
    // Es genuinamente útil para la fase 3: al cargar, el panel necesita saber
    // quién lo está operando para decidir qué mostrar.
    @GetMapping("/sesion")
    public UsuarioResponse sesion(@AuthenticationPrincipal UsuarioAutenticado usuario) {
        return AuthService.aResponse(usuario);
    }

    // Sólo Administrador.
    //
    // Esta distinción NO la puede hacer la regla de URL, porque las dos zonas
    // del panel viven bajo /api/admin. El contrato con el cliente dice que el
    // Operador gestiona pedidos, stock y productos pero no accede a reportes
    // económicos ni a configuración, y eso se resuelve a nivel de método.
    //
    // Hoy no devuelve datos reales: los reportes son de la fase 3. Lo que sí
    // hace es permitir comprobar que @PreAuthorize está ACTIVO — sin
    // @EnableMethodSecurity la anotación se ignora en silencio y el endpoint
    // quedaría abierto a cualquier operador sin que nadie se entere.
    @GetMapping("/reportes/verificacion")
    @PreAuthorize("hasRole('ADMIN')")
    public Map<String, String> verificacionReportes() {
        return Map.of("acceso", "reportes economicos");
    }
}
