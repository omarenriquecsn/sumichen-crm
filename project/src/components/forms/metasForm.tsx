import React, { useState } from "react";
import { MesEnum, Vendedor } from "../../types";
import { Meta } from "../../types";

type MetasFormProps = {
  vendedor: Vendedor;
  onSubmit: (metas: Partial<Meta>) => void;
  loading?: boolean;
};


const meses = [
  MesEnum.Enero, MesEnum.Febrero, MesEnum.Marzo, MesEnum.Abril, MesEnum.Mayo, MesEnum.Junio,
  MesEnum.Julio, MesEnum.Agosto, MesEnum.Septiembre, MesEnum.Octubre, MesEnum.Noviembre, MesEnum.Diciembre
];

export const MetasForm: React.FC<MetasFormProps> = ({ vendedor, onSubmit, loading }) => {
  const [form, setForm] = useState<Partial<Meta>>({
    mes: MesEnum.Enero,
    emails: 0,
    tareas: 0,
    llamadas: 0,
    reuniones: 0,
    objetivo_clientes: 0,
    objetivo_ventas: 0,
  });

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
      <h2 className="text-xl font-bold mb-4">Asignar metas a {vendedor.nombre} {vendedor.apellido}</h2>
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