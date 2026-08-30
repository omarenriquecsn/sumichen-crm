import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../context/useAuth";

// Lista TODOS los usuarios (vendedores + admins) con GET /usuarios?incluirAdmins=true.
// Se usa para configurar quién recibe proveedores/postulantes en el menú de
// bienvenida de WhatsApp (los admins también pueden atender esos contactos).
const useUsuariosTodos = () => {
    const URL = import.meta.env.VITE_BACKEND_URL;
    const { session } = useAuth();
    return useQuery({
        queryKey: ["usuarios-todos"],
        queryFn: async () => {
            const res = await fetch(`${URL}/usuarios?incluirAdmins=true`, {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                    authorization: `Bearer ${session?.access_token}`,
                },
                credentials: "include",
            });
            const data = await res.json();
            return data || [];
        },
        staleTime: 1000 * 60 * 5,
        retry: 1,
    });
};

export default useUsuariosTodos;
