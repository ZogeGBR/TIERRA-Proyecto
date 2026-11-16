package com.tierra.ecommerce.service;

import com.tierra.ecommerce.dto.TipoAlquilerDTO;
import com.tierra.ecommerce.entity.TipoEquipoAlquiler;
import com.tierra.ecommerce.repository.TipoEquipoAlquilerRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoMoreInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class TipoAlquilerServiceTest {

    @Mock private TipoEquipoAlquilerRepository tipoRepository;

    @InjectMocks private TipoAlquilerService service;

    private static TipoEquipoAlquiler tipo(String nombre, String precio) {
        TipoEquipoAlquiler t = new TipoEquipoAlquiler();
        t.setId(UUID.randomUUID());
        t.setNombre(nombre);
        t.setPrecioDia(new BigDecimal(precio));
        return t;
    }

    @Test
    void listarConPrecio_devuelveIdNombreYPrecioEnElOrdenDelRepositorio() {
        TipoEquipoAlquiler bastones = tipo("Bastones", "2500.00");
        TipoEquipoAlquiler esquis = tipo("Esquís", "12000.00");
        when(tipoRepository.findByPrecioDiaIsNotNullOrderByNombre()).thenReturn(List.of(bastones, esquis));

        List<TipoAlquilerDTO> tipos = service.listarConPrecio();

        assertEquals(List.of(
                new TipoAlquilerDTO(bastones.getId(), "Bastones", new BigDecimal("2500.00")),
                new TipoAlquilerDTO(esquis.getId(), "Esquís", new BigDecimal("12000.00"))
        ), tipos);
    }

    @Test
    void listarConPrecio_soloConsultaLosTiposConPrecio() {
        when(tipoRepository.findByPrecioDiaIsNotNullOrderByNombre()).thenReturn(List.of());

        assertTrue(service.listarConPrecio().isEmpty());
        // Nunca findAll: un tipo sin precio no se muestra.
        verify(tipoRepository).findByPrecioDiaIsNotNullOrderByNombre();
        verifyNoMoreInteractions(tipoRepository);
    }
}
