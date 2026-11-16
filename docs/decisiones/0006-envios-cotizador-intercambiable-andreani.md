# 0006 — Envíos: cotizador intercambiable, preparado para Andreani

- **Estado:** aceptada
- **Fecha:** Fase 2, tarea 10
- **Ubicación en el repo:** `docs/decisiones/0006-envios-cotizador-intercambiable-andreani.md`

---

## Contexto

Los envíos a domicilio se van a hacer con **Andreani**, a través de su API. Las credenciales (usuario, contraseña, número de cliente y contratos) las entrega el comercial de Andreani, y todavía no están.

Mientras tanto, el checkout sin cuenta (tarea 9) necesita un costo de envío para cobrar, y la pantalla necesita mostrarlo antes de pagar. Hasta esta tarea, el costo era un número fijo escrito en `PedidoService`, y el frontend mostraba otro número fijo escrito en su propio código.

Según la documentación pública de Andreani, para **cotizar** pide el código postal de destino, el contrato (distinto para envío a domicilio y a sucursal), el número de cliente, el origen y, por cada bulto, peso, volumen o medidas y valor declarado. Para **crear el envío** pide además remitente y destinatario con documento, teléfonos y email, y la dirección completa con piso, departamento, localidad, provincia y código postal. Devuelve el número de envío y las etiquetas.

## Decisión

### Un solo lugar calcula el costo, y lo que calcula es intercambiable

`EnvioService` decide la cobertura y el costo, y lo usan los dos lados: el endpoint de cotización (`POST /api/envios/cotizacion`), que informa, y el alta del pedido, que cobra. **Lo que se muestra y lo que se cobra no pueden diferir porque son el mismo cálculo.** Nunca se usa un costo que mande el navegador.

El costo en sí lo calcula una implementación de la interfaz `CotizadorEnvio`, elegida por configuración (`envios.proveedor`):

| Proveedor | Qué hace | Cuándo |
|---|---|---|
| `fijo` | El mismo monto para cualquier destino de la zona (`ENVIO_COSTO_FIJO`, hoy $12.000) | Ahora, mientras no estén las credenciales |
| `andreani` | Le pide la tarifa a la API de Andreani | Cuando se integre |

**Por qué.** Integrar Andreani tiene que ser agregar una clase, no reescribir el checkout. El endpoint de cotización, el checkout y el frontend no se enteran de qué proveedor hay detrás.

### Lo que Andreani va a necesitar ya viaja armado

`EnvioService` le pasa al cotizador una `SolicitudCotizacion` con la provincia, el código postal y, por cada ítem, cantidad, peso, medidas y precio, más el valor declarado total. El cotizador fijo no usa nada de eso, pero el de Andreani lo va a encontrar listo.

### Peso y medidas en los productos (V9)

Se agregan `peso_gramos`, `alto_cm`, `ancho_cm` y `largo_cm` a `productos`, **vacías**. Son del producto ya embalado. Van por producto y no por variante: un talle más no cambia el bulto de forma relevante, y es lo que Tierra puede cargar en su planilla.

**Por qué ahora y vacías.** Es el dato que más tarda en juntarse: Tierra tiene que pesar y medir cada producto. Con las columnas creadas, puede empezar a cargarlo antes de que lleguen las credenciales.

### La cobertura es una decisión comercial, en configuración

Envío a domicilio a Neuquén, Río Negro, Chubut y Santa Cruz (`ENVIO_PROVINCIAS`), comparando sin tildes ni mayúsculas. Fuera de la zona, la cotización responde `cubierto: false` y ofrece el retiro en el local. No es una limitación de Andreani, que llega a todo el país: abrir más provincias es cambiar la configuración.

### Si el correo falla, no se cobra un costo inventado

La interfaz contempla el error: el cotizador lanza `CotizacionNoDisponibleException` y se responde **503** con *"No pudimos calcular el costo del envío. Probá de nuevo en unos minutos."* La compra no avanza, pero tampoco cobra un envío equivocado. El cotizador fijo nunca falla. El de Andreani tendrá que decidir qué hacer si a un producto le faltan el peso o las medidas: la opción segura es rechazar la cotización con ese mismo error.

## Consecuencias

- `PedidoService` ya no tiene el costo escrito: lo pide a `EnvioService`, **antes de reservar stock**, así un destino fuera de zona se rechaza sin tocar el inventario.
- El código postal de envío tiene que tener 4 números, que es el que usa Andreani para cotizar.
- **Lo que falta para la integración, y en qué tarea:**
  - ~~**Piso y departamento** en la dirección del pedido~~: hecho en la tarea 9 (V10), como campos opcionales. Con la V10 el pedido también guarda el DNI y el teléfono de quien recibe, que Andreani pide para el destinatario.
  - **El cotizador de Andreani** y sus credenciales en variables de entorno (`ANDREANI_*`), nunca en el repo: tarea propia, apenas termine el bloque del checkout y estén las credenciales.
  - **Crear el envío en Andreani cuando se aprueba el pago**, y guardar el número de envío y el seguimiento: la tabla `envios` ya existe y sirve tal cual (transportista, número de seguimiento, costo, estado). El punto donde engancharlo ya existe: `PagoService`, al confirmar el pago.
- **Lo que tiene que definir Tierra:**
  - Las credenciales de Andreani: usuario, contraseña, número de cliente y los contratos.
  - El origen: desde qué sucursal o dirección despacha.
  - El peso y las medidas de cada producto embalado, en su planilla de productos.
  - Si se ofrece el **retiro en sucursal Andreani** como tercera opción de entrega. Si se ofrece, hay que sumar ese tipo de entrega.
  - Si la zona de envío sigue siendo de 4 provincias o se abre al país.

## Alternativas descartadas

- **Esperar las credenciales para hacer la tarea 10 directamente con Andreani.** Bloquearía el checkout, que es el camino crítico de la fase, por un trámite que no depende del equipo.
- **Que el frontend calcule o tenga escrito el costo.** Es lo que había: el comprador veía un número y pagaba otro.
- **Peso y medidas por variante.** Más precisión de la que el caso necesita, y el triple de datos para cargar.
