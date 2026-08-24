import { Producto } from '../entities/Productos';
import {
  getProductos,
  getProductoById,
  createProducto,
  updateProducto,
} from '../repositories/productosRepository';

export const getProductosService = async () => {
  const productos = await getProductos();
  return productos;
};

export const getProductoByIdService = async (id: string) => {
  const producto = await getProductoById(id);
  return producto;
};

export const createProductoService = async (
  productoData: Partial<Producto>,
) => {
  const nuevoProducto = await createProducto(productoData);
  return nuevoProducto;
};

export const updateProductoService = async (
  id: string,
  productoData: Partial<Producto>,
) => {
  const productoActualizado = await updateProducto(id, productoData);
  return productoActualizado;
};
