// Backend FALSO para probar el frontend sin tocar el backend real.
// Implementa el contrato asumido de la Fase 2 (ver contrato-fase2-frontend.md).
// Sin dependencias:  node dev/backend-falso.mjs   (puerto 8080, o PORT)
// Solo para desarrollo y pruebas: NO es una referencia de seguridad.
import http from "node:http";
import crypto from "node:crypto";

const PORT = Number(process.env.PORT ?? 8080);
const ORIGEN = process.env.ORIGEN ?? "http://localhost:3000";
const EMAILS_EQUIPO = ["equipo@tierra.test"];
const CLAVE_EQUIPO = "equipo-clave-123";

const C = (n) => `c0000000-0000-0000-0000-00000000000${n}`;
const M = (n) => `b0000000-0000-0000-0000-00000000000${n}`;
const categorias = [
  { id: C(1), nombre: "Bicicletas", padreId: null },
  { id: C(2), nombre: "Ropa", padreId: null },
  { id: C(5), nombre: "Carpas", padreId: null },
  { id: C(6), nombre: "Mochilas", padreId: null },
];
const marcas = [
  { id: M(1), nombre: "Scott" },
  { id: M(2), nombre: "The North Face" },
  { id: M(3), nombre: "Northland" },
];
const nombresCat = Object.fromEntries(categorias.map((c) => [c.id, c.nombre]));
const nombresMarca = Object.fromEntries(marcas.map((m) => [m.id, m.nombre]));
const productos = Array.from({ length: 15 }, (_, i) => {
  const n = i + 1;
  const cat = [C(1), C(2), C(5), C(6)][i % 4];
  return {
    id: `d0000000-0000-0000-0000-${String(n).padStart(12, "0")}`,
    nombre: `Producto ${n}`,
    descripcion: `Descripción del producto ${n}.`,
    marcaId: [M(1), M(2), M(3)][i % 3],
    categoriaId: cat,
    genero: ["UNISEX", "HOMBRE", "MUJER"][i % 3],
    precio: 10000 + n * 5000,
    variantes: [
      { id: `e0000000-0000-0000-0000-${String(n).padStart(12, "0")}`, sku: `SKU-${n}-M`, talla: "M", color: "Negro", stock: n === 3 ? 1 : 20, controlaStock: true },
      { id: `e1000000-0000-0000-0000-${String(n).padStart(12, "0")}`, sku: `SKU-${n}-L`, talla: "L", color: "Rojo", stock: 20, controlaStock: true },
    ],
  };
});
const variantes = new Map();
for (const p of productos) for (const v of p.variantes) variantes.set(v.id, { v, p });

const tiposAlquiler = [
  { id: "t1", nombre: "Esquíes + botas", precioDia: 18000 },
  { id: "t2", nombre: "Snowboard + botas", precioDia: 20000 },
  { id: "t3", nombre: "Raquetas de nieve", precioDia: 8000 },
];

// --- estado ---
const sesiones = new Map(); // sid -> { email, nombre, rol, vence }
const codigos = new Map(); // email -> { codigo, intentos, vence }
const pedidos = []; // todos
const datosGuardados = new Map(); // email -> datos
const registro = { pedidosCreados: 0, codigosEnviados: [] };
const opciones = { cotizacionFalla: false, checkoutFalla: null, demoraCheckoutMs: 0, rankingFalla: [], modoDevelop: false };

const PROVINCIAS = ["neuquen", "rio negro", "chubut", "santa cruz"];
const sinAcento = (s) => String(s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

function cookies(req) {
  return Object.fromEntries((req.headers.cookie ?? "").split(/;\s*/).filter(Boolean).map((c) => { const i = c.indexOf("="); return [c.slice(0, i), decodeURIComponent(c.slice(i + 1))]; }));
}
function cabeceras(req, extra = {}) {
  return {
    "Access-Control-Allow-Origin": req.headers.origin ?? ORIGEN,
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Allow-Headers": "Content-Type, X-XSRF-TOKEN",
    "Access-Control-Allow-Methods": "GET,POST,DELETE,OPTIONS",
    Vary: "Origin",
    ...extra,
  };
}
function enviar(req, res, status, cuerpo, extra = {}) {
  const h = cabeceras(req, extra);
  if (cuerpo === undefined) { res.writeHead(status, h); return res.end(); }
  h["Content-Type"] = "application/json; charset=utf-8";
  res.writeHead(status, h);
  res.end(JSON.stringify(cuerpo));
}
const error = (req, res, status, mensaje, codigo) => enviar(req, res, status, codigo ? { mensaje, codigo } : { mensaje });
async function leerJson(req) {
  const partes = [];
  for await (const p of req) partes.push(p);
  const t = Buffer.concat(partes).toString("utf8");
  if (!t) return {};
  try { return JSON.parse(t); } catch { return null; }
}
function sesionDe(req) {
  const s = sesiones.get(cookies(req).SESION);
  if (!s) return null;
  if (s.vence < Date.now()) return null;
  return s;
}
const usuarioJson = (s) => ({ id: crypto.createHash("sha1").update(s.email).digest("hex").slice(0, 8), nombre: s.nombre, email: s.email, rol: s.rol });
const emailOk = (e) => typeof e === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

function cotizar(tipoEntrega, provincia) {
  if (tipoEntrega === "RETIRO_LOCAL") return { cubierto: true, costo: 0, mensaje: null };
  if (!PROVINCIAS.includes(sinAcento(provincia))) return { cubierto: false, costo: null, mensaje: "Todavía no enviamos a esa provincia. Podés retirar en el local." };
  return { cubierto: true, costo: 4500, mensaje: null };
}
function calcularItems(items) {
  if (!Array.isArray(items) || items.length === 0) return { error: "El carrito está vacío." };
  let subtotal = 0; const lineas = [];
  for (const it of items) {
    const x = variantes.get(it?.varianteId);
    if (!x || !Number.isInteger(it.cantidad) || it.cantidad < 1) return { error: "Hay un producto que ya no está disponible." };
    if (x.v.stock < it.cantidad) return { error: `No hay stock suficiente de ${x.p.nombre}.` };
    subtotal += x.p.precio * it.cantidad;
    lineas.push({ nombreProducto: x.p.nombre, talla: x.v.talla, color: x.v.color, cantidad: it.cantidad, precioUnitario: x.p.precio });
  }
  return { subtotal, lineas };
}
const mascaraDni = (d) => (d ? `***.***.${String(d).replace(/\D/g, "").slice(-3)}` : null);
const mascaraTel = (t) => (t ? `••• ${String(t).replace(/\D/g, "").slice(-4)}` : null);

const servidor = http.createServer(async (req, res) => {
  const url = new URL(req.url, "http://x");
  const ruta = url.pathname.replace(/^\/api/, "");
  const metodo = req.method;
  if (metodo === "OPTIONS") return enviar(req, res, 204);

  // Todo GET emite la cookie XSRF-TOKEN si no está (como Spring).
  const extra = {};
  if (!cookies(req)["XSRF-TOKEN"]) extra["Set-Cookie"] = [`XSRF-TOKEN=${crypto.randomUUID()}; Path=/`];
  const enviarX = (status, cuerpo, h = {}) => {
    const cookiesSet = [...(extra["Set-Cookie"] ?? []), ...(h["Set-Cookie"] ?? [])];
    return enviar(req, res, status, cuerpo, cookiesSet.length ? { ...h, "Set-Cookie": cookiesSet } : h);
  };
  const err = (status, m, c) => enviarX(status, c ? { mensaje: m, codigo: c } : { mensaje: m });

  // --- hooks de prueba ---
  if (ruta === "/__test/estado") return enviarX(200, { pedidos, registro, datosGuardados: [...datosGuardados], opciones, sesiones: sesiones.size });
  if (ruta === "/__test/codigo") return enviarX(200, { codigo: codigos.get(url.searchParams.get("email"))?.codigo ?? null });
  if (ruta === "/__test/opciones" && metodo === "POST") { Object.assign(opciones, await leerJson(req)); return enviarX(200, opciones); }
  if (ruta === "/__test/reset" && metodo === "POST") {
    sesiones.clear(); codigos.clear(); pedidos.length = 0; datosGuardados.clear();
    registro.pedidosCreados = 0; registro.codigosEnviados = [];
    Object.assign(opciones, { cotizacionFalla: false, checkoutFalla: null, demoraCheckoutMs: 0, rankingFalla: [], modoDevelop: false });
    for (const x of variantes.values()) x.v.stock = x.p.id.endsWith("003") && x.v.sku.endsWith("M") ? 1 : 20;
    return enviarX(200, {});
  }
  if (ruta === "/__test/vencer-sesion" && metodo === "POST") { for (const s of sesiones.values()) s.vence = 0; return enviarX(200, {}); }

  // CSRF: todo método no seguro necesita el header igual a la cookie.
  if (!["GET", "HEAD"].includes(metodo)) {
    const c = cookies(req)["XSRF-TOKEN"];
    if (!c || req.headers["x-xsrf-token"] !== c) return err(403, "Falta el token de seguridad.");
  }

  // Modo develop: imita el backend real de la Fase 1. Solo existen auth, productos por
  // categoría/marca (lista simple) y alquiler/disponibilidad; el resto cae en
  // anyRequest().denyAll() y responde 401 "Necesitás iniciar sesión" aunque la ruta sea pública.
  if (opciones.modoDevelop && !ruta.startsWith("/__test")) {
    const existe = ruta.startsWith("/auth/") || /^\/productos\/[0-9a-f-]{36}$/.test(ruta) ||
      (ruta === "/productos" && metodo === "GET");
    if (!existe) return err(401, "Necesitás iniciar sesión para hacer esto");
    if (ruta === "/productos") {
      const cat = url.searchParams.get("categoriaId"), mar = url.searchParams.get("marcaId");
      const lista = productos.filter((p) => (cat && p.categoriaId === cat) || (mar && p.marcaId === mar)).map((p) => ({
        id: p.id, nombre: p.nombre, marca: nombresMarca[p.marcaId], categoria: nombresCat[p.categoriaId], precio: p.precio, imagenPrincipal: null }));
      return enviarX(200, cat || mar ? lista : []);
    }
  }

  // --- catálogo ---
  if (ruta === "/categorias" && metodo === "GET") return enviarX(200, categorias);
  if (ruta === "/marcas" && metodo === "GET") return enviarX(200, marcas);
  if (ruta === "/productos" && metodo === "GET") {
    const q = sinAcento(url.searchParams.get("q") ?? "");
    const cat = url.searchParams.get("categoriaId"), mar = url.searchParams.get("marcaId"), gen = url.searchParams.get("genero");
    const pmin = url.searchParams.get("precioMin"), pmax = url.searchParams.get("precioMax");
    let lista = productos.filter((p) =>
      (!q || sinAcento(p.nombre).includes(q)) && (!cat || p.categoriaId === cat) && (!mar || p.marcaId === mar) &&
      (!gen || p.genero === gen) && (!pmin || p.precio >= Number(pmin)) && (!pmax || p.precio <= Number(pmax)));
    const orden = url.searchParams.get("orden") ?? "nombre";
    lista = [...lista].sort((a, b) => orden === "precio_asc" ? a.precio - b.precio : orden === "precio_desc" ? b.precio - a.precio : a.nombre.localeCompare(b.nombre, "es", { numeric: true }));
    const tamanio = Number(url.searchParams.get("tamanio") ?? 12), pagina = Math.max(1, Number(url.searchParams.get("pagina") ?? 1));
    const contenido = lista.slice((pagina - 1) * tamanio, pagina * tamanio).map((p) => ({
      id: p.id, nombre: p.nombre, marca: nombresMarca[p.marcaId], categoria: nombresCat[p.categoriaId], precio: p.precio, imagenPrincipal: null }));
    return enviarX(200, { contenido, pagina, tamanio, totalElementos: lista.length, totalPaginas: Math.ceil(lista.length / tamanio) });
  }
  // Rankings de la home (contrato asumido). Los datos son inventados: no hay ventas reales.
  if ((ruta === "/productos/mas-vendidos" || ruta === "/productos/mas-buscados") && metodo === "GET") {
    const tipo = ruta.endsWith("vendidos") ? "vendidos" : "buscados";
    if (opciones.rankingFalla.includes(tipo)) return err(500, "Error interno.");
    const limite = Math.min(50, Math.max(1, Number(url.searchParams.get("limite") ?? 12)));
    const orden = tipo === "vendidos" ? [...productos].reverse() : [...productos].sort((a, b) => (a.precio % 7) - (b.precio % 7) || a.precio - b.precio);
    return enviarX(200, orden.slice(0, limite).map((p) => ({ id: p.id, nombre: p.nombre, marca: nombresMarca[p.marcaId], categoria: nombresCat[p.categoriaId], precio: p.precio, imagenPrincipal: null })));
  }
  let m;
  if ((m = ruta.match(/^\/productos\/([^/]+)$/)) && metodo === "GET") {
    const p = productos.find((x) => x.id === m[1]);
    if (!p) return err(404, "Producto no encontrado.");
    return enviarX(200, { id: p.id, nombre: p.nombre, descripcion: p.descripcion, marca: nombresMarca[p.marcaId], categoria: nombresCat[p.categoriaId], genero: p.genero, precio: p.precio, variantes: p.variantes, imagenes: [] });
  }
  if (ruta === "/alquiler/tipos" && metodo === "GET") return enviarX(200, tiposAlquiler);

  // --- auth ---
  if (ruta === "/auth/yo" && metodo === "GET") {
    const s = sesionDe(req);
    return s ? enviarX(200, usuarioJson(s)) : err(401, "No hay sesión.");
  }
  if (ruta === "/auth/codigo" && metodo === "POST") {
    const b = await leerJson(req);
    if (!b || !emailOk(b.email)) return err(400, "Ingresá un email válido.");
    const email = b.email.trim().toLowerCase();
    const generico = { mensaje: "Si el email es válido, te enviamos un código." };
    if (!EMAILS_EQUIPO.includes(email)) {
      const codigo = String(crypto.randomInt(0, 1_000_000)).padStart(6, "0");
      codigos.set(email, { codigo, intentos: 0, vence: Date.now() + 10 * 60_000 });
      registro.codigosEnviados.push(email);
    }
    return enviarX(200, generico);
  }
  if (ruta === "/auth/codigo/verificar" && metodo === "POST") {
    const b = await leerJson(req);
    const email = String(b?.email ?? "").trim().toLowerCase();
    const c = codigos.get(email);
    if (!c || c.vence < Date.now() || c.intentos >= 5) return err(401, "El código no es válido o venció.");
    if (String(b.codigo) !== c.codigo) { c.intentos++; return err(401, "El código no es válido o venció."); }
    codigos.delete(email);
    const sid = crypto.randomUUID();
    const s = { email, nombre: email.split("@")[0], rol: "CLIENTE", vence: Date.now() + 7 * 86400_000 };
    sesiones.set(sid, s);
    return enviarX(200, usuarioJson(s), { "Set-Cookie": [`SESION=${sid}; Path=/; HttpOnly`] });
  }
  if (ruta === "/auth/equipo/login" && metodo === "POST") {
    const b = await leerJson(req);
    const email = String(b?.email ?? "").trim().toLowerCase();
    if (!EMAILS_EQUIPO.includes(email) || b?.password !== CLAVE_EQUIPO) return err(401, "Email o contraseña incorrectos.");
    const sid = crypto.randomUUID();
    const s = { email, nombre: "Equipo", rol: "ADMIN", vence: Date.now() + 12 * 3600_000 };
    sesiones.set(sid, s);
    return enviarX(200, usuarioJson(s), { "Set-Cookie": [`SESION=${sid}; Path=/; HttpOnly`] });
  }
  if (ruta === "/auth/logout" && metodo === "POST") {
    sesiones.delete(cookies(req).SESION);
    return enviarX(204, undefined, { "Set-Cookie": ["SESION=; Path=/; Max-Age=0"] });
  }

  // --- envío / checkout ---
  if (ruta === "/envios/cotizacion" && metodo === "POST") {
    if (opciones.cotizacionFalla) return err(500, "Error interno.");
    const b = await leerJson(req);
    return enviarX(200, cotizar(b?.tipoEntrega, b?.provincia));
  }
  if (ruta === "/checkout" && metodo === "POST") {
    if (opciones.demoraCheckoutMs) await new Promise((r) => setTimeout(r, opciones.demoraCheckoutMs));
    if (opciones.checkoutFalla) return err(opciones.checkoutFalla, "Falló el checkout de prueba.");
    const b = await leerJson(req);
    if (!b) return err(400, "Solicitud inválida.");
    const email = String(b.email ?? "").trim().toLowerCase();
    if (!b.nombre?.trim() || !emailOk(email) || !b.telefono?.trim()) return err(400, "Completá nombre, email y teléfono.");
    if (EMAILS_EQUIPO.includes(email)) return err(409, "No podemos usar ese email para comprar. Usá otro.", "EMAIL_DEL_EQUIPO");
    if (!["ENVIO_DOMICILIO", "RETIRO_LOCAL"].includes(b.tipoEntrega)) return err(400, "Elegí cómo recibir tu pedido.");
    const domicilio = b.tipoEntrega === "ENVIO_DOMICILIO";
    if (domicilio) {
      if (!b.dni || !/^\d{7,8}$/.test(String(b.dni).replace(/\D/g, ""))) return err(400, "Ingresá un DNI válido.");
      const d = b.direccion;
      if (!d?.calle || !d?.ciudad || !d?.provincia || !/^\d{4}$/.test(String(d.codigoPostal ?? ""))) return err(400, "Completá la dirección de entrega.");
    }
    const cot = cotizar(b.tipoEntrega, b.direccion?.provincia);
    if (!cot.cubierto) return err(400, cot.mensaje);
    const calc = calcularItems(b.items);
    if (calc.error) return err(409, calc.error);
    const costoEnvio = cot.costo ?? 0;
    const total = calc.subtotal + costoEnvio;
    const id = crypto.randomUUID();
    const sesion = sesionDe(req);
    pedidos.push({
      id, email, estado: "PENDIENTE", creadoEn: new Date().toISOString(), tipoEntrega: b.tipoEntrega,
      direccionEntrega: domicilio ? b.direccion : null, contactoNombre: b.nombre, contactoTelefono: b.telefono, contactoDni: domicilio ? String(b.dni) : null,
      subtotal: calc.subtotal, descuento: 0, costoEnvio, total, items: calc.lineas,
    });
    registro.pedidosCreados++;
    if (sesion && sesion.email === email && b.guardarDatos === true) {
      datosGuardados.set(email, { nombre: b.nombre, telefono: b.telefono, dni: domicilio ? String(b.dni) : null, direccion: domicilio ? b.direccion : null });
    }
    // Nunca abre sesión, ni para email nuevo ni para existente.
    return enviarX(201, { pedidoId: id, total, initPoint: `https://www.mercadopago.com.ar/checkout/v1/redirect?pref_id=${id}`, expiraEn: new Date(Date.now() + 30 * 60_000).toISOString() });
  }
  if ((m = ruta.match(/^\/pagos\/pedidos\/([^/]+)\/preferencia$/)) && metodo === "POST") {
    const s = sesionDe(req);
    const p = pedidos.find((x) => x.id === m[1]);
    if (!s || !p || p.email !== s.email) return err(404, "Pedido no encontrado.");
    return enviarX(200, { preferenceId: "pref-" + p.id, initPoint: `https://www.mercadopago.com.ar/checkout/v1/redirect?pref_id=${p.id}` });
  }

  // --- cuenta ---
  if (ruta === "/pedidos/mios" && metodo === "GET") {
    const s = sesionDe(req);
    if (!s || s.rol !== "CLIENTE") return err(401, "No hay sesión.");
    const mios = pedidos.filter((p) => p.email === s.email).reverse().map(({ email, ...p }) => ({ ...p, contactoDni: mascaraDni(p.contactoDni), contactoTelefono: mascaraTel(p.contactoTelefono) }));
    return enviarX(200, mios);
  }
  if (ruta === "/cuenta/datos-entrega") {
    const s = sesionDe(req);
    if (!s || s.rol !== "CLIENTE") return err(401, "No hay sesión.");
    if (metodo === "GET") { const d = datosGuardados.get(s.email); return d ? enviarX(200, d) : err(404, "No hay datos guardados."); }
    if (metodo === "DELETE") { datosGuardados.delete(s.email); return enviarX(204, undefined); }
  }
  return err(404, "Ruta inexistente.");
});

servidor.listen(PORT, () => console.log(`Backend falso en http://localhost:${PORT}/api`));
