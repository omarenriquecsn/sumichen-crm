import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../context/useAuth";
const URL = import.meta.env.VITE_BACKEND_URL;

const useVendedorDetalle = (id: string) => {
  const { session } = useAuth();
  return useQuery({
    queryKey: ["vendedor", id],
    queryFn: async () => {
      const res = await fetch(`${URL}/usuarios/${id}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          authorization: `Bearer ${session?.access_token}`,
        },
        credentials: "include",
      });
      if (!res.ok) throw new Error("Error al obtener vendedor");
      const data = await res.json();
      return data;
    },
    staleTime: 1000 * 60 * 5,
    retry: 1,
  });
};

export default useVendedorDetalle;
