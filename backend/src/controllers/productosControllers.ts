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
import { sincronizarDisponibilidadDesdeInventario } from '../utils/inventarioDisponibilidad';
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

    // Sincroniza `productos.disponible` según el stock del inventario recién
    // subido (col 1 = código, col 5 = TOTAL). Si falla, el archivo ya quedó en
    // Storage pero respondemos error para que el usuario lo sepa y reintente.
    let sincronizacion;
    try {
      sincronizacion = await sincronizarDisponibilidadDesdeInventario(
        req.file.buffer,
      );
    } catch (syncErr) {
      console.error('No se pudo sincronizar la disponibilidad:', syncErr);
      return res.status(500).json({
        error:
          'El archivo se subió pero falló la sincronización de disponibilidad',
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
      message: 'Archivo subido exitosamente',
      fileName,
      sincronizacion,
    });
  },
];

/**
 * Sube la lista de precios en PDF (área de Mayerlin). Solo admins.
 *
 * El archivo se guarda SIEMPRE con el nombre fijo `lista_precios.pdf` en
 * `uploads/productos` (se sustituye en cada subida) y además se parsea para
 * actualizar `productos.precio_base` con la columna "Precio OFERTA ESPECIAL
 * $/kg" de la tabla del PDF (matcheando por código = `productos.descripcion`).
 */
export const subirListaPrecios = [
  upload.single('file'),
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
