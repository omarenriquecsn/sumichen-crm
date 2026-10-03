import exportActividadesToExcel from '../utils/exportActividades';
import exportClientesToExcel from '../utils/exportClientes';
import { exportMetasToExcel } from '../utils/exportMetas';
import { exportPedidosToExcel } from '../utils/exportPedidos';
import  exportReunionesToExcel  from '../utils/exportReuniones';
import exportZonasToExcel from '../utils/exportZonas';
import exportLeadsToExcel from '../utils/exportLeads';
import exportChatsToExcel from '../utils/exportChats';
import exportProductosToExcel from '../utils/exportProductos';
import exportInstrumentosToExcel from '../utils/exportInstrumentos';
import exportKardexToExcel from '../utils/exportKardex';

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

export const getDescargasZonasService = async () => {
  return await exportZonasToExcel();
};

export const getDescargasLeadsService = async () => {
  return await exportLeadsToExcel();
};

export const getDescargasChatsService = async () => {
  return await exportChatsToExcel();
};

export const getDescargasProductosService = async () => {
  return await exportProductosToExcel();
};

export const getDescargasInstrumentosService = async () => {
  return await exportInstrumentosToExcel();
};

export const getDescargasKardexService = async () => {
  return await exportKardexToExcel();
};
