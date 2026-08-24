import { Request, Response } from 'express';
import {
  getProductosService,
  getProductoByIdService,
  createProductoService,
  updateProductoService,
} from '../services/productosServices';
import { ApiError } from '../utils/ApiError';
import { createClient } from '@supabase/supabase-js';
import multer from 'multer';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_KEY!,
);
const upload = multer();

export const getProductos = async (req: Request, res: Response) => {
  const productos = await getProductosService();
  if (productos.length === 0)
    throw new ApiError('No hay productos disponibles');
  res.json(productos);
};

export const getProductoById = async (req: Request, res: Response) => {
  const { id } = req.params;
  const producto = await getProductoByIdService(id);
  if (!producto) throw new ApiError('Producto no encontrado', 404);
  res.json(producto);
};

export const createProducto = async (req: Request, res: Response) => {
  const nuevoProducto = await createProductoService(req.body);
  if (!nuevoProducto) throw new ApiError('No se pudo crear el producto', 400);
  res.status(201).json(nuevoProducto);
};

export const updateProducto = async (req: Request, res: Response) => {
  const { id } = req.params;
  const productoActualizado = await updateProductoService(id, req.body);
  if (!productoActualizado)
    throw new ApiError('No se pudo actualizar el producto', 400);
  res.json(productoActualizado);
};

export const subirInventario = [
  upload.single('file'),
  async (req: Request, res: Response) => {
    if (!req.file) {
      return res.status(400).json({ error: 'No se ha subido ningún archivo' });
    }
    const fileName = 'inventario.xlsx';

    const { data, error } = await supabase.storage
      .from('inventario')
      .upload(fileName, req.file.buffer, {
        contentType: req.file.mimetype,
        upsert: true,
      });

    if (error) {
      return res.status(500).json({ error: 'Error al subir el archivo' });
    }

    res.status(200).json({ message: 'Archivo subido exitosamente', fileName });
  },
];
