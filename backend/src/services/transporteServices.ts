import { Transporte } from '../entities/Transporte';
import {
  getTransporteByPedidoId,
  createTransporte,
  updateTransporte,
  setPedidoTransporte,
} from '../repositories/transporteRepository';
import { ApiError } from '../utils/ApiError';

export const getTransporteService = async (pedidoId: string) => {
  const transporte = await getTransporteByPedidoId(pedidoId);
  if (!transporte) {
    throw new ApiError('El pedido no tiene transporte registrado', 404);
  }
  return transporte;
};

export const saveTransporteService = async (
  pedidoId: string,
  data: Partial<Transporte>,
) => {
  const existente = await getTransporteByPedidoId(pedidoId);
  if (existente) {
    const actualizado = await updateTransporte(existente.id, data);
    if (!actualizado) {
      throw new ApiError('No se pudo actualizar el transporte', 400);
    }
    return actualizado;
  }

  const nuevo = await createTransporte(data);
  if (!nuevo) {
    throw new ApiError('No se pudo crear el transporte', 400);
  }

  const asociado = await setPedidoTransporte(pedidoId, nuevo.id);
  if (!asociado) {
    throw new ApiError('No se pudo asociar el transporte al pedido', 400);
  }

  return nuevo;
};
