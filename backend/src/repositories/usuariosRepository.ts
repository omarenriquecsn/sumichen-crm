import { AppDataSource } from '../config/dataBaseConfig';
import { Vendedor } from '../entities/Vendedores';

export const getUsuarios = async () => {
  const userRepository = AppDataSource.getRepository(Vendedor);
  return await userRepository.find();
};

export const getUsuarioById = async (id: string) => {
  const userRepository = AppDataSource.getRepository(Vendedor);
  return await userRepository.findOneBy({ supabase_id: id });
};

export const getUsuarioByIdDb = async (id: string) => {
  const userRepository = AppDataSource.getRepository(Vendedor);
  return await userRepository.findOneBy({ id });
};

export const createUsuario = async (userData: Partial<Vendedor>) => {
  const userRepository = AppDataSource.getRepository(Vendedor);
  const newUser = userRepository.create(userData);
  return await userRepository.save(newUser);
};

export const updateUsuario = async (
  id: string,
  userData: Partial<Vendedor>,
) => {
  const userRepository = AppDataSource.getRepository(Vendedor);
  await userRepository.update(id, userData);
  return await userRepository.findOneBy({ id });
};

export const deleteUsuario = async (id: string) => {
  const userRepository = AppDataSource.getRepository(Vendedor);
  return await userRepository.update(id, { activo: false });
};
