package com.tierra.ecommerce.service;

import com.tierra.ecommerce.dto.EquipoDisponibleDTO;
import com.tierra.ecommerce.entity.EquipoAlquiler;
import com.tierra.ecommerce.repository.EquipoAlquilerRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Service
@Transactional(readOnly = true)
public class DisponibilidadAlquilerService {

    private final EquipoAlquilerRepository equipoRepository;

    public DisponibilidadAlquilerService(EquipoAlquilerRepository equipoRepository) {
        this.equipoRepository = equipoRepository;
    }

    public List<EquipoDisponibleDTO> buscarDisponibles(UUID tipoId, LocalDate fechaInicio, LocalDate fechaFin) {
        if (fechaFin.isBefore(fechaInicio)) {
            throw new IllegalArgumentException("La fecha de fin no puede ser anterior a la de inicio");
        }
        return equipoRepository.findDisponibles(tipoId, fechaInicio, fechaFin)
                .stream()
                .map(this::aDTO)
                .toList();
    }

    private EquipoDisponibleDTO aDTO(EquipoAlquiler equipo) {
        return new EquipoDisponibleDTO(
                equipo.getId(),
                equipo.getTipo().getNombre(),
                equipo.getMarca() != null ? equipo.getMarca().getNombre() : null,
                equipo.getModelo(),
                equipo.getTalla(),
                equipo.getPrecioDia(),
                equipo.getDepositoGarantia()
        );
    }
}
