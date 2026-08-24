import { AppDataSource } from '../config/dataBaseConfig';
import { MenuBienvenida } from '../entities/MenuBienvenida';

const getRepo = () => AppDataSource.getRepository(MenuBienvenida);

export const getMenuBienvenida = async (): Promise<MenuBienvenida | null> => {
  const repo = getRepo();
  const configs = await repo.find({ order: { fecha_creacion: 'ASC' }, take: 1 });
  return configs[0] || null;
};

export const upsertMenuBienvenida = async (data: Partial<MenuBienvenida>): Promise<MenuBienvenida> => {
  const repo = getRepo();
  const existente = await getMenuBienvenida();
  if (existente) {
    await repo.update(existente.id, data);
    return (await repo.findOne({ where: { id: existente.id } }))!;
  }
  const nuevo = repo.create(data);
  return await repo.save(nuevo);
};
