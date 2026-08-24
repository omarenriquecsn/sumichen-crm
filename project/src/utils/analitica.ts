import { Oportunidad } from "../types";

export const etapaPipeline = (
  oportunidades: Oportunidad[] | undefined,
  etapa: string
) => oportunidades?.filter((oportunidad) => oportunidad.etapa === etapa);

export const valorPipeline = (oportunidades: Oportunidad[] | undefined) =>
  oportunidades?.reduce(
    (total, oportunidad) => total + Number(oportunidad.valor),
    0
  );

export const probabilidadPipeline = (
  oportunidades: Oportunidad[] | undefined, etapa: string
) =>{
    const oportunidadesFiltradas = etapaPipeline(oportunidades, etapa)
    const totalProbabilidad = oportunidadesFiltradas?.reduce((total, oportunidad) => total + Number(oportunidad.probabilidad), 0)
    if(!oportunidadesFiltradas) return 0
    if(!totalProbabilidad) return 0
    return totalProbabilidad/oportunidadesFiltradas?.length
  }

  export const getColorClasses = (color: string) => {
    switch (color) {
      case "green":
        return "bg-green-100 text-green-600";
      case "blue":
        return "bg-blue-100 text-blue-600";
      case "purple":
        return "bg-purple-100 text-purple-600";
      case "orange":
        return "bg-orange-100 text-orange-600";
      default:
        return "bg-gray-100 text-gray-600";
    }
  };
  