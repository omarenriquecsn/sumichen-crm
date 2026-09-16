import { Transporte } from '../entities/Transporte';
import {
  getTransporteByPedidoId,
  createTransporte,
  updateTransporte,
  setPedidoTransporte,
} from '../repositories/transporteRepository';
import { ApiError } from '../utils/ApiError';
import { AppDataSource } from '../config/dataBaseConfig';
import { Pedido } from '../entities/Pedidos';
import { getClientesByIdAuxiliar } from '../repositories/clientesRepository';
import { getUsuarioByIdDb } from '../repositories/usuariosRepository';
import { enviarPushAAdmins } from './pushServices';
import { EventoNotificacionEnum } from '../enums/EventoNotificacionEnum';

/**
 * Avisa a los admins cuando un VENDEDOR edita el transporte de un pedido.
 * Si quien edita es un admin, no se envía nada. El fallo del push nunca debe
 * romper el guardado del transporte.
 */
const notificarTransporteEditado = async (
  pedidoId: string,
  editor?: { id?: string; rol?: string },
) => {
  if (editor?.rol !== 'vendedor') return;

  try {
    const pedido = await AppDataSource.getRepository(Pedido).findOneBy({
      id: pedidoId,
    });
    if (!pedido) return;

    const usuario = editor.id ? await getUsuarioByIdDb(editor.id) : null;
    const nombreEditor = usuario
      ? `${usuario.nombre || ''} ${usuario.apellido || ''}`.trim()
      : 'Un vendedor';

    const cliente = await getClientesByIdAuxiliar(pedido.cliente_id);
    const empresa = cliente?.empresa || 'el cliente';

    await enviarPushAAdmins(
      {
        titulo: '🚚 Transporte actualizado',
        cuerpo: `${nombreEditor} editó el transporte del pedido Nro ${pedido.numero} de ${empresa}`,
        url: `#/pedidos/${pedidoId}`,
      },
      EventoNotificacionEnum.TRANSPORTE_EDITADO,
    );
  } catch (error) {
    console.error('No se pudo enviar push de transporte editado:', error);
  }
};

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
  editor?: { id?: string; rol?: string },
) => {
  const existente = await getTransporteByPedidoId(pedidoId);

  if (existente) {
    const actualizado = await updateTransporte(existente.id, data);
    if (!actualizado) {
      throw new ApiError('No se pudo actualizar el transporte', 400);
    }
    await notificarTransporteEditado(pedidoId, editor);
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

  await notificarTransporteEditado(pedidoId, editor);
  return nuevo;
};
