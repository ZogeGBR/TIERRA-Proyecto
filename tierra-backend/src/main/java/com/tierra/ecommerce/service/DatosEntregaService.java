package com.tierra.ecommerce.service;

import com.tierra.ecommerce.dto.DatosEntregaResponse;
import com.tierra.ecommerce.entity.Direccion;
import com.tierra.ecommerce.entity.DireccionEntrega;
import com.tierra.ecommerce.entity.Usuario;
import com.tierra.ecommerce.enums.TipoEntrega;
import com.tierra.ecommerce.exception.RecursoNoEncontradoException;
import com.tierra.ecommerce.repository.DireccionRepository;
import com.tierra.ecommerce.repository.UsuarioRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

// Datos guardados para la próxima compra (tarea 22, ADR 0005): nombre,
// teléfono y DNI en la cuenta (usuarios) y una sola dirección (direcciones).
//
// Hay una sola puerta de escritura, el checkout con sesión de cliente y la
// casilla tildada (guardar). No existe un endpoint para escribirlos: la
// cuenta solo expone leerlos y borrarlos.
@Service
public class DatosEntregaService {

    private final UsuarioRepository usuarioRepository;
    private final DireccionRepository direccionRepository;

    public DatosEntregaService(UsuarioRepository usuarioRepository, DireccionRepository direccionRepository) {
        this.usuarioRepository = usuarioRepository;
        this.direccionRepository = direccionRepository;
    }

    @Transactional(readOnly = true)
    public DatosEntregaResponse obtener(UUID usuarioId) {
        Usuario usuario = usuarioRepository.findById(usuarioId)
                .orElseThrow(() -> new RecursoNoEncontradoException("Usuario no encontrado"));
        DireccionEntrega direccion = direccionRepository.findByUsuarioId(usuarioId)
                .map(DatosEntregaService::aDireccionEntrega)
                .orElse(null);
        return new DatosEntregaResponse(usuario.getNombre(), usuario.getTelefono(), usuario.getDni(), direccion);
    }

    // Lo llama CheckoutService DENTRO de la transacción del pedido, solo con
    // sesión de cliente y la casilla tildada: si el pedido no se crea, no se
    // guarda nada. El cliente tiene que venir de la sesión, nunca del email
    // escrito en el checkout.
    //
    // Con retiro en el local no hay DNI ni dirección: se guardan nombre y
    // teléfono, y el DNI y la dirección que ya estaban se conservan (retirar
    // una vez en el local no tiene por qué borrar la dirección de siempre).
    //
    // MANDATORY: si alguien lo llamara fuera de una transacción, falla en vez
    // de guardar los datos por separado del pedido.
    @Transactional(propagation = Propagation.MANDATORY)
    public void guardar(Usuario cliente, NuevoPedido datos) {
        cliente.setNombre(datos.contactoNombre());
        cliente.setTelefono(datos.contactoTelefono());
        if (datos.tipoEntrega() == TipoEntrega.ENVIO_DOMICILIO) {
            cliente.setDni(datos.contactoDni());
            DireccionEntrega d = datos.direccion();
            direccionRepository.guardarUnica(UUID.randomUUID(), cliente.getId(), d.getCalle(), d.getNumero(),
                    d.getPiso(), d.getDepartamento(), d.getCiudad(), d.getProvincia(), d.getCodigoPostal());
        }
        usuarioRepository.save(cliente);
    }

    // Borra teléfono, DNI y la dirección guardada. El nombre queda: es el de
    // la cuenta y no puede faltar. Los pedidos no se tocan: cada uno tiene su
    // propia copia del contacto y la dirección.
    @Transactional
    public void borrar(UUID usuarioId) {
        Usuario usuario = usuarioRepository.findById(usuarioId)
                .orElseThrow(() -> new RecursoNoEncontradoException("Usuario no encontrado"));
        usuario.setTelefono(null);
        usuario.setDni(null);
        usuarioRepository.save(usuario);
        direccionRepository.borrarDelUsuario(usuarioId);
    }

    private static DireccionEntrega aDireccionEntrega(Direccion d) {
        return new DireccionEntrega(d.getCalle(), d.getNumero(), d.getPiso(), d.getDepartamento(),
                d.getCiudad(), d.getProvincia(), d.getCodigoPostal());
    }
}
