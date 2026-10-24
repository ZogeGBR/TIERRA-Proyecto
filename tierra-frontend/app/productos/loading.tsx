// Esqueleto que se ve mientras llega el catálogo la primera vez (al entrar
// desde otra página). Cuando se cambia un filtro, Next conserva la pantalla
// anterior en vez de mostrar esto: por eso el panel atenúa la grilla mientras
// carga (ver CatalogoLayout).
export default function CargandoCatalogo() {
  return (
    <div className="mx-auto max-w-6xl px-6 py-10" aria-busy="true" aria-label="Cargando el catálogo">
      <div className="mb-6 h-8 w-40 skeleton rounded-lg bg-tierra-crema-oscuro" />
      <div className="grid gap-8 md:grid-cols-[16rem_1fr]">
        <div className="hidden h-96 skeleton rounded-2xl bg-white/60 md:block" />
        <div className="grid grid-cols-2 gap-5 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="aspect-[3/4] skeleton rounded-xl bg-white/60" />
          ))}
        </div>
      </div>
    </div>
  );
}
