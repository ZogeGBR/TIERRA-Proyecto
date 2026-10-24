// El frontend frente a un backend como `develop` (Fase 1): rutas nuevas ausentes (401 por denyAll)
// y catálogo como lista simple. Requiere backend falso en :8080 y la app en :3000 (ver e2e.mjs).
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE ?? "playwright");
const WEB = process.env.WEB ?? "http://localhost:3000", API = process.env.API ?? "http://localhost:8080/api";
const H = { "X-XSRF-TOKEN": "x", Cookie: "XSRF-TOKEN=x", "content-type": "application/json" };
const post = (r, b = {}) => fetch(`${API}${r}`, { method: "POST", headers: H, body: JSON.stringify(b) });
const nav = await chromium.launch({ executablePath: process.env.CHROMIUM ?? "/opt/pw-browsers/chromium-1194/chrome-linux/chrome", args: ["--no-sandbox"] });
let ok = 0, mal = 0;
const t = (c, n) => { c ? ok++ : mal++; console.log(c ? "OK  " : "FALLA", n); };
await post("/__test/reset"); await post("/__test/opciones", { modoDevelop: true });
const pag = await nav.newPage(); const errs = [];
pag.on("pageerror", (e) => errs.push(e.message));
for (const ruta of ["/", "/productos", "/productos?categoriaId=x", "/alquiler", "/checkout", "/carrito"]) {
  const r = await pag.goto(WEB + ruta, { waitUntil: "networkidle" });
  const txt = await pag.locator("body").innerText();
  t(r.status() < 500, `${ruta} no da 5xx (${r.status()})`);
  t(!/sesión venció|Application error|Unhandled/i.test(txt), `${ruta} sin mensajes engañosos`);
}
t(errs.length === 0, "sin errores de JavaScript: " + errs.join("|"));
await post("/__test/opciones", { modoDevelop: false });
await nav.close(); console.log(`${ok} ok, ${mal} mal`); process.exit(mal ? 1 : 0);
