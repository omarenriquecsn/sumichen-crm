import { ProductosPedido } from '../entities/Productos_pedido';
import {
  getProductosPedidos,
  getProductosPedidoById,
  createProductosPedido,
  updateProductosPedido,
  deleteProductosPedido,
} from '../repositories/producto_pedidoRepository';
import { getPedidos } from '../repositories/pedidosRepository';

export const getProductos_pedidoService = async () => {
  const productos_pedido = await getProductosPedidos();
  return productos_pedido;
};

export const getProductosPedidosByVendedorService = async (
  pedido_id: string,
) => {
  const productos_pedido = await getProductosPedidos();
  return productos_pedido.filter((pp) => pp.pedido_id === pedido_id);
};

export const getProductos_pedidoByIdService = async (id: string) => {
  const productos_pedido = await getProductosPedidoById(id);
  return productos_pedido;
};

export const createProductos_pedidoService = async (
  Productos_pedidoData: Partial<ProductosPedido>,
) => {
  const nuevoProductos_pedido =
    await createProductosPedido(Productos_pedidoData);
  return nuevoProductos_pedido;
};

export const updateProductos_pedidoService = async (
  id: string,
  Productos_pedidoData: Partial<ProductosPedido>,
) => {
  const actualizado = await updateProductosPedido(id, Productos_pedidoData);
  return actualizado;
};

export const deleteProductos_pedidoService = async (id: string) => {
  const borrado = await deleteProductosPedido(id);
  return borrado;
};
