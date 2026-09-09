import { Request, Response } from 'express';
import multer from 'multer';
import {
  getClientesService,
  getClientesByIdService,
  createClientesService,
  updateClientesService,
  deleteClientesService,
  deleteClientesDefinitivamenteService,
  aplicarProyeccionesService,
} from '../services/clientesServices';
import { parsearProyeccionesExcel } from '../utils/proyeccionesExcel';
import { ApiError } from '../utils/ApiError';

const upload = multer({ limits: { fileSize: 10 * 1024 * 1024 } });

export const getClientes = async (req: Request, res: Response) => {
  const clientes = await getClientesService();
  if (clientes.length === 0) throw new ApiError('No hay clientes para mostrar');
  res.json(clientes);
};

export const getClientesById = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { rol } = req.user;

  const cliente = await getClientesByIdService(id, rol);

  if (!cliente) throw new ApiError('Cliente no encontrado', 404);

  res.json(cliente);
};

export const createClientes = async (req: Request, res: Response) => {
  const { rol } = req.user;
  const nuevoCliente = await createClientesService(req.body, rol);  

  if (!nuevoCliente) throw new ApiError('No se ha creado el cliente', 400);

  res.status(201).json(nuevoCliente);
};

export const updateClientes = async (req: Request, res: Response) => {
  const { id } = req.params;
  const clienteActualizado = await updateClientesService(id, req.body);

  if (!clienteActualizado)
    throw new ApiError('No se actualizó el cliente', 400);

  res.json(clienteActualizado);
};

export const deleteClientes = async (req: Request, res: Response) => {
  const { id } = req.params;
  const clienteBorrado = await deleteClientesService(id);

  if (!clienteBorrado) throw new ApiError('No se ha borrado el cliente', 400);

  res.status(204).send();
};

export const deleteClientesDefinitivamente = async (
  req: Request,
  res: Response,
) => {
  const { id } = req.params;
  const { rol } = req.user;

  if (rol !== 'admin')
    throw new ApiError('No autorizado para eliminar definitivamente', 403);

  const clienteBorrado = await deleteClientesDefinitivamenteService(id);

  if (!clienteBorrado)
    throw new ApiError('No se ha borrado el cliente', 400);

  res.status(204).send();
};

/**
 * POST /clientes/proyecciones (JWT + multer)
 * Recibe un Excel con dos columnas (RIF | proyección de venta) y actualiza
 * únicamente `clientes.proyeccion_venta`. Cualquier usuario autenticado puede
 * cargarlo; un vendedor solo afecta sus propios clientes y el admin a todos.
 */
export const subirProyecciones = [
  upload.single('file'),
  async (req: Request, res: Response) => {
    if (!req.file) {
      return res.status(400).json({ error: 'No se ha subido ningún archivo' });
    }
    try {
      const filas = await parsearProyeccionesExcel(req.file.buffer);
      if (filas.length === 0) {
        return res.status(400).json({
          error:
            'El archivo no tiene filas válidas. Espera dos columnas: RIF y proyección de venta.',
        });
      }
      const resumen = await aplicarProyeccionesService(
        filas,
        req.user?.rol ?? 'vendedor',
        req.user?.vendedor_db_id,
      );
      return res.status(200).json({
        message: 'Proyecciones cargadas exitosamente',
        nombre: req.file.originalname,
        resumen,
      });
    } catch (err) {
      console.error('Error al procesar proyecciones:', err);
      return res
        .status(500)
        .json({ error: 'Error al procesar el archivo de proyecciones' });
    }
  },
];
