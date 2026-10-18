// Dónde vive la página de cada producto.
//
// Hoy la ruta usa el id (UUID). La tarea 8 de la Fase 2 suma un `slug` legible
// ("campera-the-north-face-outdoor") y el backend deja funcionando las rutas
// por UUID durante toda la fase. Cuando el slug exista, este es el ÚNICO lugar
// que hay que tocar: las tarjetas, el carrito y el historial llaman acá.
export function rutaDeProducto(p: { id: string; slug?: string | null }): string {
  // Hasta que el backend sirva GET /productos/{slug}, el id es lo único que
  // seguro resuelve. Para activar el slug: devolver `p.slug ?? p.id`.
  return `/productos/${p.id}`;
}
