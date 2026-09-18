package com.tierra.ecommerce.service;

import com.tierra.ecommerce.entity.Pedido;
import com.tierra.ecommerce.entity.Producto;
import com.tierra.ecommerce.entity.ReservaStock;
import com.tierra.ecommerce.entity.VarianteProducto;
import com.tierra.ecommerce.exception.StockInsuficienteException;
import com.tierra.ecommerce.repository.ReservaStockRepository;
import com.tierra.ecommerce.repository.VarianteProductoRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
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
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class InventarioServiceTest {

    @Mock
    private VarianteProductoRepository varianteRepository;

    @Mock
    private ReservaStockRepository reservaStockRepository;

    @InjectMocks
    private InventarioService inventarioService;

    private UUID varianteId;
    private Pedido pedido;
    private Producto producto;

    @BeforeEach
    void setUp() {
        varianteId = UUID.randomUUID();

        producto = new Producto();
        producto.setId(UUID.randomUUID());
        producto.setNombre("Bicicleta MTB Scott 29");

        pedido = new Pedido();
        pedido.setId(UUID.randomUUID());
    }

    @Test
    @DisplayName("Caso Scott: Si no controla stock, reservarStock no reserva ni descuenta y retorna null con stock 0")
    void reservarStock_sinControlDeStock_retornaNullSinBloquearNiGuardar() {
        VarianteProducto varianteScott = new VarianteProducto();
        varianteScott.setId(varianteId);
        varianteScott.setProducto(producto);
        varianteScott.setSku("BICI-SCOTT-01");
        varianteScott.setStock(0);
        varianteScott.setStockReservado(0);
        varianteScott.setControlaStock(false);

        when(varianteRepository.findByIdConBloqueo(varianteId)).thenReturn(Optional.of(varianteScott));

        ReservaStock resultado = inventarioService.reservarStock(varianteId, 2, pedido);

        assertNull(resultado, "Variantes sin control de stock deben retornar null");
        assertEquals(0, varianteScott.getStock(), "El stock físico no debe cambiar");
        assertEquals(0, varianteScott.getStockReservado(), "El stock reservado no debe cambiar");
        verify(varianteRepository, never()).save(any());
        verify(reservaStockRepository, never()).save(any());
    }

    @Test
    @DisplayName("Variante normal sin stock suficiente lanza StockInsuficienteException")
    void reservarStock_conControlDeStock_sinStockDisponible_lanzaExcepcion() {
        VarianteProducto varianteNormal = new VarianteProducto();
        varianteNormal.setId(varianteId);
        varianteNormal.setProducto(producto);
        varianteNormal.setSku("CAMP-TNF-01");
        varianteNormal.setStock(1);
        varianteNormal.setStockReservado(1); // disponible = 0
        varianteNormal.setControlaStock(true);

        when(varianteRepository.findByIdConBloqueo(varianteId)).thenReturn(Optional.of(varianteNormal));

        assertThrows(StockInsuficienteException.class, () ->
                inventarioService.reservarStock(varianteId, 1, pedido));

        verify(varianteRepository, never()).save(any());
        verify(reservaStockRepository, never()).save(any());
    }

    @Test
    @DisplayName("Variante normal con stock suficiente reserva unidades exitosamente")
    void reservarStock_conControlDeStock_conStockSuficiente_reservaCorrectamente() {
        VarianteProducto varianteNormal = new VarianteProducto();
        varianteNormal.setId(varianteId);
        varianteNormal.setProducto(producto);
        varianteNormal.setSku("CAMP-TNF-01");
        varianteNormal.setStock(5);
        varianteNormal.setStockReservado(0);
        varianteNormal.setControlaStock(true);

        when(varianteRepository.findByIdConBloqueo(varianteId)).thenReturn(Optional.of(varianteNormal));
        when(reservaStockRepository.save(any(ReservaStock.class))).thenAnswer(invocation -> invocation.getArgument(0));

        ReservaStock resultado = inventarioService.reservarStock(varianteId, 2, pedido);

        assertNotNull(resultado);
        assertEquals(2, varianteNormal.getStockReservado());
        assertEquals(varianteNormal, resultado.getVariante());
        assertEquals(pedido, resultado.getPedido());
        assertEquals(2, resultado.getCantidad());
        verify(varianteRepository).save(varianteNormal);
        verify(reservaStockRepository).save(any(ReservaStock.class));
    }

    @Test
    @DisplayName("confirmarVenta descuenta stock de variante normal")
    void confirmarVenta_varianteNormal_descuentaStockFisicoYReservado() {
        VarianteProducto varianteNormal = new VarianteProducto();
        varianteNormal.setId(varianteId);
        varianteNormal.setStock(5);
        varianteNormal.setStockReservado(2);
        varianteNormal.setControlaStock(true);

        ReservaStock reserva = new ReservaStock();
        reserva.setId(UUID.randomUUID());
        reserva.setPedido(pedido);
        reserva.setVariante(varianteNormal);
        reserva.setCantidad(2);
        reserva.setLiberada(false);

        when(reservaStockRepository.findByPedidoId(pedido.getId())).thenReturn(List.of(reserva));
        when(varianteRepository.findByIdConBloqueo(varianteId)).thenReturn(Optional.of(varianteNormal));

        inventarioService.confirmarVenta(pedido);

        assertEquals(3, varianteNormal.getStock());
        assertEquals(0, varianteNormal.getStockReservado());
        assertTrue(reserva.isLiberada());
        verify(varianteRepository).save(varianteNormal);
        verify(reservaStockRepository).save(reserva);
    }

    @Test
    @DisplayName("confirmarVenta con variante que no controla stock no descuenta stock y libera reserva")
    void confirmarVenta_varianteSinControlStock_noDescuentaStock() {
        VarianteProducto varianteScott = new VarianteProducto();
        varianteScott.setId(varianteId);
        varianteScott.setStock(0);
        varianteScott.setStockReservado(0);
        varianteScott.setControlaStock(false);

        ReservaStock reserva = new ReservaStock();
        reserva.setId(UUID.randomUUID());
        reserva.setPedido(pedido);
        reserva.setVariante(varianteScott);
        reserva.setCantidad(1);
        reserva.setLiberada(false);

        when(reservaStockRepository.findByPedidoId(pedido.getId())).thenReturn(List.of(reserva));
        when(varianteRepository.findByIdConBloqueo(varianteId)).thenReturn(Optional.of(varianteScott));

        inventarioService.confirmarVenta(pedido);

        assertEquals(0, varianteScott.getStock(), "El stock debe permanecer en 0");
        assertEquals(0, varianteScott.getStockReservado());
        assertTrue(reserva.isLiberada());
        verify(varianteRepository, never()).save(varianteScott);
        verify(reservaStockRepository).save(reserva);
    }

    @Test
    @DisplayName("liberarReserva para variante normal restaura stockReservado")
    void liberarReserva_varianteNormal_restauraStockReservado() {
        VarianteProducto varianteNormal = new VarianteProducto();
        varianteNormal.setId(varianteId);
        varianteNormal.setStock(10);
        varianteNormal.setStockReservado(3);
        varianteNormal.setControlaStock(true);

        ReservaStock reserva = new ReservaStock();
        reserva.setVariante(varianteNormal);
        reserva.setCantidad(2);
        reserva.setLiberada(false);

        when(varianteRepository.findByIdConBloqueo(varianteId)).thenReturn(Optional.of(varianteNormal));

        inventarioService.liberarReserva(reserva);

        assertEquals(1, varianteNormal.getStockReservado());
        assertTrue(reserva.isLiberada());
        verify(varianteRepository).save(varianteNormal);
        verify(reservaStockRepository).save(reserva);
    }

    @Test
    @DisplayName("liberarReserva para variante sin control de stock no toca stockReservado")
    void liberarReserva_varianteSinControlStock_noTocaStockReservado() {
        VarianteProducto varianteScott = new VarianteProducto();
        varianteScott.setId(varianteId);
        varianteScott.setStock(0);
        varianteScott.setStockReservado(0);
        varianteScott.setControlaStock(false);

        ReservaStock reserva = new ReservaStock();
        reserva.setVariante(varianteScott);
        reserva.setCantidad(1);
        reserva.setLiberada(false);

        when(varianteRepository.findByIdConBloqueo(varianteId)).thenReturn(Optional.of(varianteScott));

        inventarioService.liberarReserva(reserva);

        assertEquals(0, varianteScott.getStockReservado());
        assertTrue(reserva.isLiberada());
        verify(varianteRepository, never()).save(varianteScott);
        verify(reservaStockRepository).save(reserva);
    }
}
