import { useState } from "react";
import { Ticket } from "../../types";
import { useAuth } from "../../context/useAuth";

type Estado = "abierto" | "en_proceso" | "resuelto" | "cerrado";


type CrearTicketProps = {
  onSubmit: (data: Partial<Ticket>) => void;
  accion: string;
  cliente_id?: string;
  estado: Estado;
};

const CrearTicket = ({ onSubmit, accion, cliente_id, estado }: CrearTicketProps) => {

    const {currentUser} = useAuth();

  const [formData, setFormData] = useState<Partial<Ticket>>({
    titulo: "",
    descripcion: "",
    vendedor_id: currentUser?.id ?? "",
    cliente_id: cliente_id ?? "",
    estado: estado ?? "abierto",
    prioridad: "alta",
    categoria: "tecnico",
    fecha_creacion: new Date(),
    fecha_actualizacion: new Date(),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
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
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Titulo
        </label>
        <input
          type="text"
          name="titulo"
          placeholder="Titulo"
          value={formData.titulo}
          onChange={handleChange}
          required
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Descripción
        </label>
        <textarea
          name="descripcion"
          placeholder="Descripcion"
          value={formData.descripcion ?? ""}
          onChange={handleChange}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50 min-h-[48px]"
        />
      </div>

      
      <label className="block text-sm font-medium text-gray-700 mb-1">
        Prioridad
      </label>
      <select
        name="prioridad"
        value={formData.prioridad ?? ""}
        onChange={handleChange}
        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50"
      >
        <option value="alta">Alta</option>
        <option value="media">Media</option>
        <option value="baja">Abierto</option>
        <option value="urgente">Urgente</option>
      </select>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        Categoria
      </label>
      <select
        name="categoria"
        value={formData.categoria ?? ""}
        onChange={handleChange}
        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50"
      >
        <option value="tecnico">Técnico</option>
        <option value="facturacion">Facturacion</option>
        <option value="producto">Producto</option>
        <option value="servicio">Servicio</option>
      </select>
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

export default CrearTicket;
