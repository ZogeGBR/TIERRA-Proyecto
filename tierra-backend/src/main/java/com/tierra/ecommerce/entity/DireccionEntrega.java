package com.tierra.ecommerce.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Embeddable
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class DireccionEntrega {

    @Column(name = "envio_calle", length = 200)
    private String calle;

    @Column(name = "envio_numero", length = 20)
    private String numero;

    // Opcionales. Andreani los pide por separado para crear el envío.
    @Column(name = "envio_piso", length = 10)
    private String piso;

    @Column(name = "envio_departamento", length = 10)
    private String departamento;

    @Column(name = "envio_ciudad", length = 100)
    private String ciudad;

    @Column(name = "envio_provincia", length = 100)
    private String provincia;

    @Column(name = "envio_codigo_postal", length = 20)
    private String codigoPostal;
}
