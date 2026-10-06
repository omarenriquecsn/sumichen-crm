import React, { useEffect, useState } from "react";
import { MesEnum, Vendedor } from "../../types";
import { Meta } from "../../types";

type MetasFormProps = {
  vendedor: Vendedor;
  metas?: Meta[];
  onSubmit: (metas: Partial<Meta>) => void;
  loading?: boolean;
};


const meses = [
  MesEnum.Enero, MesEnum.Febrero, MesEnum.Marzo, MesEnum.Abril, MesEnum.Mayo, MesEnum.Junio,
  MesEnum.Julio, MesEnum.Agosto, MesEnum.Septiembre, MesEnum.Octubre, MesEnum.Noviembre, MesEnum.Diciembre
];

const metaVacia: Partial<Meta> = {
  mes: MesEnum.Enero,
  emails: 0,
  tareas: 0,
  llamadas: 0,
  reuniones: 0,
  whatsapp: 0,
  objetivo_clientes: 0,
  objetivo_ventas: 0,
};

function recenciaMetaMs(meta: Meta): number {
  const t = (v: Date | string) => {
    const ms = new Date(v).getTime();
    return Number.isFinite(ms) ? ms : 0;
  };
  return Math.max(t(meta.fecha_creacion), t(meta.fecha_actualizacion));
}

export const MetasForm: React.FC<MetasFormProps> = ({ vendedor, metas = [], onSubmit, loading }) => {
  const [form, setForm] = useState<Partial<Meta>>(metaVacia);
  const [editando, setEditando] = useState(false);

  // Precarga la meta ya asignada de ese vendedor/mes (si existe). Así reasignar
  // el mismo mes se comporta como edición: la nueva sustituye a la anterior.
  useEffect(() => {
    const existente = metas
      .filter(
        (m) => m.vendedor_id === vendedor.id && m.mes === form.mes
      )
      .sort((a, b) => recenciaMetaMs(b) - recenciaMetaMs(a))[0];

    if (existente) {
      setForm({
        mes: existente.mes,
        emails: existente.emails ?? 0,
        tareas: existente.tareas ?? 0,
        llamadas: existente.llamadas ?? 0,
        reuniones: existente.reuniones ?? 0,
        whatsapp: existente.whatsapp ?? 0,
        objetivo_clientes: existente.objetivo_clientes ?? 0,
        objetivo_ventas: existente.objetivo_ventas ?? 0,
      });
      setEditando(true);
    } else {
      setForm((prev) => ({ ...metaVacia, mes: prev.mes }));
      setEditando(false);
    }
  }, [vendedor.id, form.mes, metas]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: name === "mes" ? value : Number(value),
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(form);
  };

const inputNumberStyle: React.CSSProperties = {
  // Quita flechas en Chrome, Safari, Edge, Opera
  WebkitAppearance: "none",
  MozAppearance: "textfield",
  appearance: "textfield",
};

 const handleKeyDown = (e: React.KeyboardEvent<HTMLFormElement>) => {
    if (e.key === "Enter") {
      // Evita el submit si no hay productos seleccionados
      e.preventDefault();
    }
  };


  return (
    <form onSubmit={handleSubmit} onKeyDown={handleKeyDown} className="space-y-6 bg-white p-6 rounded shadow mx-auto">
      <h2 className="text-xl font-bold mb-1">Asignar metas a {vendedor.nombre} {vendedor.apellido}</h2>
      {editando && (
        <p className="text-sm text-amber-600 mb-3">
          Ya existe una meta de ese mes para este vendedor: al guardar se
          sustituirá por estos valores.
        </p>
      )}
      <div>
        <label className="block font-medium mb-1">Mes</label>
        <select
          name="mes"
          value={form.mes}
          onChange={handleChange}
          className="border rounded px-3 py-2 w-full"
          required
        >
          <option value="">Selecciona un mes</option>
          {meses.map((mes) => (
            <option key={mes} value={mes}>{mes}</option>
          ))}
        </select>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block font-medium mb-1">Emails</label>
          <input
            type="number"
            name="emails"
            value={form.emails}
            onChange={handleChange}
            min={0}
            className="border rounded px-3 py-2 w-full"
            style={inputNumberStyle}
            onFocus={e => e.target.value = ""}
          />
        </div>
        <div>
          <label className="block font-medium mb-1">Tareas</label>
          <input
            type="number"
            name="tareas"
            value={form.tareas}
            onChange={handleChange}
            min={0}
            className="border rounded px-3 py-2 w-full"
            style={inputNumberStyle}
            onFocus={e => e.target.value = ""}
          />
        </div>
        <div>
          <label className="block font-medium mb-1">Llamadas</label>
          <input
            type="number"
            name="llamadas"
            value={form.llamadas}
            onChange={handleChange}
            min={0}
            className="border rounded px-3 py-2 w-full"
            style={inputNumberStyle}
            onFocus={e => e.target.value = ""}
          />
        </div>
        <div>
          <label className="block font-medium mb-1">Reuniones</label>
          <input
            type="number"
            name="reuniones"
            value={form.reuniones}
            onChange={handleChange}
            min={0}
            className="border rounded px-3 py-2 w-full"
            style={inputNumberStyle}
            onFocus={e => e.target.value = ""}
          />
        </div>
        <div>
          <label className="block font-medium mb-1">WhatsApp</label>
          <input
            type="number"
            name="whatsapp"
            value={form.whatsapp}
            onChange={handleChange}
            min={0}
            className="border rounded px-3 py-2 w-full"
            style={inputNumberStyle}
            onFocus={e => e.target.value = ""}
          />
        </div>
        <div>
          <label className="block font-medium mb-1">Nuevos Prospectos</label>
          <input
            type="number"
            name="objetivo_clientes"
            value={form.objetivo_clientes}
            onChange={handleChange}
            min={0}
            className="border rounded px-3 py-2 w-full"
            style={inputNumberStyle}
            onFocus={e => e.target.value = ""}
          />
        </div>
        <div className="col-span-2">
          <label className="block font-medium mb-1">Meta de ventas ($)</label>
          <input
            type="number"
            name="objetivo_ventas"
            value={form.objetivo_ventas}
            onChange={handleChange}
            min={0}
            className="border rounded px-3 py-2 w-full"
            style={inputNumberStyle}
            onFocus={e => e.target.value = ""}
          />
        </div>
      </div>
      <button
        type="submit"
        className="bg-blue-600 text-white px-6 py-2 rounded font-semibold hover:bg-blue-700"
        disabled={loading}
      >
        {loading ? "Guardando..." : "Asignar metas"}
      </button>
    </form>
  );
};

export default MetasForm;