import { Inclinar } from "@/components/Inclinar";
import Link from "next/link";

interface CategoryCardProps {
  nombre: string;
  categoriaId: string;
  // La imagen ya trae el ícono, el nombre y el botón "Ver más" incluidos. Una
  // categoría sin imagen propia se dibuja con su nombre en texto: usar la foto
  // de otra mostraría un nombre que no es el suyo.
  imagen?: string;
  colorAcento?: "terracota" | "verde" | "ambar";
}

// Mapas completos (no interpolación de string) porque Tailwind necesita
// ver la clase literal para incluirla en el build -- "ring-tierra-" +
// variable no funciona.
const BARRA: Record<string, string> = {
  terracota: "bg-tierra-terracota",
  verde: "bg-tierra-verde",
  ambar: "bg-tierra-ambar"
};
const FONDO_SIN_IMAGEN: Record<string, string> = {
  terracota: "from-tierra-terracota/85 to-tierra-terracota-oscuro",
  verde: "from-tierra-verde/80 to-tierra-terracota-oscuro",
  ambar: "from-tierra-ambar/85 to-tierra-terracota-oscuro"
};
const ANILLO_HOVER: Record<string, string> = {
  terracota: "hover:ring-tierra-terracota",
  verde: "hover:ring-tierra-verde",
  ambar: "hover:ring-tierra-ambar"
};

export function CategoryCard({ nombre, categoriaId, imagen, colorAcento = "terracota" }: CategoryCardProps) {
  return (
    <Inclinar className="h-full">
    <Link
      href={`/productos?categoriaId=${categoriaId}`}
      className={`group flex flex-col rounded-lg overflow-hidden aspect-[4/5] shadow-sm ring-2 ring-transparent
                  transition-all duration-200 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-tierra-verde
                  focus:ring-offset-2 ${ANILLO_HOVER[colorAcento]}`}
    >
      {/* Barrita de color arriba — variedad sin taparle nada a la imagen,
          que ya trae su propio texto/botón "quemados" adentro. */}
      <div className={`h-1.5 shrink-0 ${BARRA[colorAcento]}`} />
      {imagen ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={imagen}
          alt={nombre}
          className="flex-1 min-h-0 w-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
      ) : (
        <div
          className={`flex-1 min-h-0 w-full flex flex-col items-center justify-end gap-3 pb-5 bg-gradient-to-b
                      ${FONDO_SIN_IMAGEN[colorAcento]} transition-transform duration-300 group-hover:scale-105`}
        >
          <span className="font-serif text-2xl text-white drop-shadow">{nombre}</span>
          <span className="rounded-full bg-white px-4 py-1 text-sm text-tierra-terracota-oscuro">Ver más</span>
        </div>
      )}
    </Link>
    </Inclinar>
  );
}
