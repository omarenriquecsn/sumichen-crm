import React from "react";
import { Layout } from "../../components/layout/Layout";
import { useSupabase } from "../../hooks/useSupabase";
import useVendedores from "../../hooks/useVendedores";
import { toast } from "react-toastify";
import { Plus, MapPin, Users, Edit, Trash2, X, Check } from "lucide-react";
import { Zona, Vendedor } from "../../types";

const Zonas: React.FC = () => {
  const { useZonas, useCrearZona, useActualizarZona, useEliminarZona, useAsignarVendedorZona, useDesasignarVendedorZona } = useSupabase();
  const { data: zonas, isLoading, refetch } = useZonas();
  const { data: vendedores, isLoading: loadingVendedores } = useVendedores();
  const [showModal, setShowModal] = React.useState(false);
  const [editingZona, setEditingZona] = React.useState<Zona | null>(null);
  const [formData, setFormData] = React.useState({ nombre: "", descripcion: "", estadosInput: "" });
  const [asignandoZona, setAsignandoZona] = React.useState<string | null>(null);
  const [vendedorId, setVendedorId] = React.useState("");

  const crearZona = useCrearZona();
  const actualizarZona = useActualizarZona();
  const eliminarZona = useEliminarZona();
  const asignarVendedor = useAsignarVendedorZona();
  const desasignarVendedor = useDesasignarVendedorZona();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nombre.trim()) {
      toast.error("El nombre es obligatorio");
      return;
    }
    const estados = formData.estadosInput
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const zonaData = { nombre: formData.nombre, descripcion: formData.descripcion, estados };
    if (editingZona) {
      actualizarZona.mutate(
        { id: editingZona.id, zonaData },
        {
          onSuccess: () => {
            toast.success("Zona actualizada");
            setShowModal(false);
            setEditingZona(null);
            setFormData({ nombre: "", descripcion: "", estadosInput: "" });
            refetch();
          },
          onError: () => toast.error("Error al actualizar zona"),
        }
      );
    } else {
      crearZona.mutate(
        { zonaData },
        {
          onSuccess: () => {
            toast.success("Zona creada");
            setShowModal(false);
            setFormData({ nombre: "", descripcion: "", estadosInput: "" });
            refetch();
          },
          onError: () => toast.error("Error al crear zona"),
        }
      );
    }
  };

  const handleEdit = (zona: Zona) => {
    setEditingZona(zona);
    setFormData({ nombre: zona.nombre, descripcion: zona.descripcion || "", estadosInput: (zona.estados || []).join(", ") });
    setShowModal(true);
  };

  const handleDelete = (id: string) => {
    if (confirm("¿Eliminar esta zona? Se desasignarán sus vendedores.")) {
      eliminarZona.mutate(id, {
        onSuccess: () => {
          toast.success("Zona eliminada");
          refetch();
        },
        onError: () => toast.error("Error al eliminar zona"),
      });
    }
  };

  const handleAsignar = async (zonaId: string) => {
    if (!vendedorId) {
      toast.error("Selecciona un vendedor");
      return;
    }
    asignarVendedor.mutate(
      { zonaId, vendedorId },
      {
        onSuccess: () => {
          toast.success("Vendedor asignado");
          setAsignandoZona(null);
          setVendedorId("");
          refetch();
        },
        onError: () => toast.error("Error al asignar"),
      }
    );
  };

  const openAsignar = (zonaId: string) => setAsignandoZona(zonaId);

  const handleDesasignar = (zonaId: string, vendedorVzId: string) => {
    if (confirm("¿Desasignar este vendedor de la zona?")) {
      desasignarVendedor.mutate(
        { zonaId, vendedorId: vendedorVzId },
        {
          onSuccess: () => {
            toast.success("Vendedor desasignado");
            refetch();
          },
          onError: () => toast.error("Error al desasignar"),
        }
      );
    }
  };

  return (
    <Layout title="Gestión de Zonas" subtitle="Crear zonas y asignar vendedores">
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <MapPin className="text-blue-600" /> Zonas de Venta
          </h1>
          <button
              onClick={() => {
                setEditingZona(null);
                setFormData({ nombre: "", descripcion: "", estadosInput: "" });
                setShowModal(true);
              }}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <Plus className="h-4 w-4" /> Nueva Zona
          </button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">Cargando...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Zona</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Descripción</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estados cubiertos</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Vendedores</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {zonas?.map((zona) => (
                  <tr key={zona.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">{zona.nombre}</div>
                    </td>
                    <td className="px-4 py-3 text-gray-500 max-w-xs truncate">
                      {zona.descripcion || "—"}
                    </td>
                    <td className="px-4 py-3">
                      {zona.estados?.length ? (
                        <div className="flex flex-wrap gap-1">
                          {zona.estados.map((estado) => (
                            <span key={estado} className="bg-purple-50 text-purple-700 px-2 py-0.5 text-xs rounded">
                              {estado}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-gray-400 text-sm">Sin estados</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-1 text-xs font-medium rounded-full ${
                          zona.activa
                            ? "bg-green-100 text-green-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {zona.activa ? "Activa" : "Inactiva"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {zona.vendedores?.length ? (
                        <div className="flex flex-wrap gap-1">
                          {zona.vendedores.map((vz) => (
                            <span
                              key={vz.id}
                              className="bg-blue-50 text-blue-700 px-2 py-1 text-xs rounded flex items-center gap-1"
                            >
                              {vz.vendedor?.nombre} {vz.vendedor?.apellido}
                              <button
                                onClick={() => vz.vendedor?.id && handleDesasignar(zona.id, vz.vendedor.id)}
                                className="hover:text-red-600"
                                title="Desasignar vendedor"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-gray-400 text-sm">Sin vendedores</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {asignandoZona === zona.id ? (
                          <>
                            <select
                              value={vendedorId}
                              onChange={(e) => setVendedorId(e.target.value)}
                              className="border border-gray-300 rounded px-2 py-1 text-sm"
                              disabled={loadingVendedores}
                            >
                              <option value="">{loadingVendedores ? "Cargando vendedores..." : "Seleccionar vendedor"}</option>
                              {vendedores?.map((v: Vendedor) => (
                                <option key={v.id} value={v.id}>
                                  {v.nombre} {v.apellido}
                                </option>
                              ))}
                            </select>
                            <button
                              onClick={() => handleAsignar(zona.id)}
                              disabled={crearZona.isPending || actualizarZona.isPending}
                              className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700"
                            >
                              <Check className="h-4 w-4" /> Asignar
                            </button>
                            <button
                              onClick={() => setAsignandoZona(null)}
                              className="text-gray-500 hover:text-gray-700"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => openAsignar(zona.id)}
                              className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                            >
                              <Users className="h-4 w-4 inline mr-1" /> Asignar
                            </button>
                            <button
                              onClick={() => handleEdit(zona)}
                              className="text-gray-600 hover:text-gray-800 text-sm font-medium"
                            >
                              <Edit className="h-4 w-4 inline mr-1" /> Editar
                            </button>
                            <button
                              onClick={() => handleDelete(zona.id)}
                              className="text-red-600 hover:text-red-800 text-sm font-medium"
                            >
                              <Trash2 className="h-4 w-4 inline mr-1" /> Eliminar
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 w-full max-w-md">
              <h2 className="text-xl font-bold mb-4">
                {editingZona ? "Editar Zona" : "Nueva Zona"}
              </h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nombre *
                  </label>
                  <input
                    type="text"
                    value={formData.nombre}
                    onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                    className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Descripción
                  </label>
                  <textarea
                    value={formData.descripcion}
                    onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                    className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={3}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Estados cubiertos (separados por coma)
                  </label>
                  <input
                    type="text"
                    value={formData.estadosInput}
                    onChange={(e) => setFormData({ ...formData, estadosInput: e.target.value })}
                    className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Ej: Miranda, Distrito Capital, La Guaira"
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    Estos estados se ofrecen en el menú de bienvenida de WhatsApp para auto-asignar vendedores.
                  </p>
                </div>
                <div className="flex justify-end gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowModal(false);
                      setEditingZona(null);
                      setFormData({ nombre: "", descripcion: "", estadosInput: "" });
                    }}
                    className="px-4 py-2 text-gray-700 border border-gray-300 rounded hover:bg-gray-50"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={crearZona.isPending || actualizarZona.isPending}
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    {crearZona.isPending || actualizarZona.isPending ? "Guardando..." : "Guardar"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Zonas;