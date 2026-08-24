import { Cliente, Reunion } from "../types";

export function filtrarReuniones({ reuniones, filtroEstado, terminoBusqueda, clientesMap }: {
  reuniones: Reunion[] | undefined,
  filtroEstado: string,
  terminoBusqueda: string,
  clientesMap: Map<string, Cliente>
}) {
  if (!reuniones) return [];
  const busquedaLower = terminoBusqueda.toLowerCase();
  return (Array.isArray(reuniones) ? reuniones : []).filter((reunion) => {
    // Filtro por estado
    const pasaFiltroEstado =
      filtroEstado === "todas" || reunion.estado === filtroEstado;

    // Filtro por término de búsqueda
    const clienteNombre = clientesMap.get(reunion.cliente_id)?.nombre ?? "";
    const clienteEmpresa = clientesMap.get(reunion.cliente_id)?.empresa ?? "";
    const pasaFiltroBusqueda =
      terminoBusqueda.trim() === "" ||
      reunion.titulo.toLowerCase().includes(busquedaLower) ||
      (reunion.descripcion?.toLowerCase().includes(busquedaLower) ?? false) ||
      clienteNombre.toLowerCase().includes(busquedaLower) ||
      clienteEmpresa.toLowerCase().includes(busquedaLower);

    return pasaFiltroEstado && pasaFiltroBusqueda;
  });
}

export function obtenerProximasReuniones(reuniones: Reunion[] | undefined) {
  if (!reuniones) return [];
  return (Array.isArray(reuniones) ? reuniones : [])
    .filter(
      (r) =>
        r.estado === "programada" && new Date(r.fecha_inicio) > new Date()
    )
    .sort(
      (a, b) =>
        new Date(a.fecha_inicio).getTime() -
        new Date(b.fecha_inicio).getTime()
    )
    .slice(0, 3);
}

export function buildClientesMap(clientes: Cliente[] | undefined) {
  if (!clientes) return new Map();
  return new Map(Array.isArray(clientes) ? clientes.map((cliente) => [cliente.id, cliente]) : []);
}
import { toast } from "react-toastify";
import dayjs from "dayjs";
import { Dispatch, SetStateAction } from "react";
import { NavigateFunction } from "react-router-dom";
import {  ICrearReunion, IFormReunion } from "../types";
import { User } from "@supabase/supabase-js";
import { UseMutateFunction } from "@tanstack/react-query";

export interface HandleCrearReunionParams {
  data: IFormReunion;
  currentUser: User | null;
  navigate: NavigateFunction;
  crearReunion: (
    params: {
      reunionData: ICrearReunion;
      currentUser: User;
    },
    callbacks: {
      onSuccess: () => void;
      onError: (error: unknown) => void;
    }
  ) => void;
  setModalCopen: Dispatch<SetStateAction<boolean>>;
}

export const handleCrearReunionUtil = ({
  data,
  currentUser,
  navigate,
  crearReunion,
  setModalCopen,
}: HandleCrearReunionParams) => {
  if (!currentUser) {
    toast.error("Error usuario no logueado");
    navigate("/login");
    return;
  }
  const { fecha, inicio, fin, ...rest } = data;

  const fecha_inicio = dayjs(fecha)
    .hour(Number(inicio.split(":")[0]))
    .minute(Number(inicio.split(":")[1]))
    .second(0)
    .millisecond(0)
    .toISOString();

  const fecha_fin = dayjs(fecha)
    .hour(Number(fin.split(":")[0]))
    .minute(Number(fin.split(":")[1]))
    .second(0)
    .millisecond(0)
    .toISOString();

  const newReunion = {
    ...rest,
    fecha_inicio: new Date(fecha_inicio),
    fecha_fin: new Date(fecha_fin),
  };

  crearReunion(
    {
      reunionData: newReunion,
      currentUser,
    },
    {
      onSuccess: () => {
        toast.success("Reunion creada con exito");
        setModalCopen(false);
      },
      onError: () => {
        toast.error("Error al crear la reunion");
        return;
      },
    }
  );

};

interface HandleActualizarReunionParams {
  data: Partial<Reunion>;
  currentUser: User;
  navigate: NavigateFunction;
  actualizarReunion: UseMutateFunction<
    void,
    Error,
    { ReunionData: Partial<Reunion>; currentUser: User },
    unknown
  >;
  setModalReunion: Dispatch<SetStateAction<boolean>>;
}

export const handleActualizarReunionUtil = ({
  data,
  currentUser,
  navigate,
  actualizarReunion,
  setModalReunion,
}: HandleActualizarReunionParams) => {
  if (!currentUser) {
    toast.error("Usuario no logueado");
    navigate("/login");
    return;
  }

  actualizarReunion(
    {
      ReunionData: data,
      currentUser,
    },
    {
      onSuccess: () => {
        toast.success("Reunion Actualizada");
        setModalReunion(false);
      },
      onError: () => {
        toast.error("Error editando la reunion");
      },
    }
  );
};

export const getEstadoColor = (estado: string) => {
  switch (estado) {
    case "programada":
      return "bg-blue-100 text-blue-800";
    case "completada":
      return "bg-green-100 text-green-800";
    case "cancelada":
      return "bg-red-100 text-red-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
};


 export const formatReunionPayload = (data: IFormReunion) => {
    const { fecha, inicio, fin, ...rest } = data;

    const fecha_inicio = new Date(
      dayjs(fecha)
        .hour(Number(inicio.split(":")[0]))
        .minute(Number(inicio.split(":")[1]))
        .second(0)
        .millisecond(0)
        .toISOString()
    );

    const fecha_fin = new Date(
      dayjs(fecha)
        .hour(Number(fin.split(":")[0]))
        .minute(Number(fin.split(":")[1]))
        .second(0)
        .millisecond(0)
        .toISOString()
    );

    return { ...rest, fecha_inicio, fecha_fin };
  };