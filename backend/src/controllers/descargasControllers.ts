import { Request, Response } from "express";
import { getDescargasPedidosService, getDescargasClientesService, getDescargasReunionesService, getDescargasActividadesService, getDescargasMetasService, getDescargasZonasService, getDescargasLeadsService, getDescargasChatsService } from "../services/descargasServices";

const esErrorSinDatos = (error: unknown): boolean =>
  error instanceof Error && /^no hay /i.test(error.message);

const manejarError = (res: Response, error: unknown) => {
  if (esErrorSinDatos(error)) {
    res.status(404).json({
      message: error instanceof Error ? error.message : "No hay datos en la base de datos para este descargable",
    });
    return;
  }
  res.status(500).json({ message: "Error al obtener las descargas" });
};

export const getDescargasPedidos = async (req: Request, res: Response) => {
    console.log('getDescargas called');
  try {
    const descargas = await getDescargasPedidosService();
    res.status(200).download(descargas, 'pedidos.xlsx');
  } catch (error) {
    manejarError(res, error);
  }
};
export const getDescargasClientes = async (req: Request, res: Response) => {
    console.log('getDescargas called');
  try {
    const descargas = await getDescargasClientesService();
    res.status(200).download(descargas, 'clientes.xlsx');
  } catch (error) {
    manejarError(res, error);
  }
};

export const getDescargasReuniones = async (req: Request, res: Response) => {
    console.log('getDescargas called');
  try {
    const descargas = await getDescargasReunionesService();
    res.status(200).download(descargas, 'reuniones.xlsx');
  } catch (error) {
    manejarError(res, error);
  }
};

export const getDescargasActividades = async (req: Request, res: Response) => {
    console.log('getDescargas called');
  try {
    const descargas = await getDescargasActividadesService();
    res.status(200).download(descargas, 'actividades.xlsx');
  } catch (error) {
    manejarError(res, error);
  }
};
export const getDescargasMetas = async (req: Request, res: Response) => {
    console.log('getDescargas called');
  try {
    const descargas = await getDescargasMetasService();
    res.status(200).download(descargas, 'metas.xlsx');
  } catch (error) {
    manejarError(res, error);
  }
};

export const getDescargasZonas = async (req: Request, res: Response) => {
    console.log('getDescargas called');
  try {
    const descargas = await getDescargasZonasService();
    res.status(200).download(descargas, 'zonas.xlsx');
  } catch (error) {
    manejarError(res, error);
  }
};

export const getDescargasLeads = async (req: Request, res: Response) => {
    console.log('getDescargas called');
  try {
    const descargas = await getDescargasLeadsService();
    res.status(200).download(descargas, 'leads.xlsx');
  } catch (error) {
    manejarError(res, error);
  }
};

export const getDescargasChats = async (req: Request, res: Response) => {
    console.log('getDescargas called');
  try {
    const descargas = await getDescargasChatsService();
    res.status(200).download(descargas, 'chats.xlsx');
  } catch (error) {
    manejarError(res, error);
  }
};
