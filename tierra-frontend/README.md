# Tierra — frontend

Next.js 14 (App Router) + TypeScript + Tailwind, consumiendo la API de `tierra-backend`.

## Cómo levantarlo

1. `npm install`
2. `cp .env.local.example .env.local` y completar `NEXT_PUBLIC_API_URL` con la URL del backend.
3. `npm run dev`

## Pendientes conocidos (marcados en el código con comentarios)

- **Usuario y dirección en el checkout**: `CrearPedidoRequest` hoy pide un `usuarioId` y
  `direccionEnvioId` que ya existan en la base. Falta un flujo de registro/login (o
  checkout como invitado con creación exprés de usuario+dirección) antes de conectar
  el checkout a un usuario real — está marcado en `app/checkout/page.tsx`.
- **Tipos de equipo de alquiler hardcodeados** en `app/alquiler/page.tsx` — reemplazar
  por un `GET /api/tipos-equipo-alquiler` cuando se agregue ese endpoint al backend.
- **Categorías hardcodeadas** en la home — mismo caso, falta `GET /api/categorias`.
- El carrito vive en `localStorage` (`context/CartContext.tsx`) porque todavía no hay
  sesión de usuario. Cuando haya login, conviene sincronizarlo con el backend.
