import type { Config } from "tailwindcss";

// Colores del boceto, con el fondo llevado a un tono más cálido (más
// tostado/tierra) que el crema frío que tenía antes.
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        tierra: {
          bordo: "#5C2A32",
          "bordo-oscuro": "#431E24",
          crema: "#F5E7D0",
          "crema-oscuro": "#E9D3AC",
          azul: "#2D6CA6",
          naranja: "#E08A2B",
          teal: "#1E7F72"
        }
      },
      fontFamily: {
        serif: ["var(--font-fraunces)", "Georgia", "serif"],
        sans: ["var(--font-work-sans)", "system-ui", "sans-serif"]
      }
    }
  },
  plugins: []
};

export default config;
