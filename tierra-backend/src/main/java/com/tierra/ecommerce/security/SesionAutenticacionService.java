package com.tierra.ecommerce.security;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.stereotype.Component;

// Abre la sesión HTTP de un usuario que ya se autenticó.
//
// Se extrajo de AuthController para que exista una sola copia de esta
// lógica, que es fácil de romper sin que se note. Hoy la usa el login; con
// el acceso por código (ADR 0005, tarea 3) la van a usar el login del equipo
// y la verificación del código, y acá se va a fijar la duración de la sesión
// según el rol.
//
// EL CHECKOUT NO LA USA: comprar nunca abre sesión (ADR 0005). Si se la
// llamara desde ahí, cualquiera que escribiera un email ajeno entraría a la
// cuenta de esa persona.
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
