package com.tierra.ecommerce.security;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.util.Set;

// Abre la sesión HTTP de un usuario que ya se autenticó.
//
// Se extrajo de AuthController para que exista una sola copia de esta
// lógica, que es fácil de romper sin que se note. La usan los dos canales
// de acceso (ADR 0005): el login del equipo y la verificación del código.
//
// La duración de la sesión depende del rol. Los clientes usan la del
// servidor (server.servlet.session.timeout, 7 días de inactividad). El
// equipo, una más corta (auth.sesion-equipo, 12 horas): desde su sesión se
// ven los datos de todos los clientes, y hoy no hay forma de cerrar una
// sesión a distancia si se pierde un celular o queda abierta la computadora
// del local.
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

    private static final Set<String> ROLES_EQUIPO = Set.of("ROLE_ADMIN", "ROLE_OPERADOR");

    private final SecurityContextRepository securityContextRepository;
    private final Duration duracionSesionEquipo;

    public SesionAutenticacionService(SecurityContextRepository securityContextRepository,
                                      @Value("${auth.sesion-equipo}") Duration duracionSesionEquipo) {
        this.securityContextRepository = securityContextRepository;
        this.duracionSesionEquipo = duracionSesionEquipo;
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

        if (esDelEquipo(auth)) {
            HttpSession sesion = request.getSession(false);
            if (sesion != null) {
                sesion.setMaxInactiveInterval((int) duracionSesionEquipo.toSeconds());
            }
        }
    }

    private static boolean esDelEquipo(Authentication auth) {
        for (GrantedAuthority autoridad : auth.getAuthorities()) {
            if (ROLES_EQUIPO.contains(autoridad.getAuthority())) {
                return true;
            }
        }
        return false;
    }
}
