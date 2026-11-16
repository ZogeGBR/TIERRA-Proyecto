// Ondas de colores en movimiento para fondos beige. Solo CSS: tres capas que se
// deslizan despacio a velocidades distintas (transform, sin repintar). Los
// colores salen de variables (--ola-1/2/3) para que cada tema las cambie.
export function Olas({ className = "" }: { className?: string }) {
  return (
    <div className={`olas ${className}`} aria-hidden="true" data-olas>
      <div className="ola ola-a" />
      <div className="ola ola-b" />
      <div className="ola ola-c" />
    </div>
  );
}
