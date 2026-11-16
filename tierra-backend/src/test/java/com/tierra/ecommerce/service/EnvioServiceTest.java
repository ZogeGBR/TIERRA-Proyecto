package com.tierra.ecommerce.service;

import com.tierra.ecommerce.config.EnvioProperties;
import com.tierra.ecommerce.dto.CotizacionEnvioResponse;
import com.tierra.ecommerce.dto.ItemPedidoRequest;
import com.tierra.ecommerce.entity.Producto;
import com.tierra.ecommerce.entity.VarianteProducto;
import com.tierra.ecommerce.enums.TipoEntrega;
import com.tierra.ecommerce.exception.CotizacionNoDisponibleException;
import com.tierra.ecommerce.exception.RecursoNoEncontradoException;
import com.tierra.ecommerce.repository.VarianteProductoRepository;
import com.tierra.ecommerce.service.envio.CotizadorEnvio;
import com.tierra.ecommerce.service.envio.SolicitudCotizacion;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyCollection;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class EnvioServiceTest {

    @Mock private CotizadorEnvio cotizador;
    @Mock private VarianteProductoRepository varianteRepository;

    private EnvioService envioService;
    private VarianteProducto campera;
    private List<ItemPedidoRequest> dosCamperas;

    @BeforeEach
    void setUp() {
        EnvioProperties properties = new EnvioProperties();
        ReflectionTestUtils.setField(properties, "provinciasConCobertura", List.of("Neuquén", "Río Negro", "Chubut", "Santa Cruz"));
        ReflectionTestUtils.setField(properties, "costoFijo", new BigDecimal("12000"));
        envioService = new EnvioService(properties, cotizador, varianteRepository);

        Producto producto = new Producto();
        producto.setId(UUID.randomUUID());
        producto.setPrecio(new BigDecimal("100000"));
        producto.setActivo(true);
        producto.setPesoGramos(900);
        producto.setAltoCm(10);
        producto.setAnchoCm(30);
        producto.setLargoCm(40);
        campera = new VarianteProducto();
        campera.setId(UUID.randomUUID());
        campera.setProducto(producto);
        campera.setPrecioAdicional(new BigDecimal("5000"));
        dosCamperas = List.of(new ItemPedidoRequest(campera.getId(), 2));
    }

    @Test
    void retirarEnElLocalNoCuestaNadaYNoLlamaAlCotizador() {
        CotizacionEnvioResponse r = envioService.cotizar(TipoEntrega.RETIRO_LOCAL, null, null, dosCamperas);

        assertTrue(r.cubierto());
        assertEquals(0, BigDecimal.ZERO.compareTo(r.costo()));
        verifyNoInteractions(cotizador);
    }

    @Test
    void dentroDeLaZonaElCostoLoDaElCotizador() {
        when(varianteRepository.findAllById(anyCollection())).thenReturn(List.of(campera));
        when(cotizador.cotizar(any())).thenReturn(new BigDecimal("15500"));

        CotizacionEnvioResponse r = envioService.cotizar(TipoEntrega.ENVIO_DOMICILIO, "Chubut", "9200", dosCamperas);

        assertTrue(r.cubierto());
        assertEquals(0, new BigDecimal("15500").compareTo(r.costo()));
        assertNull(r.mensaje());
    }

    // Lo que necesita Andreani ya viaja armado: código postal, y por cada
    // ítem su cantidad, peso, medidas y precio, más el valor declarado total.
    @Test
    void alCotizadorLeLlegaTodoLoQueNecesitaUnCorreo() {
        when(varianteRepository.findAllById(anyCollection())).thenReturn(List.of(campera));
        when(cotizador.cotizar(any())).thenReturn(BigDecimal.ONE);
        ArgumentCaptor<SolicitudCotizacion> solicitud = ArgumentCaptor.forClass(SolicitudCotizacion.class);

        envioService.cotizar(TipoEntrega.ENVIO_DOMICILIO, " Chubut ", " 9200 ", dosCamperas);

        verify(cotizador).cotizar(solicitud.capture());
        SolicitudCotizacion s = solicitud.getValue();
        assertEquals("Chubut", s.provincia());
        assertEquals("9200", s.codigoPostal());
        assertEquals(1, s.bultos().size());
        SolicitudCotizacion.Bulto b = s.bultos().get(0);
        assertEquals(2, b.cantidad());
        assertEquals(900, b.pesoGramos());
        assertEquals(10, b.altoCm());
        assertEquals(30, b.anchoCm());
        assertEquals(40, b.largoCm());
        assertEquals(0, new BigDecimal("105000").compareTo(b.valorUnitario()));
        assertEquals(0, new BigDecimal("210000").compareTo(s.valorDeclarado()));
    }

    @Test
    void laProvinciaSeComparaSinTildesNiMayusculas() {
        assertTrue(envioService.tieneCobertura("NEUQUEN"));
        assertTrue(envioService.tieneCobertura(" rio negro "));
        assertTrue(envioService.tieneCobertura("Santa Cruz"));
        assertFalse(envioService.tieneCobertura("Córdoba"));
        assertFalse(envioService.tieneCobertura(""));
        assertFalse(envioService.tieneCobertura(null));
    }

    @Test
    void fueraDeLaZonaNoEsUnErrorEnLaCotizacionSinoUnaOfertaDeRetiro() {
        CotizacionEnvioResponse r = envioService.cotizar(TipoEntrega.ENVIO_DOMICILIO, "Córdoba", "5000", dosCamperas);

        assertFalse(r.cubierto());
        assertNull(r.costo());
        assertEquals("Por ahora enviamos a domicilio solo a Neuquén, Río Negro, Chubut y Santa Cruz. "
                + "Podés retirar tu compra en el local.", r.mensaje());
        verifyNoInteractions(cotizador);
    }

    @Test
    void enUnPedidoFueraDeLaZonaSiEsUnError() {
        assertThrows(IllegalArgumentException.class,
                () -> envioService.costoParaPedido(TipoEntrega.ENVIO_DOMICILIO, "Córdoba", "5000", dosCamperas));
    }

    @Test
    void enUnPedidoConRetiroElCostoEsCero() {
        assertEquals(0, BigDecimal.ZERO.compareTo(
                envioService.costoParaPedido(TipoEntrega.RETIRO_LOCAL, null, null, dosCamperas)));
    }

    @Test
    void conEnvioLaProvinciaYElCodigoPostalSonObligatorios() {
        assertThrows(IllegalArgumentException.class,
                () -> envioService.cotizar(TipoEntrega.ENVIO_DOMICILIO, null, "9200", dosCamperas));
        assertThrows(IllegalArgumentException.class,
                () -> envioService.cotizar(TipoEntrega.ENVIO_DOMICILIO, "Chubut", null, dosCamperas));
        for (String malo : List.of("920", "92000", "A9200", "9200AAA", "")) {
            assertThrows(IllegalArgumentException.class,
                    () -> envioService.cotizar(TipoEntrega.ENVIO_DOMICILIO, "Chubut", malo, dosCamperas), malo);
        }
        verifyNoInteractions(cotizador);
    }

    @Test
    void unaVarianteInexistenteODeUnProductoInactivoNoSeCotiza() {
        when(varianteRepository.findAllById(anyCollection())).thenReturn(List.of());
        assertThrows(RecursoNoEncontradoException.class,
                () -> envioService.cotizar(TipoEntrega.ENVIO_DOMICILIO, "Chubut", "9200", dosCamperas));

        campera.getProducto().setActivo(false);
        when(varianteRepository.findAllById(anyCollection())).thenReturn(List.of(campera));
        assertThrows(RecursoNoEncontradoException.class,
                () -> envioService.cotizar(TipoEntrega.ENVIO_DOMICILIO, "Chubut", "9200", dosCamperas));
        verifyNoInteractions(cotizador);
    }

    // Si el correo falla, el error sube tal cual: ni la cotización ni el
    // pedido siguen con un costo inventado.
    @Test
    void siElCotizadorFallaElErrorSube() {
        when(varianteRepository.findAllById(anyCollection())).thenReturn(List.of(campera));
        when(cotizador.cotizar(any())).thenThrow(new CotizacionNoDisponibleException("Andreani no respondió"));

        assertThrows(CotizacionNoDisponibleException.class,
                () -> envioService.costoParaPedido(TipoEntrega.ENVIO_DOMICILIO, "Chubut", "9200", dosCamperas));
    }
}
