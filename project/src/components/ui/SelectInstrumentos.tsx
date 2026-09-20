import { useState } from "react";
import { Almacen, formInstrumento, InstrumentoStock, TipoInstrumento } from "../../types";
import { toast } from "react-toastify";

const ETIQUETA_ALMACEN: Record<Almacen, string> = {
  globalca: "GLOBALCA",
  wms: "WMS",
};

type Props = {
  tipos: TipoInstrumento[];
  stock: InstrumentoStock[];
  /** Almacenes disponibles según los productos del pedido. */
  almacenes: Almacen[];
  seleccionInicial?: formInstrumento[];
  onSeleccionar: (seleccion: formInstrumento[]) => void;
};

const SelectInstrumentos = ({
  tipos,
  stock,
  almacenes,
  seleccionInicial,
  onSeleccionar,
}: Props) => {
  const [seleccion, setSeleccion] = useState<formInstrumento[]>(
    seleccionInicial ?? [],
  );
  const [tipoId, setTipoId] = useState("");
  const [almacen, setAlmacen] = useState<Almacen | "">(
    almacenes.length === 1 ? almacenes[0] : "",
  );
  const [cantidad, setCantidad] = useState(1);

  const disponible = (tipoInstrumentoId: string, al: Almacen) =>
    Number(
      stock.find(
        (s) => s.tipo_instrumento_id === tipoInstrumentoId && s.almacen === al,
      )?.cantidad_disponible ?? 0,
    );

  const almacenDeLinea = (al: Almacen | "") =>
    (al || (almacenes.length === 1 ? almacenes[0] : "")) as Almacen;

  const notificar = (s: formInstrumento[]) => {
    setSeleccion(s);
    onSeleccionar(s);
  };

  const agregar = () => {
    if (!tipoId) {
      toast.info("Selecciona un instrumento.");
      return;
    }
    const al = almacenDeLinea(almacen);
    if (!al) {
      toast.info("Selecciona el almacén del instrumento.");
      return;
    }
    const cant = Math.max(1, Number(cantidad) || 0);
    const disp = disponible(tipoId, al);
    if (disp > 0 && cant > disp) {
      toast.info(`Solo hay ${disp.toFixed(2)} disponibles en ${ETIQUETA_ALMACEN[al]}.`);
      return;
    }
    const tipo = tipos.find((t) => t.id === tipoId);
    if (!tipo) return;

    const existente = seleccion.find(
      (s) => s.tipo_instrumento_id === tipoId && s.almacen === al,
    );
    if (existente) {
      notificar(
        seleccion.map((s) =>
          s.tipo_instrumento_id === tipoId && s.almacen === al
            ? { ...s, cantidad: s.cantidad + cant }
            : s,
        ),
      );
    } else {
      notificar([
        ...seleccion,
        {
          tipo_instrumento_id: tipoId,
          nombre: tipo.nombre,
          almacen: al,
          cantidad: cant,
        },
      ]);
    }
    setTipoId("");
    setCantidad(1);
  };

  const quitar = (tipoInstrumentoId: string, al: Almacen) =>
    notificar(
      seleccion.filter(
        (s) => !(s.tipo_instrumento_id === tipoInstrumentoId && s.almacen === al),
      ),
    );

  const cambiarCantidad = (
    tipoInstrumentoId: string,
    al: Almacen,
    valor: number,
  ) =>
    notificar(
      seleccion.map((s) =>
        s.tipo_instrumento_id === tipoInstrumentoId && s.almacen === al
          ? { ...s, cantidad: Math.max(1, Number(valor) || 1) }
          : s,
      ),
    );

  const cambiarAlmacenLinea = (
    tipoInstrumentoId: string,
    desde: Almacen,
    hacia: Almacen,
  ) =>
    notificar(
      seleccion.map((s) =>
        s.tipo_instrumento_id === tipoInstrumentoId && s.almacen === desde
          ? { ...s, almacen: hacia }
          : s,
      ),
    );

  return (
    <div className="space-y-3">
      {tipos.length === 0 ? (
        <p className="text-sm text-amber-600">
          No hay instrumentos configurados. Un administrador debe crearlos.
        </p>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-end bg-gray-50 p-3 rounded-lg">
            <div className="sm:col-span-5">
              <label className="block text-xs text-gray-500">Instrumento</label>
              <select
                value={tipoId}
                onChange={(e) => setTipoId(e.target.value)}
                className="w-full border rounded px-2 py-1 bg-white"
              >
                <option value="">Selecciona...</option>
                {tipos.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.nombre}
                  </option>
                ))}
              </select>
            </div>
            {almacenes.length > 1 && (
              <div className="sm:col-span-3">
                <label className="block text-xs text-gray-500">Almacén</label>
                <select
                  value={almacen}
                  onChange={(e) => setAlmacen(e.target.value as Almacen)}
                  className="w-full border rounded px-2 py-1 bg-white"
                >
                  <option value="">Selecciona...</option>
                  {almacenes.map((a) => (
                    <option key={a} value={a}>
                      {ETIQUETA_ALMACEN[a]}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div className="sm:col-span-2">
              <label className="block text-xs text-gray-500">Cantidad</label>
              <input
                type="number"
                min={1}
                step="1"
                value={cantidad}
                onChange={(e) => setCantidad(Number(e.target.value))}
                className="w-full border rounded px-2 py-1"
              />
            </div>
            <div className="sm:col-span-2">
              <button
                type="button"
                onClick={agregar}
                className="w-full bg-blue-500 text-white px-3 py-2 rounded hover:bg-blue-600"
              >
                Agregar
              </button>
            </div>
          </div>

          {seleccion.length > 0 && (
            <div className="space-y-2">
              {seleccion.map((s) => (
                <div
                  key={`${s.tipo_instrumento_id}-${s.almacen}`}
                  className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center bg-white border rounded-lg p-3"
                >
                  <span className="sm:col-span-5 font-medium text-gray-800">
                    {s.nombre}
                  </span>
                  <div className="sm:col-span-3">
                    {almacenes.length > 1 ? (
                      <select
                        value={s.almacen}
                        onChange={(e) =>
                          cambiarAlmacenLinea(
                            s.tipo_instrumento_id,
                            s.almacen,
                            e.target.value as Almacen,
                          )
                        }
                        className="w-full border rounded px-2 py-1 bg-white text-sm"
                      >
                        {almacenes.map((a) => (
                          <option key={a} value={a}>
                            {ETIQUETA_ALMACEN[a]}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <span className="text-sm text-gray-600">
                        {ETIQUETA_ALMACEN[s.almacen]}
                      </span>
                    )}
                    <p className="text-[10px] text-gray-500">
                      Disp: {disponible(s.tipo_instrumento_id, s.almacen).toFixed(0)}
                    </p>
                  </div>
                  <div className="sm:col-span-2">
                    <input
                      type="number"
                      min={1}
                      step="1"
                      value={s.cantidad}
                      onChange={(e) =>
                        cambiarCantidad(
                          s.tipo_instrumento_id,
                          s.almacen,
                          Number(e.target.value),
                        )
                      }
                      className="w-full border rounded px-2 py-1"
                    />
                  </div>
                  <div className="sm:col-span-2 flex justify-end">
                    <button
                      type="button"
                      onClick={() => quitar(s.tipo_instrumento_id, s.almacen)}
                      className="text-red-500 hover:text-red-700 text-sm"
                    >
                      Quitar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default SelectInstrumentos;
