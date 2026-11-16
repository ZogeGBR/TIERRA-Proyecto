package com.tierra.ecommerce.service;

import com.tierra.ecommerce.dto.CheckoutRequest;
import com.tierra.ecommerce.dto.CheckoutResponse;
import com.tierra.ecommerce.dto.PreferenciaPagoResponse;
import com.tierra.ecommerce.entity.DireccionEntrega;
import com.tierra.ecommerce.entity.Pedido;
import com.tierra.ecommerce.entity.Usuario;
import com.tierra.ecommerce.enums.RolUsuario;
import com.tierra.ecommerce.enums.TipoEntrega;
import com.tierra.ecommerce.exception.EmailDelEquipoException;
import com.tierra.ecommerce.exception.LinkDePagoNoDisponibleException;
import com.tierra.ecommerce.exception.RecursoNoEncontradoException;
import com.tierra.ecommerce.repository.UsuarioRepository;
import com.tierra.ecommerce.security.UsuarioAutenticado;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import java.util.UUID;

// Checkout sin cuenta (tarea 9, ADR 0005): la única puerta para crear pedidos.
//
// | Sesión     | Email del checkout   | Qué pasa                                   |
// |------------|----------------------|--------------------------------------------|
// | Ninguna    | No existe            | Se crea el cliente SIN contraseña          |
// | Ninguna    | Es de un cliente     | El pedido se asocia; la cuenta NO se toca  |
// | Ninguna    | Es del equipo        | 409 EMAIL_DEL_EQUIPO                       |
// | De cliente | Se ignora            | El pedido va al cliente de la sesión       |
// | Del equipo | Cualquiera           | Como si no hubiera sesión                  |
//
// Y en ningún caso el checkout abre una sesión: escribir el email de otra
// persona no da acceso a nada. La única vez que el checkout escribe en una
// cuenta es con sesión de cliente y la casilla "guardar mis datos" tildada
// (tarea 22): ahí el email está demostrado con el código.
@Service
public class CheckoutService {

    private static final Logger log = LoggerFactory.getLogger(CheckoutService.class);

    private final UsuarioRepository usuarioRepository;
    private final PedidoService pedidoService;
    private final PagoService pagoService;
    private final DatosEntregaService datosEntregaService;
    private final TransactionTemplate transaccion;

    public CheckoutService(UsuarioRepository usuarioRepository, PedidoService pedidoService,
                           PagoService pagoService, DatosEntregaService datosEntregaService,
                           PlatformTransactionManager transactionManager) {
        this.usuarioRepository = usuarioRepository;
        this.pedidoService = pedidoService;
        this.pagoService = pagoService;
        this.datosEntregaService = datosEntregaService;
        this.transaccion = new TransactionTemplate(transactionManager);
    }

    // sesion: el principal de la sesión, o null si no hay.
    //
    // NO es @Transactional a propósito: el link de pago se pide DESPUÉS de que
    // la transacción del pedido confirma, en otra transacción. Es una llamada
    // de red a Mercado Pago y no debe ocurrir con el pedido y el stock
    // bloqueados (ADR 0005).
    public CheckoutResponse comprar(CheckoutRequest request, UsuarioAutenticado sesion) {
        NuevoPedido datos = validarYArmar(request);

        Pedido pedido = transaccion.execute(estado -> {
            Usuario cliente = resolverCliente(request, sesion);
            Pedido creado = pedidoService.crearPedido(cliente, datos);
            // En la misma transacción: si el pedido no se crea, no se guarda nada.
            if (guardaDatos(request, sesion)) {
                datosEntregaService.guardar(cliente, datos);
            }
            return creado;
        });

        PreferenciaPagoResponse preferencia;
        try {
            preferencia = pagoService.crearPreferenciaPago(pedido.getId(), pedido.getUsuario().getId());
        } catch (RuntimeException e) {
            compensar(pedido.getId(), e);
            throw new LinkDePagoNoDisponibleException(e);
        }
        return new CheckoutResponse(pedido.getId(), pedido.getTotal(), preferencia.initPoint(), preferencia.expiraEn());
    }

    // Sin link no hay forma de pagar: el pedido se cancela y el stock se
    // libera en el momento. Si hasta eso falla, el job de vencimientos lo
    // resuelve igual a los veinte minutos; se registra para enterarse.
    private void compensar(UUID pedidoId, RuntimeException causa) {
        log.warn("No se pudo generar el link de pago del pedido {}: se cancela y se libera el stock", pedidoId, causa);
        try {
            pedidoService.cancelarSinLinkDePago(pedidoId);
        } catch (RuntimeException e) {
            log.error("No se pudo cancelar el pedido {} después de fallar el link de pago; "
                    + "lo va a liberar el job de vencimientos", pedidoId, e);
        }
    }

    // Solo con sesión de cliente: es la única forma de saber que la cuenta es de
    // quien compra. Sin sesión, la casilla se ignora aunque llegue tildada.
    static boolean guardaDatos(CheckoutRequest request, UsuarioAutenticado sesion) {
        return Boolean.TRUE.equals(request.guardarDatos())
                && sesion != null && sesion.getRol() == RolUsuario.CLIENTE;
    }

    // Quién es el dueño del pedido. Corre dentro de la transacción del pedido.
    Usuario resolverCliente(CheckoutRequest request, UsuarioAutenticado sesion) {
        if (sesion != null && sesion.getRol() == RolUsuario.CLIENTE) {
            // Con sesión de cliente, el email que se escribió no importa.
            return usuarioRepository.findById(sesion.getId())
                    .orElseThrow(() -> new RecursoNoEncontradoException("Usuario no encontrado"));
        }
        // Sin sesión o con sesión del equipo: decide el email del checkout.
        String email = AuthService.normalizarEmail(request.email());
        Usuario existente = usuarioRepository.findByEmail(email).orElse(null);
        if (existente == null) {
            // Un cliente nuevo solo con nombre, email y rol: teléfono, DNI y
            // dirección viven en cada pedido, no en la cuenta.
            usuarioRepository.insertarClienteSiNoExiste(UUID.randomUUID(), request.nombre().trim(), email);
            existente = usuarioRepository.findByEmail(email)
                    .orElseThrow(() -> new IllegalStateException("No se encontró el cliente recién creado"));
        }
        if (existente.getRol() != RolUsuario.CLIENTE) {
            throw new EmailDelEquipoException();
        }
        // Un cliente existente, activo o no, recibe el pedido sin que se
        // modifique ningún dato de su cuenta (ADR 0005).
        return existente;
    }

    // Las reglas que dependen del tipo de entrega (las fijas las valida el
    // DTO). Se valida antes de tocar la base.
    static NuevoPedido validarYArmar(CheckoutRequest r) {
        String telefono = r.telefono().trim();
        int digitosTelefono = telefono.replaceAll("\\D", "").length();
        if (digitosTelefono < 8 || digitosTelefono > 15) {
            throw new IllegalArgumentException("El teléfono tiene que tener entre 8 y 15 números, con código de área");
        }

        if (r.tipoEntrega() == TipoEntrega.RETIRO_LOCAL) {
            // Para retirar en el local no hacen falta ni DNI ni dirección: si
            // llegan, se ignoran.
            return new NuevoPedido(TipoEntrega.RETIRO_LOCAL, null, r.nombre().trim(), telefono, null, r.items());
        }

        String dni = r.dni() == null ? "" : r.dni().replaceAll("\\D", "");
        if (dni.length() < 7 || dni.length() > 8) {
            throw new IllegalArgumentException("Para el envío a domicilio hace falta el DNI (7 u 8 números)");
        }
        CheckoutRequest.DireccionCheckout d = r.direccion();
        if (d == null || vacio(d.calle()) || vacio(d.ciudad()) || vacio(d.provincia()) || vacio(d.codigoPostal())) {
            throw new IllegalArgumentException("Para el envío a domicilio hacen falta la calle, la ciudad, la provincia y el código postal");
        }
        DireccionEntrega direccion = new DireccionEntrega(
                d.calle().trim(), recortar(d.numero()), recortar(d.piso()), recortar(d.departamento()),
                d.ciudad().trim(), d.provincia().trim(), d.codigoPostal().trim());
        return new NuevoPedido(TipoEntrega.ENVIO_DOMICILIO, direccion, r.nombre().trim(), telefono, dni, r.items());
    }

    private static boolean vacio(String s) {
        return s == null || s.isBlank();
    }

    private static String recortar(String s) {
        return vacio(s) ? null : s.trim();
    }
}
