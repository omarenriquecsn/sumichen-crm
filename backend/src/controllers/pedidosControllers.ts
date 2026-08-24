import { Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import {
  getPedidosService,
  getPedidosByIdService,
  createPedidosService,
  updatePedidosService,
  deletePedidosService,
  getPedidosByVendedorService,
} from '../services/pedidosServices';
import { ApiError } from '../utils/ApiError';
import convertirArchivo from '../utils/ConvertirArchivo';
import unirPDFS from '../utils/UnirArchivos';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_KEY!,
);
const upload = multer();

export const subirEvidencia = [
  upload.array('files'),

  async (req: Request, res: Response) => {
    const { id } = req.params;
    if (!req.files?.length) {
      return res.status(400).json({ error: 'No se envió ningún archivo' });
    }
    // Subir archivo a Supabase Storage
    // const fileExt = req.file.originalname.split('.').pop();
    const buffersPDF = await Promise.all(
      (req.files as Express.Multer.File[]).map(convertirArchivo),
    );
    const pdfFinal = await unirPDFS(buffersPDF);
    const fileName = `pedido_${id}_${Date.now()}.pdf`;

    //     const { data, error } = await supabase.storage
    //       .from('evidencias')
    //       .upload(fileName, pdfFinal, {
    //         contentType: 'application/pdf',
    //         upsert: true,
    //       });
    //     if (error) {
    //       return res.status(500).json({
    //         error: 'Error al subir archivo a Supabase',
    //         details: error.message,
    //       });
    //     }
    //     // Construir URL pública
    //     const { publicUrl } = supabase.storage
    //       .from('evidencias')
    //       .getPublicUrl(fileName).data;
    //     // Actualizar pedido con la URL
    //     const actualizado = await updatePedidosService(id, {
    //       evidencia_url: publicUrl,
    //     });
    //     if (!actualizado) {
    //       return res
    //         .status(500)
    //         .json({ error: 'No se pudo actualizar el pedido con la evidencia' });
    //     }
    //     res.json({ url: publicUrl });
    //   },
    // ];

    // Ruta donde se guardan las evidencias (PDF).
    // En producción default: /var/www/crm-backend/uploads/evidencias.
    // En dev local se configura con EVIDENCIA_UPLOAD_PATH (ej. la carpeta backend/uploads/evidencias).
    const uploadDir =
      process.env.EVIDENCIA_UPLOAD_PATH ||
      path.resolve(__dirname, '../../uploads/evidencias');
    const filePath = path.join(uploadDir, fileName);

    // Asegurar que la carpeta exista
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    // Guardar el archivo en el servidor
    try {
      fs.writeFileSync(filePath, pdfFinal);
      console.log('Archivo guardado en:', filePath);
    } catch (err) {
      console.error('Error al guardar archivo:', err);
    }

    // Construir URL pública. La base se configura con PUBLIC_API_URL
    // (prod: https://crmsumichen.com/api, dev: http://localhost:3000/api).
    const baseApiUrl = process.env.PUBLIC_API_URL || 'https://crmsumichen.com/api';
    const publicUrl = `${baseApiUrl}/uploads/${fileName}`;

    // Actualizar pedido con la URL
    const actualizado = await updatePedidosService(id, {
      evidencia_url: publicUrl,
    });

    if (!actualizado) {
      return res
        .status(500)
        .json({ error: 'No se pudo actualizar el pedido con la evidencia' });
    }

    res.json({ url: publicUrl });
  },
];

export const getPedidos = async (req: Request, res: Response) => {
  const pedidos = await getPedidosService();
  if (!pedidos) return [];
  res.json(pedidos);
};

export const getPedidoById = async (req: Request, res: Response) => {
  const { id } = req.params;
  const pedido = await getPedidosByIdService(id);
  if (!pedido) throw new ApiError('Pedido no encontrado', 404);
  res.json(pedido);
};

export const getPedidosByVendedor = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { rol } = req.user;
  const pedidos = await getPedidosByVendedorService(id, rol);
  if (pedidos.length === 0) throw new ApiError('No hay pedidos disponibles');
  res.json(pedidos);
};

export const createPedido = async (req: Request, res: Response) => {
  const nuevoPedido = await createPedidosService(req.body);
  if (!nuevoPedido) throw new ApiError('Error al crear el pedido', 400);
  res.status(201).json(nuevoPedido);
};

export const updatePedido = async (req: Request, res: Response) => {
  const { id } = req.params;
  const actualizado = await updatePedidosService(id, req.body);
  if (!actualizado) throw new ApiError('No se pudo actualizar el pedido', 400);
  res.json(actualizado);
};

export const deletePedido = async (req: Request, res: Response) => {
  const { id } = req.params;
  const borrado = await deletePedidosService(id);
  if (!borrado) throw new ApiError('No se pudo eliminar el pedido', 400);
  res.status(204).send();
};
