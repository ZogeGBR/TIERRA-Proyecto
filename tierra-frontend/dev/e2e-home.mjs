// Home: video de ondas, sombreado del borde y tarjeta del hero que acompaña el scroll.
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE ?? "playwright");
const WEB = process.env.WEB ?? "http://localhost:3000";
const nav = await chromium.launch({ executablePath: process.env.CHROMIUM ?? "/opt/pw-browsers/chromium-1194/chrome-linux/chrome", args: ["--no-sandbox", "--autoplay-policy=no-user-gesture-required"] });
const res = [];
const ok = (c, m) => { if (!c) throw new Error(m); };
const eq1 = (a, b) => ok(a === b, `esperado ${b}, obtuve ${a}`);
const API = process.env.API ?? "http://localhost:8080/api";
async function caso(n, fn, o = {}) {
  const ctx = await nav.newContext({ viewport: { width: o.ancho ?? 1280, height: 800 }, reducedMotion: o.reducido ? "reduce" : "no-preference" });
  const page = await ctx.newPage();
  const errores = []; page.on("pageerror", (e) => errores.push(e.message));
  await page.route(/fonts\.(gstatic|googleapis)\.com/, (r) => r.abort());
  try { await fn(page); ok(!errores.length, errores.join("|")); res.push(["PASA", n]); } catch (e) { res.push(["FALLA", n + " → " + e.message.split("\n")[0]]); } finally { await ctx.close(); }
}
const ir = async (p) => { await p.goto(WEB, { waitUntil: "domcontentloaded" }); await p.waitForTimeout(1500); };

await caso("Video de ondas: dos franjas, avanzan, HD (1920) con pantalla ancha", async (p) => {
  await ir(p);
  await p.evaluate(() => document.querySelector(".catalogo").scrollIntoView()); await p.waitForTimeout(1500);
  ok((await p.locator(".fondo-ondas video").count()) === 2, "debe haber 2 franjas de video");
  const t1 = await p.evaluate(() => document.querySelector(".fondo-ondas video").currentTime);
  await p.waitForTimeout(1500);
  const v = await p.evaluate(() => { const e = document.querySelector(".fondo-ondas video"); return { t: e.currentTime, pausado: e.paused, w: e.videoWidth, dur: e.duration, src: e.currentSrc }; });
  ok(v.w === 1280, "en 1280 debe usar el video estándar: " + JSON.stringify(v));
  ok(!v.pausado && v.t > t1 + 0.5, `no avanza: ${t1} → ${v.t}`);
  ok(v.dur > 9 && v.dur < 11, "bucle de 10 s (ondas-tierra): " + v.dur);
});
await caso("Video de ondas en 1920: usa la versión HD", async (p) => {
  await ir(p);
  await p.evaluate(() => document.querySelector(".catalogo").scrollIntoView()); await p.waitForTimeout(1500);
  const w = await p.evaluate(() => document.querySelector(".fondo-ondas video").videoWidth);
  eq1(w, 1920);
}, { ancho: 1920 });
await caso("Fuera de pantalla el video se pausa", async (p) => {
  await ir(p);
  await p.evaluate(() => window.scrollTo(0, 0));
  await p.waitForTimeout(800);
  const pausado = await p.evaluate(() => document.querySelector(".fondo-ondas video").paused);
  ok(pausado, "debería estar pausado fuera de pantalla");
});
await caso("Movimiento reducido: imagen fija, sin <video> ni descarga", async (p) => {
  const pedidos = []; p.on("request", (r) => { if (/ondas-tierra-(v2|hd)\.(mp4|webm)/.test(r.url())) pedidos.push(r.url()); });
  await ir(p);
  ok((await p.locator(".fondo-ondas video").count()) === 0, "hay <video>");
  ok((await p.locator(".fondo-ondas img").count()) >= 1, "falta imagen fija");
  ok(pedidos.length === 0, "descargó el video: " + pedidos);
}, { reducido: true });
await caso("Sombreado del borde: el marco tiene drop-shadow y el panel conserva su clip-path", async (p) => {
  await ir(p);
  const r = await p.evaluate(() => ({ f: getComputedStyle(document.querySelector(".papel-sombra")).filter, c: getComputedStyle(document.querySelector(".papel-central")).clipPath, b: getComputedStyle(document.querySelector(".papel-central")).boxShadow }));
  ok(/drop-shadow/.test(r.f), "sin drop-shadow: " + r.f);
  ok(/polygon/.test(r.c), "perdió el borde rasgado");
});
await caso("Tarjeta del hero QUIETA (fija, mismo lugar siempre) y sin tapar beneficios ni Categorías", async (p) => {
  await ir(p);
  const info = () => p.evaluate(() => {
    const c = document.querySelector("h1").parentElement; const r = c.getBoundingClientRect();
    const h = document.querySelector("[data-hero]").getBoundingClientRect();
    return { top: Math.round(r.top * 10) / 10, left: Math.round(r.left * 10) / 10, bottom: r.bottom, op: parseFloat(getComputedStyle(c).opacity), heroBottom: h.bottom, inert: c.hasAttribute("inert") };
  });
  const i0 = await info();
  ok(i0.op === 1, "debe verse al inicio");
  const fin = await p.evaluate(() => document.querySelector(".catalogo").getBoundingClientRect().top + scrollY);
  let vistas = 0;
  for (let y = 0; y <= fin; y += 40) {
    await p.evaluate((v) => window.scrollTo(0, v), y); await p.waitForTimeout(120);
    const i = await info();
    ok(Math.abs(i.top - i0.top) <= 1 && Math.abs(i.left - i0.left) <= 1, `se movió en scroll ${y}: ${i.top},${i.left} vs ${i0.top},${i0.left}`);
    if (i.op > 0.05) { vistas++; ok(i.bottom <= i.heroBottom + 50, `invade debajo del hero en scroll ${y}`); }
    if (i.op < 0.02) ok(i.inert, "oculta pero no inert en scroll " + y);
  }
  ok(vistas > 5, "casi nunca visible");
  await p.waitForTimeout(300);
  const f = await info(); ok(f.op < 0.02, "debe estar desvanecida al llegar a Categorías: " + f.op);
  await p.evaluate(() => window.scrollTo(0, 0)); await p.waitForTimeout(300);
  const b = await info(); ok(b.op === 1 && Math.abs(b.top - i0.top) <= 1, "no vuelve igual");
});
await caso("Tarjeta fija también tras recargar a mitad de página", async (p) => {
  await ir(p);
  const y0 = await p.evaluate(() => Math.round(document.querySelector("h1").parentElement.getBoundingClientRect().top));
  await p.evaluate(() => window.scrollTo(0, 150)); await p.waitForTimeout(200);
  await p.reload({ waitUntil: "domcontentloaded" }); await p.waitForTimeout(1500);
  const y1 = await p.evaluate(() => Math.round(document.querySelector("h1").parentElement.getBoundingClientRect().top));
  ok(Math.abs(y1 - y0) <= 1, `tras recargar quedó en ${y1}, esperado ${y0}`);
});
await caso("Carrusel de productos: avanza solo, sin salto, pausa al pasar el mouse", async (p) => {
  await ir(p);
  await p.locator(".carrusel-continuo").scrollIntoViewIfNeeded(); await p.waitForTimeout(500);
  const x = () => p.evaluate(() => new DOMMatrixReadOnly(getComputedStyle(document.querySelector(".carrusel-cinta")).transform).m41);
  const a = await x(); await p.waitForTimeout(1000); const b = await x();
  ok(b < a - 20, `no avanza solo: ${a} → ${b}`);
  // fluidez: muestras frecuentes sin saltos grandes ni retrocesos (salvo la vuelta de ciclo)
  const m = await p.evaluate(() => new Promise((res) => { const o = []; const t0 = performance.now(); const f = () => { o.push(new DOMMatrixReadOnly(getComputedStyle(document.querySelector(".carrusel-cinta")).transform).m41); performance.now() - t0 < 2500 ? requestAnimationFrame(f) : res(o); }; f(); }));
  let saltos = 0; for (let i = 1; i < m.length; i++) { const d = m[i] - m[i - 1]; if (d > 60 || d < -60) saltos++; }
  ok(saltos <= 1, "saltos bruscos: " + saltos);
  await p.locator(".carrusel-continuo").hover(); await p.waitForTimeout(400);
  const c = await x(); await p.waitForTimeout(800); const d = await x();
  ok(Math.abs(d - c) < 1.5, `no pausa con el mouse: ${c} → ${d}`);
  // pausa manual
  await p.mouse.move(5, 5); await p.waitForTimeout(300);
  await p.locator("section:has(.carrusel-continuo)").getByRole("button", { name: /pausar|reanudar/i }).click(); await p.waitForTimeout(300);
  const e = await x(); await p.waitForTimeout(700); const f = await x();
  ok(Math.abs(f - e) < 1.5, "el botón de pausa no frena");
});
await caso("Carrusel: pestañas, flechas, copia oculta para lectores", async (p) => {
  await ir(p);
  await p.getByRole("tab", { name: "Más vendidos" }).waitFor();
  const primero = await p.locator(".carrusel-cinta a").first().innerText();
  await p.getByRole("tab", { name: "Más buscados" }).click(); await p.waitForTimeout(400);
  const otro = await p.locator(".carrusel-cinta a").first().innerText();
  ok(primero !== otro, "las dos pestañas muestran lo mismo");
  eq1(await p.getByRole("tab", { name: "Más buscados" }).getAttribute("aria-selected"), "true");
  ok((await p.locator('.carrusel-cinta [aria-hidden="true"] a').count()) >= 8, "falta la copia aria-hidden");
  await p.locator("section:has(.carrusel-continuo)").getByRole("button", { name: /pausar|reanudar/i }).click();
  const x = () => p.evaluate(() => new DOMMatrixReadOnly(getComputedStyle(document.querySelector(".carrusel-cinta")).transform).m41);
  const a = await x();
  await p.getByRole("button", { name: /siguientes/i }).click(); await p.waitForTimeout(700);
  ok((await x()) < a - 200, "flecha siguiente no mueve");
  await p.getByRole("button", { name: /anteriores/i }).click(); await p.waitForTimeout(700);
});
await caso("Carrusel: si un ranking falla, esa pestaña desaparece y la home sigue", async (p) => {
  const set = (v) => fetch(API + "/__test/opciones", { method: "POST", headers: { "X-XSRF-TOKEN": "x", Cookie: "XSRF-TOKEN=x", "content-type": "application/json" }, body: JSON.stringify({ rankingFalla: v }) });
  await set(["buscados"]);
  try {
    await ir(p);
    ok((await p.getByRole("tab").count()) === 0, "con una sola lista no debería haber pestañas");
    ok((await p.locator(".carrusel-cinta a").count()) >= 1, "falta el carrusel");
    await set(["buscados", "vendidos"]);
    await ir(p);
    ok((await p.locator(".carrusel-continuo").count()) === 0, "sin rankings no debería haber carrusel");
    ok(await p.getByRole("heading", { name: "Categorías" }).isVisible(), "Categorías debe seguir");
  } finally { await set([]); }
});
await caso("Carrusel con movimiento reducido: scroll nativo, sin animación", async (p) => {
  await ir(p);
  await p.locator(".carrusel-productos").first().scrollIntoViewIfNeeded();
  ok((await p.locator(".carrusel-cinta").count()) === 0, "no debería haber cinta animada");
  ok((await p.locator(".carrusel-productos a").count()) >= 8, "faltan tarjetas");
}, { reducido: true });
await caso("Móvil 400px: sin scroll horizontal y tarjeta visible", async (p) => {
  await ir(p);
  ok(await p.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1), "scroll horizontal");
  ok(await p.getByRole("heading", { name: /Equipos para tus aventuras/ }).isVisible(), "tarjeta no visible");
}, { ancho: 400 });
await caso("Capturas", async (p) => {
  await ir(p);
  await p.evaluate(() => document.querySelector(".catalogo").scrollIntoView()); await p.waitForTimeout(1200);
  await p.screenshot({ path: "dev/captura-ondas.png" });
  await p.evaluate(() => window.scrollTo(0, 260)); await p.waitForTimeout(400);
  await p.screenshot({ path: "dev/captura-hero-scroll.png" });
});
await nav.close();
for (const [r, n] of res) console.log(r.padEnd(6), n);
process.exit(res.some(([r]) => r === "FALLA") ? 1 : 0);
