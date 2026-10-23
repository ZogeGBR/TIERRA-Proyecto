package com.tierra.ecommerce.service;

import com.tierra.ecommerce.config.CodigoAccesoProperties;
import com.tierra.ecommerce.entity.CodigoAcceso;
import com.tierra.ecommerce.entity.Usuario;
import com.tierra.ecommerce.enums.RolUsuario;
import com.tierra.ecommerce.notificacion.CodigoAccesoSolicitado;
import com.tierra.ecommerce.repository.CodigoAccesoRepository;
import com.tierra.ecommerce.repository.UsuarioRepository;
import com.tierra.ecommerce.security.CodigoAccesoHasher;
import com.tierra.ecommerce.security.GeneradorCodigoAcceso;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InOrder;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

// Una prueba por cada fila de la tabla "Pedir y usar un código" del ADR 0005,
// más los casos que se rompen con facilidad: vencimiento, agotamiento,
// bloqueo y su vencimiento. El tiempo se mueve con un reloj de prueba en vez
// de esperar minutos reales.
@ExtendWith(MockitoExtension.class)
class CodigoAccesoServiceTest {

    private static final String EMAIL = "cliente@tierra.test";
    private static final String CLAVE = "clave-de-prueba-con-mas-de-32-bytes-de-largo";
    private static final LocalDateTime INICIO = LocalDateTime.of(2026, 10, 14, 12, 0);

    @Mock private UsuarioRepository usuarioRepository;
    @Mock private CodigoAccesoRepository codigoAccesoRepository;
    @Mock private ApplicationEventPublisher eventos;

    private RelojDePrueba reloj;
    private CodigoAccesoHasher hasher;
    private CodigoAccesoService servicio;

    @BeforeEach
    void setUp() {
        reloj = new RelojDePrueba(INICIO);
        CodigoAccesoProperties properties = new CodigoAccesoProperties(10, 5, 3, 5, 3, 60, CLAVE);
        hasher = new CodigoAccesoHasher(properties);
        servicio = new CodigoAccesoService(usuarioRepository, codigoAccesoRepository, hasher,
                new GeneradorCodigoAcceso(), properties, eventos, reloj);
    }

    // ---------------------------------------------------------------
    // Pedir un código
    // ---------------------------------------------------------------

    @Nested
    class Solicitar {

        @Test
        void emailInexistenteNoGeneraNiEnviaNada() {
            when(usuarioRepository.findByEmailConBloqueo(EMAIL)).thenReturn(Optional.empty());

            servicio.solicitar(EMAIL);

            verify(codigoAccesoRepository, never()).save(any());
            verifyNoInteractions(eventos);
        }

        @Test
        void clienteRecibeUnCodigoQueSeGuardaComoHmacYNuncaEnTextoPlano() {
            Usuario cliente = cliente();
            when(usuarioRepository.findByEmailConBloqueo(EMAIL)).thenReturn(Optional.of(cliente));
            when(codigoAccesoRepository.contarDesde(eq(cliente.getId()), any())).thenReturn(0L);

            servicio.solicitar(EMAIL);

            ArgumentCaptor<CodigoAcceso> guardado = ArgumentCaptor.forClass(CodigoAcceso.class);
            ArgumentCaptor<CodigoAccesoSolicitado> evento = ArgumentCaptor.forClass(CodigoAccesoSolicitado.class);
            verify(codigoAccesoRepository).save(guardado.capture());
            verify(eventos).publishEvent(evento.capture());

            String codigo = evento.getValue().codigo();
            assertTrue(codigo.matches("\\d{6}"), "el código tiene que ser de seis dígitos: " + codigo);
            assertEquals(EMAIL, evento.getValue().email());

            CodigoAcceso c = guardado.getValue();
            assertSame(cliente, c.getUsuario());
            assertNotEquals(codigo, c.getCodigoHash());
            assertFalse(c.getCodigoHash().contains(codigo));
            assertEquals(hasher.hash(cliente.getId(), codigo), c.getCodigoHash());
            assertEquals(INICIO.plusMinutes(10), c.getExpiraEn());
            assertEquals(INICIO, c.getCreadoEn());
        }

        @Test
        void pedirUnCodigoNuevoInvalidaElAnteriorAntesDeGuardar() {
            Usuario cliente = cliente();
            when(usuarioRepository.findByEmailConBloqueo(EMAIL)).thenReturn(Optional.of(cliente));
            when(codigoAccesoRepository.contarDesde(eq(cliente.getId()), any())).thenReturn(0L);

            servicio.solicitar(EMAIL);

            InOrder orden = inOrder(codigoAccesoRepository);
            orden.verify(codigoAccesoRepository).invalidarPendientes(cliente.getId());
            orden.verify(codigoAccesoRepository).save(any());
        }

        @Test
        void elEmailSeNormalizaAntesDeBuscar() {
            when(usuarioRepository.findByEmailConBloqueo(EMAIL)).thenReturn(Optional.empty());

            servicio.solicitar("  Cliente@Tierra.TEST ");

            verify(usuarioRepository).findByEmailConBloqueo(EMAIL);
        }

        @Test
        void alguienDelEquipoNoRecibeCodigo() {
            Usuario admin = cliente();
            admin.setRol(RolUsuario.ADMIN);
            when(usuarioRepository.findByEmailConBloqueo(EMAIL)).thenReturn(Optional.of(admin));

            servicio.solicitar(EMAIL);

            verify(codigoAccesoRepository, never()).save(any());
            verifyNoInteractions(eventos);
        }

        @Test
        void clienteDadoDeBajaNoRecibeCodigo() {
            Usuario inactivo = cliente();
            inactivo.setActivo(false);
            when(usuarioRepository.findByEmailConBloqueo(EMAIL)).thenReturn(Optional.of(inactivo));

            servicio.solicitar(EMAIL);

            verify(codigoAccesoRepository, never()).save(any());
            verifyNoInteractions(eventos);
        }

        @Test
        void clienteBloqueadoNoRecibeCodigo() {
            Usuario bloqueado = cliente();
            bloqueado.setBloqueadoHasta(INICIO.plusMinutes(30));
            when(usuarioRepository.findByEmailConBloqueo(EMAIL)).thenReturn(Optional.of(bloqueado));

            servicio.solicitar(EMAIL);

            verify(codigoAccesoRepository, never()).save(any());
            verifyNoInteractions(eventos);
        }

        @Test
        void conElBloqueoVencidoVuelveARecibirCodigo() {
            Usuario cliente = cliente();
            cliente.setBloqueadoHasta(INICIO.minusMinutes(1));
            when(usuarioRepository.findByEmailConBloqueo(EMAIL)).thenReturn(Optional.of(cliente));
            when(codigoAccesoRepository.contarDesde(eq(cliente.getId()), any())).thenReturn(0L);

            servicio.solicitar(EMAIL);

            verify(codigoAccesoRepository).save(any());
            verify(eventos).publishEvent(any(CodigoAccesoSolicitado.class));
        }

        @Test
        void laCuartaSolicitudEnQuinceMinutosNoGeneraCodigo() {
            Usuario cliente = cliente();
            when(usuarioRepository.findByEmailConBloqueo(EMAIL)).thenReturn(Optional.of(cliente));
            when(codigoAccesoRepository.contarDesde(cliente.getId(), INICIO.minusMinutes(15))).thenReturn(3L);

            servicio.solicitar(EMAIL);

            verify(codigoAccesoRepository, never()).invalidarPendientes(any());
            verify(codigoAccesoRepository, never()).save(any());
            verifyNoInteractions(eventos);
        }

        @Test
        void laSextaSolicitudDelDiaNoGeneraCodigo() {
            Usuario cliente = cliente();
            when(usuarioRepository.findByEmailConBloqueo(EMAIL)).thenReturn(Optional.of(cliente));
            when(codigoAccesoRepository.contarDesde(cliente.getId(), INICIO.minusMinutes(15))).thenReturn(0L);
            when(codigoAccesoRepository.contarDesde(cliente.getId(), INICIO.minusHours(24))).thenReturn(5L);

            servicio.solicitar(EMAIL);

            verify(codigoAccesoRepository, never()).invalidarPendientes(any());
            verify(codigoAccesoRepository, never()).save(any());
            verifyNoInteractions(eventos);
        }
    }

    // ---------------------------------------------------------------
    // Usar un código
    // ---------------------------------------------------------------

    @Nested
    class Verificar {

        @Test
        void codigoCorrectoDevuelveElUsuarioLoMarcaUsadoYReiniciaElContador() {
            Usuario cliente = cliente();
            cliente.setIntentosFallidos(2);
            CodigoAcceso codigo = codigoVigente(cliente, "123456");
            prepararPendiente(cliente, codigo);

            Optional<Usuario> resultado = servicio.verificar(EMAIL, "123456");

            assertTrue(resultado.isPresent());
            assertSame(cliente, resultado.get());
            assertTrue(codigo.isUsado());
            assertEquals(0, cliente.getIntentosFallidos());
            assertNull(cliente.getBloqueadoHasta());
        }

        @Test
        void codigoIncorrectoDevuelveVacioYSumaUnIntento() {
            Usuario cliente = cliente();
            CodigoAcceso codigo = codigoVigente(cliente, "123456");
            prepararPendiente(cliente, codigo);

            assertTrue(servicio.verificar(EMAIL, "654321").isEmpty());

            assertEquals(1, codigo.getIntentos());
            assertFalse(codigo.isUsado());
            assertEquals(0, cliente.getIntentosFallidos());
        }

        @Test
        void elQuintoIntentoFallidoAgotaElCodigoYDespuesNiElCorrectoEntra() {
            Usuario cliente = cliente();
            CodigoAcceso codigo = codigoVigente(cliente, "123456");
            prepararPendiente(cliente, codigo);

            for (int i = 0; i < 5; i++) {
                assertTrue(servicio.verificar(EMAIL, "000000").isEmpty());
            }
            assertEquals(5, codigo.getIntentos());
            assertEquals(1, cliente.getIntentosFallidos(), "un código agotado suma uno al contador");

            assertTrue(servicio.verificar(EMAIL, "123456").isEmpty());
            assertFalse(codigo.isUsado());
            assertEquals(5, codigo.getIntentos(), "un código agotado no sigue sumando intentos");
        }

        @Test
        void unCodigoVencidoNoEntraAunqueSeaCorrecto() {
            Usuario cliente = cliente();
            CodigoAcceso codigo = codigoVigente(cliente, "123456");
            prepararPendiente(cliente, codigo);

            reloj.avanzarMinutos(10);

            assertTrue(servicio.verificar(EMAIL, "123456").isEmpty());
            assertFalse(codigo.isUsado());
        }

        @Test
        void unMinutoAntesDeVencerTodaviaEntra() {
            Usuario cliente = cliente();
            CodigoAcceso codigo = codigoVigente(cliente, "123456");
            prepararPendiente(cliente, codigo);

            reloj.avanzarMinutos(9);

            assertTrue(servicio.verificar(EMAIL, "123456").isPresent());
        }

        @Test
        void tresCodigosAgotadosSeguidosBloqueanUnaHora() {
            Usuario cliente = cliente();
            cliente.setIntentosFallidos(2);
            CodigoAcceso codigo = codigoVigente(cliente, "123456");
            prepararPendiente(cliente, codigo);

            for (int i = 0; i < 5; i++) {
                servicio.verificar(EMAIL, "000000");
            }

            assertEquals(3, cliente.getIntentosFallidos());
            assertEquals(INICIO.plusMinutes(60), cliente.getBloqueadoHasta());
        }

        @Test
        void clienteBloqueadoRecibeErrorYNoSumaIntentos() {
            Usuario cliente = cliente();
            cliente.setIntentosFallidos(3);
            cliente.setBloqueadoHasta(INICIO.plusMinutes(30));
            when(usuarioRepository.findByEmailConBloqueo(EMAIL)).thenReturn(Optional.of(cliente));

            assertTrue(servicio.verificar(EMAIL, "123456").isEmpty());

            verify(codigoAccesoRepository, never()).findPendientes(any());
            assertEquals(3, cliente.getIntentosFallidos());
        }

        @Test
        void alVencerElBloqueoElContadorArrancaDeCero() {
            Usuario cliente = cliente();
            cliente.setIntentosFallidos(3);
            cliente.setBloqueadoHasta(INICIO.minusMinutes(1));
            CodigoAcceso codigo = codigoVigente(cliente, "123456");
            prepararPendiente(cliente, codigo);

            for (int i = 0; i < 5; i++) {
                servicio.verificar(EMAIL, "000000");
            }

            assertEquals(1, cliente.getIntentosFallidos(),
                    "con el bloqueo vencido, un código agotado no puede volver a bloquear al instante");
            assertNull(cliente.getBloqueadoHasta());
        }

        @Test
        void unaCuentaQuePasoAlEquipoNoEntraConCodigo() {
            Usuario cuenta = cliente();
            cuenta.setRol(RolUsuario.OPERADOR);
            when(usuarioRepository.findByEmailConBloqueo(EMAIL)).thenReturn(Optional.of(cuenta));

            assertTrue(servicio.verificar(EMAIL, "123456").isEmpty());

            verify(codigoAccesoRepository, never()).findPendientes(any());
        }

        @Test
        void clienteDadoDeBajaNoEntra() {
            Usuario inactivo = cliente();
            inactivo.setActivo(false);
            when(usuarioRepository.findByEmailConBloqueo(EMAIL)).thenReturn(Optional.of(inactivo));

            assertTrue(servicio.verificar(EMAIL, "123456").isEmpty());

            verify(codigoAccesoRepository, never()).findPendientes(any());
        }

        @Test
        void emailInexistenteDevuelveVacio() {
            when(usuarioRepository.findByEmailConBloqueo(EMAIL)).thenReturn(Optional.empty());

            assertTrue(servicio.verificar(EMAIL, "123456").isEmpty());
        }

        @Test
        void sinCodigoPendienteDevuelveVacio() {
            Usuario cliente = cliente();
            when(usuarioRepository.findByEmailConBloqueo(EMAIL)).thenReturn(Optional.of(cliente));
            when(codigoAccesoRepository.findPendientes(cliente.getId())).thenReturn(List.of());

            assertTrue(servicio.verificar(EMAIL, "123456").isEmpty());
        }

        @Test
        void unFormatoInvalidoNiSiquieraConsultaLaBase() {
            assertTrue(servicio.verificar(EMAIL, null).isEmpty());
            assertTrue(servicio.verificar(EMAIL, "12345").isEmpty());
            assertTrue(servicio.verificar(EMAIL, "1234567").isEmpty());
            assertTrue(servicio.verificar(EMAIL, "12a456").isEmpty());

            verifyNoInteractions(usuarioRepository, codigoAccesoRepository);
        }
    }

    // ---------------------------------------------------------------
    // Utilidades
    // ---------------------------------------------------------------

    private static Usuario cliente() {
        Usuario u = new Usuario();
        u.setId(UUID.randomUUID());
        u.setNombre("Cliente de Prueba");
        u.setEmail(EMAIL);
        u.setRol(RolUsuario.CLIENTE);
        return u;
    }

    private CodigoAcceso codigoVigente(Usuario usuario, String codigo) {
        CodigoAcceso c = new CodigoAcceso();
        c.setUsuario(usuario);
        c.setCodigoHash(hasher.hash(usuario.getId(), codigo));
        c.setCreadoEn(INICIO);
        c.setExpiraEn(INICIO.plusMinutes(10));
        return c;
    }

    private void prepararPendiente(Usuario usuario, CodigoAcceso codigo) {
        when(usuarioRepository.findByEmailConBloqueo(EMAIL)).thenReturn(Optional.of(usuario));
        when(codigoAccesoRepository.findPendientes(usuario.getId())).thenReturn(List.of(codigo));
    }

    // Reloj que se mueve a mano. Trabaja en UTC para que el resultado no
    // dependa de la zona horaria de la máquina que corre los tests.
    static class RelojDePrueba extends Clock {
        private Instant ahora;

        RelojDePrueba(LocalDateTime inicio) {
            this.ahora = inicio.toInstant(ZoneOffset.UTC);
        }

        void avanzarMinutos(long minutos) {
            ahora = ahora.plusSeconds(minutos * 60);
        }

        @Override public ZoneId getZone() { return ZoneOffset.UTC; }
        @Override public Clock withZone(ZoneId zone) { return this; }
        @Override public Instant instant() { return ahora; }
    }
}
