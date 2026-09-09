import { AppDataSource } from '../config/dataBaseConfig';
import { EstadoClienteEnum } from '../enums/EstadoClienteEnum';
import { Cliente } from '../entities/Clientes';

export const getClientes = async () => {
  const ClienteRepository = AppDataSource.getRepository(Cliente);
  return await ClienteRepository.find({
    order: { fecha_creacion: 'DESC' },
  });
};

export const getClientesByIdAuxiliar = async (id: string) => {
  const ClienteRepository = AppDataSource.getRepository(Cliente);
  return await ClienteRepository.findOne({
    where: { id },
  });
};

export const getClienteById = async (id: string) => {
  const ClienteRepository = AppDataSource.getRepository(Cliente);
  return await ClienteRepository.find({
    where: { vendedor_id: id },
    order: { fecha_creacion: 'DESC' },
  });
};

export const getOneCliente = async (id: string) => {
  const ClienteRepository = AppDataSource.getRepository(Cliente);
  return await ClienteRepository.findOneBy({ id });
}

export const createCliente = async (ClienteData: Partial<Cliente>) => {
  const ClienteRepository = AppDataSource.getRepository(Cliente);
  const cleanData = Object.fromEntries(
    Object.entries(ClienteData).filter(([, value]) => value !== ''),
  );
  const newCliente = ClienteRepository.create(cleanData);
  return await ClienteRepository.save(newCliente);
};

export const updateCliente = async (
  id: string,
  ClienteData: Partial<Cliente>,
) => {
  const cleanData: Partial<Cliente> = Object.fromEntries(
    Object.entries(ClienteData).filter(([, value]) => value !== ''),
  );
  if (!cleanData || Object.keys(cleanData).length === 0) {
    throw new Error('No se proporcionaron datos para actualizar al cliente.');
  }
  const ClienteRepository = AppDataSource.getRepository(Cliente);
  await ClienteRepository.update(id, cleanData);
  return await ClienteRepository.findOneBy({ id });
};

// Actualiza únicamente la proyección de venta del cliente. Este es el único
// camino de escritura de `proyeccion_venta` (la ruta genérica la ignora).
export const actualizarProyeccion = async (id: string, valor: number) => {
  const ClienteRepository = AppDataSource.getRepository(Cliente);
  await ClienteRepository.update(id, { proyeccion_venta: valor });
  return await ClienteRepository.findOneBy({ id });
};

export const deleteCliente = async (id: string) => {
  const ClienteRepository = AppDataSource.getRepository(Cliente);
  return await ClienteRepository.update(id, {
    estado: EstadoClienteEnum.INACTIVO,
  });
};

export const deleteClienteDefinitivamente = async (id: string) => {
  const ClienteRepository = AppDataSource.getRepository(Cliente);
  return await ClienteRepository.delete(id);
};
