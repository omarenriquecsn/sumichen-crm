import { useEffect, useMemo, useRef, useState } from "react";
import { Oportunidad } from "../../types";
import { useSupabase } from "../../hooks/useSupabase";

type props = {
  onSubmit: (data: Partial<Oportunidad>) => void;
  id?: string;
  accion: string;
  etapa?: "inicial" | "calificado" | "propuesta" | "negociacion" | "cerrado";
};

const CrearOportunidad = ({ onSubmit, accion, etapa }: props) => {
  const supabase = useSupabase();

  const valorProbabilidad = (etapa: string | undefined) => {
    switch (etapa) {
      case "inicial":
        return 10;
      case "calificado":
        return 30;
      case "propuesta":
        return 50;
      case "negociacion":
        return 70;
      case "cerrado":
        return 100;
      default:
        return 0;
    }
  };

  const [formData, setFormData] = useState<Partial<Oportunidad>>({
    cliente_id: "",
    titulo: "Oportunidad",
    descripcion: "",
    valor: 0,
    probabilidad: valorProbabilidad(etapa),
    etapa: etapa || "inicial",
    fecha_creacion: new Date(),
  });

  const { data: clientes } = supabase.useClientes();
  const [clienteSearch, setClienteSearch] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchRef = useRef<HTMLDivElement | null>(null);

   const filteredClientes = useMemo(() => {
    if (!Array.isArray(clientes)) return [];
    const q = clienteSearch.trim().toLowerCase();
    if (!q) return clientes;
    return clientes.filter((c) => {
      const empresa = (c.empresa || "").toLowerCase();
      const nombreCompleto = `${(c.nombre || "").toLowerCase()} ${(c.apellido || "").toLowerCase()}`;
      return empresa.includes(q) || nombreCompleto.includes(q);
    });
  }, [clientes, clienteSearch]);

    useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handledChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLFormElement>) => {
    const target = e.target as HTMLElement;
    const isTextarea = target.tagName === "TEXTAREA";

    if (e.key === "Enter" && !isTextarea) {
      e.preventDefault(); // bloquea Enter solo fuera del textarea
    }
  };


  return (
    <form onSubmit={handleSubmit} onKeyDown={handleKeyDown}>
      <div>
        <label
          htmlFor="cliente"
          className="block text-sm font-medium text-gray-700"
        >
          Cliente
        </label>
      <div ref={searchRef} className="relative">
          <input
            id="cliente"
            name="cliente_search"
            type="text"
            value={clienteSearch}
            onChange={(e) => {
              const val = e.target.value;
              setClienteSearch(val);
              setShowSuggestions(true);
              // si hay match exacto por empresa asigna cliente_id automáticamente
              const match = clientes?.find(
                (c) => (c.empresa || "").toLowerCase() === val.trim().toLowerCase()
              );
              setFormData((prev) => ({
                ...prev,
                cliente_id: match ? match.id : prev.cliente_id || "",
              }));
            }}
            onFocus={() => setShowSuggestions(true)}
            placeholder="Escribe nombre o empresa para buscar..."
            className="mt-1 block w-full px-3 py-2 rounded-md border border-gray-300 shadow-sm bg-white"
            autoComplete="off"
          />

          {showSuggestions && filteredClientes.length > 0 && (
            <ul className="absolute z-20 left-0 right-0 mt-1 bg-white border rounded shadow max-h-56 overflow-auto">
              {filteredClientes.map((c) => (
                <li
                  key={c.id}
                  className="px-3 py-2 cursor-pointer hover:bg-gray-100"
                  onMouseDown={(ev) => {
                    // onMouseDown para evitar que el input pierda foco antes del click
                    ev.preventDefault();
                    const label = c.empresa || `${c.nombre} ${c.apellido}`;
                    setClienteSearch(label);
                    setFormData((prev) => ({ ...prev, cliente_id: c.id }));
                    setShowSuggestions(false);
                  }}
                >
                  <div className="text-sm font-medium">{c.empresa || `${c.nombre} ${c.apellido}`}</div>
                  
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <label className="block text-sm font-medium text-gray-700 mb-1">
        Descripción
      </label>
      <textarea
        name="descripcion"
        placeholder="Descripción de la oportunidad"
        value={formData.descripcion}
        onChange={handledChange}
        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50 min-h-[48px]"
      />
      <label className="block text-sm font-medium text-gray-700 mb-1">
        Venta Estimada
      </label>
      <input
        type="number"
        name="valor"
        placeholder="Valor de la oportunidad"
        value={formData.valor}
        onChange={handledChange}
        required
        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50"
      />
      {/* <label className="block text-sm font-medium text-gray-700 mb-1">
        Probabilidad (%)
      </label>
      <input
        type="number"
        name="probabilidad"
        placeholder="Probabilidad de cierre"
        value={formData.probabilidad}
        onChange={handledChange}
        required
        min="0"
        max="100"
        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50"
      /> */}

      <div className="flex justify-end pt-4">
        <button
          type="submit"
          className="bg-blue-600 hover:bg-blue-700 transition-colors text-white px-6 py-2 rounded-lg font-semibold shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          {accion}
        </button>
      </div>
    </form>
  );
};

export default CrearOportunidad;
