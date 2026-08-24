import { useSupabase } from "../../hooks/useSupabase";
import React from "react";
import { Layout } from "../layout/Layout";
import { useAuth } from "../../context/useAuth";
import { toast } from "react-toastify";

const AgregarProducto = () => {
  const [formData, setFormData] = React.useState({
    nombre: "",
    descripcion: "",
    unidad_medida: "KG",
    precio_base: 0,
  });
  const { mutate: crearProducto, error } = useSupabase().useCrearProducto();
  const { userData } = useAuth();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    crearProducto(
      { productoData: formData },
      {
        onSuccess: () => {
          toast.success("¡Producto agregado exitosamente!");
          setFormData({
            nombre: "",
            descripcion: "",
            unidad_medida: "KG",
            precio_base: 0,
          });
        },
        onError: () => {
          toast.error("Error al agregar el producto. Intenta nuevamente.");
        },
      }
    );
  };
  return (
    <Layout
      title={`¡Bienvenido, ${userData?.nombre}!`}
      subtitle="Carga un nuevo producto"
    >
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="bg-white rounded-xl shadow-lg p-8 w-full max-w-md">
          <h1 className="text-2xl font-bold mb-6 text-center text-gray-800">
            Agregar Producto
          </h1>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-gray-700 font-medium mb-1">
                Nombre
              </label>
              <input
                type="text"
                name="nombre"
                value={formData.nombre}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Nombre del producto"
                required
              />
            </div>
            <div>
              <label className="block text-gray-700 font-medium mb-1">
                Precio Unitario
              </label>
              <input
                type="number"
                name="precio_base"
                onChange={handleChange}
                className="w-full border border-gray-300 rounded px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 mt-2"
                placeholder="Precio del producto"
                required
              />
              <style>{`
                    input[type=number]::-webkit-inner-spin-button,
                    input[type=number]::-webkit-outer-spin-button {
                      -webkit-appearance: none;
                      margin: 0;
                      }
                      input[type=number] {
                      -moz-appearance: textfield;
                    }
                  `}</style>
            </div>
            <div>
              <label className="block text-gray-700 font-medium mb-1">
                Código
              </label>
              <input
                type="text"
                name="descripcion"
                value={formData.descripcion}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Código o descripción"
                required
              />
            </div>
            <button
              type="submit"
              className="w-full bg-blue-600 text-white py-2 rounded font-semibold hover:bg-blue-700 transition-colors"
            >
              {error ? "Error al agregar" : "Agregar"}
            </button>
          </form>
        </div>
      </div>
    </Layout>
  );
};

export default AgregarProducto;
