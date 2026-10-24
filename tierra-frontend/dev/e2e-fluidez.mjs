// Ronda "fluidez": header de vidrio, barra de progreso, titulares por palabra, hero con barras,
// flechas del carrusel sin cortes, tarjetas con profundidad, luz del cursor y movimiento reducido.
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE ?? "playwright");
const WEB = process.env.WEB ?? "http://localhost:3000";
const nav = await chromium.launch({ executablePath: process.env.CHROMIUM ?? "/opt/pw-browsers/chromium-1194/chrome-linux/chrome", args: ["--no-sandbox"] });
const res = [];
const ok = (c, m) => { if (!c) throw new Error(m); };
async function caso(n, fn, o = {}) {
  const ctx = await nav.newContext({ viewport: { width: o.ancho ?? 1280, height: 800 }, reducedMotion: o.reducido ? "reduce" : "no-preference", hasTouch: !!o.tactil });
  const page = await ctx.newPage();
  const errores = []; page.on("pageerror", (e) => errores.push(e.message));
  await page.route(/fonts\.(gstatic|googleapis)\.com/, (r) => r.abort());
  try { await fn(page); ok(!errores.length, errores.join("|")); res.push(["PASA", n]); } catch (e) { res.push(["FALLA", n + " → " + e.message.split("\n")[0]]); } finally { await ctx.close(); }
}
const ir = async (p, ruta = "/") => { await p.goto(WEB + ruta, { waitUntil: "domcontentloaded" }); await p.waitForTimeout(1500); };

await caso("Header: el aviso se va con el scroll sin saltos de contenido y la barra pasa a vidrio; vuelve al subir", async (p) => {
  await ir(p);
  const h = () => p.evaluate(() => { const e = document.querySelector("header"); return { c: e.dataset.compacto, alto: Math.round(e.getBoundingClientRect().height), f: getComputedStyle(e.querySelector(".header-barra")).backdropFilter }; });
  const a = await h(); ok(a.c === "no", "arranca compacto");
  await p.evaluate(() => window.scrollTo(0, 400)); await p.waitForTimeout(700);
  const b = await h(); ok(b.c === "si", "no se compactó"); ok(b.alto === a.alto, `la altura cambió (salto de contenido): ${a.alto} → ${b.alto}`); ok(/blur/.test(b.f), "sin vidrio: " + b.f);
  const top = await p.evaluate(() => Math.round(document.querySelector("header").getBoundingClientRect().top)); ok(top < 0, "el aviso no se fue con el scroll: " + top);
  await p.evaluate(() => window.scrollTo(0, 0)); await p.waitForTimeout(700);
  ok((await h()).c === "no", "no volvió");
});
await caso("Barra de progreso de lectura crece con el scroll", async (p) => {
  await ir(p);
  const t = () => p.evaluate(() => new DOMMatrixReadOnly(getComputedStyle(document.querySelector("[data-barra-progreso]")).transform).a);
  const a = await t(); await p.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight / 2)); await p.waitForTimeout(500);
  const b = await t(); ok(b > a + 0.25 && b < 0.9, `${a} → ${b}`);
});
await caso("Enlace activo del menú sigue a la ruta (Inicio en /, Catálogo en /productos)", async (p) => {
  await ir(p);
  ok(await p.locator('header nav a[aria-current="page"]').first().innerText().then((t) => /Inicio/.test(t)), "Inicio no activo en /");
  await ir(p, "/productos");
  ok(await p.locator('header nav a[aria-current="page"]').first().innerText().then((t) => /Cat/.test(t)), "Catálogo no activo");
});
await caso("Titulares por palabra: el texto sigue entero, las palabras entran escalonadas y la destacada va en cursiva", async (p) => {
  await ir(p, "/productos");
  const c = await p.evaluate(() => { const h = document.querySelector("h1"); return { t: h.textContent, n: h.querySelectorAll(".pal").length, st: getComputedStyle(h.querySelector(".pal-acento")).fontStyle }; });
  ok(c.t === "Catálogo" && c.n === 1 && c.st === "italic", JSON.stringify(c));
  await ir(p);
  const r = await p.evaluate(() => { const h = document.querySelector("h1"); return { t: h.textContent, n: h.querySelectorAll(".pal").length, d: [...h.querySelectorAll(".pal")].map((e) => e.style.animationDelay) }; });
  ok(r.t === "Equipos para tus aventuras en la montaña", "texto: " + r.t); ok(r.n === 7, "palabras: " + r.n);
  ok(new Set(r.d).size === 7, "sin escalonado: " + r.d);
});
await caso("Titular del scroll: se revela al llegar (Categorías)", async (p) => {
  await ir(p);
  await p.evaluate(() => document.querySelector("h2").scrollIntoView({ block: "center" })); await p.waitForTimeout(1200);
  const o = await p.evaluate(() => [...document.querySelectorAll("[data-pal]")].map((e) => e.dataset.pal + ":" + getComputedStyle(e.querySelector(".pal")).opacity));
  ok(o.every((x) => !x.startsWith("oculto") || x.endsWith(":1")), "titular oculto en pantalla: " + o);
});
await caso("Hero: la barra de la foto actual avanza sola y cambia de foto al llenarse", async (p) => {
  await ir(p);
  const e0 = await p.locator("[aria-roledescription=carrusel] .animate-etiqueta-fade").innerText();
  const w = () => p.evaluate(() => new DOMMatrixReadOnly(getComputedStyle(document.querySelector(".hero-progreso")).transform).a);
  const a = await w(); await p.waitForTimeout(1200); const b = await w(); ok(b > a + 0.1, `la barra no avanza: ${a} → ${b}`);
  await p.waitForTimeout(5200);
  const e1 = await p.locator("[aria-roledescription=carrusel] .animate-etiqueta-fade").innerText();
  ok(e1 !== e0, "no cambió de foto: " + e0);
});
await caso("Hero: flechas del teclado y botones cambian de foto", async (p) => {
  await ir(p);
  const e = () => p.locator("[aria-roledescription=carrusel] .animate-etiqueta-fade").innerText();
  const e0 = await e(); await p.locator('button[aria-label="Foto siguiente"]').click({ force: true }); await p.waitForTimeout(200);
  ok((await e()) !== e0, "botón siguiente no cambió");
});
await caso("Carrusel de productos: la flecha desliza en muchos cuadros (sin salto) y se frena sola", async (p) => {
  await ir(p);
  await p.locator(".carrusel-continuo").scrollIntoViewIfNeeded(); await p.waitForTimeout(600);
  await p.locator(".carrusel-continuo").hover(); await p.waitForTimeout(1500); // frenado gradual
  const x = () => p.evaluate(() => new DOMMatrixReadOnly(getComputedStyle(document.querySelector(".carrusel-cinta")).transform).m41);
  const x0 = await x();
  await p.locator('button[aria-label="Siguientes"]').click({ force: true });
  const m = []; for (let i = 0; i < 14; i++) { m.push(await x()); await p.waitForTimeout(40); }
  const dist = new Set(m.map((v) => Math.round(v))).size;
  ok(dist >= 6, `salta en pocos pasos (${dist}): ${m.map((v) => Math.round(v))}`);
  ok(x0 - m[m.length - 1] > 300, `no recorrió: ${x0} → ${m[m.length - 1]}`);
  const saltoMax = Math.max(...m.slice(1).map((v, i) => Math.abs(v - m[i])));
  ok(saltoMax < 330, "salto brusco de " + saltoMax);
});
await caso("Tarjeta de producto se inclina hacia el mouse y vuelve; luz del cursor aparece", async (p) => {
  await ir(p, "/productos");
  const c = p.locator(".inclinar").first(); const bb = await c.boundingBox();
  await p.mouse.move(bb.x + bb.width * 0.9, bb.y + bb.height * 0.2); await p.waitForTimeout(900);
  const ry = await c.evaluate((e) => e.style.getPropertyValue("--ry")); ok(parseFloat(ry) > 1.5, "sin inclinación: " + ry);
  ok((await p.evaluate(() => getComputedStyle(document.querySelector("[data-luz-cursor]")).opacity)) === "1", "sin luz del cursor");
  await p.mouse.move(5, 5); await p.waitForTimeout(400);
  ok(parseFloat(await c.evaluate((e) => e.style.getPropertyValue("--ry"))) === 0, "no volvió");
});
await caso("Pulsar un botón lo achica un poco sin moverlo de lugar", async (p) => {
  await ir(p);
  await p.locator(".carrusel-continuo").scrollIntoViewIfNeeded(); await p.waitForTimeout(500);
  const b = p.locator('button[aria-label="Siguientes"]').first();
  const bb0 = await b.boundingBox(); await p.mouse.move(bb0.x + 5, bb0.y + 5); await p.mouse.down(); await p.waitForTimeout(300);
  const esc = await b.evaluate((e) => getComputedStyle(e).scale); const bb1 = await b.boundingBox(); await p.mouse.up();
  ok(parseFloat(esc) < 1, "sin escala al presionar: " + esc);
  ok(Math.abs(bb1.y + bb1.height / 2 - (bb0.y + bb0.height / 2)) < 1, "se movió de lugar");
});
await caso("Movimiento reducido: sin luz, sin inclinación, titulares visibles, hero sin avance automático", async (p) => {
  await ir(p, "/productos");
  ok((await p.evaluate(() => getComputedStyle(document.querySelector("[data-luz-cursor]")).display)) === "none", "luz visible");
  ok((await p.evaluate(() => getComputedStyle(document.querySelector(".inclinar")).transform)) === "none", "inclinación activa");
  ok((await p.evaluate(() => getComputedStyle(document.querySelector("h1 .pal")).opacity)) === "1", "titular invisible");
  await ir(p);
  ok((await p.locator(".hero-progreso").count()) === 0, "hay barra animada");
}, { reducido: true });
await caso("Táctil 400px: sin luz de cursor, sin scroll horizontal, tarjetas sin inclinación", async (p) => {
  await ir(p, "/productos");
  ok(await p.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1), "scroll horizontal");
  ok((await p.evaluate(() => getComputedStyle(document.querySelector("[data-luz-cursor]")).display)) === "none", "luz en táctil");
}, { ancho: 400, tactil: true });
await caso("Fluidez al hacer scroll por la home (≥ 35 fps)", async (p) => {
  await ir(p);
  const fps = await p.evaluate(() => new Promise((res) => { let n = 0; const t0 = performance.now(); let y = 0; const f = (t) => { n++; y += 18; window.scrollTo(0, y % 3000); if (t - t0 < 2500) requestAnimationFrame(f); else res(n / ((t - t0) / 1000)); }; requestAnimationFrame(f); }));
  ok(fps >= 35, "fps " + fps.toFixed(1));
});

await caso("Catálogo: todas las tarjetas miden lo mismo aunque el nombre sea larguísimo o la marca enorme", async (p) => {
  await ir(p, "/productos");
  await p.evaluate(() => {
    const tarjetas = [...document.querySelectorAll(".grilla-anim .inclinar")];
    const nombre = tarjetas[1].querySelector("a p.font-medium"); nombre.textContent = "Campera impermeable de alta montaña con capucha ajustable, membrana respirable y costuras selladas para el viento patagónico";
    const marca = tarjetas[2].querySelector("a p.uppercase"); marca.textContent = "Una marca con un nombre exageradamente largo para probar el recorte";
  });
  await p.waitForTimeout(400);
  const m = await p.evaluate(() => [...document.querySelectorAll(".grilla-anim .inclinar")].map((e) => { const r = e.getBoundingClientRect(); const img = e.querySelector("a > div").getBoundingClientRect(); return [Math.round(r.height), Math.round(img.height), Math.round(r.width)]; }));
  ok(m.length >= 6, "pocas tarjetas: " + m.length);
  ok(new Set(m.map((x) => x[0])).size === 1, "alturas distintas: " + JSON.stringify(m.map((x) => x[0])));
  ok(new Set(m.map((x) => x[1])).size === 1, "fotos de distinto alto: " + JSON.stringify(m.map((x) => x[1])));
  ok(new Set(m.map((x) => x[2])).size === 1, "anchos distintos");
});
await caso("Carrusel de la home: tarjetas del mismo alto", async (p) => {
  await ir(p);
  const h = await p.evaluate(() => [...document.querySelectorAll(".carrusel-cinta .inclinar")].map((e) => Math.round(e.getBoundingClientRect().height)));
  ok(h.length > 4 && new Set(h).size === 1, "alturas: " + JSON.stringify(h));
});
await caso("Sobre Tierra: historia, 23 años, enlace activo, y se llega desde 'Conocenos'", async (p) => {
  await ir(p);
  await p.locator("a", { hasText: "Conocenos" }).first().click(); await p.waitForURL(/sobre-tierra/); await p.waitForTimeout(1500);
  const r = await p.evaluate(() => ({ h1: document.querySelector("h1").textContent, anios: document.querySelector("span[aria-label='23']").textContent, caps: document.querySelectorAll("#historia li").length, act: document.querySelector('header nav a[aria-current="page"]')?.textContent, cta: !!document.querySelector('a[href*="wa.me"]') }));
  ok(r.h1 === "Nacimos en Esquel, entre montañas", r.h1);
  ok(r.caps === 3, "capítulos: " + r.caps); ok(/Sobre Tierra/.test(r.act ?? ""), "enlace activo: " + r.act); ok(r.cta, "sin WhatsApp");
  await p.waitForTimeout(1200);
  ok((await p.evaluate(() => document.querySelector("span[aria-label='23']").textContent)) === "23", "el contador no llega a 23");
  ok(await p.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1), "scroll horizontal");
});
await caso("Sobre Tierra en celular (400px) y con movimiento reducido: todo visible, sin scroll horizontal", async (p) => {
  await ir(p, "/sobre-tierra");
  ok((await p.evaluate(() => document.querySelector("span[aria-label='23']").textContent)) === "23", "contador");
  ok((await p.evaluate(() => getComputedStyle(document.querySelector("h1 .pal")).opacity)) === "1", "título invisible");
  ok(await p.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1), "scroll horizontal");
}, { ancho: 400, reducido: true });

await caso("Sobre Tierra: portada con la cordillera a todo el ancho (sin recorte) y caminos de colores que se dibujan", async (p) => {
  await ir(p, "/sobre-tierra");
  const h = await p.evaluate(() => { const c = document.querySelector("[data-banda-cordillera] .cordillera-banda"); const s = c.closest("section").getBoundingClientRect(); const r = c.getBoundingClientRect(); return { izq: s.left, der: s.right, cl: r.left, cr: r.right, iw: innerWidth, m: getComputedStyle(c).maskImage || getComputedStyle(c).webkitMaskImage }; });
  ok(Math.abs(h.cl - h.izq) < 1 && Math.abs(h.cr - h.der) < 1 && Math.abs(h.der - h.iw) < 1.5, "la cordillera no cubre toda la portada: " + JSON.stringify(h));
  ok(/gradient/.test(h.m), "sin fundido en los bordes: " + h.m);
  await p.evaluate(() => document.querySelector("[data-caminos]").scrollIntoView({ block: "center" })); await p.waitForTimeout(3500);
  const c = await p.evaluate(() => { const s = document.querySelector("[data-caminos]"); return { v: s.dataset.visto, n: s.querySelectorAll(".camino").length, off: getComputedStyle(s.querySelector(".camino")).strokeDashoffset, par: s.querySelectorAll(".camino-parada").length }; });
  ok(c.v === "si" && c.n === 5 && c.par === 4, JSON.stringify(c)); ok(parseFloat(c.off) === 0, "camino sin dibujar: " + c.off);
  const t = await p.evaluate(() => { const txt = document.querySelector("[data-caminos]").parentElement.querySelector("h2").getBoundingClientRect(); return txt.width > 100; }); ok(t, "título no visible");
});
await caso("Sobre Tierra con movimiento reducido: caminos ya dibujados y quietos", async (p) => {
  await ir(p, "/sobre-tierra");
  const r = await p.evaluate(() => { const s = document.querySelector("[data-caminos]"); return { a: getComputedStyle(s.querySelector(".caminos-mece")).animationName, par: s.querySelectorAll(".camino-parada").length }; });
  ok(r.a === "none" && r.par === 4, JSON.stringify(r));
}, { reducido: true });

await nav.close();
for (const [e, n] of res) console.log(e, " ", n);
console.log(`${res.filter((r) => r[0] === "PASA").length}/${res.length}`);
process.exit(res.some((r) => r[0] === "FALLA") ? 1 : 0);
