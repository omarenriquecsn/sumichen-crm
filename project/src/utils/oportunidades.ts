import { Oportunidad, Reunion } from "../types";
import {probabilidadPipeline} from "./analitica"

export const getColorClasses = (color: string): string => {
  const map = {
    gray: "bg-gray-100 text-gray-800 border-gray-200",
    blue: "bg-blue-100 text-blue-800 border-blue-200",
    yellow: "bg-yellow-100 text-yellow-800 border-yellow-200",
    orange: "bg-orange-100 text-orange-800 border-orange-200",
    green: "bg-green-100 text-green-800 border-green-200",
  };

  return map[color as keyof typeof map] || map.gray;
};

export const getProbabilityColor = (prob: number): string => {
  if (prob >= 80) return "text-green-600";
  if (prob >= 60) return "text-yellow-600";
  if (prob >= 40) return "text-orange-600";
  return "text-red-600";
};

export const calcularTotalEtapa = (
  oportunidades: Oportunidad[],
  etapaId: string
): number =>
  Array.isArray(oportunidades) ? oportunidades
    .filter((o) => o.etapa === etapaId)
    .reduce((acc, o) => acc + Number(o.valor), 0) : 0;

export const OportunidadesUtilmes = (
  oportunidades: Oportunidad[] | undefined
): Oportunidad[] | [] => {
  const OportunidadesMes =
    Array.isArray(oportunidades) ? oportunidades?.filter(
      (oportunidad) =>
        new Date(oportunidad.fecha_creacion).getMonth() ===
        new Date().getMonth()
    ) ?? [] : [];
  return OportunidadesMes;
};

export const valorPipeline = (oportunidades: Oportunidad[] | undefined) =>
  Array.isArray(oportunidades) ? oportunidades?.reduce(
    (total, oportunidad) => total + Number(oportunidad.valor),
    0
  ) : 0;

export function obtenerReunionesProximas(reuniones: Reunion[]): Reunion[] {
  
  if (!reuniones) return [];
  const hoy = new Date();
  const limite = new Date();
  limite.setDate(hoy.getDate() + 2);

  return reuniones
    .map((r) => ({
      ...r,
      fecha: new Date(r.fecha_inicio),
    }))
    .filter((r) => r.fecha >= hoy && r.fecha <= limite)
    .sort((a, b) => a.fecha.getTime() - b.fecha.getTime())
    .slice(0, 4);
}

export const clientePorEtapaAnalitica = (
  oportunidades: Oportunidad[] | undefined,
  etapa: string
) => {
  const etapaFormateada = etapa.charAt(0).toUpperCase() + etapa.slice(1);

  if (!oportunidades)
    return {
      etapa: etapaFormateada,
      cantidad: 0,
      porcentaje: 0,
    };
  const oportunidadesFiltradas = Array.isArray(oportunidades) ? oportunidades.filter(
    (oportunidad) => oportunidad.etapa === etapa
  ) : [];

  
  return {
    etapa: etapaFormateada,
    cantidad: oportunidadesFiltradas.length,
    porcentaje: probabilidadPipeline(oportunidadesFiltradas, etapa),
  };
};


