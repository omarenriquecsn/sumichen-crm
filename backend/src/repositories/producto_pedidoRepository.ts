import { AppDataSource } from '../config/dataBaseConfig';
import { ProductosPedido } from '../entities/Productos_pedido';

export const getProductosPedidos = async () => {
  const ProductosPedidoRepository =
    AppDataSource.getRepository(ProductosPedido);
  return await ProductosPedidoRepository.find();
};

export const getProductosPedidoById = async (id: string) => {
  const ProductosPedidoRepository =
    AppDataSource.getRepository(ProductosPedido);
  return await ProductosPedidoRepository.find({ where: { pedido_id: id } });
};

export const createProductosPedido = async (
  ProductosPedidoData: Partial<ProductosPedido>,
) => {
  const ProductosPedidoRepository =
    AppDataSource.getRepository(ProductosPedido);
  const newProductosPedido =
    ProductosPedidoRepository.create(ProductosPedidoData);
  return await ProductosPedidoRepository.save(newProductosPedido);
};

export const updateProductosPedido = async (
  id: string,
  ProductosPedidoData: Partial<ProductosPedido>,
) => {
  const ProductosPedidoRepository =
    AppDataSource.getRepository(ProductosPedido);
  await ProductosPedidoRepository.update(id, ProductosPedidoData);
  return await ProductosPedidoRepository.findOneBy({ id });
};

export const deleteProductosPedido = async (id: string) => {
  const ProductosPedidoRepository =
    AppDataSource.getRepository(ProductosPedido);
  return await ProductosPedidoRepository.delete(id);
};
