// Datos de contacto reales de Tierra (los dio el cliente). Un solo lugar: el
// footer, el botón flotante y el alquiler leen de acá.
export const WHATSAPP_NUMERO = "5492945699751"; // +54 9 2945 699751
export const WHATSAPP_VISIBLE = "+54 9 2945 699751";
export const MAIL = "tierra.esquel@gmail.com";
export const INSTAGRAM_USUARIO = "tierra.esquel";
// Tierra no tiene Facebook: no se enlaza.

export const URL_MAIL = `mailto:${MAIL}`;
export const URL_INSTAGRAM = `https://www.instagram.com/${INSTAGRAM_USUARIO}/`;
export const urlWhatsapp = (texto?: string) => `https://wa.me/${WHATSAPP_NUMERO}${texto ? `?text=${encodeURIComponent(texto)}` : ""}`;
