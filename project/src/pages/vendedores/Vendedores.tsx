import React from "react";
import { Layout } from "../../components/layout/Layout";
import { Phone, DollarSign, User } from "lucide-react";
import useVendedores from "../../hooks/useVendedores";
import { Meta, Vendedor } from "../../types"; // Asegúrate de que la interfaz Vendedor esté definida en tu types.ts
import Modal from "../../components/ui/Modal";
import MetasForm from "../../components/forms/metasForm";
import { useGetMetas, usePostMetas } from "../../hooks/useMetas";
import { useAuth } from "../../context/useAuth";
import MenuVendedor from "./menuVendedor";
import { User as SupabaseUser } from "@supabase/supabase-js";

function recenciaMetaMs(meta: Meta): number {
  const t = (v: Date | string) => {
    const ms = new Date(v).getTime();
    return Number.isFinite(ms) ? ms : 0;
  };
  return Math.max(t(meta.fecha_creacion), t(meta.fecha_actualizacion));
}

const Vendedores: React.FC = () => {
  const [modalOpen, setModalOpen] = React.useState(false);
  const [vendedorSeleccionado, setVendedorSeleccionado] =
    React.useState<Vendedor | null>(null);
  const { data: vendedores, isLoading, error } = useVendedores();
  //   const navigate = useNavigate();

  // metas
  const { currentUser } = useAuth();
  const { mutate: actualizarMetas } = usePostMetas();
  const { data: metas } = useGetMetas(currentUser?.id ? currentUser.id : "");

  if (isLoading)
    return (
      <Layout title="Vendedores" subtitle="Cargando...">
        <div>Cargando vendedores...</div>
      </Layout>
    );
  if (error)
    return (
      <Layout title="Vendedores" subtitle="Error al cargar datos">
        <div>Error al cargar vendedores</div>
      </Layout>
    );

  const metasPorVendedor: Meta[] = Array.isArray(metas)
    ? Object.values(
        metas.reduce((acc: Record<string, Meta>, meta: Meta) => {
          const vendedorId = meta.vendedor_id;
          const prev = acc[vendedorId];
          if (!prev || recenciaMetaMs(meta) > recenciaMetaMs(prev)) {
            acc[vendedorId] = meta;
          }
          return acc;
        }, {})
      )
    : [];

  const abrirModalMetas = (vendedor: Vendedor) => {
    setVendedorSeleccionado(vendedor);
    setModalOpen(true);
  };

  const handleActualizarMetas = (metas: Partial<Meta>) => {
    if (vendedorSeleccionado) {
      actualizarMetas({ vendedorId: vendedorSeleccionado.id, metas });
    }
  };

  return (
    <Layout title="Vendedores" subtitle="Lista de vendedores registrados">
      <div className="space-y-6">
        {/* Lista de vendedores (móvil/tablet: tarjetas) */}
        <div className="grid grid-cols-1 gap-3 lg:hidden">
          {vendedores?.map((vendedor: Vendedor) => (
            <div
              key={vendedor.id}
              className="bg-white rounded-xl border border-gray-200 p-4 space-y-3"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center shrink-0">
                  <span className="text-blue-600 font-semibold">
                    {vendedor.nombre?.[0]?.toUpperCase() || "?"}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-gray-900 truncate">
                    {vendedor.nombre} {vendedor.apellido}
                  </p>
                  <p className="text-sm text-gray-500 flex items-center gap-1">
                    <Phone className="h-3 w-3" />
                    <span className="truncate">{vendedor.telefono}</span>
                  </p>
                </div>
                <MenuVendedor vendedor={{ id: vendedor.id } as SupabaseUser} />
              </div>
              <div className="flex items-center justify-between border-t border-gray-100 pt-2">
                <span className="text-xs text-gray-500">Meta de ventas</span>
                <span className="font-medium text-gray-900 flex items-center gap-1">
                  <DollarSign className="h-4 w-4 text-green-600" />$
                  {metasPorVendedor.find(
                    (meta: Meta) => meta.vendedor_id === vendedor.id
                  )?.objetivo_ventas ?? 0}
                </span>
              </div>
              <button
                className="w-full text-center bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium py-2 px-4 rounded-lg transition-colors"
                onClick={() => abrirModalMetas(vendedor)}
              >
                Asignar Metas
              </button>
            </div>
          ))}
        </div>
        {/* Lista de vendedores (desktop: tabla) */}
        <div className="hidden lg:block bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left py-4 px-6 font-medium text-gray-900">
                    Nombre
                  </th>
                  <th className="text-left py-4 px-6 font-medium text-gray-900">
                    Teléfono
                  </th>
                  <th className="text-left py-4 px-6 font-medium text-gray-900">
                    Meta de Ventas
                  </th>
                  <th className="text-left py-4 px-6 font-medium text-gray-900">
                    Panel
                  </th>
                  <th className="text-left py-4 px-6 font-medium text-gray-900">
                    Metas
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {vendedores?.map((vendedor: Vendedor) => (
                  <tr key={vendedor.id} className="hover:bg-gray-50">
                    <td className="py-4 px-6">
                      <div className="flex items-center space-x-2">
                        <User className="h-5 w-5 text-blue-600" />
                        <span>
                          {vendedor.nombre} {vendedor.apellido}
                        </span>
                      </div>
                    </td>

                    <td className="py-4 px-6">
                      <div className="flex items-center space-x-1 text-sm text-gray-500">
                        <Phone className="h-4 w-4" />
                        <span>{vendedor.telefono}</span>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center space-x-1">
                        <DollarSign className="h-4 w-4 text-green-600" />
                        <span className="font-medium text-gray-900">
                          $
                          {metasPorVendedor.find(
                            (meta: Meta) => meta.vendedor_id === vendedor.id
                          )?.objetivo_ventas ?? 0}
                        </span>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <MenuVendedor vendedor={{ id: vendedor.id } as SupabaseUser} />
                    </td>
                    <td className="py-4 px-6">
                      <button
                        className="text-blue-600 hover:underline font-medium"
                        onClick={() => abrirModalMetas(vendedor)}
                      >
                        Asignar Metas
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)}>
        {vendedorSeleccionado && (
          <MetasForm
            vendedor={vendedorSeleccionado}
            onSubmit={(metas) => {
              handleActualizarMetas(metas);
              setModalOpen(false);
            }}
          />
        )}
      </Modal>
    </Layout>
  );
};

export default Vendedores;
