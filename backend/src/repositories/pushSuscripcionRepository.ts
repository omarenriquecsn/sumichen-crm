import { PushSuscripcion } from '../entities/PushSuscripcion';
import { AppDataSource } from '../config/dataBaseConfig';

const PushSuscripcionRepository = AppDataSource.getRepository(PushSuscripcion);

export const guardarSuscripcionRepository = async (data: {
  vendedor_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  dispositivo?: string;
}) => {
  const existente = await PushSuscripcionRepository.findOneBy({
    endpoint: data.endpoint,
  });
  if (existente) {
    existente.vendedor_id = data.vendedor_id;
    existente.p256dh = data.p256dh;
    existente.auth = data.auth;
    if (data.dispositivo) existente.dispositivo = data.dispositivo;
    return await PushSuscripcionRepository.save(existente);
  }
  const nueva = PushSuscripcionRepository.create(data);
  return await PushSuscripcionRepository.save(nueva);
};

export const obtenerSuscripcionesPorVendedorRepository = async (vendedorId: string) => {
  return await PushSuscripcionRepository.find({
    where: { vendedor_id: vendedorId },
    order: { fecha_creacion: 'DESC' },
  });
};

export const obtenerSuscripcionesPorVendedoresRepository = async (vendedorIds: string[]) => {
  if (!vendedorIds.length) return [];
  return await PushSuscripcionRepository.createQueryBuilder('ps')
    .where('ps.vendedor_id IN (:...ids)', { ids: vendedorIds })
    .getMany();
};

export const eliminarSuscripcionRepository = async (endpoint: string) => {
  return await PushSuscripcionRepository.delete({ endpoint });
};
