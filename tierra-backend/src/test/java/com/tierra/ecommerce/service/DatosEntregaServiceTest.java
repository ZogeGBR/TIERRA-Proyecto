package com.tierra.ecommerce.service;

import com.tierra.ecommerce.dto.DatosEntregaResponse;
import com.tierra.ecommerce.dto.ItemPedidoRequest;
import com.tierra.ecommerce.entity.Direccion;
import com.tierra.ecommerce.entity.DireccionEntrega;
import com.tierra.ecommerce.entity.Usuario;
import com.tierra.ecommerce.enums.TipoEntrega;
import com.tierra.ecommerce.repository.DireccionRepository;
import com.tierra.ecommerce.repository.UsuarioRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class DatosEntregaServiceTest {

    @Mock private UsuarioRepository usuarioRepository;
    @Mock private DireccionRepository direccionRepository;
    @InjectMocks private DatosEntregaService service;

    private Usuario cliente;
    private final List<ItemPedidoRequest> items = List.of(new ItemPedidoRequest(UUID.randomUUID(), 1));

    @BeforeEach
    void setUp() {
        cliente = new Usuario();
        cliente.setId(UUID.randomUUID());
        cliente.setNombre("Nombre de la cuenta");
        cliente.setEmail("ana@example.com");
        cliente.setTelefono("1111 111111");
        cliente.setDni("20333444");
    }

    @Test
    void devuelveLosDatosCompletosConLaDireccionGuardada() {
        Direccion d = new Direccion();
        d.setCalle("San Martín");
        d.setNumero("123");
        d.setPiso("2");
        d.setDepartamento("B");
        d.setCiudad("Esquel");
        d.setProvincia("Chubut");
        d.setCodigoPostal("9200");
        when(usuarioRepository.findById(cliente.getId())).thenReturn(Optional.of(cliente));
        when(direccionRepository.findByUsuarioId(cliente.getId())).thenReturn(Optional.of(d));

        DatosEntregaResponse r = service.obtener(cliente.getId());

        assertEquals("Nombre de la cuenta", r.nombre());
        assertEquals("1111 111111", r.telefono());
        // Completo, sin enmascarar: lo guardó el mismo cliente con su sesión.
        assertEquals("20333444", r.dni());
        assertEquals("San Martín", r.direccion().getCalle());
        assertEquals("2", r.direccion().getPiso());
        assertEquals("B", r.direccion().getDepartamento());
        assertEquals("9200", r.direccion().getCodigoPostal());
    }

    @Test
    void sinDatosGuardadosVienenVaciosConElNombreDeLaCuenta() {
        cliente.setTelefono(null);
        cliente.setDni(null);
        when(usuarioRepository.findById(cliente.getId())).thenReturn(Optional.of(cliente));
        when(direccionRepository.findByUsuarioId(cliente.getId())).thenReturn(Optional.empty());

        DatosEntregaResponse r = service.obtener(cliente.getId());

        assertEquals("Nombre de la cuenta", r.nombre());
        assertNull(r.telefono());
        assertNull(r.dni());
        assertNull(r.direccion());
    }

    @Test
    void conEnvioGuardaNombreTelefonoDniYLaDireccion() {
        DireccionEntrega dir = new DireccionEntrega("San Martín", "123", "2", "B", "Esquel", "Chubut", "9200");
        NuevoPedido datos = new NuevoPedido(TipoEntrega.ENVIO_DOMICILIO, dir, "Ana Pérez", "2945 123456", "30111222", items);

        service.guardar(cliente, datos);

        assertEquals("Ana Pérez", cliente.getNombre());
        assertEquals("2945 123456", cliente.getTelefono());
        assertEquals("30111222", cliente.getDni());
        verify(direccionRepository).guardarUnica(any(UUID.class), eq(cliente.getId()), eq("San Martín"), eq("123"),
                eq("2"), eq("B"), eq("Esquel"), eq("Chubut"), eq("9200"));
        verify(usuarioRepository).save(cliente);
    }

    @Test
    void conRetiroGuardaNombreYTelefonoYConservaElDniYLaDireccion() {
        NuevoPedido datos = new NuevoPedido(TipoEntrega.RETIRO_LOCAL, null, "Ana Pérez", "2945 123456", null, items);

        service.guardar(cliente, datos);

        assertEquals("Ana Pérez", cliente.getNombre());
        assertEquals("2945 123456", cliente.getTelefono());
        assertEquals("20333444", cliente.getDni());
        verify(direccionRepository, never()).guardarUnica(any(), any(), any(), any(), any(), any(), any(), any(), any());
        verify(direccionRepository, never()).borrarDelUsuario(any());
    }

    @Test
    void borrarQuitaTelefonoDniYDireccionYConservaElNombre() {
        when(usuarioRepository.findById(cliente.getId())).thenReturn(Optional.of(cliente));

        service.borrar(cliente.getId());

        assertNull(cliente.getTelefono());
        assertNull(cliente.getDni());
        assertEquals("Nombre de la cuenta", cliente.getNombre());
        verify(direccionRepository).borrarDelUsuario(cliente.getId());
        verify(usuarioRepository).save(cliente);
    }
}
