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
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.regex.Pattern;

// Acceso de clientes por código de seis dígitos. Implementa la tabla
// "Pedir y usar un código" del ADR 0005; cualquier cambio de comportamiento
// se discute ahí antes de tocar esta clase.
//
// Las dos operaciones devuelven lo mismo hacia afuera en todos los casos de
// error: quien llama no puede distinguir un email inexistente de un cliente
// bloqueado, del equipo, o que pasó el límite. Esa es la regla que evita que
// el acceso sirva para averiguar quién compró en Tierra.
@Service
public class CodigoAccesoService {

    private static final Pattern SEIS_DIGITOS = Pattern.compile("\\d{6}");

    private final UsuarioRepository usuarioRepository;
    private final CodigoAccesoRepository codigoAccesoRepository;
    private final CodigoAccesoHasher hasher;
    private final GeneradorCodigoAcceso generador;
    private final CodigoAccesoProperties properties;
    private final ApplicationEventPublisher eventos;
    private final Clock reloj;

    public CodigoAccesoService(UsuarioRepository usuarioRepository,
                               CodigoAccesoRepository codigoAccesoRepository,
                               CodigoAccesoHasher hasher,
                               GeneradorCodigoAcceso generador,
                               CodigoAccesoProperties properties,
                               ApplicationEventPublisher eventos,
                               Clock reloj) {
        this.usuarioRepository = usuarioRepository;
        this.codigoAccesoRepository = codigoAccesoRepository;
        this.hasher = hasher;
        this.generador = generador;
        this.properties = properties;
        this.eventos = eventos;
        this.reloj = reloj;
    }

    // ---------------------------------------------------------------
    // Pedir un código
    // ---------------------------------------------------------------

    // No devuelve nada a propósito: el controller responde siempre el mismo
    // mensaje genérico, se haya generado un código o no.
    @Transactional
    public void solicitar(String email) {
        LocalDateTime ahora = LocalDateTime.now(reloj);

        Optional<Usuario> encontrado = usuarioRepository.findByEmailConBloqueo(AuthService.normalizarEmail(email));
        if (encontrado.isEmpty()) {
            return;
        }
        Usuario usuario = encontrado.get();

        // El equipo nunca recibe código: si pudiera, tomar el control del
        // email de alguien del equipo daría acceso al panel.
        if (!esClienteHabilitado(usuario) || estaBloqueado(usuario, ahora)) {
            return;
        }

        if (codigoAccesoRepository.contarDesde(usuario.getId(), ahora.minusMinutes(15))
                >= properties.getSolicitudesPor15Minutos()) {
            return;
        }
        if (codigoAccesoRepository.contarDesde(usuario.getId(), ahora.minusHours(24))
                >= properties.getSolicitudesPorDia()) {
            return;
        }

        // Un solo código vigente por cliente.
        codigoAccesoRepository.invalidarPendientes(usuario.getId());

        String codigo = generador.generar();
        CodigoAcceso nuevo = new CodigoAcceso();
        nuevo.setUsuario(usuario);
        nuevo.setCodigoHash(hasher.hash(usuario.getId(), codigo));
        nuevo.setExpiraEn(ahora.plusMinutes(properties.getVigenciaMinutos()));
        nuevo.setCreadoEn(ahora);
        codigoAccesoRepository.save(nuevo);

        // Se envía recién cuando esta transacción confirma, y en otro hilo:
        // ver EnvioCodigoAccesoListener.
        eventos.publishEvent(new CodigoAccesoSolicitado(usuario.getEmail(), usuario.getNombre(), codigo));
    }

    // ---------------------------------------------------------------
    // Usar un código
    // ---------------------------------------------------------------

    // Devuelve el usuario si el código es correcto. Vacío en CUALQUIER otro
    // caso, sin distinguir cuál: el controller responde un error genérico.
    //
    // Devuelve Optional en vez de lanzar una excepción porque, cuando el
    // código es incorrecto, hay que GUARDAR el intento: una excepción dentro
    // de la transacción la desharía y el intento no contaría nunca.
    @Transactional
    public Optional<Usuario> verificar(String email, String codigo) {
        if (codigo == null || !SEIS_DIGITOS.matcher(codigo).matches()) {
            return Optional.empty();
        }
        LocalDateTime ahora = LocalDateTime.now(reloj);

        Optional<Usuario> encontrado = usuarioRepository.findByEmailConBloqueo(AuthService.normalizarEmail(email));
        if (encontrado.isEmpty()) {
            return Optional.empty();
        }
        Usuario usuario = encontrado.get();

        // Se vuelve a mirar el rol: un código generado cuando la cuenta era de
        // cliente no puede abrir una sesión si después pasó al equipo.
        if (!esClienteHabilitado(usuario)) {
            return Optional.empty();
        }
        // Bloqueado: error genérico y NO suma intentos.
        if (estaBloqueado(usuario, ahora)) {
            return Optional.empty();
        }

        List<CodigoAcceso> pendientes = codigoAccesoRepository.findPendientes(usuario.getId());
        if (pendientes.isEmpty()) {
            return Optional.empty();
        }
        CodigoAcceso vigente = pendientes.get(0);

        // Vencido o agotado: ni siquiera el código correcto entra.
        if (!vigente.getExpiraEn().isAfter(ahora) || vigente.getIntentos() >= properties.getIntentosMaximos()) {
            return Optional.empty();
        }

        if (hasher.coincide(usuario.getId(), codigo, vigente.getCodigoHash())) {
            vigente.setUsado(true);
            usuario.setIntentosFallidos(0);
            usuario.setBloqueadoHasta(null);
            return Optional.of(usuario);
        }

        vigente.setIntentos(vigente.getIntentos() + 1);
        if (vigente.getIntentos() >= properties.getIntentosMaximos()) {
            registrarCodigoAgotado(usuario, ahora);
        }
        return Optional.empty();
    }

    // En las cuentas de cliente, usuarios.intentos_fallidos cuenta CÓDIGOS
    // AGOTADOS seguidos, no intentos sueltos. El login con contraseña del
    // equipo nunca toca estos campos en una cuenta de cliente: un solo canal
    // por cuenta (ADR 0005).
    //
    // La seguridad no depende de este bloqueo sino del límite diario de
    // códigos: corta rachas, nada más. Ver el ADR.
    private void registrarCodigoAgotado(Usuario usuario, LocalDateTime ahora) {
        // Si el bloqueo anterior ya venció, el contador arranca de cero. Sin
        // esto, un solo código agotado después del bloqueo volvería a
        // bloquear al instante (el mismo error que se corrigió en la Fase 1).
        boolean bloqueoVencido = usuario.getBloqueadoHasta() != null
                && !usuario.getBloqueadoHasta().isAfter(ahora);
        int agotados = (bloqueoVencido ? 0 : usuario.getIntentosFallidos()) + 1;

        usuario.setIntentosFallidos(agotados);
        usuario.setBloqueadoHasta(agotados >= properties.getAgotadosParaBloqueo()
                ? ahora.plusMinutes(properties.getBloqueoMinutos())
                : null);
    }

    private static boolean esClienteHabilitado(Usuario usuario) {
        return usuario.getRol() == RolUsuario.CLIENTE && usuario.isActivo();
    }

    private static boolean estaBloqueado(Usuario usuario, LocalDateTime ahora) {
        return usuario.getBloqueadoHasta() != null && usuario.getBloqueadoHasta().isAfter(ahora);
    }
}
