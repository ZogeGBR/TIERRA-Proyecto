/** @type {import('next').NextConfig} */
const nextConfig = {
  // Sin remotePatterns a propósito. El sitio no usa next/image (todas las
  // imágenes van con <img>), y un comodín "**" convertía el optimizador de
  // imágenes en un proxy abierto: cualquiera podía pedirle al servidor que
  // descargara y procesara imágenes de cualquier dominio. Cuando las fotos de
  // producto vivan en un storage (Fase 3), se agrega acá SOLO ese dominio.
};

export default nextConfig;
