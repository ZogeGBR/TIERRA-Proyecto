package com.tierra.ecommerce.security;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.stereotype.Component;

// Extraído de AuthController: lo necesitan dos lugares ahora (login/registro
// explícitos, y el checkout con cuenta implícita), y esta lógica es
// demasiado sensible para tener dos copias que puedan divergir.
//
// Guarda la autenticación en la sesión HTTP.
//
// ESTE ES EL PASO QUE MÁS SE OLVIDA. En Spring Security 6, poner la
// autenticación en el SecurityContextHolder ya NO la persiste sola: hay
// que escribirla explícitamente en el repositorio. Buena parte de los
// ejemplos que circulan son de versiones anteriores y omiten esta línea.
// El síntoma es desconcertante: el login devuelve 200 con su cookie, y la
// request siguiente llega sin sesión.
@Component
public class SesionAutenticacionService {

    private final SecurityContextRepository securityContextRepository;

    public SesionAutenticacionService(SecurityContextRepository securityContextRepository) {
        this.securityContextRepository = securityContextRepository;
    }

    public void iniciarSesion(Authentication auth,
                              HttpServletRequest request,
                              HttpServletResponse response) {
        // Protección contra fijación de sesión: si alguien llegó con una
        // sesión anónima ya existente, el identificador cambia al autenticarse.
        // El filtro de Spring que hace esto no interviene cuando el login es
        // manual como acá, así que hay que hacerlo a mano.
        HttpSession sesionPrevia = request.getSession(false);
        if (sesionPrevia != null) {
            request.changeSessionId();
        }

        SecurityContext contexto = SecurityContextHolder.createEmptyContext();
        contexto.setAuthentication(auth);
        SecurityContextHolder.setContext(contexto);
        securityContextRepository.saveContext(contexto, request, response);
    }
}
