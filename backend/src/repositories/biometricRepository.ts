import { CredencialBiometrica } from '../entities/CredencialBiometrica';
import { AppDataSource } from '../config/dataBaseConfig';

const CredencialRepository = AppDataSource.getRepository(CredencialBiometrica);

export const guardarCredencialRepository = async (data: {
  supabase_id: string;
  credential_id: string;
  public_key: string;
  counter: number;
  dispositivo?: string;
}) => {
  const nueva = CredencialRepository.create(data);
  return await CredencialRepository.save(nueva);
};

export const obtenerCredencialPorCredentialIdRepository = async (credentialId: string) => {
  return await CredencialRepository.findOneBy({ credential_id: credentialId });
};

export const obtenerCredencialesPorSupabaseIdRepository = async (supabaseId: string) => {
  return await CredencialRepository.find({
    where: { supabase_id: supabaseId },
    order: { fecha_creacion: 'DESC' },
  });
};

export const actualizarCounterRepository = async (credentialId: string, counter: number) => {
  return await CredencialRepository.update(
    { credential_id: credentialId },
    { counter }
  );
};

export const eliminarCredencialRepository = async (id: string) => {
  return await CredencialRepository.delete({ id });
};
