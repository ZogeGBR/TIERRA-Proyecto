package com.tierra.ecommerce.service;

import com.tierra.ecommerce.dto.MarcaDTO;
import com.tierra.ecommerce.entity.Marca;
import com.tierra.ecommerce.repository.MarcaRepository;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@Transactional(readOnly = true)
public class MarcaService {

    // El nombre de una marca es único en la base: no hace falta desempate.
    static final Sort ORDEN = Sort.by("nombre");

    private final MarcaRepository marcaRepository;

    public MarcaService(MarcaRepository marcaRepository) {
        this.marcaRepository = marcaRepository;
    }

    public List<MarcaDTO> listar() {
        return marcaRepository.findAll(ORDEN).stream()
                .map(MarcaService::aDto)
                .toList();
    }

    private static MarcaDTO aDto(Marca marca) {
        return new MarcaDTO(marca.getId(), marca.getNombre(), marca.getLogoUrl());
    }
}
