package com.tierra.ecommerce.repository;

import com.tierra.ecommerce.dto.FiltrosCatalogo;
import com.tierra.ecommerce.entity.Producto;
import com.tierra.ecommerce.entity.VarianteProducto;
import com.tierra.ecommerce.enums.OrdenCatalogo;
import jakarta.persistence.criteria.CriteriaBuilder;
import jakarta.persistence.criteria.Expression;
import jakarta.persistence.criteria.Order;
import jakarta.persistence.criteria.Predicate;
import jakarta.persistence.criteria.Root;
import jakarta.persistence.criteria.Subquery;
import org.springframework.data.jpa.domain.Specification;

import java.util.ArrayList;
import java.util.Collection;
import java.util.List;
import java.util.UUID;

// Arma la consulta del catálogo combinando solo los filtros presentes.
// Reemplaza a los métodos derivados (findByCategoriaId..., findByMarcaId...),
// que no se podían combinar: cinco filtros habrían sido decenas de métodos.
public final class ProductoEspecificaciones {

    // translate() le saca las tildes a las columnas, igual que
    // FiltrosCatalogo.normalizar a lo que escribe la persona. Se listan
    // también las mayúsculas acentuadas porque lower() no las convierte con
    // todas las configuraciones regionales de PostgreSQL. Sin la extensión
    // unaccent a propósito: no hace falta instalar nada en la base.
    static final String CON_TILDE = "áàäâãéèëêíìïîóòöôõúùüûñçÁÀÄÂÃÉÈËÊÍÌÏÎÓÒÖÔÕÚÙÜÛÑÇ";
    static final String SIN_TILDE = "aaaaaeeeeiiiiooooouuuuncaaaaaeeeeiiiiooooouuuunc";

    private ProductoEspecificaciones() {
    }

    // categoriaIds: la categoría pedida más sus descendientes (o null si no
    // se filtra por categoría). Se resuelve antes, en ProductoService.
    //
    // El orden va acá y no en el Pageable porque el nombre se ordena sin
    // mayúsculas ni tildes (ver OrdenCatalogo), y eso no se puede expresar con
    // un Sort de Spring. Spring respeta este orden mientras el Pageable no
    // traiga uno propio, y lo quita solo en la consulta de conteo.
    public static Specification<Producto> catalogo(FiltrosCatalogo filtros, Collection<UUID> categoriaIds,
                                                   OrdenCatalogo orden) {
        return (root, query, cb) -> {
            if (!Long.class.equals(query.getResultType())) {
                query.orderBy(ordenar(root, cb, orden));
            }
            List<Predicate> condiciones = new ArrayList<>();
            condiciones.add(cb.isTrue(root.get("activo")));

            if (categoriaIds != null) {
                condiciones.add(root.get("categoria").get("id").in(categoriaIds));
            }
            if (filtros.marcaId() != null) {
                condiciones.add(cb.equal(root.get("marca").get("id"), filtros.marcaId()));
            }
            if (filtros.genero() != null) {
                condiciones.add(cb.equal(root.get("genero"), filtros.genero()));
            }
            if (filtros.precioMin() != null) {
                condiciones.add(cb.greaterThanOrEqualTo(root.get("precio"), filtros.precioMin()));
            }
            if (filtros.precioMax() != null) {
                condiciones.add(cb.lessThanOrEqualTo(root.get("precio"), filtros.precioMax()));
            }
            if (filtros.talle() != null || filtros.color() != null) {
                condiciones.add(cb.exists(varianteConStock(root, query.subquery(Integer.class), cb, filtros)));
            }
            for (String palabra : filtros.palabras()) {
                condiciones.add(contienePalabra(root, cb, palabra));
            }
            return cb.and(condiciones.toArray(Predicate[]::new));
        };
    }

    private static List<Order> ordenar(Root<Producto> producto, CriteriaBuilder cb, OrdenCatalogo orden) {
        Order porNombre = cb.asc(sinTildes(cb, producto.get("nombre")));
        Order porId = cb.asc(producto.get("id"));
        return switch (orden) {
            case NOMBRE -> List.of(porNombre, porId);
            case PRECIO_ASC -> List.of(cb.asc(producto.get("precio")), porNombre, porId);
            case PRECIO_DESC -> List.of(cb.desc(producto.get("precio")), porNombre, porId);
        };
    }

    // Talle y color se buscan en la MISMA variante: "M y Azul" exige que
    // exista la campera M azul, no una M negra y una S azul. Y con unidades
    // disponibles: quien filtra por talle quiere comprar ese talle.
    private static Subquery<Integer> varianteConStock(Root<Producto> producto, Subquery<Integer> sub,
                                                      CriteriaBuilder cb, FiltrosCatalogo filtros) {
        Root<VarianteProducto> v = sub.from(VarianteProducto.class);
        List<Predicate> condiciones = new ArrayList<>();
        condiciones.add(cb.equal(v.get("producto"), producto));
        // Sin distinguir mayúsculas ni tildes: "unico" encuentra "Único".
        if (filtros.talle() != null) {
            condiciones.add(cb.equal(sinTildes(cb, v.get("talla")), FiltrosCatalogo.normalizar(filtros.talle())));
        }
        if (filtros.color() != null) {
            condiciones.add(cb.equal(sinTildes(cb, v.get("color")), FiltrosCatalogo.normalizar(filtros.color())));
        }
        condiciones.add(conStock(v, cb));
        return sub.select(cb.literal(1)).where(condiciones.toArray(Predicate[]::new));
    }

    // Misma regla que VarianteProducto.getDisponible(): sin control de stock
    // siempre hay; con control, stock menos lo reservado por pedidos en curso.
    static Predicate conStock(Root<VarianteProducto> v, CriteriaBuilder cb) {
        return cb.or(
                cb.isFalse(v.get("controlaStock")),
                cb.greaterThan(cb.diff(v.<Integer>get("stock"), v.<Integer>get("stockReservado")), 0)
        );
    }

    private static Predicate contienePalabra(Root<Producto> producto, CriteriaBuilder cb, String palabra) {
        String patron = "%" + escaparLike(palabra) + "%";
        return cb.or(
                cb.like(sinTildes(cb, producto.get("nombre")), patron, '\\'),
                cb.like(sinTildes(cb, producto.get("marca").get("nombre")), patron, '\\'),
                cb.like(sinTildes(cb, producto.get("categoria").get("nombre")), patron, '\\'),
                cb.like(sinTildes(cb, cb.coalesce(producto.get("descripcion"), "")), patron, '\\')
        );
    }

    private static Expression<String> sinTildes(CriteriaBuilder cb, Expression<String> columna) {
        return cb.function("translate", String.class, cb.lower(columna), cb.literal(CON_TILDE), cb.literal(SIN_TILDE));
    }

    // "%" y "_" son comodines de LIKE: si alguien busca "50%" tiene que
    // encontrar el texto "50%", no cualquier cosa que empiece con 50.
    static String escaparLike(String texto) {
        return texto.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_");
    }
}
