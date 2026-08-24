import exportActividadesToExcel from '../utils/exportActividades';
import exportClientesToExcel from '../utils/exportClientes';
import { exportMetasToExcel } from '../utils/exportMetas';
import { exportPedidosToExcel } from '../utils/exportPedidos';
import  exportReunionesToExcel  from '../utils/exportReuniones';

export const getDescargasPedidosService = async () => {
 
  return await exportPedidosToExcel();
};

export const getDescargasClientesService = async () => {
 
  return await exportClientesToExcel();
};
export const getDescargasReunionesService = async () => {
 
  return await exportReunionesToExcel();
};

export const getDescargasActividadesService = async () => {
 
  return await exportActividadesToExcel();
};

export const getDescargasMetasService = async () => {
 
  return await exportMetasToExcel();
};
