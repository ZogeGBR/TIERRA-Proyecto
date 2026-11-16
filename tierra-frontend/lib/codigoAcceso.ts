// Lógica pura del ingreso por código de 6 dígitos (auditoría Fase 2, 3.2).
// Está acá, y no dentro del componente, para poder probarla sin navegador.

export const LARGO_CODIGO = 6;

// Texto fijo al pedir el código. Es SIEMPRE el mismo, exista o no el email:
// si la pantalla dijera otra cosa en algún caso, serviría para averiguar qué
// emails son clientes.
export const MENSAJE_CODIGO_ENVIADO =
  "Si ese email tiene compras en Tierra, te enviamos un código. Puede tardar unos minutos: revisá también la carpeta de spam.";

// Texto fijo de cualquier fallo al verificar (código malo, vencido, agotado,
// cuenta bloqueada...). Mismo motivo.
export const MENSAJE_CODIGO_INCORRECTO = "El código es incorrecto o venció. Pedí uno nuevo.";

// Segundos que el botón "Reenviar código" queda deshabilitado.
export const ESPERA_REENVIO_SEG = 60;

// Deja solo dígitos y corta en 6. Sirve para lo que escribe la persona y para
// lo que pega el celular ("123 456", "Tu código es 123456").
export function normalizarCodigo(crudo: string): string {
  return crudo.replace(/\D/g, "").slice(0, LARGO_CODIGO);
}

export function codigoCompleto(codigo: string): boolean {
  return new RegExp(`^\\d{${LARGO_CODIGO}}$`).test(codigo);
}

// Segundos que faltan para poder reenviar (0 = ya se puede). `desde` y
// `ahora` en milisegundos.
export function segundosParaReenviar(desde: number, ahora: number, espera = ESPERA_REENVIO_SEG): number {
  const falta = Math.ceil((desde + espera * 1000 - ahora) / 1000);
  return Math.max(0, falta);
}

export function emailValido(valor: string): boolean {
  // Chequeo deliberadamente liviano: el navegador ya valida type="email" y el
  // backend es quien decide. Esto solo evita mandar "a" o "".
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(valor.trim());
}
