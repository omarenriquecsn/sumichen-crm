import Select from "react-select";
import { toast } from "react-toastify";
import { LoadingSpinner } from "./LoadingSpinner";
import { Cliente, Vendedor } from "../../types";
import useVendedores from "../../hooks/useVendedores";
import { useState } from "react";
import { useVendedorCliente } from "../../hooks/useCliente";

type SelectVendedorProps = {
  closeModal: () => void;
  cliente: Cliente
};

const SelectVendedor = ({
  cliente,
  closeModal,
  
}: SelectVendedorProps) => {
  const [vendedorSeleccionado, setVendedorSeleccionado] = useState<string | null>(
    null
  );
  const {
    data: vendedoresDb,
    isLoading: loadingVendedores,
    error: errorVendedores,
  } = useVendedores();

  const { mutate: asignarVendedor } = useVendedorCliente();

  const vendedores = vendedoresDb;
  if (errorVendedores) {
    toast.error("Error al cargar los vendedores");
    return;
  }

  if (loadingVendedores) {
    return <LoadingSpinner />;
  }

  if (!vendedores) {
    toast.error("No hay vendedores");
    return;
  }

  const handleAsignarVendedor = () => {
    if (!vendedorSeleccionado) return;

    asignarVendedor({
      vendedor_id: vendedorSeleccionado,
      data: cliente,
    });
    closeModal();
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium text-gray-900">
        Selecciona un vendedor
      </h3>
      <Select
        options={vendedores.map((v: Vendedor) => ({
          value: v.id,
          label: `${v.nombre} ${v.apellido}`,
        }))}
        onChange={(opcion: { value: string; label: string } | null) =>
          setVendedorSeleccionado(opcion?.value ?? null)
        }
        placeholder="Selecciona un vendedor"
        isSearchable
        menuPortalTarget={document.body}
        styles={{ menuPortal: (base) => ({ ...base, zIndex: 9999 }) }}
      />
      <button
        type="submit"
        onClick={() => {handleAsignarVendedor()}}
        className="bg-green-600 text-white px-4 py-2 rounded-lg disabled:opacity-50"
      >
        Asignar Vendedor
      </button>
    </div>
  );
};

export default SelectVendedor;
