import { AppDataSource } from '../config/dataBaseConfig';
import { Devolucion } from '../entities/Devolucion';

const repo = () => AppDataSource.getRepository(Devolucion);

export const createDevolucion = async (data: Partial<Devolucion>) => {
  const nueva = repo().create(data);
  return repo().save(nueva);
};

export const getDevolucionesPorPedido = async (pedidoId: string) =>
  repo().find({
    where: { pedido_id: pedidoId },
    relations: ['detalles', 'usuario'],
    order: { fecha_creacion: 'DESC' },
  });

export const getDevolucionById = async (id: string) =>
  repo().findOne({ where: { id }, relations: ['detalles'] });
