// Ilustraciones vectoriales propias con los colores de la marca. Reemplazan
// a las fotos de stock genéricas (que no tenían relación con el rubro) hasta
// que Tierra tenga fotografía real de producto y del local.
// currentColor toma el color de texto del contenedor que las envuelve.

export function BikeIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 300 300" className={className} fill="none" stroke="currentColor" strokeWidth="10" strokeLinecap="round">
      <circle cx="80" cy="200" r="55" />
      <circle cx="220" cy="200" r="55" />
      <path d="M80 200 L150 100 L220 200 M150 100 L120 200 M150 100 L190 70 M170 70 L215 70" />
      <path d="M190 70 L150 100" />
    </svg>
  );
}

export function JacketIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 300 300" className={className} fill="none" stroke="currentColor" strokeWidth="10" strokeLinejoin="round" strokeLinecap="round">
      <path d="M120 60 Q150 40 180 60 L180 80 L230 110 L215 170 L180 150 L180 250 L120 250 L120 150 L85 170 L70 110 L120 80 Z" />
      <path d="M150 60 L150 100" />
    </svg>
  );
}

export function TentIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 300 300" className={className} fill="none" stroke="currentColor" strokeWidth="10" strokeLinejoin="round" strokeLinecap="round">
      <path d="M150 70 L250 230 L50 230 Z" />
      <path d="M150 70 L150 230" />
      <path d="M135 230 L150 160 L165 230" />
      <path d="M40 235 L260 235" />
    </svg>
  );
}

export function BackpackIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 300 300" className={className} fill="none" stroke="currentColor" strokeWidth="10" strokeLinejoin="round" strokeLinecap="round">
      <rect x="90" y="110" width="120" height="140" rx="24" />
      <path d="M105 110 Q105 60 150 60 Q195 60 195 110" />
      <rect x="115" y="70" width="70" height="55" rx="14" />
      <path d="M120 160 L180 160" />
      <path d="M120 190 L180 190" />
    </svg>
  );
}

export function ShoeIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 300 300" className={className} fill="none" stroke="currentColor" strokeWidth="10" strokeLinejoin="round" strokeLinecap="round">
      <path d="M50 200 Q50 160 90 155 L140 150 Q160 110 200 115 Q230 118 245 150 Q260 175 250 200 Z" />
      <path d="M50 200 L250 200 L250 220 Q250 230 240 230 L60 230 Q50 230 50 220 Z" />
      <path d="M100 155 L110 190 M140 150 L145 190 M180 145 L185 190" />
    </svg>
  );
}

export function MountainIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 300 300" className={className} fill="none" stroke="currentColor" strokeWidth="10" strokeLinejoin="round" strokeLinecap="round">
      <circle cx="230" cy="70" r="28" fill="currentColor" stroke="none" />
      <path d="M20 250 L110 110 L155 170 L190 120 L280 250 Z" />
    </svg>
  );
}
