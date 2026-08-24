import { toast } from "react-toastify";

const useDescargas = (tipo: string) => {
  const handleDescargar = async () => {
    const URL = import.meta.env.VITE_BACKEND_URL;
    const confirmed = confirm(`Descargar ${tipo}?`);
    if (confirmed) {
       await fetch(`${URL}/descargas/${tipo}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
      });
      // Aquí va la lógica para descargar el archivo desde tu backend o Supabase
      // Por ejemplo: await descargarArchivo(tipo);
      toast.success(`Descarga de ${tipo} iniciada.`);
     
    }
  };

  return { handleDescargar };
};
export default useDescargas;
