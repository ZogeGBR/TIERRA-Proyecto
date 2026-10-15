package com.tierra.ecommerce.service;

import com.tierra.ecommerce.dto.MarcaDTO;
import com.tierra.ecommerce.entity.Marca;
import com.tierra.ecommerce.repository.MarcaRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Sort;

import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class MarcaServiceTest {

    @Mock private MarcaRepository marcaRepository;
    @InjectMocks private MarcaService marcaService;

    @Test
    void devuelveLasMarcasEnElOrdenDeLaBase() {
        assertEquals(Sort.by("nombre"), MarcaService.ORDEN);
        Marca northland = marca("Northland", "https://cdn.tierra.test/northland.png");
        Marca scott = marca("Scott", null);
        when(marcaRepository.findAll(MarcaService.ORDEN)).thenReturn(List.of(northland, scott));

        List<MarcaDTO> lista = marcaService.listar();

        assertEquals(List.of("Northland", "Scott"), lista.stream().map(MarcaDTO::nombre).toList());
        assertEquals(northland.getId(), lista.get(0).id());
        assertEquals("https://cdn.tierra.test/northland.png", lista.get(0).logoUrl());
    }

    @Test
    void unaMarcaSinLogoLoDevuelveEnNull() {
        Marca scott = marca("Scott", null);
        when(marcaRepository.findAll(MarcaService.ORDEN)).thenReturn(List.of(scott));

        assertNull(marcaService.listar().get(0).logoUrl());
    }

    private static Marca marca(String nombre, String logoUrl) {
        Marca m = new Marca();
        m.setId(UUID.randomUUID());
        m.setNombre(nombre);
        m.setLogoUrl(logoUrl);
        return m;
    }
}
