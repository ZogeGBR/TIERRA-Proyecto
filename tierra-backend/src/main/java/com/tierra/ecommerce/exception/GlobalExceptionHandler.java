package com.tierra.ecommerce.exception;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
// Ojo: la de Spring Security, NO java.nio.file.AccessDeniedException.
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.HttpRequestMethodNotSupportedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.servlet.NoHandlerFoundException;
import org.springframework.web.servlet.resource.NoResourceFoundException;

import java.util.Objects;
import java.util.stream.Collectors;

// Handler centralizado: ningun controller necesita try/catch propio,
// y nunca se filtra un stack trace ni un mensaje interno al cliente.
@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @ExceptionHandler(RecursoNoEncontradoException.class)
    public ResponseEntity<ErrorResponse> handleNoEncontrado(RecursoNoEncontradoException ex) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(new ErrorResponse(ex.getMessage()));
    }

    @ExceptionHandler(StockInsuficienteException.class)
    public ResponseEntity<ErrorResponse> handleStock(StockInsuficienteException ex) {
        return ResponseEntity.status(HttpStatus.CONFLICT).body(new ErrorResponse(ex.getMessage()));
    }

    @ExceptionHandler(EquipoNoDisponibleException.class)
    public ResponseEntity<ErrorResponse> handleEquipoNoDisponible(EquipoNoDisponibleException ex) {
        return ResponseEntity.status(HttpStatus.CONFLICT).body(new ErrorResponse(ex.getMessage()));
    }

    // Credenciales inválidas. El mensaje es SIEMPRE el mismo, exista o no el
    // email: si difiriera, cualquiera podría averiguar qué direcciones están
    // registradas probando una por una.
    // Lo lanza @PreAuthorize cuando el rol no alcanza.
    //
    // Hace falta acá además del AccessDeniedHandler de SecurityConfig, porque
    // son dos caminos distintos: aquél atrapa las denegaciones de la cadena de
    // filtros (las reglas por URL), y éste las de nivel de método, que ocurren
    // ya dentro del controller y por eso llegan al @RestControllerAdvice.
    //
    // Sin este handler, un 403 legítimo de @PreAuthorize cae en el genérico y
    // el cliente recibe "ocurrió un error inesperado" con un 500.
    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<ErrorResponse> handleAccesoDenegado(AccessDeniedException ex) {
        return ResponseEntity.status(HttpStatus.FORBIDDEN)
                .body(new ErrorResponse("No tenés permisos para hacer esto"));
    }

    @ExceptionHandler(CredencialesInvalidasException.class)
    public ResponseEntity<ErrorResponse> handleCredenciales(CredencialesInvalidasException ex) {
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(new ErrorResponse(ex.getMessage()));
    }

    // 423 Locked: la cuenta existe y la contraseña podría ser correcta, pero
    // hubo demasiados intentos fallidos. Se distingue del 401 a propósito, para
    // que el frontend pueda explicar que hay que esperar en vez de insistir.
    @ExceptionHandler(CuentaBloqueadaException.class)
    public ResponseEntity<ErrorResponse> handleBloqueada(CuentaBloqueadaException ex) {
        return ResponseEntity.status(HttpStatus.LOCKED).body(new ErrorResponse(ex.getMessage()));
    }

    @ExceptionHandler(CuentaDeshabilitadaException.class)
    public ResponseEntity<ErrorResponse> handleDeshabilitada(CuentaDeshabilitadaException ex) {
        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(new ErrorResponse(ex.getMessage()));
    }

    @ExceptionHandler(EmailYaRegistradoException.class)
    public ResponseEntity<ErrorResponse> handleEmailDuplicado(EmailYaRegistradoException ex) {
        return ResponseEntity.status(HttpStatus.CONFLICT).body(new ErrorResponse(ex.getMessage()));
    }

    // Errores de validación de los DTO. Sin este handler caían en el genérico
    // y el frontend recibía un 500 en vez de saber qué campo está mal.
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ErrorResponse> handleValidacion(MethodArgumentNotValidException ex) {
        String detalle = ex.getBindingResult().getFieldErrors().stream()
                .map(error -> error.getDefaultMessage())
                .filter(Objects::nonNull)
                .distinct()
                .collect(Collectors.joining(". "));
        if (detalle.isBlank()) {
            detalle = "Los datos enviados no son válidos";
        }
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(new ErrorResponse(detalle));
    }

    // JSON mal formado, un enum con un valor que no existe, un campo con el
    // tipo equivocado. Sin este handler caía en el genérico y el cliente
    // recibía un 500 que parecía una falla del servidor.
    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<ErrorResponse> handleCuerpoIlegible(HttpMessageNotReadableException ex) {
        // El mensaje interno incluye nombres de clases y a veces parte del
        // cuerpo enviado: no se expone.
        log.warn("Cuerpo de request ilegible: {}", ex.getMessage());
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(new ErrorResponse("El cuerpo del pedido no tiene un formato válido"));
    }

    // Método equivocado sobre una ruta que existe: POST donde va GET, por
    // ejemplo. Tiene que llegar como 405 y no como 500, o quien depura no
    // tiene forma de distinguir un error de ruteo de una falla real.
    @ExceptionHandler(HttpRequestMethodNotSupportedException.class)
    public ResponseEntity<ErrorResponse> handleMetodoNoSoportado(HttpRequestMethodNotSupportedException ex) {
        return ResponseEntity.status(HttpStatus.METHOD_NOT_ALLOWED)
                .body(new ErrorResponse("El método " + ex.getMethod() + " no está permitido en esta dirección"));
    }

    // Ruta inexistente. NoResourceFoundException es la que lanza Spring 6.1
    // cuando no hay handler; NoHandlerFoundException queda por compatibilidad.
    @ExceptionHandler({NoHandlerFoundException.class, NoResourceFoundException.class})
    public ResponseEntity<ErrorResponse> handleRutaNoEncontrada(Exception ex) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(new ErrorResponse("La dirección solicitada no existe"));
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<ErrorResponse> handleIllegalArgument(IllegalArgumentException ex) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(new ErrorResponse(ex.getMessage()));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorResponse> handleGenerico(Exception ex) {
        // Antes esto no quedaba registrado en ningún lado — el cliente veía
        // "error inesperado" y nosotros no teníamos forma de saber qué pasó.
        log.error("Error no controlado", ex);
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(new ErrorResponse("Ocurrió un error inesperado. Intentá de nuevo más tarde."));
    }
}
