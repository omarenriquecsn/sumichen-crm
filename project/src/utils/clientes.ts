import { Cliente } from "../types";
// Retorna un cliente por su ID
export const cliente = (
  cliente_id: string | undefined,
  clientes: Cliente[]
) => {
  if (!cliente_id || !clientes) return;
  return clientes?.find((c) => c.id === cliente_id);
};

// Retorna clientes activos
export const clientesActivos = (clientes: Cliente[] | undefined) =>
  Array.isArray(clientes)
    ? clientes?.filter((cliente) => cliente.estado === "activo") ?? []
    : [];

// Retorna clientes inactivos
export const clientesProspectos = (clientes: Cliente[] | undefined) =>
  Array.isArray(clientes)
    ? clientes?.filter((cliente) => {
        const prospectos = cliente.estado === "prospecto";
        return prospectos;
      }) ?? []
    : [];

// Retorna clientes prospectos creados en un mes específico (0-11)

export const clientesProspectosMes = (
  clientes: Cliente[] | undefined,
  mes: number
) => {
  const prospectosAño = Array.isArray(clientes)
    ? clientes.filter(
        (c) =>
          new Date(c.fecha_creacion).getFullYear() === new Date().getFullYear()
      )
    : [];
  const prospectosMes = Array.isArray(prospectosAño)
    ? clientesProspectos(prospectosAño)?.filter((cliente) => {
        return new Date(cliente.fecha_creacion).getMonth() === mes;
      })
    : [];
  return prospectosMes.length;
};

// Retorna clientes activos creados en un mes específico (0-11)
export const clientesNuevos = (clientes: Cliente[] | undefined) => {
  return Array.isArray(clientes)
    ? clientes?.filter((cliente) => {
        return cliente.estado === "activo";
      }) ?? []
    : [];
};

export const clientesNuevosArray = (clientes: Cliente[] | undefined) => {
  const clientesAño = Array.isArray(clientes)
    ? clientes.filter(
        (c) =>
          new Date(c.fecha_creacion).getFullYear() === new Date().getFullYear()
      )
    : [];
  const clientesMes = Array.isArray(clientesAño)
    ? clientesNuevos(clientesAño)?.filter((cliente) => {
        return (
          new Date(cliente.fecha_creacion).getMonth() === new Date().getMonth()
        );
      })
    : [];
  return Array.isArray(clientesMes)
    ? clientesMes.filter((cliente) => {
        return cliente.estado === "activo";
      }) ?? []
    : [];
};

// Retorna clientes activos creados en un mes específico (0-11)
export const clientesNuevosMes = (
  cliente: Cliente[] | undefined,
  mes: number
) => {
  const clientesAño = Array.isArray(cliente)
    ? cliente.filter(
        (c) =>
          new Date(c.fecha_creacion).getFullYear() === new Date().getFullYear()
      )
    : [];
  return Array.isArray(clientesAño)
    ? clientesNuevos(clientesAño)?.filter(
        (c) => new Date(c.fecha_creacion).getMonth() === mes
      ).length
    : 0;
};

//Clietes actualizados en el mes
function esFechaValida(valor: Date): boolean {
  const fecha = new Date(valor);
  return !isNaN(fecha.getTime());
}
export const clientesActualizadosMes = (
  clientes: Cliente[] | undefined,
  mes: number
) => {
  const clientesActivos = Array.isArray(clientes)
    ? clientes.filter(
        (c) =>
          c.estado === "activo" &&
          (c.estado_anterior === "prospecto" ||
            c.estado_anterior === "inactivo")
      )
    : [];
  const clientesAño = Array.isArray(clientesActivos)
    ? clientesActivos.filter(
        (c) =>
          new Date(c.fecha_actualizacion).getFullYear() ===
          new Date().getFullYear()
      )
    : [];

  return Array.isArray(clientesAño)
    ? clientesAño.filter((c) => {
        if (c.fecha_estado && esFechaValida(c.fecha_estado))
          return new Date(c.fecha_estado).getMonth() === mes;
      }).length
    : 0;
};

export const objetivoClientesConvertidos = (clientes: Cliente[]) => {
  const prospectosMes = clientesProspectos(clientes);
  if (!prospectosMes) return 0;
  return Math.ceil(prospectosMes.length * 0.25); // Suponiendo una tasa de conversión del 25%
};

export const getEtapaColor = (etapa: string) => {
  switch (etapa) {
    case "inicial":
      return "bg-gray-100 text-gray-800";
    case "calificado":
      return "bg-blue-100 text-blue-800";
    case "propuesta":
      return "bg-yellow-100 text-yellow-800";
    case "negociacion":
      return "bg-orange-100 text-orange-800";
    case "cerrado":
      return "bg-green-100 text-green-800";
    case "perdido":
      return "bg-red-100 text-red-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
};

export const getEstadoColor = (estado: string) => {
  switch (estado) {
    case "cliente":
      return "bg-green-100 text-green-800";
    case "prospecto":
      return "bg-blue-100 text-blue-800";
    case "inactivo":
      return "bg-gray-100 text-gray-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
};

export function esClienteNuevoEsteMes(cliente: Cliente) {
  const ahora = new Date();
  return (
    cliente.estado === "activo" &&
    (cliente.estado_anterior === "prospecto" ||
      cliente.estado_anterior === "inactivo") &&
    cliente.fecha_estado &&
    esFechaValida(cliente.fecha_estado) &&
    new Date(cliente.fecha_estado).getMonth() === ahora.getMonth() &&
    new Date(cliente.fecha_estado).getFullYear() === ahora.getFullYear()
  );
}
