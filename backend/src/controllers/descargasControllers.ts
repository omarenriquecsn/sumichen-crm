import { Request, Response } from "express";
import { getDescargasPedidosService, getDescargasClientesService, getDescargasReunionesService, getDescargasActividadesService, getDescargasMetasService } from "../services/descargasServices";

export const getDescargasPedidos = async (req: Request, res: Response) => {
    console.log('getDescargas called');
  try {
    const descargas = await getDescargasPedidosService();
    res.status(200).download(descargas, 'pedidos.xlsx');
  } catch (error) {
    res.status(500).json({ message: "Error al obtener las descargas" });
  }
};
export const getDescargasClientes = async (req: Request, res: Response) => {
    console.log('getDescargas called');
  try {
    const descargas = await getDescargasClientesService();
    res.status(200).download(descargas, 'clientes.xlsx');
  } catch (error) {
    res.status(500).json({ message: "Error al obtener las descargas" });
  }
};

export const getDescargasReuniones = async (req: Request, res: Response) => {
    console.log('getDescargas called');
  try {
    const descargas = await getDescargasReunionesService();
    res.status(200).download(descargas, 'reuniones.xlsx');
  } catch (error) {
    res.status(500).json({ message: "Error al obtener las descargas" });
  }
};

export const getDescargasActividades = async (req: Request, res: Response) => {
    console.log('getDescargas called');
  try {
    const descargas = await getDescargasActividadesService();
    res.status(200).download(descargas, 'actividades.xlsx');
  } catch (error) {
    res.status(500).json({ message: "Error al obtener las descargas" });
  }
};
export const getDescargasMetas = async (req: Request, res: Response) => {
    console.log('getDescargas called');
  try {
    const descargas = await getDescargasMetasService();
    res.status(200).download(descargas, 'metas.xlsx');
  } catch (error) {
    res.status(500).json({ message: "Error al obtener las descargas" });
  }
};
