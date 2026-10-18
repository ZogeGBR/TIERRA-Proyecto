import type { TipoEntrega } from "./types";
import { codigoPostalValido, estadoDeCobertura } from "./cobertura";

export interface DatosCheckout {
  nombre: string;
  email: string;
  telefono: string;
  dni: string;
  calle: string;
  numero: string;
  ciudad: string;
  provincia: string;
  codigoPostal: string;
}

export type ErroresCheckout = Partial<Record<keyof DatosCheckout, string>>;

export const DATOS_VACIOS: DatosCheckout = {
  nombre: "",
  email: "",
  telefono: "",
  dni: "",
  calle: "",
  numero: "",
  ciudad: "",
  provincia: "",
  codigoPostal: ""
};

// "12.345.678", "12 345 678" y "12345678" son el mismo DNI.
export function soloDigitos(valor: string): string {
  return valor.replace(/\D/g, "");
}

// Validación liviana del lado del navegador, para avisar rápido y en el campo
// correcto. La que vale es la del backend: acá nunca se rechaza algo "por las
// dudas" que el backend aceptaría (por eso los rangos son amplios).
export function validarContacto(d: DatosCheckout, emailFijo = false): ErroresCheckout {
  const e: ErroresCheckout = {};
  if (d.nombre.trim().length < 2) e.nombre = "Escribí tu nombre completo.";
  if (!emailFijo && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email.trim())) e.email = "Escribí un email válido.";
  const digitosTel = soloDigitos(d.telefono).length;
  if (digitosTel < 8 || digitosTel > 15) e.telefono = "Escribí un teléfono de contacto, con código de área.";
  return e;
}

export function validarEntrega(d: DatosCheckout, tipoEntrega: TipoEntrega): ErroresCheckout {
  // El retiro en el local no pide DNI ni dirección.
  if (tipoEntrega === "RETIRO_LOCAL") return {};
  const e: ErroresCheckout = {};
  const digitosDni = soloDigitos(d.dni).length;
  if (digitosDni < 7 || digitosDni > 8) e.dni = "El DNI tiene 7 u 8 números.";
  if (d.calle.trim() === "") e.calle = "Escribí la calle.";
  if (d.ciudad.trim() === "") e.ciudad = "Escribí la ciudad.";
  if (d.provincia.trim() === "") e.provincia = "Elegí la provincia.";
  else if (estadoDeCobertura(d.provincia) === "fuera") e.provincia = "Todavía no enviamos a esa provincia: podés retirar en el local.";
  if (!codigoPostalValido(d.codigoPostal)) e.codigoPostal = "El código postal tiene 4 números.";
  return e;
}

export function hayErrores(e: ErroresCheckout): boolean {
  return Object.keys(e).length > 0;
}
