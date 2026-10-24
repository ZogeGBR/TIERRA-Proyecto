// Sólo se aceptan rutas internas. Sin esta validación, un enlace como
// /login?redirect=https://sitio-falso.com llevaría a la persona a una página
// de phishing justo después de un ingreso legítimo, que es el momento en el
// que menos sospecharía.
//
// También se rechazan "/\\sitio" y las rutas con saltos de línea: algunos
// navegadores tratan "\" como "/" y convertirían "/\\evil.com" en
// "//evil.com".
export function destinoSeguro(valor: string | null | undefined, porDefecto = "/"): string {
  if (!valor) return porDefecto;
  if (!valor.startsWith("/") || valor.startsWith("//")) return porDefecto;
  if (valor.includes("\\") || /[\r\n\t]/.test(valor)) return porDefecto;
  // Las propias pantallas de acceso tampoco son un destino válido: volver a
  // /login después de entrar dejaría a la persona en un bucle.
  if (/^\/(login|equipo)(?:[/?#]|$)/.test(valor)) return porDefecto;
  return valor;
}
