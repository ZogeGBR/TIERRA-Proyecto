package com.tierra.ecommerce.security;

import jakarta.servlet.http.HttpSession;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.AuthorityUtils;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;

import java.time.Duration;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertSame;

// Los comportamientos de este servicio que ningún script de verificación
// comprueba: que el identificador de sesión cambie al autenticarse, que la
// autenticación quede guardada en la sesión y no solo en el hilo actual, y
// que la sesión del equipo dure menos que la de un cliente.
// Se usa el repositorio real de Spring, el mismo que define SecurityConfig.
class SesionAutenticacionServiceTest {

    private static final Duration DOCE_HORAS = Duration.ofHours(12);

    private SesionAutenticacionService servicio;
    private MockHttpServletRequest request;
    private MockHttpServletResponse response;

    @BeforeEach
    void setUp() {
        servicio = new SesionAutenticacionService(new HttpSessionSecurityContextRepository(), DOCE_HORAS);
        request = new MockHttpServletRequest();
        response = new MockHttpServletResponse();
    }

    @AfterEach
    void limpiarContexto() {
        // El contexto de seguridad vive en el hilo: sin esto, un test le
        // deja la autenticación puesta al siguiente.
        SecurityContextHolder.clearContext();
    }

    @Test
    void conUnaSesionPreviaCambiaElIdentificador() {
        String idAnterior = request.getSession(true).getId();

        servicio.iniciarSesion(con("ROLE_CLIENTE"), request, response);

        assertNotEquals(idAnterior, request.getSession(false).getId());
    }

    @Test
    void laAutenticacionQuedaGuardadaEnLaSesion() {
        Authentication auth = con("ROLE_CLIENTE");

        servicio.iniciarSesion(auth, request, response);

        HttpSession sesion = request.getSession(false);
        assertNotNull(sesion);
        SecurityContext guardado = (SecurityContext) sesion.getAttribute(
                HttpSessionSecurityContextRepository.SPRING_SECURITY_CONTEXT_KEY);
        assertNotNull(guardado);
        assertSame(auth, guardado.getAuthentication());
        assertSame(auth, SecurityContextHolder.getContext().getAuthentication());
    }

    @Test
    void laSesionDelEquipoDuraDoceHorasDeInactividad() {
        servicio.iniciarSesion(con("ROLE_ADMIN"), request, response);
        assertEquals(12 * 60 * 60, request.getSession(false).getMaxInactiveInterval());

        MockHttpServletRequest otro = new MockHttpServletRequest();
        servicio.iniciarSesion(con("ROLE_OPERADOR"), otro, new MockHttpServletResponse());
        assertEquals(12 * 60 * 60, otro.getSession(false).getMaxInactiveInterval());
    }

    @Test
    void laSesionDeUnClienteConservaLaDuracionDelServidor() {
        int porDefecto = request.getSession(true).getMaxInactiveInterval();

        servicio.iniciarSesion(con("ROLE_CLIENTE"), request, response);

        assertEquals(porDefecto, request.getSession(false).getMaxInactiveInterval());
    }

    private static Authentication con(String rol) {
        return UsernamePasswordAuthenticationToken.authenticated(
                "alguien@tierra.esquel", null, AuthorityUtils.createAuthorityList(rol));
    }
}
