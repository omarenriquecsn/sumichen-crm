import React from "react";
import { Layout } from "../../components/layout/Layout";
import {
  Download,
  Calendar,
  Users,
  ShoppingCart,
  ListChecks,
} from "lucide-react";
import Button from "../../components/ui/Button";
import { toast } from "react-toastify";
import { useAuth } from "../../context/useAuth";

const descargas = [
  { label: "Reuniones", icon: Calendar, key: "reuniones" },
  { label: "Actividades", icon: ListChecks, key: "actividades" },
  { label: "Pedidos", icon: ShoppingCart, key: "pedidos" },
  { label: "Clientes", icon: Users, key: "clientes" },
  { label: "Metas", icon: Users, key: "metas" },
];

const DescargasDB: React.FC = () => {

    const { session } = useAuth();
    if (!session || session.user.user_metadata.rol !== 'admin') {
        return (
            <div className="flex items-center justify-center h-screen">
                <h1 className="text-4xl font-bold">Acceso denegado</h1>
            </div>
        );
    }
  const URL = import.meta.env.VITE_BACKEND_URL;
const handleDescargar = async (tipo: string) => {
  const confirmed = confirm(`Descargar ${tipo}?`);
  if (confirmed) {
    try {
      const response = await fetch(`${URL}/descargas/${tipo}`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${session.access_token}`
        },
        credentials: "include",
      });

      if (!response.ok) {
        toast.error("Error al descargar el archivo.");
        return;
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      // Puedes personalizar el nombre del archivo:
      a.download = `${tipo}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      toast.success(`Descarga de ${tipo} iniciada.`);
    } catch (error: unknown) {
      if (error instanceof Error) {
        toast.error(`Error al descargar el archivo: ${error.message}`);
      } else {
        toast.error("Error al descargar el archivo.");
      }
    }
  }
};

  return (
    <Layout
      title="Descargas de Base de Datos"
      subtitle="Exporta información por módulo"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
        {descargas.map((item) => (
          <div
            key={item.key}
            className="bg-white rounded-xl shadow p-6 flex items-center space-x-4"
          >
            <item.icon className="h-8 w-8 text-blue-600" />
            <div className="flex-1">
              <h3 className="text-lg font-semibold">{item.label}</h3>
              <p className="text-gray-500 text-sm">
                Exportar {item.label} a archivo
              </p>
            </div>
            <Button onClick={() => handleDescargar(item.key)} variant="primary">
              <Download className="h-5 w-5 mr-2" /> Descargar
            </Button>
          </div>
        ))}
      </div>
    </Layout>
  );
};

export default DescargasDB;
