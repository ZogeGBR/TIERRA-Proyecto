package com.tierra.ecommerce.service;

import com.tierra.ecommerce.dto.SesionCajaResponseDTO;
import com.tierra.ecommerce.entity.SesionCaja;
import com.tierra.ecommerce.entity.Ubicacion;
import com.tierra.ecommerce.entity.Usuario;
import com.tierra.ecommerce.enums.EstadoSesionCaja;
import com.tierra.ecommerce.exception.RecursoNoEncontradoException;
import com.tierra.ecommerce.exception.SesionCajaInvalidaException;
import com.tierra.ecommerce.repository.SesionCajaRepository;
import com.tierra.ecommerce.repository.UbicacionRepository;
import com.tierra.ecommerce.repository.UsuarioRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Service
public class SesionCajaService {

    private final SesionCajaRepository sesionCajaRepository;
    private final UsuarioRepository usuarioRepository;
    private final UbicacionRepository ubicacionRepository;

    public SesionCajaService(SesionCajaRepository sesionCajaRepository,
                              UsuarioRepository usuarioRepository,
                              UbicacionRepository ubicacionRepository) {
        this.sesionCajaRepository = sesionCajaRepository;
        this.usuarioRepository = usuarioRepository;
        this.ubicacionRepository = ubicacionRepository;
    }

    // Un solo usuario para todo el local elimina la trazabilidad interna
    // (¿quién cerró la caja con la diferencia?). Por eso cada apertura
    // queda atada a un usuario puntual, y no se puede abrir una segunda
    // sesión activa para el mismo vendedor.
    @Transactional
    public SesionCajaResponseDTO abrir(UUID usuarioId, UUID ubicacionId, BigDecimal montoInicial) {
        if (sesionCajaRepository.findByUsuarioIdAndEstado(usuarioId, EstadoSesionCaja.ABIERTA).isPresent()) {
            throw new SesionCajaInvalidaException("Este usuario ya tiene una sesión de caja abierta");
        }

        Usuario usuario = usuarioRepository.findById(usuarioId)
                .orElseThrow(() -> new RecursoNoEncontradoException("Usuario no encontrado"));
        Ubicacion ubicacion = ubicacionRepository.findById(ubicacionId)
                .orElseThrow(() -> new RecursoNoEncontradoException("Ubicación no encontrada"));

        SesionCaja sesion = new SesionCaja();
        sesion.setUsuario(usuario);
        sesion.setUbicacion(ubicacion);
        sesion.setMontoInicial(montoInicial);
        sesion.setEstado(EstadoSesionCaja.ABIERTA);
        sesion = sesionCajaRepository.save(sesion);

        return aResponseDTO(sesion);
    }

    @Transactional
    public SesionCajaResponseDTO cerrar(UUID sesionId, BigDecimal montoFinal) {
        SesionCaja sesion = sesionCajaRepository.findById(sesionId)
                .orElseThrow(() -> new RecursoNoEncontradoException("Sesión de caja no encontrada"));

        if (sesion.getEstado() == EstadoSesionCaja.CERRADA) {
            throw new SesionCajaInvalidaException("La sesión de caja ya está cerrada");
        }

        sesion.setEstado(EstadoSesionCaja.CERRADA);
        sesion.setMontoFinal(montoFinal);
        sesion.setCerradaEn(LocalDateTime.now());
        sesion = sesionCajaRepository.save(sesion);

        // El arqueo (comparar montoFinal contra lo esperado según las ventas
        // registradas en esta sesión) es lógica de reporting — se calcula
        // consultando pedidos por sesion_caja_id, no se guarda acá.
        return aResponseDTO(sesion);
    }

    private SesionCajaResponseDTO aResponseDTO(SesionCaja sesion) {
        return new SesionCajaResponseDTO(
                sesion.getId(), sesion.getEstado(), sesion.getMontoInicial(),
                sesion.getMontoFinal(), sesion.getAbiertaEn(), sesion.getCerradaEn()
        );
    }
}
