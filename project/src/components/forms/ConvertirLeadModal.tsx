import React from "react";
import { toast } from "react-toastify";
import { X, UserPlus, ShoppingCart } from "lucide-react";
import { useSupabase } from "../../hooks/useSupabase";
import { Lead } from "../../types";

interface ConvertirLeadModalProps {
  lead: Lead | null;
  onClose: () => void;
  onConverted?: () => void;
}

const ConvertirLeadModal: React.FC<ConvertirLeadModalProps> = ({ lead, onClose, onConverted }) => {
  const { useConvertirLead } = useSupabase();
  const convertirLead = useConvertirLead();
  const [form, setForm] = React.useState({
    rif: "",
    nombre: "",
    apellido: "",
    email: "",
    telefono: "",
    empresa: "",
    direccion: "",
    ciudad: "",
    direccion_entrega: "",
    google_maps: "",
    sector: "",
    notas: "",
  });

  React.useEffect(() => {
    if (lead) {
      const md = lead.metadata || {};
      setForm({
        rif: (md.rif as string) || "",
        nombre: lead.datos_contacto?.nombre || "",
        apellido: lead.datos_contacto?.apellido || "",
        email: lead.datos_contacto?.email || "",
        telefono: lead.datos_contacto?.telefono || "",
        empresa: lead.datos_contacto?.nombre || "",
        direccion: (md.direccion as string) || "",
        ciudad: (md.ciudad as string) || "",
        direccion_entrega: (md.direccion_entrega as string) || "",
        google_maps: (md.google_maps as string) || "",
        sector: (md.sector as string) || "",
        notas: "",
      });
    }
  }, [lead]);

  if (!lead) return null;

  const set = (k: keyof typeof form, v: string) => setForm((prev) => ({ ...prev, [k]: v }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nombre.trim()) {
      toast.error("El nombre es obligatorio");
      return;
    }
    const datos_cliente: Record<string, unknown> = {
      rif: form.rif.trim() || undefined,
      nombre: form.nombre.trim(),
      apellido: form.apellido.trim(),
      email: form.email.trim(),
      telefono: form.telefono.trim(),
      empresa: form.empresa.trim() || form.nombre.trim(),
      direccion: form.direccion.trim() || undefined,
      ciudad: form.ciudad.trim() || undefined,
      direccion_entrega: form.direccion_entrega.trim() || undefined,
      google_maps: form.google_maps.trim() || undefined,
      sector: form.sector.trim() || undefined,
      notas: form.notas.trim() || undefined,
    };
    convertirLead.mutate(
      { leadId: lead.id, datos_cliente },
      {
        onSuccess: () => {
          toast.success("Cliente registrado. Ya puedes crear un pedido para él.");
          onConverted?.();
        },
        onError: (err) => toast.error(err.message || "Error al registrar el cliente"),
      }
    );
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-green-600" /> Registrar Cliente
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-800">
            <X className="h-6 w-6" />
          </button>
        </div>
        <p className="text-sm text-gray-500 mb-4">
          Lead: <span className="font-medium text-gray-700">{lead.datos_contacto?.nombre}</span> — completa o corrige
          los datos para registrarlo en la base de datos. Después podrás crear un pedido.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Nombre *</label>
              <input
                type="text"
                value={form.nombre}
                onChange={(e) => set("nombre", e.target.value)}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Apellido</label>
              <input
                type="text"
                value={form.apellido}
                onChange={(e) => set("apellido", e.target.value)}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">RIF *</label>
              <input
                type="text"
                value={form.rif}
                onChange={(e) => set("rif", e.target.value)}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="J-12345678-9"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Teléfono</label>
              <input
                type="tel"
                value={form.telefono}
                onChange={(e) => set("telefono", e.target.value)}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Email</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => set("email", e.target.value)}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Empresa</label>
              <input
                type="text"
                value={form.empresa}
                onChange={(e) => set("empresa", e.target.value)}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-gray-500 mb-1">Dirección</label>
              <input
                type="text"
                value={form.direccion}
                onChange={(e) => set("direccion", e.target.value)}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Ciudad</label>
              <input
                type="text"
                value={form.ciudad}
                onChange={(e) => set("ciudad", e.target.value)}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Sector</label>
              <input
                type="text"
                value={form.sector}
                onChange={(e) => set("sector", e.target.value)}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Ej: Construcción, Farmacéutico, Alimenticio"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-gray-500 mb-1">Dirección de entrega</label>
              <input
                type="text"
                value={form.direccion_entrega}
                onChange={(e) => set("direccion_entrega", e.target.value)}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-gray-500 mb-1">Notas</label>
              <textarea
                value={form.notas}
                onChange={(e) => set("notas", e.target.value)}
                rows={2}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 border border-gray-300 rounded hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={convertirLead.isPending}
              className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
            >
              {convertirLead.isPending ? "Registrando..." : (
                <>
                  <UserPlus className="h-4 w-4" /> Registrar cliente
                </>
              )}
            </button>
          </div>
          {convertirLead.isSuccess && (
            <p className="text-sm text-green-600 flex items-center gap-1">
              <ShoppingCart className="h-4 w-4" /> Cliente registrado. Ve a <strong>Pedidos</strong> para crear un pedido.
            </p>
          )}
        </form>
      </div>
    </div>
  );
};

export default ConvertirLeadModal;
