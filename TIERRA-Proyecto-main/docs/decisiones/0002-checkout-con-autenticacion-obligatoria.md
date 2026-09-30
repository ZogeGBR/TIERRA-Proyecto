# 0002 — Checkout con autenticación obligatoria: eliminación de compra como invitado

- **Estado:** propuesta (requiere confirmación formal del cliente por impacto en presupuesto)
- **Fecha:** Fase 1 / Días 3-6 (Backend B)
- **Ubicación en el repo:** `docs/decisiones/0002-checkout-con-autenticacion-obligatoria.md`

---

## Contexto

El presupuesto comercial y técnico del proyecto, en su **punto 2.9**, compromete expresamente la *"compra como invitado y con cuenta registrada"*.

Durante el análisis y refinamiento de la arquitectura del modelo de pedidos (tarea 4 de Backend B), se evaluó el costo técnico y operativo de mantener dos flujos paralelos de checkout:
1. Un flujo para usuarios registrados, donde los pedidos se vinculan a un `usuario_id` existente y reutilizan direcciones y datos de perfil.
2. Un flujo para usuarios invitados, que requeriría admitir `pedidos.usuario_id` como `NULL`, agregar columnas de contacto desnormalizadas en `pedidos` (nombre, email, teléfono), gestionar sesiones temporales y resolver la posterior unificación de historial si el cliente se registra más adelante.

## Decisión

**Se elimina la compra como invitado.** Para realizar cualquier compra en la tienda online es obligatorio iniciar sesión o registrarse con una cuenta.

El flujo de checkout exige que el usuario esté autenticado. Por lo tanto:
- `pedidos.usuario_id` se mantiene estrictamente como `NOT NULL REFERENCES usuarios(id)`.
- No se agregan campos de contacto redundantes a la tabla `pedidos`, ya que los datos de contacto y facturación se obtienen directamente de la entidad `Usuario`.

## Motivo

1. **Simplicidad y robustez del modelo de datos:** Todos los pedidos tienen dueño desde su creación. Se evitan estados intermedios, carritos huérfanos sin trazabilidad y lógica compleja para vincular compras anónimas a cuentas nuevas.
2. **Seguridad y privacidad:** Centraliza el consentimiento legal de términos, condiciones y comunicaciones en la cuenta del usuario.
3. **Mantenimiento y trazabilidad histórica:** Facilita el seguimiento de pedidos, reclamos, garantías y devoluciones tanto para el cliente como para el operador de la tienda.
4. **Focalización del esfuerzo de desarrollo:** Permite concentrar el esfuerzo del equipo en los módulos críticos de la venta online (panel de pedidos, pasarela de pagos y gestión de envíos).

## Consecuencias

### Qué se mantiene / simplifica

- `pedidos.usuario_id NOT NULL`: la relación es obligatoria y directa.
- No se crean campos como `pedidos.email_invitado`, `pedidos.telefono_invitado` ni tablas auxiliares de invitados.
- Las consultas de historial de compras (`GET /api/pedidos/mis-pedidos` o equivalente) se resuelven de forma directa por `usuario_id`.

### Impacto contractual / Qué se requiere del cliente

- **Confirmación de alcance:** Al eliminar la compra como invitado, se reduce una funcionalidad explícitamente comprometida en el punto 2.9 del presupuesto. Esto **debe ser convalidado y firmado con el cliente** para evitar reclamos posteriores sobre faltantes de alcance.
- En el frontend, el flujo de compra guiará al usuario no autenticado a iniciar sesión o crear su cuenta antes de ingresar al paso de pago.
