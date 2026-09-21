package com.tierra.ecommerce.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.tierra.ecommerce.exception.ErrorResponse;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.access.AccessDeniedHandler;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.security.web.csrf.CookieCsrfTokenRepository;
import org.springframework.security.web.csrf.CsrfTokenRequestAttributeHandler;
import org.springframework.web.cors.CorsConfigurationSource;

// Configuración de seguridad de la API.
//
// ALCANCE ACTUAL (etapa A): sólo se definen las reglas de /api/auth. El
// resto de los endpoints sigue abierto igual que antes, porque cerrarlos
// acá rompería el frontend hasta que estén las pantallas de login. Las
// reglas reales por endpoint y los permisos por rol entran en la etapa C.
@Configuration
@EnableWebSecurity
public class SecurityConfig {

    // Dónde se guarda la sesión autenticada. Se expone como bean porque el
    // AuthController lo necesita: ver el comentario del login.
    @Bean
    public SecurityContextRepository securityContextRepository() {
        return new HttpSessionSecurityContextRepository();
    }

    // Lo arma Spring a partir del UserDetailsService y el PasswordEncoder
    // que ya existen. Es lo que usa AuthService para verificar credenciales.
    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration config) throws Exception {
        return config.getAuthenticationManager();
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http,
                                           CorsConfigurationSource corsConfigurationSource,
                                           ObjectMapper objectMapper) throws Exception {

        // El token CSRF se genera de forma diferida en Spring Security 6: si
        // nadie lo lee, la cookie nunca se escribe y el frontend no tiene qué
        // reenviar. Poner el nombre de atributo en null fuerza que se resuelva
        // en cada request, que es lo que hace que la cookie exista siempre.
        //
        // La contrapartida es que se pierde la protección contra BREACH, que
        // sólo importa cuando el token viaja dentro del cuerpo de una respuesta
        // comprimida. Acá viaja en una cookie, así que no aplica.
        CsrfTokenRequestAttributeHandler csrfHandler = new CsrfTokenRequestAttributeHandler();
        csrfHandler.setCsrfRequestAttributeName(null);

        http
            .cors(cors -> cors.configurationSource(corsConfigurationSource))

            // CSRF habilitado, no deshabilitado como estaba. El navegador manda
            // la cookie de sesión en TODA petición a nuestro dominio, incluso si
            // la disparó otro sitio: sin defensa, una página cualquiera podría
            // provocar un POST en nombre de quien esté logueado. El token es la
            // segunda capa; la primera es SameSite=Lax en la cookie de sesión
            // (ver application.yml).
            .csrf(csrf -> csrf
                    .csrfTokenRepository(CookieCsrfTokenRepository.withHttpOnlyFalse())
                    .csrfTokenRequestHandler(csrfHandler)
                    // Lo llama Mercado Pago desde su servidor: no tiene ni puede
                    // tener un token nuestro. Su protección es la verificación de
                    // firma, que es parte de la tarea 6. NO cerrar este endpoint.
                    .ignoringRequestMatchers("/api/pagos/webhook"))

            .sessionManagement(session -> session
                    // Sólo se crea sesión cuando hace falta: quien navega el
                    // catálogo sin cuenta no genera una.
                    .sessionCreationPolicy(SessionCreationPolicy.IF_REQUIRED)
                    // Al autenticarse cambia el identificador de sesión. Es el
                    // comportamiento por defecto, explícito para que nadie lo
                    // apague sin saber que apaga la protección contra fijación.
                    .sessionFixation(fixation -> fixation.changeSessionId()))

            .exceptionHandling(ex -> ex
                    // Sin esto Spring devuelve su respuesta por defecto y el
                    // apiFetch del frontend —que lee cuerpo.mensaje— muestra un
                    // error genérico inútil.
                    .authenticationEntryPoint((request, response, authException) ->
                            escribirError(response, objectMapper, HttpStatus.UNAUTHORIZED,
                                    "Necesitás iniciar sesión para hacer esto"))
                    .accessDeniedHandler(accessDeniedHandler(objectMapper)))

            .logout(logout -> logout
                    .logoutUrl("/api/auth/logout")
                    // Invalida la sesión del lado del servidor, no sólo borra la
                    // cookie: un logout que sólo borra la cookie deja la sesión
                    // viva y reutilizable.
                    .invalidateHttpSession(true)
                    .clearAuthentication(true)
                    .deleteCookies("JSESSIONID")
                    .logoutSuccessHandler((request, response, authentication) ->
                            response.setStatus(HttpServletResponse.SC_NO_CONTENT)))

            .authorizeHttpRequests(auth -> auth
                    // --- Público: el catálogo tiene que verse sin cuenta ---
                    .requestMatchers(HttpMethod.GET, "/api/productos", "/api/productos/**").permitAll()
                    .requestMatchers(HttpMethod.GET, "/api/alquiler/**").permitAll()
                    .requestMatchers("/api/auth/registro", "/api/auth/login").permitAll()

                    // El webhook lo llama Mercado Pago, que no tiene ni puede
                    // tener credenciales nuestras. Su protección es la firma
                    // del pedido, no la autenticación (tarea 6). Va también
                    // exento de CSRF, más arriba en esta misma clase.
                    .requestMatchers(HttpMethod.POST, "/api/pagos/webhook").permitAll()

                    // --- Requiere sesión ---
                    .requestMatchers("/api/auth/yo", "/api/auth/logout").authenticated()
                    .requestMatchers(HttpMethod.POST, "/api/pedidos").authenticated()
                    // Autenticado no alcanza: falta verificar que el pedido
                    // sea de quien pide el link de pago. Esa comprobación va
                    // en PagoService y es de la tarea 6 — está anotada como
                    // hallazgo para quien la haga.
                    .requestMatchers(HttpMethod.POST, "/api/pagos/pedidos/*/preferencia").authenticated()

                    // --- Panel de administración (fase 3) ---
                    // Todavía no existe ningún endpoint bajo /api/admin. La
                    // regla se deja escrita para que la fase 3 siga el patrón
                    // en vez de inventarlo, y para que un endpoint nuevo mal
                    // ubicado no quede accesible por descuido.
                    .requestMatchers("/api/admin/**").hasAnyRole("ADMIN", "OPERADOR")

                    // Cierre por denegación. Un endpoint nuevo al que nadie le
                    // asignó permisos falla en vez de quedar abierto: es el
                    // error correcto, porque se nota enseguida.
                    .anyRequest().denyAll())

            // La API no usa ninguno de los dos: el login es un endpoint JSON.
            .httpBasic(AbstractHttpConfigurer::disable)
            .formLogin(AbstractHttpConfigurer::disable);

        return http.build();
    }

    private AccessDeniedHandler accessDeniedHandler(ObjectMapper objectMapper) {
        return (request, response, accessDeniedException) ->
                escribirError(response, objectMapper, HttpStatus.FORBIDDEN,
                        "No tenés permisos para hacer esto");
    }

    // Devuelve el mismo formato que GlobalExceptionHandler. Los errores de la
    // cadena de filtros no pasan por el @RestControllerAdvice —ocurren antes
    // de llegar a un controller— así que hay que escribirlos a mano.
    private static void escribirError(HttpServletResponse response, ObjectMapper objectMapper,
                                      HttpStatus estado, String mensaje) throws java.io.IOException {
        response.setStatus(estado.value());
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.setCharacterEncoding("UTF-8");
        objectMapper.writeValue(response.getWriter(), new ErrorResponse(mensaje));
    }
}
