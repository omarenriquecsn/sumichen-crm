import { useEffect, useState } from "react";
import Modal from "../ui/Modal";
import { Transporte } from "../../types";
import { toast } from "react-toastify";
import { useSupabase } from "../../hooks/useSupabase";

type EditarTransporteModalProps = {
  pedidoId: string;
  transporteActual?: Partial<Transporte> | null;
  isOpen: boolean;
  onClose: () => void;
  onGuardado?: () => void;
};

const EditarTransporteModal = ({
  pedidoId,
  transporteActual,
  isOpen,
  onClose,
  onGuardado,
}: EditarTransporteModalProps) => {
  const [formData, setFormData] = useState<Partial<Transporte>>({
    nombre: "",
    cedula: "",
    marca: "",
    modelo: "",
    placa: "",
  });

  const { mutate: guardarTransporte, isPending } =
    useSupabase().useGuardarTransporte();

  useEffect(() => {
    if (isOpen) {
      setFormData({
        nombre: transporteActual?.nombre || "",
        cedula: transporteActual?.cedula || "",
        marca: transporteActual?.marca || "",
        modelo: transporteActual?.modelo || "",
        placa: transporteActual?.placa || "",
      });
    }
  }, [isOpen, transporteActual]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    guardarTransporte(
      { pedidoId, transporteData: formData },
      {
        onSuccess: () => {
          toast.success("Transporte actualizado exitosamente.");
          onGuardado?.();
          onClose();
        },
        onError: () => {
          toast.error("Error al guardar el transporte.");
        },
      }
    );
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Editar Transporte">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="nombre"
            className="block text-sm font-medium text-gray-700"
          >
            Nombre
          </label>
          <input
            type="text"
            name="nombre"
            id="nombre"
            value={formData.nombre}
            onChange={handleChange}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          />
        </div>
        <div>
          <label
            htmlFor="cedula"
            className="block text-sm font-medium text-gray-700"
          >
            Cédula
          </label>
          <input
            type="text"
            name="cedula"
            id="cedula"
            value={formData.cedula}
            onChange={handleChange}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          />
        </div>
        <div>
          <label
            htmlFor="marca"
            className="block text-sm font-medium text-gray-700"
          >
            Marca
          </label>
          <input
            type="text"
            name="marca"
            id="marca"
            value={formData.marca}
            onChange={handleChange}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          />
        </div>
        <div>
          <label
            htmlFor="modelo"
            className="block text-sm font-medium text-gray-700"
          >
            Modelo
          </label>
          <input
            type="text"
            name="modelo"
            id="modelo"
            value={formData.modelo}
            onChange={handleChange}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          />
        </div>
        <div>
          <label
            htmlFor="placa"
            className="block text-sm font-medium text-gray-700"
          >
            Placa
          </label>
          <input
            type="text"
            name="placa"
            id="placa"
            value={formData.placa}
            onChange={handleChange}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          />
        </div>
        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={isPending}
            className="bg-blue-600 hover:bg-blue-700 transition-colors text-white px-6 py-2 rounded-lg font-semibold shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-gray-400"
          >
            {isPending ? "Guardando..." : "Guardar"}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default EditarTransporteModal;
