// Mutaciones: rompe a propósito una regla y exige que las pruebas fallen.
// Si una mutación "sobrevive" (las pruebas siguen pasando), esa regla no está protegida.
import fs from "node:fs";
import { spawnSync } from "node:child_process";
const M = [
  ["lib/destinoSeguro.ts", 'valor.startsWith("//")', "false"],
  ["lib/destinoSeguro.ts", 'valor.includes("\\\\") || ', ""],
  ["lib/destinoSeguro.ts", "login|equipo", "login"],
  ["lib/codigoAcceso.ts", "Math.ceil(", "Math.floor("],
  ["lib/codigoAcceso.ts", "slice(0, LARGO_CODIGO)", "slice(0, 8)"],
  ["lib/cobertura.ts", '"Santa Cruz"', '"Mendoza"'],
  ["lib/cobertura.ts", "\\d{4}", "\\d{3,5}"],
  ["lib/validacionCheckout.ts", "digitosDni < 7 || digitosDni > 8", "digitosDni < 5"],
  ["lib/validacionCheckout.ts", 'if (tipoEntrega === "RETIRO_LOCAL") return {};', ""],
  ["lib/validacionCheckout.ts", "digitosTel < 8", "digitosTel < 3"],
  ["lib/pedidoPendiente.ts", "ahora >= g.venceEn", "ahora > g.venceEn"],
  ["lib/pedidoPendiente.ts", "g.firma !== firma", "false"],
  ["lib/pedidoPendiente.ts", 'u.protocol !== "https:"', "false"],
  ["lib/pedidoPendiente.ts", 'host.endsWith("." + d)', 'host.endsWith(d)'],
  ["lib/pedidoPendiente.ts", ".sort()", ""],
  ["lib/iniciarPago.ts", "if (guardado) return", "if (false) return"],
  ["lib/alquiler.ts", ") + 1;", ");"],
  ["lib/alquiler.ts", "Math.max(0, Math.floor(l.cantidad))", "l.cantidad"],
  ["lib/alquiler.ts", "digitos.length < 10", "digitos.length < 1"],
  ["lib/pedidos.ts", 'estado.toUpperCase() === "PENDIENTE"', 'estado === "PENDIENTE"'],
  ["lib/errores.ts", 'e.codigo === "EMAIL_DEL_EQUIPO"', "true"],
  ["lib/errores.ts", "e.status >= 500", "e.status >= 400"],
  ["lib/rankings.ts", "vistos.has(x.id)", "false"],
  ["lib/rankings.ts", "salida.length >= LIMITE_RANKING", "false"],
  ["lib/rankings.ts", "Number.isFinite(p.precio)", "true"],
  ["lib/rankings.ts", "if (!Array.isArray(respuesta)) return [];", ""],
  ["lib/rankings.ts", "listas[p.tipo].length > 0", "true"],
];
let sobreviven = 0;
for (const [archivo, de, a] of M) {
  const original = fs.readFileSync(archivo, "utf8");
  if (!original.includes(de)) { console.log("NO ENCONTRADA   ", archivo, JSON.stringify(de)); sobreviven++; continue; }
  fs.writeFileSync(archivo, original.replace(de, a));
  const r = spawnSync("node", ["--import", "tsx", "--test", "tests/unitarias.test.ts"], { encoding: "utf8" });
  fs.writeFileSync(archivo, original);
  const mato = r.status !== 0;
  if (!mato) sobreviven++;
  console.log(mato ? "detectada       " : "SOBREVIVE       ", archivo, JSON.stringify(de));
}
console.log(`\n${M.length - sobreviven}/${M.length} mutaciones detectadas`);
process.exit(sobreviven ? 1 : 0);
