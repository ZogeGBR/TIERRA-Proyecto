// E2E contra el backend FALSO (dev/backend-falso.mjs) y `next start`.
// Requiere playwright + Chromium instalados:  PLAYWRIGHT_MODULE=/ruta/a/playwright node dev/e2e.mjs
// Antes: backend falso en :8080 y la app (compilada con NEXT_PUBLIC_API_URL=http://localhost:8080/api y
// NEXT_PUBLIC_CATALOGO_DE_PRUEBA=0) en :3000.
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE ?? "playwright");
const WEB = process.env.WEB ?? "http://localhost:3000";
const API = process.env.API ?? "http://localhost:8080/api";
const P = (n) => `d0000000-0000-0000-0000-${String(n).padStart(12, "0")}`;
const navegador = await chromium.launch({ executablePath: process.env.CHROMIUM ?? "/opt/pw-browsers/chromium-1194/chrome-linux/chrome", args: ["--no-sandbox", "--disable-background-networking", "--disable-sync", "--no-first-run", "--proxy-bypass-list=*"] });

const resultados = [];
async function api(ruta, opts = {}) {
  const r = await fetch(`${API}${ruta}`, opts);
  return r.json();
}
const estado = () => api("/__test/estado");
const reset = () => fetch(`${API}/__test/reset`, { method: "POST", headers: { "X-XSRF-TOKEN": "x", Cookie: "XSRF-TOKEN=x" } });
const opciones = (o) => fetch(`${API}/__test/opciones`, { method: "POST", headers: { "X-XSRF-TOKEN": "x", Cookie: "XSRF-TOKEN=x", "content-type": "application/json" }, body: JSON.stringify(o) });

async function nueva({ ancho = 1280, movimientoReducido = false } = {}) {
  const ctx = await navegador.newContext({ viewport: { width: ancho, height: 900 }, reducedMotion: movimientoReducido ? "reduce" : "no-preference", locale: "es-AR" });
  const page = await ctx.newPage();
  const irA = page.goto.bind(page);
  page.goto = async (u, o) => { const r = await irA(u, { waitUntil: "domcontentloaded", ...o }); await page.waitForTimeout(600); return r; };
  page.setDefaultTimeout(12000); page.setDefaultNavigationTimeout(20000);
  const errores = [];
  page.on("pageerror", (e) => errores.push("pageerror: " + e.message));
  page.on("console", (m) => { if (m.type() === "error" && !/Failed to load resource|Failed to fetch RSC|ERR_|font|OTS parsing|favicon|401|404|403|409|500|400/.test(m.text())) errores.push("console: " + m.text()); });
  await page.route(/fonts\.(gstatic|googleapis)\.com/, (r) => r.abort());
  const salidasMP = [];
  await page.route("https://www.mercadopago.com.ar/**", (r) => { salidasMP.push(r.request().url()); return r.fulfill({ contentType: "text/html", body: "<h1>Mercado Pago simulado</h1>" }); });
  return { ctx, page, errores, salidasMP };
}
async function agregar(page, n, cantidad = 1) {
  await page.goto(`${WEB}/productos/${P(n)}`);
  if (cantidad > 1) await page.locator('input[type="number"]').fill(String(cantidad));
  await page.getByRole("button", { name: "Agregar al carrito" }).click();
  await page.getByText("Agregado al carrito.").waitFor();
}
async function datosContacto(page, { nombre = "Ana Pérez", email = "ana@mail.com", telefono = "2945 123456" } = {}) {
  await page.goto(`${WEB}/checkout`);
  await page.locator("#nombre").waitFor();
  await page.locator("#nombre").fill(nombre);
  if (email !== null && (await page.locator("#email").count())) await page.locator("#email").fill(email);
  await page.locator("#telefono").fill(telefono);
  await page.getByRole("button", { name: "Siguiente" }).click();
}
async function elegirRetiro(page) {
  await page.getByRole("radio", { name: /Retiro en el local/ }).click();
  await page.getByRole("button", { name: "Siguiente" }).click();
}
async function entrarPorCodigo(page, email) {
  await page.goto(`${WEB}/login`);
  await page.locator("#email").fill(email);
  await page.getByRole("button", { name: "Enviarme el código" }).click();
  await page.locator("#codigo").waitFor();
  const { codigo } = await api(`/__test/codigo?email=${encodeURIComponent(email)}`);
  await page.locator("#codigo").fill(codigo);
  await page.waitForURL((u) => !u.pathname.startsWith("/login"));
}
async function sinScrollHorizontal(page) {
  return page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1);
}
const eq = (a, b, m) => { if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error(`${m ?? "eq"}: esperado ${JSON.stringify(b)}, obtuve ${JSON.stringify(a)}`); };
const ok = (c, m) => { if (!c) throw new Error(m ?? "falló aserción"); };

async function caso(nombre, fn, opts) {
  if (process.env.SOLO && !new RegExp(process.env.SOLO).test(nombre)) return;
  console.log("…", nombre);
  await reset();
  const s = await nueva(opts);
  try {
    await fn(s);
    if (s.errores.length) throw new Error("errores de JS: " + s.errores.join(" | "));
    resultados.push(["PASA", nombre]);
  } catch (e) {
    resultados.push(["FALLA", nombre + " → " + String(e.message).split("\n")[0]]);
    try { await s.page.screenshot({ path: `dev/falla-${resultados.length}.png` }); } catch {}
  } finally { await s.ctx.close(); }
}

// ---------- 3.1: compra sin cuenta ----------
await caso("Compra sin sesión (retiro): crea pedido, manda a Mercado Pago y NO abre sesión", async ({ ctx, page, salidasMP }) => {
  await agregar(page, 1);
  await datosContacto(page);
  await elegirRetiro(page);
  await page.getByRole("button", { name: "Comprar" }).click();
  await page.waitForURL(/mercadopago/);
  eq((await estado()).registro.pedidosCreados, 1);
  eq((await ctx.request.get(`${API}/auth/yo`)).status(), 401, "no debe haber sesión tras comprar");
  ok(salidasMP.length >= 1);
});
await caso("Carrito NO se vacía antes de pagar y el carrito avisa 'pago sin terminar'", async ({ page }) => {
  await agregar(page, 1);
  await datosContacto(page); await elegirRetiro(page);
  await page.getByRole("button", { name: "Comprar" }).click();
  await page.waitForURL(/mercadopago/);
  await page.goto(`${WEB}/carrito`);
  await page.getByText("Tenés un pago sin terminar").waitFor();
  await page.getByText("Producto 1").first().waitFor();
});
await caso("Comprar dos veces con el mismo email sin sesión: dos pedidos, respuesta idéntica, sin sesión", async ({ ctx, page }) => {
  for (let i = 0; i < 2; i++) {
    await agregar(page, 2);
    await datosContacto(page, { email: "repetido@mail.com" }); await elegirRetiro(page);
    await page.getByRole("button", { name: "Comprar" }).click();
    await page.waitForURL(/mercadopago/);
    await page.evaluate(() => sessionStorage.clear());
  }
  const e = await estado();
  eq(e.pedidos.filter((p) => p.email === "repetido@mail.com").length, 2);
  eq((await ctx.request.get(`${API}/auth/yo`)).status(), 401);
});
await caso("Email del equipo: mensaje claro y no crea pedido", async ({ page }) => {
  await agregar(page, 1);
  await datosContacto(page, { email: "equipo@tierra.test" }); await elegirRetiro(page);
  await page.getByRole("button", { name: "Comprar" }).click();
  await page.getByText("No podemos usar ese email para comprar. Usá otro.").waitFor();
  eq((await estado()).registro.pedidosCreados, 0);
});
await caso("Doble clic en Comprar: un solo pedido", async ({ page }) => {
  await opciones({ demoraCheckoutMs: 700 });
  await agregar(page, 1);
  await datosContacto(page); await elegirRetiro(page);
  const b = page.getByRole("button", { name: "Comprar" });
  await b.dblclick();
  await page.waitForURL(/mercadopago/);
  eq((await estado()).registro.pedidosCreados, 1);
});
await caso("Envío a domicilio: pide DNI y dirección, cotiza ($4.500) y guarda DNI en el pedido", async ({ page }) => {
  await agregar(page, 1);
  await datosContacto(page);
  await page.locator("#dni").fill("12.345.678");
  await page.locator("#calle").fill("Fontana"); await page.locator("#numero").fill("482");
  await page.locator("#ciudad").fill("Esquel"); await page.locator("#provincia").selectOption("Chubut");
  await page.locator("#cp").fill("9200");
  await page.getByText(/4\.500/).first().waitFor();
  await page.getByRole("button", { name: "Siguiente" }).click();
  await page.getByRole("button", { name: "Comprar" }).click();
  await page.waitForURL(/mercadopago/);
  const p = (await estado()).pedidos[0];
  eq(p.tipoEntrega, "ENVIO_DOMICILIO"); eq(p.costoEnvio, 4500); eq(p.contactoDni, "12345678");
});
await caso("Retiro: no se pide DNI ni dirección", async ({ page }) => {
  await agregar(page, 1);
  await datosContacto(page);
  await page.getByRole("radio", { name: /Retiro en el local/ }).click();
  eq(await page.locator("#dni").count(), 0); eq(await page.locator("#calle").count(), 0);
});
await caso("Provincia sin cobertura: avisa y ofrece retiro (no deja avanzar con envío)", async ({ page }) => {
  await agregar(page, 1);
  await datosContacto(page);
  await page.locator("#dni").fill("12345678");
  await page.locator("#calle").fill("X"); await page.locator("#ciudad").fill("Y");
  await page.locator("#provincia").selectOption("Otra provincia"); await page.locator("#cp").fill("5500");
  await page.getByText(/retirar en el local|Retiro en el local/i).first().waitFor();
  await page.getByRole("button", { name: "Siguiente" }).click();
  eq(await page.getByRole("button", { name: "Comprar" }).count(), 0, "no debe llegar al pago");
});
await caso("Checkout con carrito vacío (con y sin sesión): estado vacío, sin errores", async ({ page }) => {
  await page.goto(`${WEB}/checkout`);
  await page.getByRole("link", { name: /catálogo|productos|Ver/i }).first().waitFor();
  await entrarPorCodigo(page, "vacio@mail.com");
  await page.goto(`${WEB}/checkout`);
  await page.getByRole("link", { name: /catálogo|productos|Ver/i }).first().waitFor();
});

// ---------- login por código / cuenta ----------
await caso("Login por código y 'Mis pedidos' con DNI y teléfono ocultos", async ({ page }) => {
  await agregar(page, 1);
  await datosContacto(page, { email: "cli@mail.com", telefono: "2945 123456" });
  await page.locator("#dni").fill("12.345.678");
  await page.locator("#calle").fill("Fontana"); await page.locator("#ciudad").fill("Esquel");
  await page.locator("#provincia").selectOption("Chubut"); await page.locator("#cp").fill("9200");
  await page.getByText(/4\.500/).first().waitFor();
  await page.getByRole("button", { name: "Siguiente" }).click();
  await page.getByRole("button", { name: "Comprar" }).click();
  await page.waitForURL(/mercadopago/);
  await entrarPorCodigo(page, "cli@mail.com");
  await page.goto(`${WEB}/cuenta/pedidos`);
  await page.getByText("Pendiente de pago").first().waitFor();
  const t = await page.locator("main").innerText();
  ok(t.includes("***.***.678") && !t.includes("12.345.678") && !t.includes("12345678"), "DNI debe verse oculto");
  ok(t.includes("••• 3456") && !t.includes("2945 123456"), "teléfono oculto");
});
await caso("Código incorrecto: mensaje genérico y no entra; email del equipo no recibe código", async ({ page }) => {
  await page.goto(`${WEB}/login`);
  await page.locator("#email").fill("x@mail.com");
  await page.getByRole("button", { name: "Enviarme el código" }).click();
  await page.locator("#codigo").fill("000000");
  await page.getByText("El código es incorrecto o venció. Pedí uno nuevo.").waitFor();
  ok(page.url().includes("/login"));
  await page.goto(`${WEB}/login`);
  await page.locator("#email").fill("equipo@tierra.test");
  await page.getByRole("button", { name: "Enviarme el código" }).click();
  await page.locator("#codigo").waitFor(); // misma pantalla: no se revela que es del equipo
  ok(!(await estado()).registro.codigosEnviados.includes("equipo@tierra.test"));
});
await caso("Reenvío: botón con cuenta regresiva de 60 s", async ({ page }) => {
  await page.goto(`${WEB}/login`);
  await page.locator("#email").fill("x@mail.com");
  await page.getByRole("button", { name: "Enviarme el código" }).click();
  await page.getByRole("button", { name: /Reenviar código \(\d+ s\)/ }).waitFor();
  eq(await page.getByRole("button", { name: /Reenviar código/ }).isDisabled(), true);
});
await caso("Sesión + 'Guardar mis datos': se precarga en la próxima compra y se puede borrar", async ({ page }) => {
  await entrarPorCodigo(page, "gd@mail.com");
  await agregar(page, 1);
  await page.goto(`${WEB}/checkout`);
  await page.locator("#nombre").fill("Gabi Datos");
  await page.locator("#telefono").fill("2945 777888");
  await page.getByRole("button", { name: "Siguiente" }).click();
  await elegirRetiro(page);
  await page.getByLabel("Guardar mis datos para la próxima compra").check();
  await page.getByRole("button", { name: "Comprar" }).click();
  await page.waitForURL(/mercadopago/);
  eq((await estado()).datosGuardados.length, 1);
  await page.goto(`${WEB}/checkout`);
  await page.waitForFunction(() => document.querySelector("#nombre")?.value === "Gabi Datos");
  await page.getByRole("button", { name: /Borrar|borrar/ }).first().click();
  await page.getByRole("button", { name: /Sí|Confirmar|Borrar/ }).last().click();
  for (let i = 0; i < 20 && (await estado()).datosGuardados.length; i++) await page.waitForTimeout(250);
  eq((await estado()).datosGuardados.length, 0);
});
await caso("Sin sesión no se guardan datos aunque se pida (la casilla ni aparece)", async ({ page }) => {
  await agregar(page, 1);
  await datosContacto(page); await elegirRetiro(page);
  eq(await page.getByLabel("Guardar mis datos para la próxima compra").count(), 0);
});
await caso("/equipo: login con contraseña OK y mala; /registro no existe", async ({ page }) => {
  await page.goto(`${WEB}/equipo`);
  await page.locator('input[type="email"]').fill("equipo@tierra.test");
  await page.locator('input[type="password"]').fill("mala");
  await page.getByRole("button", { name: /Entrar|Ingresar/ }).click();
  await page.getByRole("alert").filter({ hasText: /incorrect/ }).waitFor();
  await page.locator('input[type="password"]').fill("equipo-clave-123");
  await page.getByRole("button", { name: /Entrar|Ingresar/ }).click();
  await page.waitForURL((u) => !u.pathname.startsWith("/equipo"));
  const r = await page.goto(`${WEB}/registro`);
  eq(r.status(), 404);
});
await caso("Sesión vencida: /cuenta/pedidos manda al login con destino", async ({ page }) => {
  await entrarPorCodigo(page, "v@mail.com");
  await fetch(`${API}/__test/vencer-sesion`, { method: "POST", headers: { "X-XSRF-TOKEN": "x", Cookie: "XSRF-TOKEN=x" } });
  await page.goto(`${WEB}/cuenta/pedidos`);
  await page.waitForURL(/\/login\?redirect=/);
});
await caso("Logout NO vacía el carrito (el carrito vive en el navegador)", async ({ page }) => {
  await agregar(page, 1);
  await entrarPorCodigo(page, "lo@mail.com");
  await page.getByRole("button", { name: /Cuenta de/ }).click();
  await page.getByRole("menuitem", { name: "Cerrar sesión" }).click();
  await page.goto(`${WEB}/carrito`);
  await page.getByText("Producto 1").first().waitFor();
});

// ---------- retorno de Mercado Pago ----------
await caso("Páginas de retorno: éxito, pendiente y error; 'Volver a pagar' reabre el MISMO link sin crear pedido", async ({ page, salidasMP }) => {
  await agregar(page, 1);
  await datosContacto(page); await elegirRetiro(page);
  await page.getByRole("button", { name: "Comprar" }).click();
  await page.waitForURL(/mercadopago/);
  const antes = (await estado()).registro.pedidosCreados;
  await page.goto(`${WEB}/checkout/error`);
  await page.getByRole("link", { name: "Volver a pagar" }).click();
  await page.waitForURL(/mercadopago/);
  eq((await estado()).registro.pedidosCreados, antes, "no debe crear otro pedido");
  await page.goto(`${WEB}/checkout/pendiente`);
  await page.getByText("Estamos procesando tu pago").waitFor();
  await page.goto(`${WEB}/checkout/exito?external_reference=basura`);
  await page.getByText("Recibimos tu pago").waitFor();
});
await caso("Link de pago adulterado en el navegador NO redirige a un sitio externo", async ({ page }) => {
  await agregar(page, 1);
  await datosContacto(page); await elegirRetiro(page);
  await page.getByRole("button", { name: "Comprar" }).click();
  await page.waitForURL(/mercadopago/);
  await page.goto(`${WEB}/carrito`);
  await page.evaluate(() => {
    const k = "tierra_pedido_pendiente"; const g = JSON.parse(sessionStorage.getItem(k));
    g.initPoint = "https://evil.example.com/robo"; sessionStorage.setItem(k, JSON.stringify(g));
  });
  await page.goto(`${WEB}/checkout/error`);
  const b = page.getByRole("link", { name: "Volver a pagar" });
  if (await b.count()) await b.click();
  await page.waitForTimeout(600);
  ok(!page.url().includes("evil.example.com"), "no debe ir a evil");
});

// ---------- errores visibles por código ----------
await caso("Error 500 en el checkout: mensaje visible y el botón se rehabilita", async ({ page }) => {
  await opciones({ checkoutFalla: 500 });
  await agregar(page, 1);
  await datosContacto(page); await elegirRetiro(page);
  await page.getByRole("button", { name: "Comprar" }).click();
  await page.getByRole("alert").filter({ hasText: /Falló el checkout/ }).waitFor();
  eq(await page.getByRole("button", { name: "Comprar" }).isEnabled(), true);
});
await caso("Falla la cotización: se avisa y se puede reintentar", async ({ page }) => {
  await opciones({ cotizacionFalla: true });
  await agregar(page, 1);
  await datosContacto(page);
  await page.locator("#dni").fill("12345678"); await page.locator("#calle").fill("F"); await page.locator("#ciudad").fill("E");
  await page.locator("#provincia").selectOption("Chubut"); await page.locator("#cp").fill("9200");
  await page.getByRole("button", { name: /Reintentar|reintentar/ }).first().waitFor();
});
await caso("Catálogo: la pantalla responde sin error de servidor", async ({ page }) => {
  const r = await page.goto(`${WEB}/productos`);
  ok(r.status() < 500);
});

// ---------- catálogo ----------
await caso("Catálogo paginado, búsqueda y filtros por categoría/marca desde el backend", async ({ page }) => {
  await page.goto(`${WEB}/productos`);
  await page.getByText("Producto 1", { exact: true }).first().waitFor();
  await page.goto(`${WEB}/productos?pagina=2`);
  await page.getByText("Producto 13", { exact: true }).first().waitFor();
  await page.goto(`${WEB}/productos?q=producto%207`);
  await page.getByText("Producto 7", { exact: true }).first().waitFor();
  eq(await page.getByText("Producto 8", { exact: true }).count(), 0);
  await page.goto(`${WEB}/productos?categoriaId=c0000000-0000-0000-0000-000000000005`);
  await page.getByText("Producto 3", { exact: true }).first().waitFor();
  await page.goto(`${WEB}/productos/${P(1)}`);
  await page.getByRole("heading", { name: "Producto 1" }).waitFor();
});

// ---------- alquiler ----------
await caso("Alquiler: estimador con aviso de 'estimado', WhatsApp y SIN pedido de reserva al backend", async ({ page }) => {
  const pedidos = [];
  page.on("request", (r) => { if (/alquiler\/reservas/.test(r.url())) pedidos.push(r.url()); });
  await page.goto(`${WEB}/alquiler`);
  await page.getByText(/estimad/i).first().waitFor();
  const t = await page.locator("main").innerText();
  ok(!/reserv(ar|á) (ahora|online)/i.test(t), "no debe ofrecer reserva online");
  eq(pedidos, []);
});

// ---------- móvil, movimiento reducido ----------
await caso("Móvil 400px: sin scroll horizontal en las pantallas principales + menú hamburguesa", async ({ page }) => {
  await agregar(page, 1);
  for (const r of ["/", "/productos", `/productos/${P(1)}`, "/carrito", "/checkout", "/alquiler", "/login", "/equipo"]) {
    await page.goto(`${WEB}${r}`);
    await page.waitForTimeout(500);
    ok(await sinScrollHorizontal(page), `scroll horizontal en ${r}`);
  }
  await page.goto(`${WEB}/`);
  await page.getByRole("button", { name: "Abrir menú" }).click();
  await page.getByRole("navigation", { name: "Menú principal" }).getByRole("link", { name: "Catálogo" }).click();
  await page.waitForURL(/\/productos/);
}, { ancho: 400 });
await caso("Movimiento reducido: el carrusel no avanza solo y el contenido está visible", async ({ page }) => {
  await page.goto(`${WEB}/`);
  await page.waitForTimeout(500);
  const antes = await page.locator('[aria-roledescription="carrusel"], [aria-roledescription="carousel"], section[aria-label*="arrusel"]').first().innerText().catch(() => "");
  await page.waitForTimeout(7000);
  const despues = await page.locator('[aria-roledescription="carrusel"], [aria-roledescription="carousel"], section[aria-label*="arrusel"]').first().innerText().catch(() => "");
  eq(despues, antes, "el carrusel no debe avanzar solo");
  const ocultos = await page.evaluate(() => [...document.querySelectorAll("[data-rev]")].filter((e) => getComputedStyle(e).opacity === "0").length);
  eq(ocultos, 0, "nada debe quedar invisible");
  const dur = await page.evaluate(() => getComputedStyle(document.querySelector(".anim-sube, body")).animationDuration);
  ok(parseFloat(dur) < 0.01 || dur === "0s" || dur === "1e-05s", "duración de animación mínima: " + dur);
}, { movimientoReducido: true });
await caso("Con animación normal: el contenido de abajo se revela al hacer scroll (y no queda invisible)", async ({ page }) => {
  await page.goto(`${WEB}/`);
  await page.waitForTimeout(500);
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(1200);
  const ocultos = await page.evaluate(() => [...document.querySelectorAll("[data-rev]")].filter((e) => getComputedStyle(e).opacity === "0").length);
  eq(ocultos, 0);
});
await caso("Texto de cobertura corregido (ya no dice 'todo el país')", async ({ page }) => {
  await page.goto(`${WEB}/`);
  const t = await page.locator("body").innerText();
  ok(!/todo el país/i.test(t), "sigue diciendo todo el país");
  ok(t.includes("Neuquén, Río Negro, Chubut y Santa Cruz"));
});

await navegador.close();
let fallas = 0;
for (const [r, n] of resultados) { console.log(r.padEnd(6), n); if (r === "FALLA") fallas++; }
console.log(`\n${resultados.length - fallas}/${resultados.length} casos OK`);
process.exit(fallas ? 1 : 0);
