import { useMutation } from "@tanstack/react-query"
import { Cliente } from "../types"
import { useAuth } from "../context/useAuth";
import { toast } from "react-toastify";
  const URL = import.meta.env.VITE_BACKEND_URL;



export const useVendedorCliente = () => {
    const { session } = useAuth();
    return useMutation({
        mutationFn: async({ vendedor_id, data }: { vendedor_id: string, data: Partial<Cliente> }) => {
            if(!vendedor_id) throw new Error("No se proporciono el ID del vendedor");
            data.vendedor_id = vendedor_id;
            await fetch(`${URL}/clientes/${data.id}`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${session?.access_token}`
                },
                body: JSON.stringify(data)
            }).then((res) => {
                if (!res.ok) {
                    throw new Error("Error al asignar vendedor al cliente");
                }
            })
        },
        onError: (error) => {
            if (error instanceof Error) {
                toast.error(error.message);
            }
        },
        onSuccess: () => {
            toast.success("Vendedor asignado correctamente");
        }
    })
}