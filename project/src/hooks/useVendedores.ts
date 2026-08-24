import { useQuery,} from "@tanstack/react-query";
import { useAuth } from "../context/useAuth";


const useVendedores = () => {
    const URL = import.meta.env.VITE_BACKEND_URL;
    const { session } = useAuth();
    return useQuery({
        queryKey: ["vendedores"],
        queryFn: async () => {
            const vendedores = await fetch(`${URL}/usuarios`, {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                    authorization: `Bearer ${session?.access_token}`,
                },
                credentials: "include",
            }).then((response) => response.json());
            return vendedores || [];
        },
        staleTime: 1000 * 60 * 5,
        retry: 1,
    });
}

export default useVendedores;