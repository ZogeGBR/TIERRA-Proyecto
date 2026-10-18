# Tierra — frontend

Next.js 14.2.35 (App Router) + TypeScript + Tailwind, consumiendo la API de `tierra-backend`.

## Cómo levantarlo

1. `npm install`
2. `cp .env.local.example .env.local` y completar `NEXT_PUBLIC_API_URL` (y, si querés, `NEXT_PUBLIC_WHATSAPP_ALQUILER`).
3. `npm run dev`

## Cómo funciona el acceso (Fase 2)

- **Comprar no requiere cuenta ni código.** El checkout manda nombre, email, teléfono (y DNI + dirección solo con envío a domicilio) en el propio pedido. Comprar nunca abre sesión.
- **"Mis pedidos" y "guardar mis datos"** sí requieren sesión de cliente: se entra en `/login` con un código de 6 dígitos que llega por email.
- **El equipo** entra por `/equipo` (email + contraseña). No hay registro público.
- El carrito vive en el navegador (`localStorage`); cerrar sesión no lo borra.
- Contrato de endpoints que asume el frontend: `contrato-fase2-frontend.md`.

## Pruebas

| Comando | Qué hace |
|---|---|
| `npm test` | Pruebas de la lógica pura (validaciones, cobertura, pago pendiente, alquiler…). |
| `npm run test:mutaciones` | Rompe a propósito cada regla y comprueba que las pruebas lo detecten. |
| `npm run backend-falso` | Backend de mentira en `:8080` que cumple el contrato de la Fase 2 (para desarrollar sin el real). |
| `node dev/e2e.mjs` | E2E en Chromium contra el backend falso (necesita `playwright`; ver cabecera del archivo). |
| `node dev/e2e-develop.mjs` | Frontend contra un backend que se comporta como `develop` (rutas nuevas ausentes, catálogo lista simple). |
| `node dev/e2e-home.mjs` | Home: video de ondas, sombreado del borde, tarjeta del hero quieta y carrusel de más vendidos / más buscados. |

Para probar contra el backend falso: `NEXT_PUBLIC_CATALOGO_DE_PRUEBA=0 NEXT_PUBLIC_API_URL=http://localhost:8080/api npm run build && npm start`.
Sin internet para Google Fonts: `NEXT_FONT_GOOGLE_MOCKED_RESPONSES=$PWD/dev/fuentes-falsas.js npm run build` (solo para pruebas).

## Pendientes conocidos

- Cuando el backend implemente los endpoints de `contrato-fase2-frontend.md`, probar contra él y borrar `dev/backend-falso.mjs` si ya no hace falta.
- Rutas con slug (tarea 8): `lib/rutas.ts` ya lo soporta; hoy devuelve el id hasta que el backend mande `slug`.
- Catálogo de prueba (`lib/catalogoDePrueba.ts`): se apaga con `NEXT_PUBLIC_CATALOGO_DE_PRUEBA=0` y nunca está activo en producción por defecto.
- Animaciones: `app/template.tsx` (fundido por pantalla), `.grilla-anim` (escalonado), `components/Nieve.tsx` + `.tema-invierno` (alquiler). Pruebas: `node dev/e2e-animaciones.mjs`.
- Temas por ruta: `app/template.tsx` marca `data-ruta-tema` (invierno / tierra) y `globals.css` lo lee con `body:has(...)` (header, footer, fondo).
- Contacto real en `lib/contacto.ts` (WhatsApp +54 9 2945 699751, tierra.esquel@gmail.com, instagram.com/tierra.esquel; sin Facebook). Videos de fondo por ruta en `app/template.tsx` (`VideoFondo`). Banda "Somos Tierra" y footer: solo el dibujo de la cordillera (sin ondas ni video). Pruebas: `node dev/e2e-contacto.mjs`.
