import Select from "react-select";
import { useMemo } from "react";
import { useSupabase } from "../../hooks/useSupabase";
import { toast } from "react-toastify";
import { LoadingSpinner } from "./LoadingSpinner";
import { Cliente } from "../../types";
import { VirtualMenuList } from "./VirtualMenuList";

type OpcionCliente = { value: string; label: string };

type SelectClienteProps = {
  setClienteSeleccionado: React.Dispatch<React.SetStateAction<string | null>>;
  setModalClienteVisible: React.Dispatch<React.SetStateAction<boolean>>;
  setModalFormularioVisible: React.Dispatch<React.SetStateAction<boolean>>;
  clientesProp?: Cliente[];
};

const SelectCliente = ({
  setClienteSeleccionado,
  setModalClienteVisible,
  setModalFormularioVisible,
  clientesProp,
}: SelectClienteProps) => {
  const supabase = useSupabase();

  const {
    data: clientesDb,
    isLoading: loadingClientes,
    error: errorClientes,
  } = supabase.useClientes();

  const clientes = clientesProp ?? clientesDb;

  // Solo se reconstruye cuando cambia la lista de clientes (antes se rearmaba
  // el array de opciones en cada render).
  const opciones = useMemo<OpcionCliente[]>(
    () =>
      (Array.isArray(clientes) ? clientes : []).map((c) => ({
        value: c.id,
        label: c.empresa ?? "",
      })),
    [clientes],
  );

  if (errorClientes) {
    toast.error("Error al cargar los clientes");
    return;
  }

  if (!clientesProp && loadingClientes) {
    return <LoadingSpinner />;
  }

  if (!clientes) {
    toast.error("No hay clientes");
    return;
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium text-gray-900">
        Selecciona un cliente
      </h3>
      <Select<OpcionCliente>
        options={opciones}
        components={{ MenuList: VirtualMenuList }}
        maxMenuHeight={320}
        onChange={(opcion) => setClienteSeleccionado(opcion?.value ?? null)}
        placeholder="Selecciona un cliente"
        isSearchable
        menuPortalTarget={document.body}
        styles={{
          menuPortal: (base) => ({ ...base, zIndex: 9999 }),
          menu: (base) => ({ ...base, zIndex: 99999 }),
        }}
      />
      <button
        onClick={() => {
          setModalClienteVisible(false);
          setModalFormularioVisible(true);
        }}
        className="bg-green-600 text-white px-4 py-2 rounded-lg disabled:opacity-50"
      >
        Continuar
      </button>
    </div>
  );
};

export default SelectCliente;
