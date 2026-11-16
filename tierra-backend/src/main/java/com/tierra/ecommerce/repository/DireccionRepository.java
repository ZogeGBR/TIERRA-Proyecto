package com.tierra.ecommerce.repository;

import com.tierra.ecommerce.entity.Direccion;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;
import java.util.UUID;

public interface DireccionRepository extends JpaRepository<Direccion, UUID> {

    Optional<Direccion> findByUsuarioId(UUID usuarioId);

    // Guarda la única dirección del cliente: la crea o reemplaza la que había
    // (índice único por usuario, V11). En una sola sentencia, así dos compras
    // simultáneas de la misma cuenta no pueden chocar ni dejar dos.
    @Modifying
    @Query(value = """
            INSERT INTO direcciones (id, usuario_id, calle, numero, piso, departamento,
                                     ciudad, provincia, codigo_postal, es_predeterminada)
            VALUES (:id, :usuarioId, :calle, :numero, :piso, :departamento,
                    :ciudad, :provincia, :codigoPostal, true)
            ON CONFLICT (usuario_id) DO UPDATE SET
                calle = EXCLUDED.calle, numero = EXCLUDED.numero,
                piso = EXCLUDED.piso, departamento = EXCLUDED.departamento,
                ciudad = EXCLUDED.ciudad, provincia = EXCLUDED.provincia,
                codigo_postal = EXCLUDED.codigo_postal, es_predeterminada = true
            """, nativeQuery = true)
    int guardarUnica(@Param("id") UUID id, @Param("usuarioId") UUID usuarioId,
                     @Param("calle") String calle, @Param("numero") String numero,
                     @Param("piso") String piso, @Param("departamento") String departamento,
                     @Param("ciudad") String ciudad, @Param("provincia") String provincia,
                     @Param("codigoPostal") String codigoPostal);

    @Modifying
    @Query("DELETE FROM Direccion d WHERE d.usuario.id = :usuarioId")
    int borrarDelUsuario(@Param("usuarioId") UUID usuarioId);
}
