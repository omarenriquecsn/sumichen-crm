import { toast } from "react-toastify";
import { Layout } from "../layout/Layout";
import { useAuth } from "../../context/useAuth";
import { useInsertSupabase } from "../../hooks/useExcel";

const ExcelProductos = () => {
  const URL = import.meta.env.VITE_BACKEND_URL; // Replace with your upload URL

  const { userData, session } = useAuth();
  const { mutate: actualizarInventario } = useInsertSupabase();

  const handleSubmitExcel = (event: React.FormEvent<HTMLFormElement>) => {
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
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data?.error || "Error al enviar el archivo");
        return data;
      })
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

  const handleSubmitListaPrecios = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const fileInput = event.currentTarget.elements.namedItem(
      "filePrecios"
    ) as HTMLInputElement;
    if (!fileInput || !fileInput.files || fileInput.files.length === 0) {
      toast.info("Por favor selecciona un archivo antes de enviar.");
      return;
    }

    fetch(`${URL}/productos/lista-precios`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${session?.access_token}`,
      },
      body: formData,
    })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data?.error || "Error al subir la lista de precios");
        return data;
      })
      .then((data) => {
        console.log("Success:", data);
        const resumen = data?.resumen;
        if (resumen) {
          const actualizados =
            typeof resumen.actualizados === "number" ? resumen.actualizados : 0;
          const sinCambio =
            typeof resumen.sinCambio === "number" ? resumen.sinCambio : 0;
          const sinCoincidencia = Array.isArray(resumen.codigosSinCoincidencia)
            ? resumen.codigosSinCoincidencia
            : [];
          if (actualizados === 0 && sinCambio === 0) {
            toast.warning(
              "La lista se guardó, pero ningún producto de la base coincidió con los códigos del PDF."
            );
          } else {
            toast.success(
              `Lista procesada: ${actualizados} precios actualizados, ${sinCambio} sin cambio.`
            );
          }
          if (sinCoincidencia.length > 0) {
            console.warn(
              "Códigos sin coincidencia en la base:",
              sinCoincidencia
            );
          }
        } else {
          toast.success("Lista de precios subida correctamente.");
        }
      })
      .catch((error) => {
        console.error("Error:", error);
        if (error instanceof Error) {
          toast.error(`Error al subir la lista: ${error.message}`);
        } else {
          toast.error("Error al subir la lista.");
        }
      });
  };

  const inputClasses =
    "block w-full text-sm text-gray-500 " +
    "file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 " +
    "file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 " +
    "hover:file:bg-blue-100";

  return (
    <Layout
      title={`¡Bienvenido, ${userData?.nombre}!`}
      subtitle="Carga el inventario y la lista de precios de productos"
    >
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex flex-col mx-auto w-full max-w-2xl gap-6 p-6">
          {/* Área de Edmary — inventario (Excel) */}
          <form
            method="post"
            encType="multipart/form-data"
            onSubmit={handleSubmitExcel}
            className="flex flex-col p-6 bg-white border rounded-lg shadow-md"
          >
            <h2 className="text-lg font-semibold text-gray-800 mb-1">
              Área de Edmary
            </h2>
            <p className="text-sm text-gray-500 mb-4">
              Cargar Productos en almacén
            </p>
            <input
              type="file"
              name="file"
              accept=".xlsx, .xls"
              className={inputClasses}
            />
            <button
              type="submit"
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 w-full sm:w-auto"
            >
              Cargar Productos
            </button>
          </form>

          {/* Área de Mayerlin — lista de precios (PDF) */}
          <form
            method="post"
            encType="multipart/form-data"
            onSubmit={handleSubmitListaPrecios}
            className="flex flex-col p-6 bg-white border rounded-lg shadow-md"
          >
            <h2 className="text-lg font-semibold text-gray-800 mb-1">
              Área de Mayerlin
            </h2>
            <p className="text-sm text-gray-500 mb-4">
              Cargar productos con precio base
            </p>
            <input
              type="file"
              name="filePrecios"
              accept=".pdf, application/pdf"
              className={inputClasses}
            />
            <button
              type="submit"
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 w-full sm:w-auto"
            >
              Cargar Lista de Precios
            </button>
          </form>
        </div>
      </div>
    </Layout>
  );
};

export default ExcelProductos;
