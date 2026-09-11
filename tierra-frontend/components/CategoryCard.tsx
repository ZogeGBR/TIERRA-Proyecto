import Link from "next/link";

interface CategoryCardProps {
  nombre: string;
  categoriaId: string;
  imagen: string; // La imagen ya trae el ícono, el nombre y el botón "Ver más" incluidos.
}

export function CategoryCard({ nombre, categoriaId, imagen }: CategoryCardProps) {
  return (
    <Link
      href={`/productos?categoriaId=${categoriaId}`}
      className="block rounded-lg overflow-hidden aspect-[4/5] hover:opacity-90 transition-opacity"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={imagen} alt={nombre} className="w-full h-full object-cover" />
    </Link>
  );
}
