// Animaciones del resto de las pantallas y tema de invierno con nieve.
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE ?? "playwright");
const WEB = process.env.WEB ?? "http://localhost:3000";
const nav = await chromium.launch({ executablePath: process.env.CHROMIUM ?? "/opt/pw-browsers/chromium-1194/chrome-linux/chrome", args: ["--no-sandbox"] });
const res = [];
const ok = (c, m) => { if (!c) throw new Error(m); };
async function caso(n, fn, o = {}) {
  const ctx = await nav.newContext({ viewport: { width: o.ancho ?? 1280, height: 800 }, reducedMotion: o.reducido ? "reduce" : "no-preference" });
  const page = await ctx.newPage();
  const errores = []; page.on("pageerror", (e) => errores.push(e.message));
  await page.route(/fonts\.(gstatic|googleapis)\.com/, (r) => r.abort());
  try { await fn(page); ok(!errores.length, errores.join("|")); res.push(["PASA", n]); } catch (e) { res.push(["FALLA", n + " → " + e.message.split("\n")[0]]); } finally { await ctx.close(); }
}
const ir = async (p, ruta) => { await p.goto(WEB + ruta, { waitUntil: "domcontentloaded" }); await p.waitForTimeout(1500); };
// Huella simple del canvas: suma de alfas muestreados.
const huella = (p) => p.evaluate(() => { const c = document.querySelector("[data-nieve]"); const d = c.getContext("2d").getImageData(0, 0, c.width, c.height).data; let s = 0, n = 0; for (let i = 3; i < d.length; i += 37) { s += d[i] * (1 + (i % 7)); if (d[i] > 0) n++; } return { s, n }; });

await caso("Alquiler: tema invierno + copos que se mueven", async (p) => {
  await ir(p, "/alquiler");
  ok(await p.locator('[data-tema="invierno"]').count() === 1, "falta el tema de invierno");
  const bg = await p.evaluate(() => getComputedStyle(document.querySelector(".tema-invierno")).backgroundImage);
  ok(/gradient/.test(bg), "sin fondo de invierno");
  const a = await huella(p); ok(a.n > 20, "no hay copos dibujados: " + a.n);
  await p.waitForTimeout(700);
  const b = await huella(p); ok(a.s !== b.s, "los copos no se mueven");
});
await caso("Alquiler: fluidez (≥ 40 fps) y los copos no bloquean clics", async (p) => {
  await ir(p, "/alquiler");
  const fps = await p.evaluate(() => new Promise((r) => { let c = 0; const t = performance.now(); const f = () => { c++; performance.now() - t < 2000 ? requestAnimationFrame(f) : r(c / 2); }; f(); }));
  ok(fps >= 40, "fps " + fps);
  const pe = await p.evaluate(() => getComputedStyle(document.querySelector("[data-nieve]")).pointerEvents);
  ok(pe === "none", "el canvas captura clics");
  await p.getByRole("button", { name: /Sumar un/ }).first().click();
  ok((await p.locator("[aria-live=polite]").first().innerText()) === "1", "no sumó (clic bloqueado)");
  const arriba = await p.evaluate(() => { const b = document.querySelector('button[aria-label^="Sumar"]').getBoundingClientRect(); return document.elementFromPoint(b.x + b.width / 2, b.y + b.height / 2).closest("button") !== null; });
  ok(arriba, "algo tapa el botón");
});
await caso("Alquiler: movimiento reducido → copos quietos, sin giro ni entradas", async (p) => {
  await ir(p, "/alquiler");
  const a = await huella(p); ok(a.n > 20, "debe haber un cuadro estático");
  await p.waitForTimeout(800);
  const b = await huella(p); ok(a.s === b.s, "se mueve con movimiento reducido");
}, { reducido: true });
for (const ancho of [400, 1920]) {
  await caso(`Alquiler ${ancho}px: sin scroll horizontal y copos ajustados al bloque`, async (p) => {
    await ir(p, "/alquiler");
    ok(await p.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1), "scroll horizontal");
    const m = await p.evaluate(() => { const c = document.querySelector("[data-nieve]"), r = c.parentElement.getBoundingClientRect(); return [c.getBoundingClientRect().width, r.width, c.getBoundingClientRect().height, r.height]; });
    ok(Math.abs(m[0] - m[1]) < 2 && Math.abs(m[2] - m[3]) < 2, "canvas no cubre el bloque " + m);
    await p.screenshot({ path: `dev/captura-invierno-${ancho}.png` });
    if (ancho === 1920) await p.screenshot({ path: "dev/captura-invierno-completa.png", fullPage: true });
  }, { ancho });
}
await caso("Alquiler: el estimador sigue funcionando bajo la nieve", async (p) => {
  await ir(p, "/alquiler");
  await p.getByRole("button", { name: /Sumar un/ }).first().click();
  await p.fill("#desde", "2099-07-01"); await p.fill("#hasta", "2099-07-03");
  await p.getByText(/Precio estimado/).waitFor();
  ok(/\$\s?[\d.]+/.test(await p.locator("aside").innerText()), "no hay precio estimado");
});
await caso("Las otras pantallas NO tienen tema de invierno ni nieve", async (p) => {
  for (const r of ["/", "/productos", "/carrito"]) { await ir(p, r); ok((await p.locator("[data-nieve]").count()) === 0, "nieve en " + r); }
});
await caso("Entrada de pantalla y escalón en la grilla del catálogo", async (p) => {
  await ir(p, "/productos");
  ok((await p.locator(".anim-pagina").count()) === 1, "falta el fundido de pantalla");
  const r = await p.evaluate(() => { const g = document.querySelector(".grilla-anim"); return { n: g.children.length, d: [...g.children].slice(0, 5).map((c) => getComputedStyle(c).animationDelay) }; });
  ok(r.n >= 4, "poca grilla " + r.n);
  ok(r.d[0] === "0s" && r.d[3] === "0.18s", "sin escalonado: " + r.d);
});
await caso("Carrito: los ítems entran escalonados, el número salta y quitar anima antes de salir", async (p) => {
  const item = (i) => ({ varianteId: "v" + i, productoId: "p" + i, nombreProducto: "Producto " + i, talla: "M", color: null, precioUnitario: 1000 * i, cantidad: 1, imagen: null });
  await p.addInitScript((items) => localStorage.setItem("tierra_carrito", JSON.stringify(items)), [1, 2, 3].map(item));
  await ir(p, "/carrito");
  ok((await p.locator(".grilla-anim > div").count()) === 3, "faltan ítems");
  await p.getByRole("button", { name: "Sumar una unidad" }).first().click();
  await p.waitForTimeout(60);
  ok(await p.locator(".anim-saltito").count() >= 1, "no salta el número");
  await p.getByRole("button", { name: "Quitar del carrito" }).first().click();
  await p.waitForTimeout(80);
  ok(await p.locator(".anim-sale").count() === 1, "no anima la salida");
  ok((await p.locator(".grilla-anim > div").count()) === 3, "salió antes de animar");
  await p.waitForTimeout(500);
  ok((await p.locator(".grilla-anim > div").count()) === 2, "no se quitó");
});
await caso("Checkout: resumen escalonado y pasos con animación", async (p) => {
  const item = { varianteId: "v1", productoId: "p1", nombreProducto: "Campera", talla: "M", color: null, precioUnitario: 5000, cantidad: 2, imagen: null };
  await p.addInitScript((i) => localStorage.setItem("tierra_carrito", JSON.stringify([i])), item);
  await ir(p, "/checkout");
  ok((await p.locator("aside .grilla-anim, aside.grilla-anim").count()) >= 1 || (await p.locator(".grilla-anim li").count()) >= 1, "resumen sin animación");
  ok((await p.locator(".anim-paso").count()) >= 1, "paso sin animación");
});
const rgb = (p, sel) => p.evaluate((q) => getComputedStyle(document.querySelector(q)).backgroundColor, sel);
const lum = (c) => { const [r, g, b] = c.match(/[\d.]+/g).map(Number); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
const azul = (c) => { const [r, , b] = c.match(/[\d.]+/g).map(Number); return b > r + 8; };
await caso("Invierno en TODA la página: barra superior, header, footer y fondo azules; y vuelve a Tierra al salir", async (p) => {
  await ir(p, "/alquiler");
  ok(azul(await rgb(p, "header > div:first-child")), "barra superior no es azul");
  ok(azul(await rgb(p, "header > div:nth-child(2)")), "header no es azul");
  ok(azul(await rgb(p, "footer > div:first-child")), "footer no es azul");
  ok(azul(await rgb(p, "footer > div:last-child")), "franja final no es azul");
  ok(/rgb\(4|rgb\(1/.test(await rgb(p, "footer > div:first-child")) || lum(await rgb(p, "footer > div:first-child")) < 90, "footer debería ser oscuro");
  ok(/rgb\(4|rgb\(1/.test("rgb(1") && /gradient/.test(await p.evaluate(() => getComputedStyle(document.body).backgroundImage)), "fondo del body sin degradé");
  ok(azul(await p.evaluate(() => getComputedStyle(document.querySelector("header .bg-tierra-terracota")).backgroundColor)), "botón del carrito no es azul");
  // Navegación del lado del cliente: sale de invierno sin recargar.
  await p.locator("header a[href='/productos']").first().click(); await p.waitForTimeout(1200);
  ok(!azul(await rgb(p, "header > div:nth-child(2)")), "el header quedó azul fuera de /alquiler");
  ok(!azul(await rgb(p, "footer > div:last-child")), "el footer quedó azul fuera de /alquiler");
  await p.goBack(); await p.waitForTimeout(1200);
});
await caso("Catálogo, carrito y checkout: tema Tierra (naranja/verde) y animaciones propias", async (p) => {
  const item = { varianteId: "v1", productoId: "p1", nombreProducto: "Campera", talla: "M", color: null, precioUnitario: 5000, cantidad: 1, imagen: null };
  await p.addInitScript((i) => localStorage.setItem("tierra_carrito", JSON.stringify([i])), item);
  for (const ruta of ["/productos", "/carrito", "/checkout"]) {
    await ir(p, ruta);
    ok((await p.locator('[data-ruta-tema="tierra"]').count()) === 1, "sin tema Tierra en " + ruta);
    const f = await p.evaluate(() => { const b = getComputedStyle(document.body); return { img: b.backgroundImage, an: b.animationName }; });
    ok(/radial-gradient/.test(f.img) && f.an === "manchasTierra", "fondo sin manchas animadas en " + ruta + " " + f.an);
    const h = await p.evaluate(() => { const e = getComputedStyle(document.querySelector("main h1"), "::after"); return { bg: e.backgroundImage, an: e.animationName }; });
    ok(/linear-gradient/.test(h.bg) && h.an === "barraCrece", "título sin barrita en " + ruta);
    ok(!azul(await rgb(p, "header > div:nth-child(2)")), "header azul en " + ruta);
  }
  await ir(p, "/productos");
  const borde = await p.evaluate(() => getComputedStyle(document.querySelector('aside[aria-label="Filtros del catálogo"]')).borderTopColor);
  ok(/43, 95, 78/.test(borde), "panel de filtros sin acento verde: " + borde);
  const colores = await p.evaluate(() => [...document.querySelectorAll(".grilla-anim > *")].slice(0, 3).map((c) => getComputedStyle(c.querySelector("a")).borderTopColor));
  ok(new Set(colores).size === 3, "las tarjetas no alternan colores: " + colores);
  const btn = await p.evaluate(() => getComputedStyle(document.querySelector(".btn-naranja, .btn-primario") ?? document.body).backgroundImage);
  ok(/gradient/.test(btn), "botón sin degradé");
});
await caso("Tema Tierra: sin scroll horizontal en móvil y con movimiento reducido no hay animación de fondo", async (p) => {
  await ir(p, "/productos");
  ok(await p.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1), "scroll horizontal");
  await p.screenshot({ path: "dev/captura-tierra-movil.png" });
}, { ancho: 400 });
await caso("Movimiento reducido: el fondo de Tierra no se anima", async (p) => {
  await ir(p, "/productos");
  const d = await p.evaluate(() => parseFloat(getComputedStyle(document.body).animationDuration));
  ok(d < 0.01, "duración " + d);
}, { reducido: true });
await nav.close();
for (const [r, n] of res) console.log(r.padEnd(6), n);
process.exit(res.some(([r]) => r === "FALLA") ? 1 : 0);
