import dayjs from "dayjs";
import {
  Actividad,
  ActividadFormateada,
  Cliente,
  Meta,
  Reunion,
  User,
} from "../types";
import { NavigateFunction } from "react-router-dom";
import { toast } from "react-toastify";
import { obtenerReunionesProximas } from "./oportunidades";

export function formatearActividades(
  actividades: Actividad[],
  clientes: Cliente[],
  vendedore: User[] | undefined
): ActividadFormateada[] {

  const ahora = new Date();

  return actividades.map((actividad) => {
    const cliente = clientes?.find(c => c.id === actividad.cliente_id)?.empresa
    const vendedor = vendedore?.find(v => v.id === actividad.vendedor_id)?.nombre
    const fechaLimite = actividad.fecha_vencimiento ?? actividad.fecha;
    const vencida = !actividad.completado && fechaLimite < ahora;

    let status: ActividadFormateada["status"] = "pendiente";
    if (actividad.completado) status = "completada";
    else if (vencida) status = "vencida";

    return {
      id: actividad.id,
      type: actividad.tipo.toLowerCase(),
      title: actividad.titulo,
      time: dayjs(fechaLimite).fromNow(),
      status,
      cliente,
      vendedor
      
    };
  });
}

export const actividadesPoCategoria = (
  actividades: Actividad[] | undefined,
  tipo: string,
  metas: Meta[]
): {
  tipo: string;
  cantidad: number;
  porcentaje: number | null;
  meta: number;
} => {
  const meses = [
    'Enero',
    'Febrero',
    'Marzo',
    'Abril',
    'Mayo',
    'Junio',
    'Julio',
    'Agosto',
    'Septiembre',
    'Octubre',
    'Noviembre',
    'Diciembre'
  ]
  const metasMesActual = Array.isArray(metas) ? metas.find((meta) => {
    return meta.mes === meses[new Date().getMonth()]
  }) : undefined;
  const tipoParaMetas = () => {
    if(tipo === "llamada") return "llamadas";
    if(tipo === "email") return "emails";
    if(tipo === "reunion") return "reuniones";
    if(tipo === "tarea") return "tareas";
    return ;
  }
  const tipoMeta = tipoParaMetas();

  const metaValor =
    metasMesActual && typeof tipoMeta === "string" && tipoMeta in metasMesActual
      ? Number(metasMesActual[tipoMeta as keyof Meta]) || 0
      : 0;

  const tipoFormateado =
    tipo === "reunion"
      ? "Reuniones"
      : tipo.charAt(0).toUpperCase() + tipo.slice(1) + "s";
  if (!actividades)
    return {
      tipo: tipoFormateado,
      cantidad: 0,
      porcentaje: 0,
      meta: metaValor,
    };

  const ahora = new Date();
  const actividadesFiltradas = (
    Array.isArray(actividades) ? actividades : []
  ).filter((actividad) => {
    const fecha = new Date(actividad.fecha);
    return (
      actividad.tipo === tipo &&
      actividad.completado &&
      fecha.getMonth() === ahora.getMonth() &&
      fecha.getFullYear() === ahora.getFullYear()
    );
  });

  const cantidad = actividadesFiltradas.length;
  const porcentaje = metaValor > 0 ? (cantidad / metaValor) * 100 : null;

  return {
    tipo: tipoFormateado,
    cantidad,
    porcentaje,
    meta: metaValor,
  };
};

export interface CrearActividadParams {
  data: Partial<Actividad>;
  currentUser: Partial<User> | User;
  navigate: NavigateFunction;
  crearActividad: (
    params: {
      actividadData: Partial<Actividad>;
      currentUser: Partial<User> | User;
    },
    callbacks: {
      onSuccess: () => void;
      onError: (error: unknown) => void;
    }
  ) => void;
  setModalBOpen?: (v: boolean) => void;
}

export function handleCrearActividadUtil({
  data,
  currentUser,
  navigate,
  crearActividad,
  setModalBOpen,
}: CrearActividadParams) {
  if (!currentUser) {
    toast.error("Error el usuario no logueado");
    navigate("/login");
    return;
  }
  crearActividad(
    { actividadData: data, currentUser },
    {
      onSuccess: () => {
        toast.success("Actividad creada");
        if (setModalBOpen) setModalBOpen(false);
        
      },
      onError: (error: unknown) => {
        toast.error("Error al Crear Actividad");
        if (error instanceof Error) {
          throw new Error(`Error: ${error.message}`);
        } else {
          throw new Error("Error desconocido");
        }
      },
    }
  );
}

export type ProximaActividadItem = {
  id: string;
  tipo: "llamada" | "email" | "reunion";
  titulo: string;
  fecha: Date;
  cliente_id: string;
  vendedor_id: string;
  origen: "reunion" | "actividad";
};

export function obtenerActividadesProximas(
  actividades: Actividad[],
  dias = 2
): Actividad[] {
  if (!actividades || !Array.isArray(actividades)) return [];
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const limite = new Date();
  limite.setDate(hoy.getDate() + dias);
  limite.setHours(23, 59, 59, 999);

  return actividades
    .map((a) => ({
      ...a,
      fechaObj: new Date(a.fecha),
    }))
    .filter(
      (a) =>
        !a.completado &&
        ["llamada", "email", "reunion"].includes(a.tipo) &&
        a.fechaObj >= hoy &&
        a.fechaObj <= limite
    )
    .sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime())
    .slice(0, 4);
}

export function obtenerProximasActividades(
  actividades: Actividad[],
  reuniones: Reunion[]
): ProximaActividadItem[] {
  const actProximas = obtenerActividadesProximas(actividades);
  const reuProximas = obtenerReunionesProximas(reuniones);

  const reunionIds = new Set(reuniones.map((r) => r.id));

  const actProximasSinDuplicados = actProximas.filter(
    (a) => !(a.id_tipo_actividad && reunionIds.has(a.id_tipo_actividad))
  );

  const items: ProximaActividadItem[] = [
    ...reuProximas.map((r) => ({
      id: r.id,
      tipo: "reunion" as const,
      titulo: r.titulo,
      fecha: new Date(r.fecha_inicio),
      cliente_id: r.cliente_id,
      vendedor_id: r.vendedor_id,
      origen: "reunion" as const,
    })),
    ...actProximasSinDuplicados.map((a) => ({
      id: a.id,
      tipo: a.tipo as "llamada" | "email" | "reunion",
      titulo: a.titulo,
      fecha: new Date(a.fecha),
      cliente_id: a.cliente_id,
      vendedor_id: a.vendedor_id,
      origen: "actividad" as const,
    })),
  ];

  return items
    .sort((a, b) => a.fecha.getTime() - b.fecha.getTime())
    .slice(0, 6);
}
