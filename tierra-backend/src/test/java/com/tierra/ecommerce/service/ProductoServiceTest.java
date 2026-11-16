package com.tierra.ecommerce.service;

import com.tierra.ecommerce.dto.FiltrosCatalogo;
import com.tierra.ecommerce.dto.OpcionesFiltroDTO;
import com.tierra.ecommerce.dto.PaginaDTO;
import com.tierra.ecommerce.dto.ProductoDetalleDTO;
import com.tierra.ecommerce.dto.ProductoResumenDTO;
import com.tierra.ecommerce.entity.Categoria;
import com.tierra.ecommerce.entity.Marca;
import com.tierra.ecommerce.entity.Producto;
import com.tierra.ecommerce.entity.VarianteProducto;
import com.tierra.ecommerce.enums.GeneroProducto;
import com.tierra.ecommerce.enums.OrdenCatalogo;
import com.tierra.ecommerce.exception.RecursoNoEncontradoException;
import com.tierra.ecommerce.repository.CategoriaRepository;
import com.tierra.ecommerce.repository.ImagenProductoRepository;
import com.tierra.ecommerce.repository.ProductoRepository;
import com.tierra.ecommerce.repository.VarianteProductoRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyCollection;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ProductoServiceTest {

    @Mock private ProductoRepository productoRepository;
    @Mock private VarianteProductoRepository varianteRepository;
    @Mock private ImagenProductoRepository imagenRepository;
    @Mock private CategoriaRepository categoriaRepository;
    @InjectMocks private ProductoService productoService;

    private static final FiltrosCatalogo SIN_FILTROS = FiltrosCatalogo.de(null, null, null, null, null, null, null, null);

    // ---------- Listado ----------

    @Test
    void laPaginaSeCuentaDesde1YSeTraduceAlContratoDelFrontend() {
        Producto p = producto("Campera", new BigDecimal("1000"), true);
        when(productoRepository.findAll(any(Specification.class), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(p), PageRequest.of(1, 12), 13));
        when(imagenRepository.findImagenesDe(anyCollection())).thenReturn(List.of());

        PaginaDTO<ProductoResumenDTO> pagina = productoService.listar(SIN_FILTROS, 2, 12, OrdenCatalogo.NOMBRE);

        assertEquals(2, pagina.pagina());
        assertEquals(12, pagina.tamanio());
        assertEquals(13, pagina.totalElementos());
        assertEquals(2, pagina.totalPaginas());
        assertEquals("Campera", pagina.contenido().get(0).nombre());
    }

    // El orden lo pone la especificación: si el Pageable trajera un Sort,
    // Spring lo usaría en su lugar y el nombre volvería a ordenarse según la
    // configuración regional de la base.
    @Test
    void pideLaPagina1ComoLa0DeSpringYSinSortEnElPageable() {
        when(productoRepository.findAll(any(Specification.class), any(Pageable.class))).thenReturn(new PageImpl<>(List.of()));
        ArgumentCaptor<Pageable> pedido = ArgumentCaptor.forClass(Pageable.class);

        productoService.listar(SIN_FILTROS, 1, 5, OrdenCatalogo.PRECIO_DESC);

        verify(productoRepository).findAll(any(Specification.class), pedido.capture());
        assertEquals(0, pedido.getValue().getPageNumber());
        assertEquals(5, pedido.getValue().getPageSize());
        assertEquals(Sort.unsorted(), pedido.getValue().getSort());
    }

    @Test
    void lasImagenesDeTodaLaPaginaSeTraenEnUnaSolaConsultaYSeUsaLaPrimera() {
        Producto a = producto("A", BigDecimal.TEN, true);
        Producto b = producto("B", BigDecimal.TEN, true);
        when(productoRepository.findAll(any(Specification.class), any(Pageable.class))).thenReturn(new PageImpl<>(List.of(a, b)));
        when(imagenRepository.findImagenesDe(anyCollection())).thenReturn(List.of(
                imagen(a.getId(), "/a-1.png"), imagen(a.getId(), "/a-2.png")));

        List<ProductoResumenDTO> contenido = productoService.listar(SIN_FILTROS, 1, 12, OrdenCatalogo.NOMBRE).contenido();

        verify(imagenRepository, times(1)).findImagenesDe(anyCollection());
        verify(imagenRepository, never()).findByProductoIdOrderByOrdenAsc(any());
        assertEquals("/a-1.png", contenido.get(0).imagenPrincipal());
        assertNull(contenido.get(1).imagenPrincipal());
    }

    @Test
    void unaPaginaVaciaNoConsultaImagenes() {
        when(productoRepository.findAll(any(Specification.class), any(Pageable.class))).thenReturn(new PageImpl<>(List.of()));

        productoService.listar(SIN_FILTROS, 1, 12, OrdenCatalogo.NOMBRE);

        verify(imagenRepository, never()).findImagenesDe(anyCollection());
    }

    @Test
    void sinFiltroDeCategoriaNoSeConsultanLasCategorias() {
        when(productoRepository.findAll(any(Specification.class), any(Pageable.class))).thenReturn(new PageImpl<>(List.of()));

        productoService.listar(SIN_FILTROS, 1, 12, OrdenCatalogo.NOMBRE);

        verify(categoriaRepository, never()).findAll();
    }

    @Test
    void paginaYTamanioFueraDeRangoSeRechazan() {
        assertThrows(IllegalArgumentException.class, () -> productoService.listar(SIN_FILTROS, 0, 12, OrdenCatalogo.NOMBRE));
        assertThrows(IllegalArgumentException.class, () -> productoService.listar(SIN_FILTROS, ProductoService.PAGINA_MAXIMA + 1, 12, OrdenCatalogo.NOMBRE));
        assertThrows(IllegalArgumentException.class, () -> productoService.listar(SIN_FILTROS, 1, 0, OrdenCatalogo.NOMBRE));
        assertThrows(IllegalArgumentException.class, () -> productoService.listar(SIN_FILTROS, 1, ProductoService.TAMANIO_MAXIMO + 1, OrdenCatalogo.NOMBRE));
        verify(productoRepository, never()).findAll(any(Specification.class), any(Pageable.class));
    }

    // ---------- Categorías con descendientes ----------

    @Test
    void unaCategoriaIncluyeSusHijasYNietas() {
        Categoria ropa = categoria(null);
        Categoria deportiva = categoria(ropa);
        Categoria termica = categoria(deportiva);
        Categoria carpas = categoria(null);
        when(categoriaRepository.findAll()).thenReturn(List.of(ropa, deportiva, termica, carpas));

        assertEquals(Set.of(ropa.getId(), deportiva.getId(), termica.getId()), productoService.conDescendientes(ropa.getId()));
    }

    @Test
    void unaCategoriaSinHijasEsSoloElla() {
        Categoria carpas = categoria(null);
        when(categoriaRepository.findAll()).thenReturn(List.of(carpas));

        assertEquals(Set.of(carpas.getId()), productoService.conDescendientes(carpas.getId()));
    }

    // ---------- Opciones de filtro ----------

    @Test
    void losTallesSeOrdenanLetrasNumerosOtrosYUnicoAlFinal() {
        when(varianteRepository.findTallesConStock()).thenReturn(List.of("Único", "42", "XL", "S", "8", "38", "M", "XS", "Otro"));
        when(varianteRepository.findColoresConStock()).thenReturn(List.of());

        OpcionesFiltroDTO opciones = productoService.opcionesDeFiltro();

        assertEquals(List.of("XS", "S", "M", "XL", "8", "38", "42", "Otro", "Único"), opciones.talles());
    }

    @Test
    void losColoresSeOrdenanAlfabeticamenteSinRepetidos() {
        when(varianteRepository.findTallesConStock()).thenReturn(List.of());
        when(varianteRepository.findColoresConStock()).thenReturn(List.of("Verde", "Azul", "Bordó", " Azul "));

        assertEquals(List.of("Azul", "Bordó", "Verde"), productoService.opcionesDeFiltro().colores());
    }

    // ---------- Detalle ----------

    @Test
    void elDetalleDaElPrecioDeCadaVariante() {
        Producto p = producto("Bici", new BigDecimal("100000"), true);
        VarianteProducto s = variante(p, "S", BigDecimal.ZERO);
        VarianteProducto l = variante(p, "L", new BigDecimal("25000"));
        when(productoRepository.findById(p.getId())).thenReturn(Optional.of(p));
        when(varianteRepository.findByProductoId(p.getId())).thenReturn(List.of(s, l));
        when(imagenRepository.findByProductoIdOrderByOrdenAsc(p.getId())).thenReturn(List.of());

        List<ProductoDetalleDTO.VarianteDTO> variantes = productoService.obtenerDetalle(p.getId()).variantes();

        assertEquals(0, new BigDecimal("100000").compareTo(variantes.get(0).precio()));
        assertEquals(0, new BigDecimal("125000").compareTo(variantes.get(1).precio()));
    }

    @Test
    void unProductoInactivoNoSeMuestra() {
        Producto p = producto("Guantes", BigDecimal.TEN, false);
        when(productoRepository.findById(p.getId())).thenReturn(Optional.of(p));

        assertThrows(RecursoNoEncontradoException.class, () -> productoService.obtenerDetalle(p.getId()));
    }

    // ---------- Ayudas ----------

    private static Producto producto(String nombre, BigDecimal precio, boolean activo) {
        Producto p = new Producto();
        p.setId(UUID.randomUUID());
        p.setNombre(nombre);
        p.setPrecio(precio);
        p.setActivo(activo);
        p.setGenero(GeneroProducto.UNISEX);
        Marca m = new Marca();
        m.setNombre("Marca");
        p.setMarca(m);
        Categoria c = new Categoria();
        c.setNombre("Categoría");
        p.setCategoria(c);
        return p;
    }

    private static VarianteProducto variante(Producto p, String talla, BigDecimal adicional) {
        VarianteProducto v = new VarianteProducto();
        v.setId(UUID.randomUUID());
        v.setProducto(p);
        v.setSku("SKU-" + talla);
        v.setTalla(talla);
        v.setColor("Azul");
        v.setStock(3);
        v.setPrecioAdicional(adicional);
        return v;
    }

    private static Categoria categoria(Categoria padre) {
        Categoria c = new Categoria();
        c.setId(UUID.randomUUID());
        c.setCategoriaPadre(padre);
        return c;
    }

    private static ImagenProductoRepository.ImagenDeProducto imagen(UUID productoId, String url) {
        return new ImagenProductoRepository.ImagenDeProducto() {
            public UUID getProductoId() { return productoId; }
            public String getUrl() { return url; }
        };
    }
}
