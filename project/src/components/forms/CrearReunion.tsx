import { useState } from "react";
import { IFormReunion, Reunion } from "../../types";
import { useAuth } from "../../context/useAuth";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import dayjs from "dayjs";
import "dayjs/locale/es";

type CrearReunionProps = {
  cliente_id?: string;
  onSubmit: (data: IFormReunion) => void;
  accion: string;
  initialData?: Partial<Reunion> | null;
};

const CrearReunion = ({
  cliente_id,
  onSubmit,
  accion,
  initialData,
}: CrearReunionProps) => {
  const navigate = useNavigate();

  const { currentUser } = useAuth();
  const [formData, setFormData] = useState<IFormReunion>({
    cliente_id: cliente_id || initialData?.cliente_id || "",
    vendedor_id: currentUser?.id || "",
    titulo: initialData?.titulo || "",
    descripcion: initialData?.descripcion || "",
    inicio: dayjs(initialData?.fecha_inicio).locale("es").format("HH:mm") || "",
    fecha: initialData?.fecha_inicio
      ? new Date(initialData.fecha_inicio)
      : new Date(),
    fin: dayjs(initialData?.fecha_fin).locale("es").format("HH:mm") || "",
    ubicacion: initialData?.ubicacion || "",
    tipo: initialData?.tipo || "presencial",
    estado: initialData?.estado || "programada",
    recordatorio: true,
  });
  if (!currentUser) {
    toast.error("Error usuario no logueado");
    navigate("/login");
    return;
  }

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

  const handleSubmit = async (e: React.FormEvent) => {
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
      <div className="flex gap-3">
        <div className="w-1/2">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Ubicacion
          </label>
          <input
            type="text"
            name="ubicacion"
            placeholder="Ubicacion"
            value={formData.ubicacion}
            onChange={handleChange}
            required
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50"
          />
        </div>

        <div className="w-1/2">
          <label
            htmlFor="fecha"
            className="block text-sm font-medium text-gray-700"
          >
            Fecha
          </label>
          <input
            type="date"
            name="fecha"
            id="fecha"
            value={
              formData.fecha instanceof Date
                ? formData.fecha.toISOString().split("T")[0]
                : new Date(formData.fecha).toISOString().split("T")[0]
            }
            onChange={handleChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50"
          />
        </div>
      </div>
      <div className="flex gap-3">
        <div className="w-1/2">
          <label
            htmlFor="inicio"
            className="block text-sm font-medium text-gray-700"
          >
            Inicio de la Reunion
          </label>
          <input
            type="time"
            name="inicio"
            id="inicio"
            value={formData.inicio.toLocaleString()}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50"
          />
        </div>

        <div className="w-1/2">
          <label
            htmlFor="fin"
            className="block text-sm font-medium text-gray-700"
          >
            Fin de la Reunion
          </label>
          <input
            type="time"
            name="fin"
            id="fin"
            value={formData.fin.toLocaleString()}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50"
          />
        </div>
      </div>

      <div className="flex gap-3">
        <div className="w-1/2">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Estado
          </label>
          <select
            name="estado"
            value={formData.estado}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50"
          >
            <option value="programada">Programada</option>
            <option value="completada">Completada</option>
            <option value="cancelada">Cancelada</option>
          </select>
        </div>

        <div className="w-1/2">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Tipo de Reunion
          </label>
          <select
            name="tipo"
            value={formData.tipo}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50"
          >
            <option value="presencial">Presencial</option>
            <option value="virtual">Virtual</option>
            <option value="telefonica">Telefonica</option>
          </select>
        </div>
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

export default CrearReunion;
