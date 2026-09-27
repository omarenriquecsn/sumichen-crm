import { CrearPedidoDto } from '../dtos/CrearPedidoDto';
import { Pedido } from '../entities/Pedidos';
import { ProductosPedido } from '../entities/Productos_pedido';
import { Transporte } from '../entities/Transporte';
import { AppDataSource } from '../config/dataBaseConfig';
import {
  getPedidos,
  getPedidoById,
  getPedido,
} from '../repositories/pedidosRepository';
import {
  consumirLineasPedido,
  restaurarStockPedido,
  confirmarSalidasPedido,
} from './inventarioServices';
import {
  reservarInstrumentosPedido,
  liberarInstrumentosPedido,
} from './instrumentosServices';
import { eliminarEvidenciasDePedidoService } from './pedidoEvidenciasServices';
import { ApiError } from '../utils/ApiError';
import {
  enviarPushAUsuario,
  enviarPushAAdmins,
} from './pushServices';
import { EventoNotificacionEnum } from '../enums/EventoNotificacionEnum';

// import { sendWhatsappNotification } from '../utils/whatsapp';
import dotenv from 'dotenv';
import { getClientesByIdAuxiliar } from '../repositories/clientesRepository';
import { updateClientesService } from './clientesServices';
// import sendWhatsAppMessage from '../utils/sendWhatsapp';
import { EstadoClienteEnum } from '../enums/EstadoClienteEnum';
import { EtapaDeVentaEnum } from '../enums/EtapaDeVentaEnum';
import { sendPushNotification } from '../utils/pushoverNotificacion';
import { getUsuarioByIdDb } from '../repositories/usuariosRepository';
dotenv.config();

// Redondea un monto a 2 decimales (el total se calcula con el precio
// unitario ya redondeado, igual que en el formulario de pedidos).
const redondear2 = (n: number) => Math.round((Number(n) || 0) * 100) / 100;

/** Redondea a la cantidad de decimales indicada. */
const redondearA = (n: number, decimales: number) => {
  const factor = 10 ** decimales;
  return Math.round((Number(n) || 0) * factor) / factor;
};

/**
 * Precio unitario de una línea. Con `decimales = 2` (normal) es idéntico al
 * cálculo de siempre; con `decimales = 4` (productos especiales, ej. preformas
 * a 0.0091) se conservan los 4 decimales sin redondear a 2.
 */
const precioUnitarioDeLinea = (producto: {
  precio_unitario: number;
  decimales?: number;
}) => {
  const decimales = Number(producto.decimales) === 4 ? 4 : 2;
  return redondearA(producto.precio_unitario, decimales);
};

export const getPedidosService = async () => {
  const pedidos = await getPedidos();
  return pedidos;
};

export const getPedidosByVendedorService = async (id: string, rol?: string) => {
  if (rol === 'admin') {
    const pedidos = await getPedidos();
    return pedidos;
  }
  const pedidos = await getPedidos();
  return pedidos.filter((pedido) => pedido.vendedor_id === id);
};

export const getPedidosByIdService = async (id: string) => {
  const pedido = await getPedidoById(id);
  return pedido;
};

export const createPedidosService = async (pedidoData: CrearPedidoDto) => {
  const { productos, transporte_detalle, instrumentos, ...rest } = pedidoData;

  const subtotal = redondear2(
    productos.reduce(
      (acc, producto) => acc + precioUnitarioDeLinea(producto) * producto.cantidad,
      0,
    ),
  );

  // Todo el alta (pedido + líneas + transporte + consumo de stock) es atómica:
  // si el stock es insuficiente, se revierte completo.
  const pedido = await AppDataSource.transaction(async (manager) => {
    const nuevoPedido: Partial<Pedido> = {
      ...rest,
      impuestos: rest.impuestos === 'exento' ? 0 : 0.16,
      subtotal,
      total: subtotal,
    };

    // El transporte se crea explícitamente (genera el uuid), NO con cascade.
    if (transporte_detalle && rest.transporte === 'externo') {
      const transporteRepo = manager.getRepository(Transporte);
      nuevoPedido.transporte_detalle = await transporteRepo.save(
        transporteRepo.create(transporte_detalle as Partial<Transporte>),
      );
    }

    const pedidoRepo = manager.getRepository(Pedido);
    const pedidoGuardado = await pedidoRepo.save(
      pedidoRepo.create(nuevoPedido),
    );
    if (!pedidoGuardado) throw new ApiError('Error al crear el pedido', 500);

    const lineaRepo = manager.getRepository(ProductosPedido);
    for (const producto of productos) {
      await lineaRepo.save(
        lineaRepo.create({
          producto_id: producto.producto_id,
          cantidad: producto.cantidad,
          precio_unitario: producto.precio_unitario,
          precio_base: producto.precio_base,
          porcentaje_negociacion: producto.porcentaje_negociacion,
          almacen: producto.almacen,
          pedido_id: pedidoGuardado.id,
          total: redondear2(precioUnitarioDeLinea(producto) * producto.cantidad),
        }),
      );
    }

    // Descuenta el stock FIFO del almacén elegido por línea (reserva).
    await consumirLineasPedido(
      manager,
      pedidoGuardado.id,
      productos.map((p) => ({
        producto_id: p.producto_id,
        almacen: p.almacen,
        cantidad: p.cantidad,
      })),
    );

    // Reserva los instrumentos retornables (pasan a tránsito).
    await reservarInstrumentosPedido(
      manager,
      pedidoGuardado.id,
      (instrumentos ?? []).map((i) => ({
        tipo_instrumento_id: i.tipo_instrumento_id,
        almacen: i.almacen,
        cantidad: Number(i.cantidad) || 0,
      })),
    );

    return pedidoGuardado;
  });

  const cliente = await getClientesByIdAuxiliar(pedido.cliente_id);
  if (cliente && cliente.estado !== 'activo') {
    // Se pasa por el servicio para que registre estado_anterior y fecha_estado
    // (la analítica cuenta como "nuevo cliente del mes" por esos campos).
    await updateClientesService(cliente.id, {
      estado: EstadoClienteEnum.ACTIVO,
      etapa_venta: EtapaDeVentaEnum.CERRADO,
    });
  }

  // const mensaje = `Nuevo pedido creado: Nro ${pedido.numero}, Cliente: ${cliente?.empresa}, Total: ${pedido.total}`;
  // if (adminNumber) {
  //   try {
  //     await sendWhatsappNotification(mensaje, adminNumber);
  //   } catch (error) {
  //     console.error('No se pudo enviar WhatsApp al admin:', error);
  //   }
  // }

  // await sendWhatsAppMessage('pedido')
  // variables para la Notification
  const pushoverToken = process.env.PUSHOVER_TOKEN;
  const pushoverUser = process.env.PUSHOVER_USER;
  const vendedor = await getUsuarioByIdDb(pedido.vendedor_id);

  if (vendedor && pushoverToken && pushoverUser) {
    try {
      await sendPushNotification({
        token: pushoverToken,
        title: 'Nuevo pedido',
        message: `Nuevo pedido creado por ${vendedor.nombre}, Cliente: ${cliente?.empresa}, Total del Pedido: ${pedido.total} fecha: ${new Date().toLocaleString()}`,
        user: pushoverUser,
        url: process.env.APP_PUBLIC_URL || 'https://crmsumichen.com',
        device: 'chrome',
      });
    } catch (error) {
      console.error('No se pudo enviar notificación Pushover:', error);
    }
  }

  // Web Push (PWA) — evento `pedido_nuevo`: se notifica a los admins.
  try {
    await enviarPushAAdmins(
      {
        titulo: '🛒 Nuevo pedido',
        cuerpo: `Pedido Nro ${pedido.numero} · ${cliente?.empresa || 'cliente'} · Total ${pedido.total}`,
        url: '#/pedidos',
      },
      EventoNotificacionEnum.PEDIDO_NUEVO,
    );
  } catch (error) {
    console.error('No se pudo enviar push de nuevo pedido:', error);
  }

  return pedido;
};

/**
 * Edita un pedido PENDIENTE por completo (cabecera + líneas + transporte).
 * Devuelve al inventario las reservas actuales y vuelve a consumir con las
 * líneas nuevas, todo dentro de una transacción.
 */
export const editarPedidosService = async (
  id: string,
  pedidoData: CrearPedidoDto,
  usuario?: { rol?: string; vendedor_db_id?: string },
) => {
  const anterior = await getPedido(id);
  if (!anterior) throw new ApiError('Pedido no encontrado', 404);
  if (anterior.estado !== 'pendiente') {
    throw new ApiError(
      'Solo se pueden editar pedidos pendientes. Para corregir un pedido confirmado usa una devolución.',
      400,
    );
  }
  if (
    usuario?.rol !== 'admin' &&
    anterior.vendedor_id !== usuario?.vendedor_db_id
  ) {
    throw new ApiError('No puedes editar un pedido de otro vendedor', 403);
  }

  const { productos, transporte_detalle, instrumentos, ...rest } = pedidoData;
  const subtotal = redondear2(
    productos.reduce(
      (acc, producto) => acc + precioUnitarioDeLinea(producto) * producto.cantidad,
      0,
    ),
  );

  return AppDataSource.transaction(async (manager) => {
    // 1. Devuelve al inventario lo que el pedido tenía reservado.
    await restaurarStockPedido(manager, id, 'Edición de pedido');
    await liberarInstrumentosPedido(manager, id, 'Edición de pedido');

    // 2. Borra las líneas anteriores.
    await manager.getRepository(ProductosPedido).delete({ pedido_id: id });

    // 3. Actualiza la cabecera.
    const cabecera: Partial<Pedido> = {
      ...rest,
      impuestos: rest.impuestos === 'exento' ? 0 : 0.16,
      subtotal,
      total: subtotal,
    };

    if (rest.transporte === 'externo' && transporte_detalle) {
      const transporteRepo = manager.getRepository(Transporte);
      if (anterior.transporte_detalle?.id) {
        await transporteRepo.update(
          anterior.transporte_detalle.id,
          transporte_detalle as Partial<Transporte>,
        );
      } else {
        const nuevo = await transporteRepo.save(
          transporteRepo.create(transporte_detalle as Partial<Transporte>),
        );
        cabecera.transporte_detalle = nuevo;
      }
    }

    await manager.getRepository(Pedido).update(id, cabecera);

    // 4. Nuevas líneas + re-consumo FIFO.
    const lineaRepo = manager.getRepository(ProductosPedido);
    for (const producto of productos) {
      await lineaRepo.save(
        lineaRepo.create({
          producto_id: producto.producto_id,
          cantidad: producto.cantidad,
          precio_unitario: producto.precio_unitario,
          precio_base: producto.precio_base,
          porcentaje_negociacion: producto.porcentaje_negociacion,
          almacen: producto.almacen,
          pedido_id: id,
          total: redondear2(precioUnitarioDeLinea(producto) * producto.cantidad),
        }),
      );
    }

    await consumirLineasPedido(
      manager,
      id,
      productos.map((p) => ({
        producto_id: p.producto_id,
        almacen: p.almacen,
        cantidad: p.cantidad,
      })),
    );

    await reservarInstrumentosPedido(
      manager,
      id,
      (instrumentos ?? []).map((i) => ({
        tipo_instrumento_id: i.tipo_instrumento_id,
        almacen: i.almacen,
        cantidad: Number(i.cantidad) || 0,
      })),
    );

    return manager.getRepository(Pedido).findOneBy({ id });
  });
};

export const updatePedidosService = async (
  id: string,
  pedidoData: Partial<Pedido>,
) => {
  const anterior = await AppDataSource.getRepository(Pedido).findOneBy({ id });

  const pedidoActualizado = await AppDataSource.transaction(async (manager) => {
    await manager.getRepository(Pedido).update(id, pedidoData);
    // Al confirmar (pendiente → procesado) las reservas pasan a salida.
    if (pedidoData.estado === 'procesado' && anterior?.estado !== 'procesado') {
      await confirmarSalidasPedido(manager, id);
    }
    return manager.getRepository(Pedido).findOneBy({ id });
  });

  // Web Push — evento `pedido_aprobado`: cuando un pedido pasa a "procesado"
  // (confirmado), se notifica al vendedor que lo creó.
  if (pedidoActualizado && anterior && pedidoData.estado === 'procesado' && anterior.estado !== 'procesado') {
    try {
      const cliente = await getClientesByIdAuxiliar(pedidoActualizado.cliente_id);
      await enviarPushAUsuario(
        pedidoActualizado.vendedor_id,
        {
          titulo: '✅ Pedido aprobado',
          cuerpo: `Tu pedido Nro ${pedidoActualizado.numero} de ${cliente?.empresa || 'el cliente'} fue confirmado.`,
          url: '#/pedidos',
        },
        EventoNotificacionEnum.PEDIDO_APROBADO,
      );
    } catch (error) {
      console.error('No se pudo enviar push de pedido aprobado:', error);
    }
  }

  return pedidoActualizado;
};

export const deletePedidosService = async (id: string) => {
  const pedido = await AppDataSource.getRepository(Pedido).findOneBy({ id });

  // Borra los archivos de las evidencias múltiples antes de eliminar el pedido
  // (las filas de `pedido_evidencias` caen por CASCADE).
  try {
    await eliminarEvidenciasDePedidoService(id);
  } catch (error) {
    console.error('No se pudieron borrar las evidencias del pedido:', error);
  }

  // Restaura el stock neto, los instrumentos, y borra líneas + pedido atómico.
  await AppDataSource.transaction(async (manager) => {
    await restaurarStockPedido(manager, id, 'Cancelación de pedido');
    await liberarInstrumentosPedido(manager, id, 'Cancelación de pedido');
    await manager.getRepository(ProductosPedido).delete({ pedido_id: id });
    await manager.getRepository(Pedido).delete(id);
  });

  // Web Push — evento `pedido_cancelado`: el pedido se elimina (cancelación) y
  // se notifica al vendedor dueño y a los admins.
  if (pedido) {
    try {
      const cliente = await getClientesByIdAuxiliar(pedido.cliente_id);
      const cuerpo = `El pedido Nro ${pedido.numero} de ${cliente?.empresa || 'el cliente'} fue cancelado.`;
      await enviarPushAUsuario(
        pedido.vendedor_id,
        { titulo: '❌ Pedido cancelado', cuerpo, url: '#/pedidos' },
        EventoNotificacionEnum.PEDIDO_CANCELADO,
      );
      await enviarPushAAdmins(
        { titulo: '❌ Pedido cancelado', cuerpo, url: '#/pedidos' },
        EventoNotificacionEnum.PEDIDO_CANCELADO,
      );
    } catch (error) {
      console.error('No se pudo enviar push de pedido cancelado:', error);
    }
  }

  return pedido;
};
