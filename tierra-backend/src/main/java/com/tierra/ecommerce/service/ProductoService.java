package com.tierra.ecommerce.service;

import com.tierra.ecommerce.dto.FiltrosCatalogo;
import com.tierra.ecommerce.dto.OpcionesFiltroDTO;
import com.tierra.ecommerce.dto.PaginaDTO;
import com.tierra.ecommerce.dto.ProductoDetalleDTO;
import com.tierra.ecommerce.dto.ProductoResumenDTO;
import com.tierra.ecommerce.entity.Categoria;
import com.tierra.ecommerce.entity.ImagenProducto;
import com.tierra.ecommerce.entity.Producto;
import com.tierra.ecommerce.entity.VarianteProducto;
import com.tierra.ecommerce.enums.EstadoPedido;
import com.tierra.ecommerce.enums.OrdenCatalogo;
import com.tierra.ecommerce.exception.RecursoNoEncontradoException;
import com.tierra.ecommerce.repository.CategoriaRepository;
import com.tierra.ecommerce.repository.ImagenProductoRepository;
import com.tierra.ecommerce.repository.PedidoItemRepository;
import com.tierra.ecommerce.repository.ProductoEspecificaciones;
import com.tierra.ecommerce.repository.ProductoRepository;
import com.tierra.ecommerce.repository.VarianteProductoRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.text.Collator;
import java.time.LocalDateTime;
import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.Deque;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;

@Service
@Transactional(readOnly = true)
public class ProductoService {

    public static final int TAMANIO_POR_DEFECTO = 12;
    public static final int TAMANIO_MAXIMO = 48;
    // Una página más allá no tiene sentido y un número enorme desbordaría el
    // cálculo del desplazamiento (pagina * tamanio) en la consulta.
    public static final int PAGINA_MAXIMA = 10_000;

    // "Más vendidos" (regla acordada con Tierra): pedidos pagados de los
    // últimos 90 días, como máximo 8 productos, y nada si hay menos de 3
    // (una lista de 1 o 2 parece vacía, no "lo más vendido").
    public static final int DIAS_MAS_VENDIDOS = 90;
    public static final int MAXIMO_MAS_VENDIDOS = 8;
    public static final int MINIMO_MAS_VENDIDOS = 3;
    // Pagado y lo que viene después. Un cancelado no cuenta, aunque se haya
    // pagado y reembolsado: no fue una venta.
    static final Set<EstadoPedido> ESTADOS_VENDIDOS = Set.of(
            EstadoPedido.PAGADO, EstadoPedido.PREPARANDO, EstadoPedido.ENVIADO, EstadoPedido.ENTREGADO);

    private final ProductoRepository productoRepository;
    private final VarianteProductoRepository varianteRepository;
    private final ImagenProductoRepository imagenRepository;
    private final CategoriaRepository categoriaRepository;
    private final PedidoItemRepository pedidoItemRepository;

    public ProductoService(ProductoRepository productoRepository,
                           VarianteProductoRepository varianteRepository,
                           ImagenProductoRepository imagenRepository,
                           CategoriaRepository categoriaRepository,
                           PedidoItemRepository pedidoItemRepository) {
        this.productoRepository = productoRepository;
        this.varianteRepository = varianteRepository;
        this.imagenRepository = imagenRepository;
        this.categoriaRepository = categoriaRepository;
        this.pedidoItemRepository = pedidoItemRepository;
    }

    // Los más vendidos, en el mismo formato que las tarjetas del catálogo.
    // Tres consultas, sin importar cuántos sean: el ranking, los productos
    // (con marca y categoría) y sus imágenes.
    public List<ProductoResumenDTO> masVendidos(int limite) {
        if (limite < MINIMO_MAS_VENDIDOS || limite > MAXIMO_MAS_VENDIDOS) {
            throw new IllegalArgumentException("El límite tiene que estar entre "
                    + MINIMO_MAS_VENDIDOS + " y " + MAXIMO_MAS_VENDIDOS);
        }
        List<UUID> ids = pedidoItemRepository.findMasVendidos(ESTADOS_VENDIDOS,
                LocalDateTime.now().minusDays(DIAS_MAS_VENDIDOS), PageRequest.of(0, limite));
        if (ids.size() < MINIMO_MAS_VENDIDOS) {
            return List.of();
        }
        Map<UUID, Producto> porId = new HashMap<>();
        for (Producto p : productoRepository.findByIdIn(ids)) {
            porId.put(p.getId(), p);
        }
        // En el orden del ranking: la consulta por ids no lo respeta.
        List<Producto> ordenados = ids.stream().map(porId::get).filter(Objects::nonNull).toList();
        Map<UUID, String> imagenes = imagenesPrincipales(ordenados);
        return ordenados.stream().map(p -> aResumen(p, imagenes.get(p.getId()))).toList();
    }

    // Catálogo con filtros combinables y paginación. Siempre la misma
    // cantidad de consultas, sin importar cuántos productos tenga la página:
    // categorías (solo si se filtra por categoría), la página con marca y
    // categoría, el conteo, y las imágenes de toda la página.
    public PaginaDTO<ProductoResumenDTO> listar(FiltrosCatalogo filtros, int pagina, int tamanio, OrdenCatalogo orden) {
        if (pagina < 1 || pagina > PAGINA_MAXIMA) {
            throw new IllegalArgumentException("La página tiene que estar entre 1 y " + PAGINA_MAXIMA);
        }
        if (tamanio < 1 || tamanio > TAMANIO_MAXIMO) {
            throw new IllegalArgumentException("El tamaño de página tiene que estar entre 1 y " + TAMANIO_MAXIMO);
        }

        Set<UUID> categoriaIds = filtros.categoriaId() == null ? null : conDescendientes(filtros.categoriaId());
        // Sin Sort en el PageRequest a propósito: el orden lo pone la
        // especificación (ver ProductoEspecificaciones.catalogo).
        Page<Producto> productos = productoRepository.findAll(
                ProductoEspecificaciones.catalogo(filtros, categoriaIds, orden),
                PageRequest.of(pagina - 1, tamanio));

        Map<UUID, String> imagenes = imagenesPrincipales(productos.getContent());
        return PaginaDTO.de(productos.map(p -> aResumen(p, imagenes.get(p.getId()))));
    }

    public OpcionesFiltroDTO opcionesDeFiltro() {
        List<String> talles = varianteRepository.findTallesConStock().stream()
                .map(String::trim).filter(t -> !t.isEmpty()).distinct()
                .sorted(ORDEN_TALLES).toList();
        Collator collator = Collator.getInstance(Locale.forLanguageTag("es-AR"));
        List<String> colores = varianteRepository.findColoresConStock().stream()
                .map(String::trim).filter(c -> !c.isEmpty()).distinct()
                .sorted(collator).toList();
        return new OpcionesFiltroDTO(talles, colores);
    }

    public ProductoDetalleDTO obtenerDetalle(UUID productoId) {
        // Un producto dado de baja no se muestra, aunque alguien tenga el link.
        Producto producto = productoRepository.findById(productoId)
                .filter(Producto::isActivo)
                .orElseThrow(() -> new RecursoNoEncontradoException("Producto no encontrado: " + productoId));

        List<VarianteProducto> variantes = varianteRepository.findByProductoId(productoId);
        List<ImagenProducto> imagenes = imagenRepository.findByProductoIdOrderByOrdenAsc(productoId);

        return new ProductoDetalleDTO(
                producto.getId(),
                producto.getNombre(),
                producto.getDescripcion(),
                producto.getMarca().getNombre(),
                producto.getCategoria().getNombre(),
                producto.getGenero().name(),
                producto.getPrecio(),
                variantes.stream()
                        .map(v -> new ProductoDetalleDTO.VarianteDTO(
                                v.getId(), v.getSku(), v.getTalla(), v.getColor(),
                                v.getDisponible(), v.isControlaStock(),
                                // Hallazgo H-G: el precio de la variante es el
                                // mismo cálculo que hace PedidoService al cobrar.
                                producto.getPrecio().add(v.getPrecioAdicional())))
                        .toList(),
                imagenes.stream().map(ImagenProducto::getUrl).toList()
        );
    }

    // La categoría pedida y todas las que cuelgan de ella, a cualquier nivel.
    // Las categorías son pocas: se traen todas en una consulta y se recorre
    // el árbol en memoria. Una categoría que no existe da un conjunto con un
    // id que no matchea ningún producto, es decir, una página vacía.
    Set<UUID> conDescendientes(UUID categoriaId) {
        Map<UUID, List<UUID>> hijas = new HashMap<>();
        for (Categoria c : categoriaRepository.findAll()) {
            Categoria padre = c.getCategoriaPadre();
            if (padre != null) {
                hijas.computeIfAbsent(padre.getId(), k -> new ArrayList<>()).add(c.getId());
            }
        }
        Set<UUID> resultado = new HashSet<>();
        Deque<UUID> pendientes = new ArrayDeque<>(List.of(categoriaId));
        while (!pendientes.isEmpty()) {
            UUID actual = pendientes.pop();
            if (resultado.add(actual)) {
                pendientes.addAll(hijas.getOrDefault(actual, List.of()));
            }
        }
        return resultado;
    }

    private Map<UUID, String> imagenesPrincipales(List<Producto> productos) {
        if (productos.isEmpty()) {
            return Map.of();
        }
        Map<UUID, String> primera = new HashMap<>();
        for (ImagenProductoRepository.ImagenDeProducto img :
                imagenRepository.findImagenesDe(productos.stream().map(Producto::getId).toList())) {
            primera.putIfAbsent(img.getProductoId(), img.getUrl());
        }
        return primera;
    }

    private static ProductoResumenDTO aResumen(Producto producto, String imagenPrincipal) {
        return new ProductoResumenDTO(
                producto.getId(),
                producto.getNombre(),
                producto.getMarca().getNombre(),
                producto.getCategoria().getNombre(),
                producto.getPrecio(),
                imagenPrincipal
        );
    }

    // Talles en el orden en que se piensan: primero las letras de menor a
    // mayor, después los números de menor a mayor, después cualquier otro
    // (alfabético), y al final "Único".
    private static final List<String> TALLES_EN_LETRAS = List.of("XXS", "XS", "S", "M", "L", "XL", "XXL", "XXXL");

    static final Comparator<String> ORDEN_TALLES = Comparator
            .comparingInt(ProductoService::grupoDeTalle)
            .thenComparingInt(t -> TALLES_EN_LETRAS.indexOf(t.toUpperCase(Locale.ROOT)))
            .thenComparingDouble(ProductoService::numeroDeTalle)
            .thenComparing(Collator.getInstance(Locale.forLanguageTag("es-AR")));

    private static int grupoDeTalle(String talle) {
        if (TALLES_EN_LETRAS.contains(talle.toUpperCase(Locale.ROOT))) return 0;
        if (talle.matches("\\d+([.,]\\d+)?")) return 1;
        if (FiltrosCatalogo.normalizar(talle).equals("unico")) return 3;
        return 2;
    }

    private static double numeroDeTalle(String talle) {
        return talle.matches("\\d+([.,]\\d+)?") ? Double.parseDouble(talle.replace(',', '.')) : 0;
    }
}
