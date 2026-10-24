// Riesgos de la migración a Next 15 / React 19 + login de montañas + video nuevo de ondas.
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE ?? "playwright");
const WEB = process.env.WEB ?? "http://localhost:3000";
const nav = await chromium.launch({ executablePath: process.env.CHROMIUM ?? "/opt/pw-browsers/chromium-1194/chrome-linux/chrome", args: ["--no-sandbox", "--autoplay-policy=no-user-gesture-required"] });
const res = [];
const ok = (c, m) => { if (!c) throw new Error(m); };
async function caso(n, fn, o = {}) {
  const ctx = await nav.newContext({ viewport: { width: o.ancho ?? 1280, height: o.alto ?? 800 } });
  const page = await ctx.newPage();
  const errores = []; page.on("pageerror", (e) => errores.push(e.message)); page.on("console", (m) => { if (m.type() === "error" && !/fonts|Failed to load resource/.test(m.text())) errores.push(m.text()); });
  await page.route(/fonts\.(gstatic|googleapis)\.com/, (r) => r.abort());
  try { await fn(page); ok(!errores.length, "errores de consola/hidratación: " + errores.join(" | ").slice(0, 300)); res.push(["PASA", n]); } catch (e) { res.push(["FALLA", n + " → " + e.message.split("\n")[0]]); } finally { await ctx.close(); }
}
const ir = async (p, ruta) => { const r = await p.goto(WEB + ruta, { waitUntil: "domcontentloaded" }); await p.waitForTimeout(1500); return r; };

await caso("Versiones: Next 15 y React 19 (como la rama develop)", async () => {
  const pk = JSON.parse(readFileSync("package.json", "utf8"));
  ok(/^15\./.test(pk.dependencies.next), "next " + pk.dependencies.next);
  ok(/^19\./.test(pk.dependencies.react) && /^19\./.test(pk.dependencies["react-dom"]), "react " + pk.dependencies.react);
});
await caso("Páginas con params/searchParams asíncronos responden bien", async (p) => {
  for (const ruta of ["/productos", "/productos?q=bici&categoria=Bicicletas", "/productos?pagina=2", "/productos/d0000000-0000-0000-0000-000000000001", "/productos/no-existe-123", "/checkout/exito?external_reference=abc", "/checkout/pendiente?external_reference=abc", "/checkout/exito"]) {
    const r = await ir(p, ruta);
    ok(r && r.status() < 500, ruta + " → " + (r && r.status()));
    ok((await p.locator("body").innerText()).length > 20, "página vacía: " + ruta);
  }
});
await caso("inert (React 19): la copia del carrusel no recibe foco ni lectores de pantalla", async (p) => {
  await ir(p, "/");
  const n = await p.evaluate(() => { const l = [...document.querySelectorAll("[inert]")]; return { total: l.length, validos: l.every((e) => e.getAttribute("inert") === "" ), enfocables: l.flatMap((e) => [...e.querySelectorAll("a,button")]).filter((e) => e.matches(":focus-visible") ).length }; });
  ok(n.total >= 1, "no hay ningún [inert] en el DOM");
  ok(n.validos, "atributo inert mal escrito");
  await p.keyboard.press("Tab");
  const dentro = await p.evaluate(() => { for (let i = 0; i < 40; i++) { document.activeElement?.blur?.(); } return 0; });
  ok(dentro === 0, "foco");
  const tabs = []; for (let i = 0; i < 40; i++) { await p.keyboard.press("Tab"); tabs.push(await p.evaluate(() => !!document.activeElement?.closest("[inert]"))); }
  ok(!tabs.some(Boolean), "el foco con Tab entró a un bloque inert");
});
for (const [nombre, ruta] of [["login", "/login"], ["equipo", "/equipo"]]) {
  await caso(`Fondo de montañas en ${nombre}: carga, cubre y la tarjeta se lee (escritorio)`, async (p) => {
    await ir(p, ruta);
    const d = await p.evaluate(() => { const i = document.querySelector("img[data-fondo-login]"); const c = i.getBoundingClientRect(); return { src: i.currentSrc, ok: i.complete && i.naturalWidth > 0, nw: i.naturalWidth, w: c.width, h: c.height, vw: innerWidth, vh: innerHeight, sx: document.documentElement.scrollWidth > innerWidth }; });
    ok(/login-montanas-ancho\.jpg/.test(d.src), "no usa el panorama: " + d.src);
    ok(d.ok && d.nw >= 2000, "imagen no cargó: " + JSON.stringify(d));
    ok(d.w >= d.vw - 1 && d.h >= d.vh - 1, "no cubre la pantalla");
    ok(!d.sx, "scroll horizontal");
    ok(!/hero\.jpg/.test(await p.content()), "sigue la foto vieja");
  });
  await caso(`Fondo de montañas en ${nombre}: versión vertical en el celular`, async (p) => {
    await ir(p, ruta);
    const d = await p.evaluate(() => { const i = document.querySelector("img[data-fondo-login]"); return { src: i.currentSrc, ok: i.complete && i.naturalWidth > 0, sx: document.documentElement.scrollWidth > innerWidth }; });
    ok(/login-montanas\.jpg/.test(d.src) && !/ancho/.test(d.src), "src " + d.src);
    ok(d.ok && !d.sx, JSON.stringify(d));
  }, { ancho: 390, alto: 800 });
}
await caso("Video nuevo de ondas: se reproduce, dura 10 s y avanza (sin pedir el viejo)", async (p) => {
  const pedidos = []; p.on("request", (r) => pedidos.push(r.url()));
  await ir(p, "/productos");
  const v = await p.evaluate(() => { const e = document.querySelector("video"); return e ? { t: e.currentTime, pausa: e.paused, dur: e.duration, src: e.currentSrc, w: e.videoWidth } : null; });
  ok(v, "no hay video en el catálogo");
  ok(/ondas-tierra-(v2|hd)\.(mp4|webm)/.test(v.src) && v.dur > 9 && v.dur < 11, JSON.stringify(v));
  ok(!pedidos.some((u) => /ondas-acuarela/.test(u)), "pide el video viejo");
  await p.waitForTimeout(1200);
  ok(await p.evaluate(() => document.querySelector("video").currentTime) > v.t, "el video no avanza");
});
console.log(res.map((r) => r.join("  ")).join("\n"));
const mal = res.filter((r) => r[0] === "FALLA").length;
console.log(`${res.length - mal} ok, ${mal} mal`);
await nav.close(); process.exit(mal ? 1 : 0);
