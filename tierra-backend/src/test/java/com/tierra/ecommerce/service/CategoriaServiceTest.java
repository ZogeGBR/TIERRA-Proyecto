package com.tierra.ecommerce.service;

import com.tierra.ecommerce.dto.CategoriaDTO;
import com.tierra.ecommerce.entity.Categoria;
import com.tierra.ecommerce.repository.CategoriaRepository;
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
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CategoriaServiceTest {

    @Mock private CategoriaRepository categoriaRepository;
    @InjectMocks private CategoriaService categoriaService;

    @Test
    void unaSubcategoriaTraeElIdDeSuPadre() {
        Categoria ropa = categoria("Ropa", "ropa", null);
        Categoria deportiva = categoria("Ropa deportiva", "ropa-deportiva", ropa);
        when(categoriaRepository.findAll(CategoriaService.ORDEN)).thenReturn(List.of(ropa, deportiva));

        List<CategoriaDTO> lista = categoriaService.listar();

        assertEquals(ropa.getId(), lista.get(1).categoriaPadreId());
    }

    @Test
    void unaCategoriaPrincipalNoTienePadre() {
        Categoria carpas = categoria("Carpas", "carpas", null);
        when(categoriaRepository.findAll(CategoriaService.ORDEN)).thenReturn(List.of(carpas));

        CategoriaDTO dto = categoriaService.listar().get(0);

        assertEquals(carpas.getId(), dto.id());
        assertEquals("Carpas", dto.nombre());
        assertEquals("carpas", dto.slug());
        assertNull(dto.categoriaPadreId());
    }

    // El orden lo da la base. Si el servicio pidiera otro, Mockito (en modo
    // estricto) falla porque la llamada no coincide con la preparada.
    @Test
    void pideLasCategoriasOrdenadasPorNombreYRespetaEseOrden() {
        assertEquals(Sort.by("nombre", "id"), CategoriaService.ORDEN);
        Categoria a = categoria("Bicicletas", "bicicletas", null);
        Categoria b = categoria("Cascos", "cascos", null);
        when(categoriaRepository.findAll(CategoriaService.ORDEN)).thenReturn(List.of(a, b));

        List<CategoriaDTO> lista = categoriaService.listar();

        assertEquals(List.of("bicicletas", "cascos"), lista.stream().map(CategoriaDTO::slug).toList());
    }

    @Test
    void sinCategoriasDevuelveUnaListaVacia() {
        when(categoriaRepository.findAll(CategoriaService.ORDEN)).thenReturn(List.of());

        assertTrue(categoriaService.listar().isEmpty());
    }

    private static Categoria categoria(String nombre, String slug, Categoria padre) {
        Categoria c = new Categoria();
        c.setId(UUID.randomUUID());
        c.setNombre(nombre);
        c.setSlug(slug);
        c.setCategoriaPadre(padre);
        return c;
    }
}
