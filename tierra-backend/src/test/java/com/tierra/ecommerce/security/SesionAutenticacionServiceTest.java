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

import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertSame;

// Los dos comportamientos de este servicio que ningún script de verificación
// comprueba: que el identificador de sesión cambie al autenticarse, y que la
// autenticación quede guardada en la sesión y no solo en el hilo actual.
// Se usa el repositorio real de Spring, el mismo que define SecurityConfig.
class SesionAutenticacionServiceTest {

    private SesionAutenticacionService servicio;
    private MockHttpServletRequest request;
    private MockHttpServletResponse response;
    private Authentication auth;

    @BeforeEach
    void setUp() {
        servicio = new SesionAutenticacionService(new HttpSessionSecurityContextRepository());
        request = new MockHttpServletRequest();
        response = new MockHttpServletResponse();
        auth = UsernamePasswordAuthenticationToken.authenticated(
                "test@tierra.esquel", null, AuthorityUtils.createAuthorityList("ROLE_CLIENTE"));
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

        servicio.iniciarSesion(auth, request, response);

        assertNotEquals(idAnterior, request.getSession(false).getId());
    }

    @Test
    void laAutenticacionQuedaGuardadaEnLaSesion() {
        servicio.iniciarSesion(auth, request, response);

        HttpSession sesion = request.getSession(false);
        assertNotNull(sesion);
        SecurityContext guardado = (SecurityContext) sesion.getAttribute(
                HttpSessionSecurityContextRepository.SPRING_SECURITY_CONTEXT_KEY);
        assertNotNull(guardado);
        assertSame(auth, guardado.getAuthentication());
        assertSame(auth, SecurityContextHolder.getContext().getAuthentication());
    }
}
