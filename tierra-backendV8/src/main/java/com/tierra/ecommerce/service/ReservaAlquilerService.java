package com.tierra.ecommerce.service;

import com.tierra.ecommerce.dto.CrearReservaRequest;
import com.tierra.ecommerce.dto.ItemReservaRequest;
import com.tierra.ecommerce.dto.ReservaResponseDTO;
import com.tierra.ecommerce.entity.EquipoAlquiler;
import com.tierra.ecommerce.entity.ReservaAlquiler;
import com.tierra.ecommerce.entity.ReservaItem;
import com.tierra.ecommerce.entity.Usuario;
import com.tierra.ecommerce.enums.EstadoReserva;
import com.tierra.ecommerce.exception.EquipoNoDisponibleException;
import com.tierra.ecommerce.exception.RecursoNoEncontradoException;
import com.tierra.ecommerce.repository.EquipoAlquilerRepository;
import com.tierra.ecommerce.repository.ReservaAlquilerRepository;
import com.tierra.ecommerce.repository.ReservaItemRepository;
import com.tierra.ecommerce.repository.UsuarioRepository;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.temporal.ChronoUnit;

@Service
public class ReservaAlquilerService {

    private final ReservaAlquilerRepository reservaRepository;
    private final ReservaItemRepository reservaItemRepository;
    private final EquipoAlquilerRepository equipoRepository;
    private final UsuarioRepository usuarioRepository;

    public ReservaAlquilerService(ReservaAlquilerRepository reservaRepository,
                                   ReservaItemRepository reservaItemRepository,
                                   EquipoAlquilerRepository equipoRepository,
                                   UsuarioRepository usuarioRepository) {
        this.reservaRepository = reservaRepository;
        this.reservaItemRepository = reservaItemRepository;
        this.equipoRepository = equipoRepository;
        this.usuarioRepository = usuarioRepository;
    }

    // Transaccional para que la re-validación de disponibilidad y la creación de la
    // reserva sean atómicas: si dos personas reservan el mismo equipo casi al mismo
    // tiempo, la segunda transacción vuelve a chequear disponibilidad y falla acá
    // en vez de crear una reserva duplicada sobre el mismo equipo y fechas.
    @Transactional
    public ReservaResponseDTO crearReserva(CrearReservaRequest request) {
        if (request.fechaFin().isBefore(request.fechaInicio())) {
            throw new IllegalArgumentException("La fecha de fin no puede ser anterior a la de inicio");
        }

        Usuario usuario = usuarioRepository.findById(request.usuarioId())
                .orElseThrow(() -> new RecursoNoEncontradoException("Usuario no encontrado"));

        long dias = ChronoUnit.DAYS.between(request.fechaInicio(), request.fechaFin()) + 1;

        ReservaAlquiler reserva = new ReservaAlquiler();
        reserva.setUsuario(usuario);
        reserva.setFechaInicio(request.fechaInicio());
        reserva.setFechaFin(request.fechaFin());
        reserva.setEstado(EstadoReserva.RESERVADO);
        reserva.setPrecioTotal(BigDecimal.ZERO);
        reserva.setDepositoTotal(BigDecimal.ZERO);
        reserva = reservaRepository.save(reserva);

        BigDecimal precioTotal = BigDecimal.ZERO;
        BigDecimal depositoTotal = BigDecimal.ZERO;

        for (ItemReservaRequest itemReq : request.equipos()) {
            EquipoAlquiler equipo = equipoRepository.findById(itemReq.equipoId())
                    .orElseThrow(() -> new RecursoNoEncontradoException("Equipo no encontrado: " + itemReq.equipoId()));

            boolean disponible = equipoRepository
                    .findDisponibles(equipo.getTipo().getId(), request.fechaInicio(), request.fechaFin())
                    .stream()
                    .anyMatch(e -> e.getId().equals(equipo.getId()));

            if (!disponible) {
                throw new EquipoNoDisponibleException(
                        "El equipo %s %s (talla %s) ya no está disponible en esas fechas"
                                .formatted(equipo.getTipo().getNombre(), equipo.getModelo(), equipo.getTalla()));
            }

            ReservaItem reservaItem = new ReservaItem();
            reservaItem.setReserva(reserva);
            reservaItem.setEquipo(equipo);
            reservaItem.setPrecioDiaAplicado(equipo.getPrecioDia());
            reservaItem.setFechaInicio(request.fechaInicio());
            reservaItem.setFechaFin(request.fechaFin());

            // Defensa en profundidad: el chequeo de arriba (findDisponibles) ya
            // descartó el caso normal, pero si dos reservas llegan casi al mismo
            // instante, es el EXCLUDE de la base — no esta validación — el que
            // realmente lo impide. Acá solo traducimos esa violación a un mensaje
            // legible en vez de dejar escapar la excepción cruda de Postgres.
            try {
                reservaItemRepository.save(reservaItem);
            } catch (DataIntegrityViolationException e) {
                throw new EquipoNoDisponibleException(
                        "El equipo %s %s (talla %s) se acaba de reservar para esas fechas — probá con otro."
                                .formatted(equipo.getTipo().getNombre(), equipo.getModelo(), equipo.getTalla()));
            }

            precioTotal = precioTotal.add(equipo.getPrecioDia().multiply(BigDecimal.valueOf(dias)));
            depositoTotal = depositoTotal.add(equipo.getDepositoGarantia());
        }

        reserva.setPrecioTotal(precioTotal);
        reserva.setDepositoTotal(depositoTotal);
        reserva = reservaRepository.save(reserva);

        return new ReservaResponseDTO(
                reserva.getId(), reserva.getEstado(), reserva.getFechaInicio(),
                reserva.getFechaFin(), reserva.getPrecioTotal(), reserva.getDepositoTotal()
        );
    }
}
