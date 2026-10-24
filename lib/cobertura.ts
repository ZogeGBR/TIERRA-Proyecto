// Zona de envío a domicilio y datos mínimos de la dirección.
//
// ATENCIÓN: la lista real de provincias con cobertura la decide el BACKEND
// (configuración, tarea 10) y su endpoint de cotización responde "fuera de
// cobertura" para el resto. Esta lista del frontend existe solo para ofrecer
// el retiro en el local apenas la persona elige la provincia, sin esperar a
// apretar "Comprar" (lo pide la auditoría, tarea 12). Si el backend cambia la
// zona, se actualiza acá también -- o, mejor, se pide por endpoint.
export const PROVINCIAS_CON_ENVIO = ["Neuquén", "Río Negro", "Chubut", "Santa Cruz"] as const;
export const OTRA_PROVINCIA = "Otra provincia";
export const OPCIONES_PROVINCIA: readonly string[] = [...PROVINCIAS_CON_ENVIO, OTRA_PROVINCIA];

function sinAcentos(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim()
    .toLowerCase();
}

export type EstadoCobertura = "sin_elegir" | "dentro" | "fuera";

// "Neuquen", "NEUQUÉN " y "neuquén" son la misma provincia.
export function estadoDeCobertura(provincia: string): EstadoCobertura {
  if (provincia.trim() === "") return "sin_elegir";
  const buscada = sinAcentos(provincia);
  return PROVINCIAS_CON_ENVIO.some((p) => sinAcentos(p) === buscada) ? "dentro" : "fuera";
}

// Código postal argentino "viejo": 4 dígitos. Es el que usa la cotización.
export function codigoPostalValido(cp: string): boolean {
  return /^\d{4}$/.test(cp.trim());
}
