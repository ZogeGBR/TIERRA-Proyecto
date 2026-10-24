// Solo para compilar SIN internet (sandbox/CI sin acceso a Google Fonts):
//   NEXT_FONT_GOOGLE_MOCKED_RESPONSES=$PWD/dev/fuentes-falsas.js npm run build
// Devuelve CSS sin archivos de fuente reales; no se usa en producción.
const css = (fam, pesos) => pesos.map((w) => `/* latin */\n@font-face {\n  font-family: '${fam}';\n  font-style: normal;\n  font-weight: ${w};\n  font-display: swap;\n  src: url(https://fonts.gstatic.com/s/falsa/${fam.replace(/ /g, "")}${w}.woff2) format('woff2');\n  unicode-range: U+0000-00FF;\n}`).join("\n");
module.exports = {
  "https://fonts.googleapis.com/css2?family=Fraunces:wght@500;600;700&display=swap": css("Fraunces", [500, 600, 700]),
  "https://fonts.googleapis.com/css2?family=Work+Sans:wght@400;500;600&display=swap": css("Work Sans", [400, 500, 600]),
};
