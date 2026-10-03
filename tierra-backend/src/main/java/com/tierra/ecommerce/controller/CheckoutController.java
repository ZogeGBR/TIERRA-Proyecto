package com.tierra.ecommerce.controller;

import com.tierra.ecommerce.dto.CheckoutRequest;
import com.tierra.ecommerce.dto.CheckoutResponseDTO;
import com.tierra.ecommerce.dto.ResultadoCheckout;
import com.tierra.ecommerce.security.SesionAutenticacionService;
import com.tierra.ecommerce.security.UsuarioAutenticado;
import com.tierra.ecommerce.service.AuthService;
import com.tierra.ecommerce.service.CheckoutService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

// Único endpoint público de creación de pedidos: no exige sesión (a
// diferencia de POST /api/pedidos, que sigue existiendo tal cual para quien
// ya está logueado). Es la puerta de entrada del checkout con cuenta
// implícita -- ver docs/decisiones/0005.
//
// @AuthenticationPrincipal llega null cuando no hay sesión, porque
// SecurityConfig marca esta ruta como permitAll: a diferencia de
// PedidoController, acá SÍ hay que contemplar el caso sin autenticar.
@RestController
@RequestMapping("/api/checkout")
public class CheckoutController {

    private final CheckoutService checkoutService;
    private final SesionAutenticacionService sesionAutenticacionService;

    public CheckoutController(CheckoutService checkoutService,
                              SesionAutenticacionService sesionAutenticacionService) {
        this.checkoutService = checkoutService;
        this.sesionAutenticacionService = sesionAutenticacionService;
    }

    @PostMapping
    public CheckoutResponseDTO checkout(@AuthenticationPrincipal UsuarioAutenticado usuarioAutenticado,
                                        @Valid @RequestBody CheckoutRequest request,
                                        HttpServletRequest httpRequest,
                                        HttpServletResponse httpResponse) {
        var usuarioIdSesion = usuarioAutenticado != null ? usuarioAutenticado.getId() : null;
        ResultadoCheckout resultado = checkoutService.procesar(usuarioIdSesion, request);

        // Si no había sesión, CheckoutService acaba de crear (o encontrar)
        // un usuario: se la abre ahora, para que el resto del flujo --
        // pagar, volver más adelante -- lo trate exactamente igual que a
        // alguien que inició sesión de la forma tradicional.
        if (!resultado.sesionYaExistia()) {
            UsuarioAutenticado principal = new UsuarioAutenticado(resultado.usuario());
            Authentication auth = UsernamePasswordAuthenticationToken.authenticated(
                    principal, null, principal.getAuthorities());
            sesionAutenticacionService.iniciarSesion(auth, httpRequest, httpResponse);
        }

        return new CheckoutResponseDTO(AuthService.aResponse(resultado.usuario()), resultado.pedido());
    }
}
