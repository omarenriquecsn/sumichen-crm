import { toast } from "react-toastify";
import { useAuth } from "../context/useAuth";
import { useNavigate } from "react-router-dom";
import { Oportunidad } from "../types";
import { useSupabase } from "./useSupabase";

export const useOportunidadAccion = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const supabase = useSupabase();

  const { data: clientes } = supabase.useClientes();
  const { data: oportunidades } = supabase.useOportunidades();
  const { mutate: CrearOportunidad } = supabase.useCrearOportunidades();
  const { mutate: editarOportunidad } = supabase.useActualizarOportunidad();
  const { mutate: actualizarCliente } = supabase.useActualizarCliente();

  //   Functions
  const submitOportunidad = (
    data: Partial<Oportunidad>,
    onClose: () => void
  ) => {
    if (!currentUser) {
      toast.error("Error usuario no logueado");
      navigate("/login");
      return;
    }

    const validarExistencia =
      Array.isArray(oportunidades) &&
      oportunidades.find((o) => o.cliente_id === data.cliente_id);

    if (validarExistencia) {
      toast.error("Ya existe una pipeline para este cliente");
      return;
    }

    if (Array.isArray(clientes)) {
      const cliente = clientes.find((c) => c.id === data.cliente_id);
      if(cliente?.estado === 'activo') {
        toast.error("Solo se pueden crear pipelines para prospectos");
        return;
      }
      if (cliente) {
        actualizarCliente({
          clienteData: {
            ...cliente,
            etapa_venta: data.etapa || cliente.etapa_venta,
            notas: data.descripcion || cliente.notas,
          },
          currentUser,
        });
      }
    }

    CrearOportunidad({
      oportunidadData: data,
      currentUser,
    });

    toast.success("Oportunidad creada exitosamente");
    onClose();
  };

  const probabilidadPorEtapa: Record<string, number> = {
    inicial: 10,
    calificado: 30,
    propuesta: 50,
    negociacion: 70,
    cerrado: 100,
  };

  //   Handle Drag and Drop para dnd-kit
  const actualizarEtapaDrag = (
    oportunidadId: string,
    nuevaEtapa:
      | "inicial"
      | "calificado"
      | "propuesta"
      | "negociacion"
      | "cerrado",
    notasEtapa?: string
  ) => {
    if (!currentUser || !oportunidades || !clientes) return;

    const oportunidad =
      Array.isArray(oportunidades) &&
      oportunidades.find((o) => o.id === oportunidadId);
    if (!oportunidad) {
      toast.error("Oportunidad no encontrada");
      return;
    }
    const cliente =
      Array.isArray(clientes) &&
      clientes.find((c) => c.id === oportunidad.cliente_id);
    if (!cliente) {
      toast.error("Cliente no encontrado");
      return;
    }
    if (nuevaEtapa === "cerrado") {
      cliente.estado = "activo";
    }

    actualizarCliente({
      clienteData: {
        ...cliente,
        etapa_venta: nuevaEtapa,
        notas: notasEtapa || cliente.notas,
      },
      currentUser,
    });

    // Buscar la oportunidad actual en cache (opcional, si necesitas más datos)
    // Aquí asumimos que solo necesitas id y etapa
    editarOportunidad({
      OportunidadData: {
        id: oportunidadId,
        etapa: nuevaEtapa,
        probabilidad: probabilidadPorEtapa[nuevaEtapa],
      },
      currentUser,
    });
    toast.success("Oportunidad actualizada exitosamente");
  };

  return {
    submitOportunidad,
    actualizarEtapaDrag,
  };
};
