"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import type { EquipoDisponible } from "@/lib/types";

// tipoId hardcodeado por ahora — cuando exista un endpoint GET /api/tipos-equipo-alquiler
// (a agregar en el backend) esto se reemplaza por un <select> cargado dinámicamente.
const TIPOS_EQUIPO = [
  { id: "REEMPLAZAR-TIPO-ESQUIS", nombre: "Esquís" },
  { id: "REEMPLAZAR-TIPO-SNOWBOARD", nombre: "Tabla de snowboard" },
  { id: "REEMPLAZAR-TIPO-BOTAS", nombre: "Botas de esquí" },
  { id: "REEMPLAZAR-TIPO-BASTONES", nombre: "Bastones" }
];

export default function AlquilerPage() {
  const [tipoId, setTipoId] = useState(TIPOS_EQUIPO[0].id);
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");
  const [resultados, setResultados] = useState<EquipoDisponible[] | null>(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function buscar() {
    if (!fechaInicio || !fechaFin) {
      setError("Elegí fecha de inicio y de fin.");
      return;
    }
    setCargando(true);
    setError(null);
    try {
      const disponibles = await api.alquiler.disponibilidad(tipoId, fechaInicio, fechaFin);
      setResultados(disponibles);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo consultar disponibilidad.");
    } finally {
      setCargando(false);
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-10">
      <h1 className="text-2xl font-medium text-tierra-bordo-oscuro mb-2">Alquiler de equipo de invierno</h1>
      <p className="text-tierra-bordo-oscuro/70 mb-6">Esquís, tablas de snowboard, botas y bastones por temporada.</p>

      <div className="bg-white border border-tierra-crema-oscuro rounded-lg p-6 flex flex-wrap gap-4 items-end">
        <div>
          <label className="block text-sm mb-1">Equipo</label>
          <select
            value={tipoId}
            onChange={(e) => setTipoId(e.target.value)}
            className="border border-tierra-crema-oscuro rounded px-3 py-2"
          >
            {TIPOS_EQUIPO.map((t) => (
              <option key={t.id} value={t.id}>
                {t.nombre}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm mb-1">Desde</label>
          <input
            type="date"
            value={fechaInicio}
            onChange={(e) => setFechaInicio(e.target.value)}
            className="border border-tierra-crema-oscuro rounded px-3 py-2"
          />
        </div>

        <div>
          <label className="block text-sm mb-1">Hasta</label>
          <input
            type="date"
            value={fechaFin}
            onChange={(e) => setFechaFin(e.target.value)}
            className="border border-tierra-crema-oscuro rounded px-3 py-2"
          />
        </div>

        <button onClick={buscar} disabled={cargando} className="bg-tierra-azul text-white px-6 py-2 rounded-full font-medium">
          {cargando ? "Buscando..." : "Ver disponibilidad"}
        </button>
      </div>

      {error && <p className="mt-4 text-red-600 text-sm">{error}</p>}

      {resultados && (
        <div className="mt-6 grid md:grid-cols-2 gap-4">
          {resultados.length === 0 && (
            <p className="text-tierra-bordo-oscuro/60">No hay equipo disponible para esas fechas.</p>
          )}
          {resultados.map((equipo) => (
            <div key={equipo.id} className="bg-white border border-tierra-crema-oscuro rounded-lg p-4">
              <p className="font-medium">
                {equipo.marca} {equipo.modelo}
              </p>
              <p className="text-sm text-tierra-bordo-oscuro/60">Talla {equipo.talla}</p>
              <p className="mt-2">
                ${equipo.precioDia.toLocaleString("es-AR")} / día
                <span className="text-xs text-tierra-bordo-oscuro/60">
                  {" "}
                  + ${equipo.depositoGarantia.toLocaleString("es-AR")} de depósito
                </span>
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
