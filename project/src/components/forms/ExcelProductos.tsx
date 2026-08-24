import { toast } from "react-toastify";
import { Layout } from "../layout/Layout";
import { useAuth } from "../../context/useAuth";
import { useInsertSupabase } from "../../hooks/useExcel";

const ExcelProductos = () => {
  const URL = import.meta.env.VITE_BACKEND_URL; // Replace with your upload URL

  const { userData, session } = useAuth();
  const { mutate: actualizarInventario } = useInsertSupabase();
  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const fileInput = event.currentTarget.elements.namedItem(
      "file"
    ) as HTMLInputElement;
    if (!fileInput || !fileInput.files || fileInput.files.length === 0) {
      toast.info("Por favor selecciona un archivo antes de enviar.");
      return;
    }

    fetch(`${URL}/productos/excel`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${session?.access_token}`,
      },
      body: formData,
    })
      .then((response) => response.json())
      .then((data) => {
        console.log("Success:", data);
        actualizarInventario();
        toast.success("Archivo enviado correctamente.");
      })
      .catch((error) => {
        console.error("Error:", error);
        if (error instanceof Error) {
          toast.error(`Error al enviar el archivo: ${error.message}`);
        } else {
          toast.error("Error al enviar el archivo.");
        }
      });
  };

  return (
    <Layout
      title={`¡Bienvenido, ${userData?.nombre}!`}
      subtitle="Carga el excel de productos con precios actualizados"
    >
      <div className="flex min-h-screen items-center justify-center">
        <form
          method="post"
          encType="multipart/form-data"
          onSubmit={handleSubmit}
          className="flex flex-col mx-auto items-center w-[50%] p-6 bg-white border rounded-lg shadow-md"
        >
          <div className="flex flex-col items-center space-y-4 mx-auto  w-full ">
            <label className="block text-sm font-medium text-gray-700 mb-2 ">
              Cargar Productos desde Excel
            </label>
            <input
              type="file"
              name="file"
              accept=".xlsx, .xls"
              className="block w-full sm:w-auto text-sm text-gray-500
         file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0
         file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700
         hover:file:bg-blue-100"
            />
            <button
              type="submit"
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Cargar Productos
            </button>
          </div>
        </form>
      </div>
    </Layout>
  );
};

export default ExcelProductos;
