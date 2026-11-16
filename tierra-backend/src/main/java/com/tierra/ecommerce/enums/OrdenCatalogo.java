package com.tierra.ecommerce.enums;

import java.util.Arrays;

// Órdenes del catálogo. La consulta los aplica en ProductoEspecificaciones:
// el nombre se compara sin mayúsculas ni tildes, para que el orden sea el
// mismo con cualquier configuración regional de PostgreSQL (con la "C", por
// ejemplo, las mayúsculas van antes que todas las minúsculas). Y todos
// terminan en nombre e id: con un empate (dos productos del mismo precio) el
// orden tiene que ser siempre el mismo, o un producto podría aparecer en dos
// páginas seguidas y otro en ninguna.
public enum OrdenCatalogo {
    NOMBRE("nombre"),
    PRECIO_ASC("precio_asc"),
    PRECIO_DESC("precio_desc");

    private final String valor;

    OrdenCatalogo(String valor) {
        this.valor = valor;
    }

    // El valor que viaja en la URL (?orden=precio_asc). Sin valor, por nombre.
    public static OrdenCatalogo desde(String valor) {
        if (valor == null || valor.isBlank()) {
            return NOMBRE;
        }
        return Arrays.stream(values())
                .filter(o -> o.valor.equals(valor))
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException(
                        "Orden inválido: usá nombre, precio_asc o precio_desc"));
    }
}
