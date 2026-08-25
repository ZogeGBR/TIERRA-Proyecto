import type { Config } from "tailwindcss";

// Colores tomados del boceto: header y acentos en bordó, fondo crudo/crema,
// botón primario azul, botón de compra en naranja.
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        tierra: {
          bordo: "#5C2A32",
          "bordo-oscuro": "#431E24",
          crema: "#F7F1E3",
          "crema-oscuro": "#EFE7D3",
          azul: "#2D6CA6",
          naranja: "#E08A2B",
          teal: "#1E7F72"
        }
      }
    }
  },
  plugins: []
};

export default config;
