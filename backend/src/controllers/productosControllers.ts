import { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import {
  getProductosService,
  getProductoByIdService,
  createProductoService,
  updateProductoService,
  aplicarPreciosListaService,
} from '../services/productosServices';
import { ApiError } from '../utils/ApiError';
import { createClient } from '@supabase/supabase-js';
import multer from 'multer';
import { enviarPushATodos } from '../services/pushServices';
import { EventoNotificacionEnum } from '../enums/EventoNotificacionEnum';
import {
  registrarIngresosDesdeInventario,
  getStockProductos,
} from '../services/inventarioServices';
import {
  getCarpetaProductos,
  NOMBRE_LISTA,
  parsearListaPrecios,
} from '../utils/listaPreciosPdf';

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
  const { nombre, descripcion } = req.body ?? {};
  if (!nombre || !String(nombre).trim()) {
    throw new ApiError('El nombre es obligatorio', 400);
  }
  if (!descripcion || !String(descripcion).trim()) {
    throw new ApiError('El código es obligatorio', 400);
  }
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
    // ⚠ Solo admin: subir el inventario recalcula la disponibilidad de TODOS
    // los productos (productos.disponible) y eso afecta la lista de pedidos.
    if (req.user?.rol !== 'admin') {
      return res.status(403).json({ error: 'Solo administradores' });
    }
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

    // Registra el ingreso de mercancía nueva: crea lotes (uno por producto,
    // almacén y código de lote) y recalcula la disponibilidad. Los lotes
    // repetidos se reportan; los códigos nuevos crean el producto.
    let ingresos;
    try {
      ingresos = await registrarIngresosDesdeInventario(req.file.buffer);
    } catch (syncErr) {
      console.error('No se pudieron registrar los ingresos:', syncErr);
      return res.status(500).json({
        error:
          'El archivo se subió pero falló el registro de ingresos de inventario',
        fileName,
      });
    }

    // Web Push — evento `productos_actualizados`: se avisa a todos los usuarios
    // (admins + vendedores) de que el inventario cambió.
    try {
      await enviarPushATodos(
        {
          titulo: '📦 Productos actualizados',
          cuerpo: 'El inventario (inventario.xlsx) fue actualizado. Revisa el catálogo.',
          url: '#/productos',
        },
        EventoNotificacionEnum.PRODUCTOS_ACTUALIZADOS,
      );
    } catch (err) {
      console.error('No se pudo enviar push de productos actualizados:', err);
    }

    res.status(200).json({
      message: 'Ingresos de inventario registrados correctamente',
      fileName,
      ingresos,
    });
  },
];

/** Catálogo con el stock real por almacén (globalca / wms / total). */
export const getStock = async (req: Request, res: Response) => {
  const productos = await getStockProductos();
  res.json(productos);
};

/**
 * Sube la lista de precios en PDF (Área de Ventas). Solo admins.
 *
 * El archivo se guarda SIEMPRE con el nombre fijo `lista_precios.pdf` en
 * `uploads/productos` (se sustituye en cada subida) y además se parsea para
 * actualizar `productos.precio_base` con la columna "Precio OFERTA ESPECIAL
 * $/kg" de la tabla del PDF (matcheando por código = `productos.descripcion`).
 */
export const subirListaPrecios = [
  upload.single('filePrecios'),
  async (req: Request, res: Response) => {
    if (req.user?.rol !== 'admin') {
      return res.status(403).json({ error: 'Solo administradores' });
    }
    if (!req.file) {
      return res.status(400).json({ error: 'No se ha subido ningún archivo' });
    }

    const nombreOriginal = req.file.originalname || '';
    if (!nombreOriginal.toLowerCase().endsWith('.pdf')) {
      return res.status(400).json({ error: 'Solo se admiten archivos PDF' });
    }

    // Guarda el archivo con el nombre fijo (sustituye el anterior).
    const carpeta = getCarpetaProductos();
    if (!fs.existsSync(carpeta)) {
      fs.mkdirSync(carpeta, { recursive: true });
    }
    const rutaFija = path.join(carpeta, NOMBRE_LISTA);
    fs.writeFileSync(rutaFija, req.file.buffer);

    // Parsea el PDF y actualiza `precio_base` de los productos que matchean.
    let resumen;
    try {
      const filas = await parsearListaPrecios(req.file.buffer);
      resumen = await aplicarPreciosListaService(filas);
    } catch (err) {
      console.error('No se pudo procesar la lista de precios:', err);
      return res.status(500).json({
        error:
          'El archivo se guardó pero falló el procesamiento de precios. Revisa que el PDF tenga el formato de la lista de precios.',
        nombre: NOMBRE_LISTA,
      });
    }

    res.status(200).json({
      message: 'Lista de precios procesada correctamente',
      nombre: NOMBRE_LISTA,
      resumen,
    });
  },
];
