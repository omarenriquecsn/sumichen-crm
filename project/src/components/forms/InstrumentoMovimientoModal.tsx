import { useEffect, useState } from "react";
import Modal from "../ui/Modal";
import { Almacen, InstrumentoStock, TipoInstrumento } from "../../types";
import { toast } from "react-toastify";
import { useSupabase } from "../../hooks/useSupabase";

type Modo = "entrada" | "baja" | "ajuste";

type Props = {
  tipos: TipoInstrumento[];
  stock: InstrumentoStock[];
  isOpen: boolean;
  modo: Modo;
  onClose: () => void;
};

const ALMACENES: Almacen[] = ["globalca", "wms"];

const InstrumentoMovimientoModal = ({
  tipos,
  stock,
  isOpen,
  modo,
  onClose,
}: Props) => {
  const supabase = useSupabase();
  const { mutate: entrada, isPending: pEntrada } =
    supabase.useRegistrarEntradaInstrumento();
  const { mutate: baja, isPending: pBaja } =
    supabase.useRegistrarBajaInstrumento();
  const { mutate: ajuste, isPending: pAjuste } =
    supabase.useRegistrarAjusteInstrumento();

  const [tipoId, setTipoId] = useState("");
  const [almacen, setAlmacen] = useState<Almacen>("globalca");
  const [cantidad, setCantidad] = useState(0);
  const [bajaTipo, setBajaTipo] = useState<"donacion" | "dano">("donacion");
  const [direccion, setDireccion] = useState<"entrada" | "salida">("entrada");
  const [observacion, setObservacion] = useState("");

  useEffect(() => {
    if (isOpen) {
      setTipoId("");
      setAlmacen("globalca");
      setCantidad(0);
      setBajaTipo("donacion");
      setDireccion("entrada");
      setObservacion("");
    }
  }, [isOpen, modo]);

  const isPending = pEntrada || pBaja || pAjuste;

  const titulo =
    modo === "entrada"
      ? "Entrada / reposición de instrumentos"
      : modo === "baja"
        ? "Baja de instrumentos"
        : "Ajuste de inventario de instrumentos";

  const disponible = Number(
    stock.find(
      (s) => s.tipo_instrumento_id === tipoId && s.almacen === almacen,
    )?.cantidad_disponible ?? 0,
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tipoId) {
      toast.info("Selecciona un instrumento.");
      return;
    }
    if (!(Number(cantidad) > 0)) {
      toast.info("Indica una cantidad mayor a 0.");
      return;
    }
    const onSuccess = () => {
      toast.success("Movimiento registrado.");
      onClose();
    };
    const onError = (error: unknown) =>
      toast.error(error instanceof Error ? error.message : "Error al registrar");

    if (modo === "entrada") {
      entrada(
        {
          tipo_instrumento_id: tipoId,
          almacen,
          cantidad: Number(cantidad),
          observacion,
        },
        { onSuccess, onError },
      );
    } else if (modo === "baja") {
      baja(
        {
          tipo_instrumento_id: tipoId,
          almacen,
          cantidad: Number(cantidad),
          baja: bajaTipo,
          observacion,
        },
        { onSuccess, onError },
      );
    } else {
      ajuste(
        {
          tipo_instrumento_id: tipoId,
          almacen,
          direccion,
          cantidad: Number(cantidad),
          observacion,
        },
        { onSuccess, onError },
      );
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={titulo}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Instrumento
          </label>
          <select
            value={tipoId}
            onChange={(e) => setTipoId(e.target.value)}
            className="mt-1 w-full border rounded px-3 py-2 bg-white"
          >
            <option value="">Selecciona...</option>
            {tipos.map((t) => (
              <option key={t.id} value={t.id}>
                {t.nombre}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Almacén
            </label>
            <select
              value={almacen}
              onChange={(e) => setAlmacen(e.target.value as Almacen)}
              className="mt-1 w-full border rounded px-3 py-2 bg-white"
            >
              {ALMACENES.map((a) => (
                <option key={a} value={a}>
                  {a.toUpperCase()}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Cantidad
            </label>
            <input
              type="number"
              min={0}
              step="1"
              value={cantidad}
              onChange={(e) => setCantidad(Number(e.target.value))}
              className="mt-1 w-full border rounded px-3 py-2"
            />
            {modo !== "entrada" && tipoId && (
              <p className="text-xs text-gray-500 mt-1">
                Disponible: {disponible}
              </p>
            )}
          </div>
        </div>

        {modo === "baja" && (
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Tipo de baja
            </label>
            <select
              value={bajaTipo}
              onChange={(e) =>
                setBajaTipo(e.target.value as "donacion" | "dano")
              }
              className="mt-1 w-full border rounded px-3 py-2 bg-white"
            >
              <option value="donacion">Donación</option>
              <option value="dano">Daño</option>
            </select>
          </div>
        )}

        {modo === "ajuste" && (
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Dirección
            </label>
            <select
              value={direccion}
              onChange={(e) =>
                setDireccion(e.target.value as "entrada" | "salida")
              }
              className="mt-1 w-full border rounded px-3 py-2 bg-white"
            >
              <option value="entrada">Entrada (sumar)</option>
              <option value="salida">Salida (restar)</option>
            </select>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Observación (opcional)
          </label>
          <textarea
            value={observacion}
            onChange={(e) => setObservacion(e.target.value)}
            rows={2}
            className="mt-1 w-full border rounded px-3 py-2"
          />
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isPending}
            className="bg-blue-600 text-white px-5 py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
          >
            {isPending ? "Guardando..." : "Registrar"}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default InstrumentoMovimientoModal;
