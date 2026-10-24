import type { ReactNode } from "react";

type Tono = "exito" | "pendiente" | "error";

// Mapa con las clases completas (no "bg-tierra-" + variable): Tailwind
// necesita ver la clase literal para incluirla en el build.
const TONOS: Record<Tono, string> = {
  exito: "bg-tierra-verde/10 text-tierra-verde",
  pendiente: "bg-tierra-ambar/15 text-tierra-ambar",
  error: "bg-tierra-terracota/10 text-tierra-terracota"
};

// Cuerpo común de las tres páginas a las que vuelve Mercado Pago, para que
// se vean como una misma familia. Es solo presentación (sin hooks): sirve
// tanto desde Server Components como desde Client Components.
export function EstadoCompra({
  tono,
  icono,
  titulo,
  children,
  acciones
}: {
  tono: Tono;
  icono: ReactNode;
  titulo: string;
  children: ReactNode;
  acciones: ReactNode;
}) {
  return (
    <div className="max-w-xl mx-auto px-6 py-16 text-center">
      <div className={`w-20 h-20 mx-auto rounded-full flex items-center justify-center ${TONOS[tono]}`}>
        {icono}
      </div>
      <h1 className="mt-6 font-serif text-3xl font-semibold text-tierra-terracota-oscuro">{titulo}</h1>
      <div className="mt-3 space-y-2 text-tierra-terracota-oscuro/80">{children}</div>
      <div className="mt-8 flex flex-wrap justify-center gap-3">{acciones}</div>
    </div>
  );
}
