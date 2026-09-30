/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    // Reemplazar por el dominio real donde se sirvan las imágenes de producto
    // (bucket de storage, CDN, etc.) antes de ir a producción.
    remotePatterns: [{ protocol: "https", hostname: "**" }]
  }
};

export default nextConfig;
