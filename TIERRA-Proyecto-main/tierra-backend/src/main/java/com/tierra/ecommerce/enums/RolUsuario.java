package com.tierra.ecommerce.enums;

// Los tres perfiles del sistema. ADMIN y OPERADOR son los dos perfiles de
// gestión que define el contrato: el Administrador accede a todo, incluidos
// reportes económicos y configuración; el Operador gestiona pedidos, stock
// y productos, pero no ve la parte económica ni la configuración.
public enum RolUsuario {
    CLIENTE, ADMIN, OPERADOR
}
