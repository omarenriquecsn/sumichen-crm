import { AppDataSource } from '../config/dataBaseConfig';
import { Pedido } from '../entities/Pedidos';
import { ProductosPedido } from '../entities/Productos_pedido';
import { Lote } from '../entities/Lote';
import { MovimientoInventario } from '../entities/MovimientoInventario';
import { Devolucion } from '../entities/Devolucion';
import { DevolucionDetalle } from '../entities/DevolucionDetalle';
import { ApiError } from '../utils/ApiError';
import { EstadoPedidoEnum } from '../enums/EstadoPedidoEnum';
import { DevolucionTipoEnum } from '../enums/DevolucionTipoEnum';
import { MovimientoInventarioTipoEnum } from '../enums/MovimientoInventarioTipoEnum';
import { EventoNotificacionEnum } from '../enums/EventoNotificacionEnum';
import { enviarPushAUsuario, enviarPushAAdmins } from './pushServices';
import { getClientesByIdAuxiliar } from '../repositories/clientesRepository';
import { getDevolucionesPorPedido } from '../repositories/devolucionesRepository';

const redondear2 = (n: number) => Math.round((Number(n) || 0) * 100) / 100;

export interface DevolucionLineaInput {
  productos_pedido_id: string;
  cantidad: number;
}

export interface RegistrarDevolucionInput {
  motivo?: string;
  notas?: string;
  productos: DevolucionLineaInput[];
}

export const getDevolucionesPorPedidoService = (pedidoId: string) =>
  getDevolucionesPorPedido(pedidoId);

/**
 * Registra una devolución (total o parcial) de un pedido confirmado:
 * - Valida que la cantidad no supere lo pendiente de devolver por línea.
 * - Devuelve los kg a los lotes originales de la venta (movimientos SALIDA).
 * - Actualiza `productos_pedido.cantidad_devuelta` y `pedidos.total_devuelto`.
 * - Si todo el pedido queda devuelto pasa a `devuelto`; si no, `devuelto_parcial`.
 */
export const registrarDevolucionService = async (
  pedidoId: string,
  data: RegistrarDevolucionInput,
  usuario?: { rol?: string; vendedor_db_id?: string },
) => {
  const pedido = await AppDataSource.getRepository(Pedido).findOneBy({
    id: pedidoId,
  });
  if (!pedido) throw new ApiError('Pedido no encontrado', 404);
  if (
    pedido.estado !== EstadoPedidoEnum.PROCESADO &&
    pedido.estado !== EstadoPedidoEnum.DEVUELTO_PARCIAL
  ) {
    throw new ApiError(
      'Solo se pueden devolver pedidos confirmados',
      400,
    );
  }
  if (
    usuario?.rol !== 'admin' &&
    pedido.vendedor_id !== usuario?.vendedor_db_id
  ) {
    throw new ApiError('No puedes devolver un pedido de otro vendedor', 403);
  }

  const devolucion = await AppDataSource.transaction(async (manager) => {
    const lineaRepo = manager.getRepository(ProductosPedido);
    const movRepo = manager.getRepository(MovimientoInventario);
    const loteRepo = manager.getRepository(Lote);
    const devRepo = manager.getRepository(Devolucion);
    const detalleRepo = manager.getRepository(DevolucionDetalle);

    const devGuardada = await devRepo.save(
      devRepo.create({
        pedido_id: pedidoId,
        tipo: DevolucionTipoEnum.PARCIAL,
        motivo: data.motivo,
        notas: data.notas,
        usuario_id: usuario?.vendedor_db_id,
        total_devuelto: 0,
      }),
    );

    let totalDevolucion = 0;
    const detalles: Partial<DevolucionDetalle>[] = [];

    for (const item of data.productos) {
      const cantidad = redondear2(item.cantidad);
      if (cantidad <= 0) continue;

      const linea = await lineaRepo.findOneBy({
        id: item.productos_pedido_id,
        pedido_id: pedidoId,
      });
      if (!linea) throw new ApiError('Línea del pedido no encontrada', 404);
      if (!linea.almacen) {
        throw new ApiError('La línea no tiene almacén definido', 400);
      }

      const pendiente = redondear2(
        Number(linea.cantidad) - Number(linea.cantidad_devuelta),
      );
      if (cantidad > pendiente + 0.0001) {
        throw new ApiError(
          `La cantidad a devolver (${cantidad} kg) supera lo pendiente (${pendiente} kg)`,
          400,
        );
      }

      const salidas = await movRepo.find({
        where: {
          pedido_id: pedidoId,
          producto_id: linea.producto_id,
          almacen: linea.almacen,
          tipo: MovimientoInventarioTipoEnum.SALIDA,
        },
        order: { fecha_creacion: 'ASC' },
      });
      const devolucionesPrevias = await movRepo.find({
        where: {
          pedido_id: pedidoId,
          producto_id: linea.producto_id,
          almacen: linea.almacen,
          tipo: MovimientoInventarioTipoEnum.DEVOLUCION,
        },
      });
      const yaDevueltoPorLote = new Map<string, number>();
      for (const previa of devolucionesPrevias) {
        if (!previa.lote_id) continue;
        yaDevueltoPorLote.set(
          previa.lote_id,
          (yaDevueltoPorLote.get(previa.lote_id) ?? 0) + Number(previa.cantidad),
        );
      }

      let restante = cantidad;
      for (const salida of salidas) {
        if (restante <= 0) break;
        if (!salida.lote_id) continue;
        const yaDev = yaDevueltoPorLote.get(salida.lote_id) ?? 0;
        const disponibleDevolver = redondear2(Number(salida.cantidad) - yaDev);
        if (disponibleDevolver <= 0) continue;

        const tomar = Math.min(disponibleDevolver, restante);
        const lote = await loteRepo.findOneBy({ id: salida.lote_id });
        if (!lote) continue;

        const nuevoSaldo = redondear2(Number(lote.cantidad_actual) + tomar);
        await loteRepo.update(lote.id, { cantidad_actual: nuevoSaldo });
        await movRepo.save(
          movRepo.create({
            tipo: MovimientoInventarioTipoEnum.DEVOLUCION,
            producto_id: linea.producto_id,
            lote_id: lote.id,
            almacen: linea.almacen,
            pedido_id: pedidoId,
            devolucion_id: devGuardada.id,
            cantidad: redondear2(tomar),
            saldo_resultante: nuevoSaldo,
            usuario_id: usuario?.vendedor_db_id,
            observacion: `Devolución pedido (lote ${lote.codigo_lote})`,
          }),
        );

        restante = redondear2(restante - tomar);
      }

      if (restante > 0.0001) {
        throw new ApiError(
          'No se pudo ubicar el lote original de la venta para reponer el stock',
          400,
        );
      }

      await lineaRepo.update(linea.id, {
        cantidad_devuelta: redondear2(
          Number(linea.cantidad_devuelta) + cantidad,
        ),
      });

      totalDevolucion = redondear2(
        totalDevolucion + cantidad * Number(linea.precio_unitario),
      );

      detalles.push({
        devolucion_id: devGuardada.id,
        productos_pedido_id: linea.id,
        producto_id: linea.producto_id,
        almacen: linea.almacen,
        cantidad,
      });
    }

    if (detalles.length === 0) {
      throw new ApiError('No se indicó ninguna cantidad a devolver', 400);
    }

    await detalleRepo.save(detalleRepo.create(detalles));

    const nuevoTotalDevuelto = redondear2(
      Number(pedido.total_devuelto) + totalDevolucion,
    );

    const lineas = await lineaRepo.find({ where: { pedido_id: pedidoId } });
    const completa =
      lineas.length > 0 &&
      lineas.every(
        (l) => Number(l.cantidad_devuelta) + 0.0001 >= Number(l.cantidad),
      );

    const nuevoEstado = completa
      ? EstadoPedidoEnum.DEVUELTO
      : EstadoPedidoEnum.DEVUELTO_PARCIAL;

    await manager.getRepository(Pedido).update(pedidoId, {
      total_devuelto: nuevoTotalDevuelto,
      estado: nuevoEstado,
    });

    await devRepo.update(devGuardada.id, {
      tipo: completa ? DevolucionTipoEnum.TOTAL : DevolucionTipoEnum.PARCIAL,
      total_devuelto: totalDevolucion,
    });

    return devRepo.findOne({
      where: { id: devGuardada.id },
      relations: ['detalles'],
    });
  });

  // Notificación push (fuera de la transacción).
  try {
    const cliente = await getClientesByIdAuxiliar(pedido.cliente_id);
    const cuerpo = `El pedido Nro ${pedido.numero} de ${
      cliente?.empresa || 'el cliente'
    } fue devuelto${devolucion?.tipo === DevolucionTipoEnum.PARCIAL ? ' parcialmente' : ''}.`;
    await enviarPushAUsuario(
      pedido.vendedor_id,
      { titulo: '↩️ Pedido devuelto', cuerpo, url: '#/pedidos' },
      EventoNotificacionEnum.PEDIDO_DEVUELTO,
    );
    await enviarPushAAdmins(
      { titulo: '↩️ Pedido devuelto', cuerpo, url: '#/pedidos' },
      EventoNotificacionEnum.PEDIDO_DEVUELTO,
    );
  } catch (error) {
    console.error('No se pudo enviar push de pedido devuelto:', error);
  }

  return devolucion;
};
