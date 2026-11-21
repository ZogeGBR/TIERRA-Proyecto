package com.tierra.ecommerce.service;

import com.tierra.ecommerce.dto.TipoAlquilerDTO;
import com.tierra.ecommerce.entity.TipoEquipoAlquiler;
import com.tierra.ecommerce.repository.TipoEquipoAlquilerRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

// Los tipos de equipo de la página de alquiler, con su precio por día, para
// el estimador (tarea 20). No informa disponibilidad ni toca las unidades,
// las reservas o las tarifas por temporada: eso es del módulo congelado por
// la decisión 0001.
@Service
@Transactional(readOnly = true)
public class TipoAlquilerService {

    private final TipoEquipoAlquilerRepository tipoRepository;

    public TipoAlquilerService(TipoEquipoAlquilerRepository tipoRepository) {
        this.tipoRepository = tipoRepository;
    }

    // Solo los que tienen precio, ordenados por nombre.
    public List<TipoAlquilerDTO> listarConPrecio() {
        return tipoRepository.findByPrecioDiaIsNotNullOrderByNombre().stream()
                .map(TipoAlquilerService::aDto)
                .toList();
    }

    private static TipoAlquilerDTO aDto(TipoEquipoAlquiler tipo) {
        return new TipoAlquilerDTO(tipo.getId(), tipo.getNombre(), tipo.getPrecioDia());
    }
}
