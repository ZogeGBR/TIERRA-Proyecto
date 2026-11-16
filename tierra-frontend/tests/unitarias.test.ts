import { test } from "node:test";
import assert from "node:assert/strict";
import { destinoSeguro } from "../lib/destinoSeguro";
import { normalizarCodigo, codigoCompleto, segundosParaReenviar, emailValido } from "../lib/codigoAcceso";
import { estadoDeCobertura, codigoPostalValido } from "../lib/cobertura";
import { validarContacto, validarEntrega, hayErrores, DATOS_VACIOS, soloDigitos } from "../lib/validacionCheckout";
import {
  firmaDeCompra, guardarPagoPendiente, leerPagoPendiente, leerCualquierPagoPendiente, borrarPagoPendiente,
  esLinkDePago, vencimientoDe
} from "../lib/pedidoPendiente";
import { obtenerLinkDePago } from "../lib/iniciarPago";
import { diasDeAlquiler, estimarPrecio, enlaceWhatsapp, armarMensajeConsulta } from "../lib/alquiler";
import { etiquetaDeEstado, tonoDeEstado, sePuedePagar, textoDeDireccion, fechaLarga } from "../lib/pedidos";
import { textoDeError, esEmailNoUsable, esErrorDeRed, esErrorDelServidor } from "../lib/errores";
import { ApiError, api, NO_DISPONIBLE } from "../lib/api";
import { filtrosDeLaUrl, queryDeFiltros, cantidadDeFiltros } from "../lib/catalogo";
import { normalizarRanking, pestaniasConProductos, LIMITE_RANKING, MINIMO_RANKING } from "../lib/rankings";

function almacenFalso() {
  const m = new Map<string, string>();
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), removeItem: (k: string) => void m.delete(k) };
}

test("destinoSeguro: solo rutas internas y nunca vuelve a login/equipo", () => {
  assert.equal(destinoSeguro("/cuenta/pedidos"), "/cuenta/pedidos");
  assert.equal(destinoSeguro(null), "/");
  assert.equal(destinoSeguro("https://evil.com"), "/");
  assert.equal(destinoSeguro("//evil.com"), "/");
  assert.equal(destinoSeguro("/\\evil.com"), "/");
  assert.equal(destinoSeguro("/a\nb"), "/");
  assert.equal(destinoSeguro("/login"), "/");
  assert.equal(destinoSeguro("/login?redirect=/x"), "/");
  assert.equal(destinoSeguro("/equipo"), "/");
  assert.equal(destinoSeguro("/equipos-de-esqui"), "/equipos-de-esqui");
  assert.equal(destinoSeguro("/loginx"), "/loginx");
});

test("código de acceso", () => {
  assert.equal(normalizarCodigo("Tu código es 123 456 789"), "123456");
  assert.equal(normalizarCodigo("12a3"), "123");
  assert.equal(codigoCompleto("123456"), true);
  assert.equal(codigoCompleto("12345"), false);
  assert.equal(codigoCompleto("1234567"), false);
  assert.equal(segundosParaReenviar(0, 0), 60);
  assert.equal(segundosParaReenviar(0, 59_001), 1);
  assert.equal(segundosParaReenviar(0, 60_000), 0);
  assert.equal(segundosParaReenviar(0, 999_999), 0);
  assert.equal(emailValido("a@b.com"), true);
  assert.equal(emailValido("a@b"), false);
  assert.equal(emailValido(""), false);
});

test("cobertura de envíos", () => {
  assert.equal(estadoDeCobertura(""), "sin_elegir");
  assert.equal(estadoDeCobertura("Neuquén"), "dentro");
  assert.equal(estadoDeCobertura(" neuquen "), "dentro");
  assert.equal(estadoDeCobertura("RÍO NEGRO"), "dentro");
  assert.equal(estadoDeCobertura("Chubut"), "dentro");
  assert.equal(estadoDeCobertura("Santa Cruz"), "dentro");
  assert.equal(estadoDeCobertura("Otra provincia"), "fuera");
  assert.equal(estadoDeCobertura("Mendoza"), "fuera");
  assert.equal(codigoPostalValido("9200"), true);
  assert.equal(codigoPostalValido("920"), false);
  assert.equal(codigoPostalValido("92000"), false);
  assert.equal(codigoPostalValido("abcd"), false);
});

test("validación del checkout", () => {
  const ok = { ...DATOS_VACIOS, nombre: "Ana Pérez", email: "ana@mail.com", telefono: "2945 123456" };
  assert.equal(hayErrores(validarContacto(ok)), false);
  assert.ok(validarContacto({ ...ok, nombre: "A" }).nombre);
  assert.ok(validarContacto({ ...ok, email: "x" }).email);
  assert.equal(validarContacto({ ...ok, email: "" }, true).email, undefined);
  assert.ok(validarContacto({ ...ok, telefono: "1234567" }).telefono);
  assert.equal(validarContacto({ ...ok, telefono: "12345678" }).telefono, undefined);
  assert.ok(validarContacto({ ...ok, telefono: "1".repeat(16) }).telefono);
  assert.equal(soloDigitos("12.345.678"), "12345678");

  // Retiro: no pide DNI ni dirección.
  assert.equal(hayErrores(validarEntrega(DATOS_VACIOS, "RETIRO_LOCAL")), false);
  const dom = { ...ok, dni: "12.345.678", calle: "Fontana", numero: "482", ciudad: "Esquel", provincia: "Chubut", codigoPostal: "9200" };
  assert.equal(hayErrores(validarEntrega(dom, "ENVIO_DOMICILIO")), false);
  assert.ok(validarEntrega({ ...dom, dni: "123456" }, "ENVIO_DOMICILIO").dni);
  assert.ok(validarEntrega({ ...dom, dni: "123456789" }, "ENVIO_DOMICILIO").dni);
  assert.ok(validarEntrega({ ...dom, calle: " " }, "ENVIO_DOMICILIO").calle);
  assert.ok(validarEntrega({ ...dom, provincia: "" }, "ENVIO_DOMICILIO").provincia);
  assert.ok(validarEntrega({ ...dom, provincia: "Otra provincia" }, "ENVIO_DOMICILIO").provincia);
  assert.ok(validarEntrega({ ...dom, codigoPostal: "92" }, "ENVIO_DOMICILIO").codigoPostal);
  // Piso y departamento son opcionales, con el largo máximo del backend.
  assert.equal(hayErrores(validarEntrega({ ...dom, piso: "12", departamento: "B" }, "ENVIO_DOMICILIO")), false);
  assert.ok(validarEntrega({ ...dom, piso: "1".repeat(11) }, "ENVIO_DOMICILIO").piso);
  assert.ok(validarEntrega({ ...dom, departamento: "B".repeat(11) }, "ENVIO_DOMICILIO").departamento);
});

test("pago pendiente: guardar, leer por firma, vencer, formato inválido", () => {
  const items = [{ varianteId: "v1", cantidad: 2 }, { varianteId: "v0", cantidad: 1 }];
  const f1 = firmaDeCompra(items, "RETIRO_LOCAL", null, "Ana@Mail.com");
  assert.equal(f1, firmaDeCompra([...items].reverse(), "RETIRO_LOCAL", null, " ana@mail.com "));
  assert.notEqual(f1, firmaDeCompra([{ varianteId: "v1", cantidad: 3 }, items[1]], "RETIRO_LOCAL", null, "ana@mail.com"));
  const dir = { calle: "Fontana", numero: "1", ciudad: "Esquel", provincia: "Chubut", codigoPostal: "9200" };
  assert.notEqual(firmaDeCompra(items, "ENVIO_DOMICILIO", dir, "a@b.com"), firmaDeCompra(items, "ENVIO_DOMICILIO", { ...dir, calle: "Otra" }, "a@b.com"));
  // Otro piso u otro departamento es otro destino: otra compra.
  assert.notEqual(firmaDeCompra(items, "ENVIO_DOMICILIO", dir, "a@b.com"), firmaDeCompra(items, "ENVIO_DOMICILIO", { ...dir, piso: "3" }, "a@b.com"));
  assert.notEqual(
    firmaDeCompra(items, "ENVIO_DOMICILIO", { ...dir, departamento: "A" }, "a@b.com"),
    firmaDeCompra(items, "ENVIO_DOMICILIO", { ...dir, departamento: "B" }, "a@b.com")
  );

  const a = almacenFalso();
  const pago = { pedidoId: "p1", initPoint: "https://www.mercadopago.com.ar/x", venceEn: 1000, firma: f1 };
  guardarPagoPendiente(pago, a);
  assert.equal(leerPagoPendiente(f1, 999, a)?.pedidoId, "p1");
  assert.equal(leerPagoPendiente("otra", 999, a), null);
  assert.equal(leerCualquierPagoPendiente(999, a)?.pedidoId, "p1");
  assert.equal(leerPagoPendiente(f1, 1000, a), null, "vencido exacto");
  assert.equal(leerCualquierPagoPendiente(10, a), null, "al vencer se borra");

  a.setItem("tierra_pedido_pendiente", "{no es json");
  assert.equal(leerCualquierPagoPendiente(0, a), null);
  assert.equal(a.getItem("tierra_pedido_pendiente"), null, "formato inválido se limpia");
  a.setItem("tierra_pedido_pendiente", JSON.stringify({ pedidoId: 1 }));
  assert.equal(leerCualquierPagoPendiente(0, a), null);

  guardarPagoPendiente(pago, a);
  borrarPagoPendiente(a);
  assert.equal(leerCualquierPagoPendiente(0, a), null);
  assert.equal(leerPagoPendiente("x", 0, null), null);

  assert.equal(vencimientoDe("2026-10-15T10:00:00Z", 0), Date.parse("2026-10-15T10:00:00Z"));
  assert.equal(vencimientoDe(null, 5), 5 + 20 * 60 * 1000);
  assert.equal(vencimientoDe("basura", 5), 5 + 20 * 60 * 1000);
});

test("esLinkDePago: solo https y Mercado Pago", () => {
  assert.equal(esLinkDePago("https://www.mercadopago.com.ar/checkout/v1/redirect?pref_id=1"), true);
  assert.equal(esLinkDePago("https://mpago.la/abc"), true);
  assert.equal(esLinkDePago("http://www.mercadopago.com.ar/x"), false);
  assert.equal(esLinkDePago("https://evil.com/mercadopago.com"), false);
  assert.equal(esLinkDePago("https://mercadopago.com.evil.com/x"), false);
  assert.equal(esLinkDePago("https://evilmercadopago.com/x"), false);
  assert.equal(esLinkDePago("javascript:alert(1)"), false);
  assert.equal(esLinkDePago("no es url"), false);
  assert.equal(esLinkDePago(""), false);
});

test("obtenerLinkDePago: reutiliza o crea, y propaga el error sin crear de más", async () => {
  let creados = 0;
  const nuevo = { pedidoId: "n", initPoint: "https://www.mercadopago.com.ar/n", venceEn: 1 };
  const viejo = { pedidoId: "v", initPoint: "https://www.mercadopago.com.ar/v", venceEn: 1 };
  const r1 = await obtenerLinkDePago({ leerPagoGuardado: () => viejo, crearPedido: async () => { creados++; return nuevo; } });
  assert.deepEqual(r1, { initPoint: viejo.initPoint, reutilizado: true });
  assert.equal(creados, 0);
  const r2 = await obtenerLinkDePago({ leerPagoGuardado: () => null, crearPedido: async () => { creados++; return nuevo; } });
  assert.deepEqual(r2, { initPoint: nuevo.initPoint, reutilizado: false });
  assert.equal(creados, 1);
  await assert.rejects(obtenerLinkDePago({ leerPagoGuardado: () => null, crearPedido: async () => { throw new Error("x"); } }), /x/);
});

test("alquiler: días inclusivos, estimado, mensaje y WhatsApp", () => {
  assert.equal(diasDeAlquiler("2026-07-10", "2026-07-10"), 1);
  assert.equal(diasDeAlquiler("2026-07-10", "2026-07-15"), 6);
  assert.equal(diasDeAlquiler("2026-07-15", "2026-07-10"), null);
  assert.equal(diasDeAlquiler("", "2026-07-10"), null);
  assert.equal(diasDeAlquiler("2026-13-40", "2026-07-10"), null);
  assert.equal(diasDeAlquiler("10/07/2026", "15/07/2026"), null);
  assert.equal(diasDeAlquiler("2026-10-24", "2026-10-26"), 3, "cambio de horario no corre un día");
  const t = { id: "t", nombre: "Esquíes", precioDia: 1000 };
  assert.equal(estimarPrecio([{ tipo: t, cantidad: 2 }], 3), 6000);
  assert.equal(estimarPrecio([{ tipo: t, cantidad: -2 }], 3), 0);
  assert.equal(estimarPrecio([{ tipo: t, cantidad: 1.9 }], 1), 1000);
  assert.equal(estimarPrecio([], 5), 0);
  const msg = armarMensajeConsulta([{ tipo: t, cantidad: 2 }, { tipo: t, cantidad: 0 }], "2026-07-10", "2026-07-15", 6, 12000);
  assert.match(msg, /2 x Esquíes/);
  assert.match(msg, /10\/07\/2026 al 15\/07\/2026 \(6 días\)/);
  assert.doesNotMatch(msg, /0 x/);
  assert.match(msg, /¿Tienen disponibilidad\?/);
  assert.match(armarMensajeConsulta([{ tipo: t, cantidad: 1 }], "2026-07-10", "2026-07-10", 1, 1000), /\(1 día\)/);
  assert.equal(enlaceWhatsapp(undefined, "x"), null);
  assert.equal(enlaceWhatsapp("123", "x"), null);
  assert.equal(enlaceWhatsapp("+54 9 2945 123456", "hola & chau")?.startsWith("https://wa.me/5492945123456?text=hola%20%26%20chau"), true);
});

test("pedidos: estados", () => {
  assert.equal(etiquetaDeEstado("PENDIENTE"), "Pendiente de pago");
  assert.equal(etiquetaDeEstado("pagado"), "Pagado");
  assert.equal(etiquetaDeEstado("EN_CAMINO"), "En camino");
  assert.equal(tonoDeEstado("CANCELADO"), "malo");
  assert.equal(tonoDeEstado("PENDIENTE"), "espera");
  assert.equal(tonoDeEstado("RARO"), "neutro");
  assert.equal(sePuedePagar("PENDIENTE"), true);
  assert.equal(sePuedePagar("pendiente"), true);
  assert.equal(sePuedePagar("PAGADO"), false);
});

test("errores por código HTTP", () => {
  assert.match(textoDeError(new ApiError(401, "x"), "d"), /sesión venció/);
  assert.match(textoDeError(new ApiError(403, "x"), "d"), /permiso/);
  assert.match(textoDeError(new ApiError(429, "x"), "d"), /muchos intentos/);
  assert.equal(textoDeError(new ApiError(409, "Sin stock"), "d"), "Sin stock");
  assert.equal(textoDeError(new ApiError(0, "No pudimos conectar"), "d"), "No pudimos conectar");
  assert.equal(textoDeError(new ApiError(500, ""), "por defecto"), "por defecto");
  assert.equal(textoDeError("rara", "por defecto"), "por defecto");
  assert.equal(esErrorDeRed(new ApiError(0, "x")), true);
  assert.equal(esErrorDeRed(new ApiError(500, "x")), false);
  assert.equal(esErrorDelServidor(new ApiError(503, "x")), true);
  assert.equal(esErrorDelServidor(new ApiError(409, "x")), false);
  assert.equal(esEmailNoUsable(new ApiError(409, "x", "EMAIL_DEL_EQUIPO")), true);
  assert.equal(esEmailNoUsable(new ApiError(409, "x", "OTRO")), false);
  assert.equal(esEmailNoUsable(new ApiError(400, "x", "EMAIL_DEL_EQUIPO")), false);
});

test("ranking de la home: se valida lo que llega y se oculta con menos de 3 productos", () => {
  const ok = (n: number) => ({ id: `id${n}`, nombre: `P${n}`, marca: "M", categoria: "C", precio: 100 * n, imagenPrincipal: null });
  assert.deepEqual(normalizarRanking(null), []);
  assert.deepEqual(normalizarRanking({ contenido: [ok(1)] }), [], "no es una lista");
  assert.deepEqual(normalizarRanking("x"), []);
  assert.equal(normalizarRanking([ok(1), ok(2)]).length, 2);
  // Mal formados: sin id, precio como texto, precio NaN, null.
  assert.equal(normalizarRanking([ok(1), { ...ok(2), id: undefined }, { ...ok(3), precio: "100" }, { ...ok(4), precio: NaN }, null, 5]).length, 1);
  // Repetidos: queda el primero.
  assert.deepEqual(normalizarRanking([ok(1), ok(1), ok(2)]).map((p) => p.id), ["id1", "id2"]);
  // Tope.
  assert.equal(normalizarRanking(Array.from({ length: 40 }, (_, i) => ok(i))).length, LIMITE_RANKING);
  // Campos opcionales ausentes no rompen.
  const r = normalizarRanking([{ id: "a", nombre: "A", precio: 5 }])[0];
  assert.equal(r.marca, ""); assert.equal(r.imagenPrincipal, null);
  // Regla acordada: como máximo 8, y se oculta con menos de 3.
  assert.equal(LIMITE_RANKING, 8);
  assert.equal(MINIMO_RANKING, 3);
  const lista = (n: number) => Array.from({ length: n }, (_, i) => ok(i));
  assert.deepEqual(pestaniasConProductos({ vendidos: [] }), []);
  assert.deepEqual(pestaniasConProductos({ vendidos: lista(2) }), [], "con 2 productos no se muestra");
  assert.deepEqual(pestaniasConProductos({ vendidos: lista(3) }).map((x) => x.tipo), ["vendidos"]);
  assert.deepEqual(pestaniasConProductos({ vendidos: lista(8) }).map((x) => x.tipo), ["vendidos"]);
});

// ---- Cruce con el backend develop ----
test("textoDeError: 423 y 501 usan el mensaje del backend", () => {
  assert.equal(textoDeError(new ApiError(423, "Cuenta bloqueada 15 min"), "x"), "Cuenta bloqueada 15 min");
  assert.match(textoDeError(new ApiError(501, "Esta función todavía no está disponible."), "x"), /todavía no está disponible/);
});

test("ruta pública inexistente (401 de denyAll) NO se muestra como 'sesión venció'", async () => {
  const { api } = await import("../lib/api");
  const original = globalThis.fetch;
  globalThis.fetch = (async () =>
    new Response(JSON.stringify({ mensaje: "Necesitás iniciar sesión para hacer esto" }), { status: 401 })) as typeof fetch;
  try {
    await assert.rejects(
      api.alquiler.tipos(),
      (e: unknown) => e instanceof ApiError && e.status === 501 && !/sesión/i.test(textoDeError(e, "x"))
    );
  } finally {
    globalThis.fetch = original;
  }
});

// El checkout ya existe: sus errores llegan tal cual, con el código que
// manda el backend, para que la pantalla reaccione según el motivo.
test("checkout: los errores del backend llegan con su código", async () => {
  const original = globalThis.fetch;
  const responder = (status: number, cuerpo: object) =>
    (async () => new Response(JSON.stringify(cuerpo), { status })) as typeof fetch;
  try {
    globalThis.fetch = responder(409, { mensaje: "No podemos usar ese email para comprar. Usá otro.", codigo: "EMAIL_DEL_EQUIPO" });
    await assert.rejects(api.checkout.confirmar({} as never), (e: unknown) => esEmailNoUsable(e));
    globalThis.fetch = responder(409, { mensaje: "Stock insuficiente", codigo: "SIN_STOCK" });
    await assert.rejects(
      api.checkout.confirmar({} as never),
      (e: unknown) => e instanceof ApiError && e.codigo === "SIN_STOCK" && !esEmailNoUsable(e)
    );
    globalThis.fetch = responder(503, { mensaje: "No pudimos generar el link de pago. No se hizo ningún cobro; probá de nuevo.", codigo: "LINK_DE_PAGO_NO_DISPONIBLE" });
    await assert.rejects(
      api.checkout.confirmar({} as never),
      (e: unknown) => e instanceof ApiError && /ningún cobro/.test(textoDeError(e, "x"))
    );
    // Un 403 (por ejemplo, sin token CSRF) ya no se disfraza de "todavía no disponible".
    globalThis.fetch = responder(403, { mensaje: "Acceso denegado" });
    await assert.rejects(api.checkout.confirmar({} as never), (e: unknown) => e instanceof ApiError && e.status === 403);
  } finally {
    globalThis.fetch = original;
  }
});

// Un endpoint público que el backend todavía no implementa: según la regla de
// SecurityConfig en la que caiga responde 401 o 404. En un GET los dos se
// traducen a "todavía no disponible".
test("endpoints públicos que todavía no existen", async () => {
  const fetchOriginal = globalThis.fetch;
  const responder = (status: number, mensaje: string) =>
    (async () => new Response(JSON.stringify({ mensaje }), { status })) as typeof fetch;
  try {
    globalThis.fetch = responder(404, "La dirección solicitada no existe");
    await assert.rejects(api.alquiler.tipos(), (e: unknown) => e instanceof ApiError && e.status === NO_DISPONIBLE);
    globalThis.fetch = responder(401, "Necesitás iniciar sesión para hacer esto");
    await assert.rejects(api.alquiler.tipos(), (e: unknown) => e instanceof ApiError && e.status === NO_DISPONIBLE);
    // Un endpoint que NO es público conserva su 401 (la sesión venció de verdad).
    globalThis.fetch = responder(401, "Necesitás iniciar sesión para hacer esto");
    await assert.rejects(api.pedidos.mios(), (e: unknown) => e instanceof ApiError && e.status === 401);
  } finally {
    globalThis.fetch = fetchOriginal;
  }
});

test("catálogo: talle y color viajan en la URL y cuentan como filtros", () => {
  const f = filtrosDeLaUrl({ talle: " M ", color: "Azul", pagina: "2" });
  assert.equal(f.talle, "M");
  assert.equal(f.color, "Azul");
  assert.equal(queryDeFiltros(f), "talle=M&color=Azul&pagina=2");
  assert.equal(cantidadDeFiltros(f), 2);
  // Vacíos o más largos que la columna de la base: se descartan.
  const g = filtrosDeLaUrl({ talle: "   ", color: "x".repeat(51) });
  assert.equal(g.talle, undefined);
  assert.equal(g.color, undefined);
  assert.equal(queryDeFiltros(g), "");
  // Con tildes: URLSearchParams los codifica, el backend los compara sin tildes.
  assert.equal(queryDeFiltros(filtrosDeLaUrl({ talle: "Único" })), "talle=%C3%9Anico");
});

test("historial: la dirección con piso y depto opcionales", () => {
  const base = { calle: "San Martín", numero: "123", ciudad: "Esquel", provincia: "Chubut", codigoPostal: "9200" };
  assert.equal(textoDeDireccion({ ...base, piso: "2", departamento: "B" }), "San Martín 123, piso 2, depto. B, Esquel, Chubut (9200)");
  assert.equal(textoDeDireccion(base), "San Martín 123, Esquel, Chubut (9200)");
  assert.equal(textoDeDireccion({ ...base, numero: null, piso: " ", departamento: null }), "San Martín, Esquel, Chubut (9200)");
});

test("historial: la fecha del backend, con zona horaria", () => {
  // El backend manda creadoEn con zona (UTC o -03:00 según el servidor).
  assert.equal(fechaLarga("2026-11-16T14:04:15.114757Z"), new Date("2026-11-16T14:04:15.114Z").toLocaleDateString("es-AR", { day: "numeric", month: "long", year: "numeric" }));
  assert.equal(fechaLarga("no es una fecha"), "");
});
