import Link from "next/link";

interface CategoryCardProps {
  nombre: string;
  categoriaId: string;
  imagen: string; // La imagen ya trae el ícono, el nombre y el botón "Ver más" incluidos.
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
const ANILLO_HOVER: Record<string, string> = {
  terracota: "hover:ring-tierra-terracota",
  verde: "hover:ring-tierra-verde",
  ambar: "hover:ring-tierra-ambar"
};

export function CategoryCard({ nombre, categoriaId, imagen, colorAcento = "terracota" }: CategoryCardProps) {
  return (
    <Link
      href={`/productos?categoriaId=${categoriaId}`}
      className={`group flex flex-col rounded-lg overflow-hidden aspect-[4/5] shadow-sm ring-2 ring-transparent
                  transition-all duration-200 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-tierra-verde
                  focus:ring-offset-2 ${ANILLO_HOVER[colorAcento]}`}
    >
      {/* Barrita de color arriba — variedad sin taparle nada a la imagen,
          que ya trae su propio texto/botón "quemados" adentro. */}
      <div className={`h-1.5 shrink-0 ${BARRA[colorAcento]}`} />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={imagen}
        alt={nombre}
        className="flex-1 min-h-0 w-full object-cover transition-transform duration-300 group-hover:scale-105"
      />
    </Link>
  );
}
