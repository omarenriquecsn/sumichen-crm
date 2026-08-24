import { AppDataSource } from '../config/dataBaseConfig';
import { Producto } from '../entities/Productos';

export const getProductos = async () => {
  const ProductoRepository = AppDataSource.getRepository(Producto);
  return await ProductoRepository.find();
};

export const getProductoById = async (id: string) => {
  const ProductoRepository = AppDataSource.getRepository(Producto);
  return await ProductoRepository.findOneBy({ id });
};

export const createProducto = async (ProductoData: Partial<Producto>) => {
  const ProductoRepository = AppDataSource.getRepository(Producto);
  const newProducto = ProductoRepository.create(ProductoData);
  return await ProductoRepository.save(newProducto);
};

export const updateProducto = async (
  id: string,
  ProductoData: Partial<Producto>,
) => {
  const ProductoRepository = AppDataSource.getRepository(Producto);
  await ProductoRepository.update(id, ProductoData);
  return await ProductoRepository.findOneBy({ id });
};
