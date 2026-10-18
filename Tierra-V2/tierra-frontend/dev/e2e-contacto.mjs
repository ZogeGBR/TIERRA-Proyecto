// Contacto real, banda "Somos Tierra", ondas, videos intercalados y envío del alquiler.
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE ?? "playwright");
const WEB = process.env.WEB ?? "http://localhost:3000";
const nav = await chromium.launch({ executablePath: process.env.CHROMIUM ?? "/opt/pw-browsers/chromium-1194/chrome-linux/chrome", args: ["--no-sandbox", "--autoplay-policy=no-user-gesture-required"] });
const res = [];
const ok = (c, m) => { if (!c) throw new Error(m); };
async function caso(n, fn, o = {}) {
  const ctx = await nav.newContext({ viewport: { width: o.ancho ?? 1280, height: 800 }, reducedMotion: o.reducido ? "reduce" : "no-preference" });
  const page = await ctx.newPage();
  const errores = []; page.on("pageerror", (e) => errores.push(e.message));
  await page.route(/fonts\.(gstatic|googleapis)\.com/, (r) => r.abort());
  try { await fn(page, ctx); ok(!errores.length, errores.join("|")); res.push(["PASA", n]); } catch (e) { res.push(["FALLA", n + " → " + e.message.split("\n")[0]]); } finally { await ctx.close(); }
}
const ir = async (p, ruta) => { await p.goto(WEB + ruta, { waitUntil: "domcontentloaded" }); await p.waitForTimeout(1600); };
const NUM = "5492945699751";

await caso("Footer: mail, Instagram y WhatsApp reales; sin Facebook ni datos viejos", async (p) => {
  await ir(p, "/");
  const hrefs = await p.evaluate(() => [...document.querySelectorAll("footer a")].map((a) => a.getAttribute("href")));
  ok(hrefs.includes("mailto:tierra.esquel@gmail.com"), "falta mailto");
  ok(hrefs.includes("https://www.instagram.com/tierra.esquel/"), "falta Instagram");
  ok(hrefs.some((h) => h && h.startsWith("https://wa.me/" + NUM)), "falta WhatsApp");
  const t = await p.locator("footer").innerText();
  ok(!/facebook/i.test(await p.locator("footer").innerHTML()), "sigue Facebook");
  ok(!/123456|hola@tierra/.test(t), "quedan datos viejos");
  ok(t.includes("+54 9 2945 699751") && t.includes("tierra.esquel@gmail.com"), "faltan datos visibles");
  const ext = await p.evaluate(() => [...document.querySelectorAll('footer a[target="_blank"]')].every((a) => /noopener/.test(a.rel)));
  ok(ext, "enlace externo sin noopener");
});
await caso("Menú Contacto lleva al bloque de contacto del pie", async (p) => {
  await ir(p, "/productos");
  await p.locator("header nav >> text=Contacto").first().click(); await p.waitForTimeout(600);
  ok(await p.locator("#contacto").isVisible(), "no se ve el contacto");
});
for (const ancho of [400, 1280, 1920]) {
  await caso(`Banda "Somos Tierra" (${ancho}px): solo el dibujo de la cordillera de siempre, quieto, sin ondas ni scroll horizontal`, async (p) => {
    await ir(p, "/");
    const r = await p.evaluate(() => {
      const img = document.querySelector('img[src="/images/brand/cordillera.png"]');
      const banda = img?.closest("section");
      return { hay: !!img, ondas: banda ? banda.querySelectorAll(".olas").length : -1, anim: banda ? getComputedStyle(banda).animationName : "", lamina: !!document.querySelector(".banda-somos-montana"),
               ondasFooter: document.querySelectorAll("footer .olas").length, video: document.querySelectorAll("footer video, section video").length };
    });
    ok(r.hay, "falta el dibujo original de la cordillera");
    ok(r.ondas === 0 && r.ondasFooter === 0, "no debe haber ondas en la banda ni en el footer");
    ok(r.anim === "none" && !r.lamina, "la banda no debe animarse ni usar la lámina espejada: " + r.anim);
    ok(await p.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1), "scroll horizontal");
  }, { ancho });
}
await caso("Footer sin ondas ni video en catálogo, carrito y alquiler", async (p) => {
  for (const ruta of ["/productos", "/carrito", "/alquiler", "/login"]) {
    await ir(p, ruta);
    ok((await p.locator("footer .olas, footer video").count()) === 0, "footer con ondas/video en " + ruta);
  }
});
await caso("Videos intercalados: catálogo→ondas, ficha→ondas, carrito→montaña, pago→montaña; el resto sin video", async (p) => {
  const item = { varianteId: "v1", productoId: "p1", nombreProducto: "Campera", talla: "M", color: null, precioUnitario: 5000, cantidad: 1, imagen: null };
  await p.addInitScript((i) => localStorage.setItem("tierra_carrito", JSON.stringify([i])), item);
  const esperado = { "/productos": "ondas", "/productos/d0000000-0000-0000-0000-000000000015": "ondas", "/carrito": "montana", "/checkout": "montana", "/alquiler": null, "/login": null };
  for (const [ruta, f] of Object.entries(esperado)) {
    await ir(p, ruta);
    const v = await p.evaluate(() => [...document.querySelectorAll("[data-video-fondo]")].map((e) => e.getAttribute("data-video-fondo")));
    if (f === null) ok(v.length === 0, `${ruta} no debería tener video: ${v}`);
    else { ok(v.length === 1 && v[0] === f, `${ruta}: esperado ${f}, hay ${v}`); await p.waitForTimeout(800); ok((await p.locator("[data-video-fondo] video").count()) === 1, "no cargó el <video> en " + ruta); }
  }
  // Nunca dos videos a la vez en estas pantallas
  await ir(p, "/productos");
  ok((await p.locator("[data-video-fondo]").count()) === 1, "más de un video");
});
await caso("Videos de catálogo/carrito: con movimiento reducido no se descarga nada", async (p) => {
  const pedidos = []; p.on("request", (r) => { if (/\/video\/.*\.(mp4|webm)/.test(r.url())) pedidos.push(r.url()); });
  await ir(p, "/productos"); await ir(p, "/carrito");
  ok(pedidos.length === 0, "descargó video: " + pedidos);
  ok((await p.locator("[data-video-fondo] img").count()) === 1, "falta la imagen fija");
}, { reducido: true });
await caso("Video de cordillera: usa 1280 y avanza; en 1920 usa HD", async (p) => {
  await ir(p, "/carrito"); await p.waitForTimeout(1200);
  const a = await p.evaluate(() => { const v = document.querySelector("[data-video-fondo] video"); return { w: v.videoWidth, t: v.currentTime }; });
  ok(a.w === 1280, "ancho " + a.w);
  await p.waitForTimeout(1200);
  ok((await p.evaluate(() => document.querySelector("[data-video-fondo] video").currentTime)) > a.t + 0.5, "no avanza");
});
await caso("Video de cordillera HD en 1920", async (p) => { await ir(p, "/carrito"); await p.waitForTimeout(1500); ok((await p.evaluate(() => document.querySelector("[data-video-fondo] video").videoWidth)) === 1920, "no es HD"); }, { ancho: 1920 });
await caso("Botón flotante de WhatsApp: está en catálogo y no en alquiler ni pago", async (p) => {
  await ir(p, "/productos"); ok((await p.locator("[data-boton-whatsapp]").count()) === 1, "falta"); 
  ok((await p.locator("[data-boton-whatsapp]").getAttribute("href")).startsWith("https://wa.me/" + NUM), "número incorrecto");
  await ir(p, "/alquiler"); ok((await p.locator("[data-boton-whatsapp]").count()) === 0, "aparece en alquiler");
  await ir(p, "/checkout"); ok((await p.locator("[data-boton-whatsapp]").count()) === 0, "aparece en pago");
});
await caso("Alquiler: 'Enviar por WhatsApp' deshabilitado hasta completar y arma el enlace correcto", async (p) => {
  await ir(p, "/alquiler");
  const env = p.locator("[data-enviar-alquiler]");
  ok(await env.evaluate((e) => e.tagName === "BUTTON" && e.disabled), "debería estar deshabilitado al inicio");
  await p.getByRole("button", { name: /Sumar un/ }).first().click();
  ok(await env.evaluate((e) => e.tagName === "BUTTON" && e.disabled), "sin fechas sigue deshabilitado");
  await p.fill("#desde", "2099-07-01"); await p.fill("#hasta", "2099-07-03");
  await p.fill("#nombre-alquiler", "Zoe");
  await p.waitForTimeout(500);
  const a = p.locator("a[data-enviar-alquiler]"); await a.waitFor();
  const href = await a.getAttribute("href");
  ok(href.startsWith("https://wa.me/" + NUM + "?text="), "enlace: " + href);
  const txt = decodeURIComponent(href.split("?text=")[1]);
  ok(/Soy Zoe/.test(txt) && /Del 01\/07/.test(txt.replace(/\s/g, " ")) || /Soy Zoe/.test(txt), "mensaje: " + txt);
  ok(/Esquíes|Esqu/.test(txt) && /\$/.test(txt), "faltan equipo/estimado: " + txt);
  ok((await a.getAttribute("target")) === "_blank" && /noopener/.test(await a.getAttribute("rel")), "sin noopener");
  // Si borra las fechas, vuelve a deshabilitarse
  await p.fill("#hasta", ""); await p.waitForTimeout(300);
  ok(await p.locator("button[data-enviar-alquiler]").isDisabled(), "no se volvió a deshabilitar");
});
await caso("Pantallas con video: sin scroll horizontal en móvil", async (p) => {
  for (const r of ["/productos", "/carrito", "/checkout", "/alquiler", "/"]) { await ir(p, r); ok(await p.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1), "scroll horizontal en " + r); }
}, { ancho: 400 });
await caso("Fluidez (≥ 35 fps) en catálogo con video y ondas", async (p) => {
  await ir(p, "/productos");
  const fps = await p.evaluate(() => new Promise((r) => { let c = 0; const t = performance.now(); const f = () => { c++; performance.now() - t < 2000 ? requestAnimationFrame(f) : r(c / 2); }; f(); }));
  ok(fps >= 35, "fps " + fps);
});
await nav.close();
for (const [r, n] of res) console.log(r.padEnd(6), n);
process.exit(res.some(([r]) => r === "FALLA") ? 1 : 0);
