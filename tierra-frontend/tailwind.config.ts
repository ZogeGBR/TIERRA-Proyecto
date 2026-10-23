import type { Config } from "tailwindcss";

// Paleta rediseñada — reemplaza por completo la anterior (bordó/crema
// fría/azul/naranja/teal). Colores extraídos directamente de la imagen
// de referencia (acuarela abstracta terracota + verde azulado), no
// inventados: terracota, terracota-oscuro, crema, crema-oscuro, verde,
// verde-claro. "ambar" se mantiene casi igual al naranja anterior porque
// ya aparecía tal cual en esa misma imagen.
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        tierra: {
          terracota: "#B8571F",
          "terracota-oscuro": "#6B3517",
          crema: "#F7ECDD",
          "crema-oscuro": "#EAD9BE",
          verde: "#2B5F4E",
          "verde-claro": "#8FB39D",
          ambar: "#E08A2B"
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
