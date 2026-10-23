// Adónde mandar a la persona después de entrar, a partir del ?redirect= de
// la URL.
//
// Sólo se aceptan rutas internas. Sin esta validación, un enlace como
// /login?redirect=https://sitio-falso.com llevaría a la persona a una página
// de phishing justo después de un login legítimo, que es el momento en el que
// menos sospecharía. "//sitio-falso.com" también es una URL externa para el
// navegador, aunque empiece con barra.
export function destinoSeguro(valor: string | null): string {
  if (!valor) return "/";
  if (!valor.startsWith("/") || valor.startsWith("//")) return "/";
  return valor;
}
