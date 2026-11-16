package com.tierra.ecommerce.service;

import com.tierra.ecommerce.config.EnvioProperties;
import com.tierra.ecommerce.dto.CotizacionEnvioResponse;
import com.tierra.ecommerce.dto.ItemPedidoRequest;
import com.tierra.ecommerce.entity.Producto;
import com.tierra.ecommerce.entity.VarianteProducto;
import com.tierra.ecommerce.enums.TipoEntrega;
import com.tierra.ecommerce.exception.RecursoNoEncontradoException;
import com.tierra.ecommerce.repository.VarianteProductoRepository;
import com.tierra.ecommerce.service.envio.CotizadorEnvio;
import com.tierra.ecommerce.service.envio.SolicitudCotizacion;
import com.tierra.ecommerce.util.Textos;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

// Cobertura y costo de los envíos (tarea 10, decisión 0006).
//
// Lo usan los dos lados: el endpoint de cotización, que le informa el costo a
// la pantalla antes de pagar, y el alta del pedido, que lo vuelve a calcular
// al cobrar. Como es el mismo código, lo que se muestra y lo que se cobra no
// pueden diferir. Nunca se usa un costo que mande el navegador.
@Service
public class EnvioService {

    private final EnvioProperties properties;
    private final CotizadorEnvio cotizador;
    private final VarianteProductoRepository varianteRepository;

    public EnvioService(EnvioProperties properties, CotizadorEnvio cotizador,
                        VarianteProductoRepository varianteRepository) {
        this.properties = properties;
        this.cotizador = cotizador;
        this.varianteRepository = varianteRepository;
    }

    // Cotización para la pantalla. Un destino fuera de zona no es un error:
    // se responde cubierto = false y la pantalla ofrece el retiro.
    //
    // La transacción hace falta para leer el producto de cada variante (con
    // open-in-view desactivado, fuera de una transacción fallaría). Cuando lo
    // llama costoParaPedido, corre dentro de la transacción del pedido.
    @Transactional(readOnly = true)
    public CotizacionEnvioResponse cotizar(TipoEntrega tipoEntrega, String provincia, String codigoPostal,
                                           List<ItemPedidoRequest> items) {
        if (tipoEntrega == TipoEntrega.RETIRO_LOCAL) {
            return CotizacionEnvioResponse.cubierto(BigDecimal.ZERO);
        }
        validarDestino(provincia, codigoPostal);
        if (!tieneCobertura(provincia)) {
            return CotizacionEnvioResponse.fueraDeCobertura(mensajeFueraDeCobertura());
        }
        return CotizacionEnvioResponse.cubierto(cotizador.cotizar(solicitud(provincia, codigoPostal, items)));
    }

    // Costo para cobrar en un pedido. Acá un destino fuera de zona SÍ es un
    // error: la pantalla ya ofreció el retiro, y si el pedido llega igual con
    // envío, se rechaza.
    public BigDecimal costoParaPedido(TipoEntrega tipoEntrega, String provincia, String codigoPostal,
                                      List<ItemPedidoRequest> items) {
        CotizacionEnvioResponse cotizacion = cotizar(tipoEntrega, provincia, codigoPostal, items);
        if (!cotizacion.cubierto()) {
            throw new IllegalArgumentException(cotizacion.mensaje());
        }
        return cotizacion.costo();
    }

    public boolean tieneCobertura(String provincia) {
        if (provincia == null || provincia.isBlank()) {
            return false;
        }
        String buscada = Textos.normalizar(provincia);
        return properties.getProvinciasConCobertura().stream()
                .anyMatch(p -> Textos.normalizar(p).equals(buscada));
    }

    String mensajeFueraDeCobertura() {
        List<String> provincias = properties.getProvinciasConCobertura().stream().map(String::trim).toList();
        String lista = provincias.size() == 1
                ? provincias.get(0)
                : String.join(", ", provincias.subList(0, provincias.size() - 1)) + " y " + provincias.get(provincias.size() - 1);
        return "Por ahora enviamos a domicilio solo a " + lista + ". Podés retirar tu compra en el local.";
    }

    private static void validarDestino(String provincia, String codigoPostal) {
        if (provincia == null || provincia.isBlank()) {
            throw new IllegalArgumentException("La provincia es obligatoria para el envío a domicilio");
        }
        // El código postal de 4 números es el que usa Andreani para cotizar.
        if (codigoPostal == null || !codigoPostal.trim().matches("\\d{4}")) {
            throw new IllegalArgumentException("El código postal tiene que tener 4 números");
        }
    }

    // Arma lo que necesita el correo: cada ítem con el peso, las medidas y el
    // precio de su producto. Una sola consulta para todas las variantes.
    private SolicitudCotizacion solicitud(String provincia, String codigoPostal, List<ItemPedidoRequest> items) {
        Map<UUID, VarianteProducto> variantes = varianteRepository
                .findAllById(items.stream().map(ItemPedidoRequest::varianteId).distinct().toList())
                .stream()
                .collect(Collectors.toMap(VarianteProducto::getId, Function.identity()));

        List<SolicitudCotizacion.Bulto> bultos = new ArrayList<>();
        BigDecimal valorDeclarado = BigDecimal.ZERO;
        for (ItemPedidoRequest item : items) {
            VarianteProducto v = variantes.get(item.varianteId());
            if (v == null || !v.getProducto().isActivo()) {
                throw new RecursoNoEncontradoException("Variante no encontrada: " + item.varianteId());
            }
            Producto p = v.getProducto();
            BigDecimal valorUnitario = p.getPrecio().add(v.getPrecioAdicional());
            bultos.add(new SolicitudCotizacion.Bulto(item.cantidad(), p.getPesoGramos(), p.getAltoCm(),
                    p.getAnchoCm(), p.getLargoCm(), valorUnitario));
            valorDeclarado = valorDeclarado.add(valorUnitario.multiply(BigDecimal.valueOf(item.cantidad())));
        }
        return new SolicitudCotizacion(provincia.trim(), codigoPostal.trim(), bultos, valorDeclarado);
    }
}
