import type { InputHTMLAttributes, ReactNode } from "react";

// Campo de formulario con etiqueta visible, mensaje de error ligado al input
// (aria-describedby / aria-invalid) y tamaño de letra de 16px: por debajo de
// eso, Safari en iPhone hace zoom automático al enfocar el campo.
export function Campo({
  id,
  etiqueta,
  error,
  ayuda,
  className = "",
  ...input
}: {
  id: string;
  etiqueta: string;
  error?: string;
  ayuda?: ReactNode;
} & Omit<InputHTMLAttributes<HTMLInputElement>, "id" | "className"> & { className?: string }) {
  const idError = `${id}-error`;
  const idAyuda = `${id}-ayuda`;
  return (
    <div className={className}>
      <label htmlFor={id} className="block text-sm font-medium text-tierra-terracota-oscuro mb-1">
        {etiqueta}
      </label>
      <input
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={[error ? idError : "", ayuda ? idAyuda : ""].filter(Boolean).join(" ") || undefined}
        className={`w-full text-base border rounded-lg px-3 py-2.5 bg-white transition-[border-color,box-shadow] read-only:bg-tierra-crema read-only:text-tierra-terracota-oscuro/70
          focus:outline-none focus:ring-2 ${
            error
              ? "border-red-500 focus:ring-red-300"
              : "border-tierra-crema-oscuro focus:border-tierra-verde focus:ring-tierra-verde/30"
          }`}
        {...input}
      />
      {ayuda && (
        <p id={idAyuda} className="mt-1 text-xs text-tierra-terracota-oscuro/60">
          {ayuda}
        </p>
      )}
      {error && (
        <p id={idError} className="mt-1 text-sm text-red-600 anim-aviso">
          {error}
        </p>
      )}
    </div>
  );
}
