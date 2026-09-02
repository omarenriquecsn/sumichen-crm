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

// Actualiza el perfil del usuario AUTENTICADO buscándolo por su supabase_id
// (= auth.users.id = session.user.id). Se usa en "Configuración → Perfil".
export const updateUsuarioBySupabaseId = async (
  supabaseId: string,
  userData: Partial<Vendedor>,
) => {
  const userRepository = AppDataSource.getRepository(Vendedor);
  await userRepository.update({ supabase_id: supabaseId }, userData);
  return await userRepository.findOneBy({ supabase_id: supabaseId });
};

export const deleteUsuario = async (id: string) => {
  const userRepository = AppDataSource.getRepository(Vendedor);
  return await userRepository.update(id, { activo: false });
};

/**
 * Indica si el teléfono pertenece a un usuario del equipo (vendedor o admin)
 * activo. Normaliza el teléfono a dígitos y lo compara contra los últimos 10
 * dígitos de `vendedores.telefono` (mismo criterio que `getLeadByTelefono`),
 * de modo que un WhatsApp con 58412... encuentre un perfil guardado como
 * "+58 412..." o "0412...".
 */
export const esUsuarioEquipoPorTelefono = async (telefono: string) => {
  const userRepository = AppDataSource.getRepository(Vendedor);
  const normalizado = telefono.replace(/\D/g, '');
  if (!normalizado) return false;
  const sufijo = normalizado.slice(-10); // últimos 10 dígitos
  const usuario = await userRepository
    .createQueryBuilder('v')
    .where(
      `v.activo = true AND v.telefono IS NOT NULL AND regexp_replace(v.telefono, '\D', '', 'g') LIKE :sufijo`,
      { sufijo: `%${sufijo}` }
    )
    .getOne();
  return !!usuario;
};
