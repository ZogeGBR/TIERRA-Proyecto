// ESLint 9, con el formato de configuración nuevo ("flat config"), que reemplaza
// a `next lint` (deprecado en Next 15.5 y eliminado en Next 16).
//
// Las reglas son las de `next/core-web-vitals`, como antes. La config de Next 15
// todavía viene en el formato viejo, así que se convierte con FlatCompat; con
// Next 16 se importa directo desde "eslint-config-next/core-web-vitals" y se
// borra FlatCompat.
//
// ESLint 9 es la última versión que soporta la config de Next (también en Next
// 16): eslint-plugin-react, que viene con ella, todavía no declara ESLint 10.
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { FlatCompat } from "@eslint/eslintrc";

const compat = new FlatCompat({ baseDirectory: dirname(fileURLToPath(import.meta.url)) });

const config = [
  // `next lint` revisaba solo app, components, lib, pages y src. `eslint .`
  // revisa todo el proyecto (también context, tests y los archivos de
  // configuración), salvo lo generado.
  { ignores: [".next/**", "out/**", "node_modules/**", "next-env.d.ts"] },
  ...compat.extends("next/core-web-vitals")
];

export default config;
