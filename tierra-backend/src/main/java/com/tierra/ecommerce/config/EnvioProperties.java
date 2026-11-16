package com.tierra.ecommerce.config;

import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.util.List;

// Configuración de envíos (ver application.yml y la decisión 0006).
@Component
public class EnvioProperties {

    // Provincias con envío a domicilio. Fuera de esta lista se ofrece el
    // retiro en el local. Es una decisión comercial, no una limitación del
    // correo: Andreani llega a todo el país.
    @Value("${envios.provincias-con-cobertura}")
    private List<String> provinciasConCobertura;

    // Lo usa solo el cotizador fijo (envios.proveedor = fijo).
    @Value("${envios.costo-fijo}")
    private BigDecimal costoFijo;

    @Value("${envios.proveedor}")
    private String proveedor;

    @PostConstruct
    void validar() {
        if (provinciasConCobertura == null || provinciasConCobertura.stream().allMatch(String::isBlank)) {
            throw new IllegalStateException("Configuración de envíos inválida: envios.provincias-con-cobertura está vacía");
        }
        if (costoFijo == null || costoFijo.signum() < 0) {
            throw new IllegalStateException("Configuración de envíos inválida: envios.costo-fijo no puede ser negativo");
        }
    }

    public List<String> getProvinciasConCobertura() { return provinciasConCobertura; }
    public BigDecimal getCostoFijo() { return costoFijo; }
    public String getProveedor() { return proveedor; }
}
