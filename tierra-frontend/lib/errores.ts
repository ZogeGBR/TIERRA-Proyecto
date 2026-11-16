import { ApiError } from "./api";

// Convierte cualquier cosa que haya lanzado una llamada a la API en el texto
// que ve la persona, distinguiendo por CÓDIGO HTTP (no por el texto del
// mensaje: se rompe en silencio el día que alguien lo reescribe).
//
// El backend ya redacta sus mensajes pensando en el usuario final, así que en
// los casos "de negocio" (400, 404, 409, 5xx) se muestra el suyo. Los dos
// casos donde el mensaje técnico no ayuda tienen texto propio: 401 (se perdió
// la sesión) y 403 (no corresponde).
export function textoDeError(e: unknown, porDefecto: string): string {
  if (!(e instanceof ApiError)) {
    return e instanceof Error && e.message ? e.message : porDefecto;
  }
  switch (e.status) {
    case 0:
      return e.message; // "No pudimos conectar con el servidor..."
    case 401:
      return "Tu sesión venció. Volvé a entrar para seguir.";
    case 403:
      return "No tenés permiso para hacer esto.";
    case 423:
      return e.message || "La cuenta está bloqueada por intentos fallidos. Probá más tarde.";
    case 501:
      return e.message;
    case 429:
      return "Hiciste muchos intentos seguidos. Esperá unos minutos y probá de nuevo.";
    default:
      return e.message || porDefecto;
  }
}

// ¿No hubo respuesta del servidor (red caída, backend apagado)?
export function esErrorDeRed(e: unknown): boolean {
  return e instanceof ApiError && e.status === 0;
}

// ¿Es un problema del servidor (5xx)? Distinto de "algo que la persona hizo
// mal": no tiene sentido pedirle que revise lo que escribió.
export function esErrorDelServidor(e: unknown): boolean {
  return e instanceof ApiError && e.status >= 500;
}

// Texto que se muestra cuando el email que se escribió en el checkout no se
// puede usar (es del equipo): el backend responde 409 con el motivo.
export function esEmailNoUsable(e: unknown): boolean {
  return e instanceof ApiError && e.status === 409 && e.codigo === "EMAIL_DEL_EQUIPO";
}
