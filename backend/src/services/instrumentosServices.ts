import { EntityManager } from 'typeorm';
import { AppDataSource } from '../config/dataBaseConfig';
import { ApiError } from '../utils/ApiError';
import { InstrumentoStock } from '../entities/InstrumentoStock';
import { MovimientoInstrumento } from '../entities/MovimientoInstrumento';
import { PedidoInstrumento } from '../entities/PedidoInstrumento';
import { Pedido } from '../entities/Pedidos';
import { AlmacenEnum } from '../enums/AlmacenEnum';
import { EstadoInstrumentoEnum } from '../enums/EstadoInstrumentoEnum';
import { MovimientoInstrumentoTipoEnum } from '../enums/MovimientoInstrumentoTipoEnum';
import {
  getTiposInstrumento,
  getTipoInstrumentoById,
  getTipoInstrumentoByNombre,
  createTipoInstrumento,
  updateTipoInstrumento,
  getStockInstrumentos,
  getMovimientosInstrumento,
  getPedidoInstrumentos,
  getTodosPedidoInstrumentos,
} from '../repositories/instrumentosRepository';

const redondear2 = (n: number) => Math.round((Number(n) || 0) * 100) / 100;

export interface LineaInstrumentoInput {
  tipo_instrumento_id: string;
  almacen: AlmacenEnum;
  cantidad: number;
}

const ALMACENES: AlmacenEnum[] = [AlmacenEnum.GLOBALCA, AlmacenEnum.WMS];

/** Recalcula el estado "principal" de una línea según sus contadores. */
const calcularEstado = (
  c: {
    cantidad: number;
    transito: number;
    cliente: number;
    almacen: number;
    donada: number;
    danada: number;
  },
): EstadoInstrumentoEnum => {
  const total = redondear2(c.cantidad);
  const terminal = redondear2(c.donada + c.danada);
  if (total > 0 && terminal >= total) {
    return c.donada >= c.danada
      ? EstadoInstrumentoEnum.DONADO
      : EstadoInstrumentoEnum.DANADO;
  }
  if (total > 0 && c.almacen >= total) return EstadoInstrumentoEnum.EN_ALMACEN;
  if (c.cliente > 0) return EstadoInstrumentoEnum.EN_CLIENTE;
  if (c.transito > 0) return EstadoInstrumentoEnum.EN_TRANSITO;
  if (c.almacen > 0) return EstadoInstrumentoEnum.EN_ALMACEN;
  return EstadoInstrumentoEnum.EN_TRANSITO;
};

const estadoDesdeLinea = (l: PedidoInstrumento) =>
  calcularEstado({
    cantidad: Number(l.cantidad),
    transito: Number(l.cantidad_transito),
    cliente: Number(l.cantidad_cliente),
    almacen: Number(l.cantidad_almacen),
    donada: Number(l.cantidad_donada),
    danada: Number(l.cantidad_danada),
  });

/** Obtiene (o crea) la fila de stock de un tipo/almacén dentro de una transacción. */
const getOrCreateStock = async (
  manager: EntityManager,
  tipoInstrumentoId: string,
  almacen: AlmacenEnum,
): Promise<InstrumentoStock> => {
  const repo = manager.getRepository(InstrumentoStock);
  let stock = await repo.findOneBy({
    tipo_instrumento_id: tipoInstrumentoId,
    almacen,
  });
  if (!stock) {
    stock = await repo.save(
      repo.create({
        tipo_instrumento_id: tipoInstrumentoId,
        almacen,
        cantidad_total: 0,
        cantidad_disponible: 0,
      }),
    );
  }
  return stock;
};

// ------------------------------ Catálogo ------------------------------

export const getTiposInstrumentoService = (soloActivos = false) =>
  getTiposInstrumento(soloActivos);

export const crearTipoInstrumentoService = async (nombre: string) => {
  const limpio = (nombre || '').trim();
  if (!limpio) throw new ApiError('El nombre es obligatorio', 400);
  const existente = await getTipoInstrumentoByNombre(limpio);
  if (existente) throw new ApiError('Ya existe un instrumento con ese nombre', 400);
  return createTipoInstrumento({ nombre: limpio, activo: true });
};

export const actualizarTipoInstrumentoService = async (
  id: string,
  data: { nombre?: string; activo?: boolean },
) => {
  const tipo = await getTipoInstrumentoById(id);
  if (!tipo) throw new ApiError('Instrumento no encontrado', 404);
  if (data.nombre) {
    const otro = await getTipoInstrumentoByNombre(data.nombre.trim());
    if (otro && otro.id !== id) {
      throw new ApiError('Ya existe un instrumento con ese nombre', 400);
    }
  }
  return updateTipoInstrumento(id, {
    ...(data.nombre ? { nombre: data.nombre.trim() } : {}),
    ...(data.activo !== undefined ? { activo: data.activo } : {}),
  });
};

// ------------------------------- Stock --------------------------------

export interface StockInstrumentoItem {
  tipo_instrumento_id: string;
  nombre: string;
  almacen: AlmacenEnum;
  cantidad_total: number;
  cantidad_disponible: number;
}

/** Matriz completa tipo × almacén (rellena con 0 los que no tienen fila). */
export const getStockInstrumentosService = async (): Promise<
  StockInstrumentoItem[]
> => {
  const tipos = await getTiposInstrumento(true);
  const stock = await getStockInstrumentos();
  const items: StockInstrumentoItem[] = [];
  for (const tipo of tipos) {
    for (const almacen of ALMACENES) {
      const fila = stock.find(
        (s) =>
          s.tipo_instrumento_id === tipo.id && s.almacen === almacen,
      );
      items.push({
        tipo_instrumento_id: tipo.id,
        nombre: tipo.nombre,
        almacen,
        cantidad_total: Number(fila?.cantidad_total ?? 0),
        cantidad_disponible: Number(fila?.cantidad_disponible ?? 0),
      });
    }
  }
  return items;
};

/** Entrada/reposición de instrumentos (admin). */
export const registrarEntradaInstrumentoService = async (
  data: { tipo_instrumento_id: string; almacen: AlmacenEnum; cantidad: number; observacion?: string },
  usuarioId?: string,
) => {
  const cantidad = redondear2(data.cantidad);
  if (!(cantidad > 0)) throw new ApiError('La cantidad debe ser mayor a 0', 400);

  return AppDataSource.transaction(async (manager) => {
    const movRepo = manager.getRepository(MovimientoInstrumento);
    const stock = await getOrCreateStock(
      manager,
      data.tipo_instrumento_id,
      data.almacen,
    );
    const nuevoTotal = redondear2(Number(stock.cantidad_total) + cantidad);
    const nuevoDisp = redondear2(Number(stock.cantidad_disponible) + cantidad);
    await manager
      .getRepository(InstrumentoStock)
      .update(stock.id, {
        cantidad_total: nuevoTotal,
        cantidad_disponible: nuevoDisp,
      });
    await movRepo.save(
      movRepo.create({
        tipo: MovimientoInstrumentoTipoEnum.ENTRADA,
        tipo_instrumento_id: data.tipo_instrumento_id,
        almacen: data.almacen,
        cantidad,
        saldo_resultante: nuevoDisp,
        usuario_id: usuarioId,
        observacion: data.observacion,
      }),
    );
    return { cantidad_total: nuevoTotal, cantidad_disponible: nuevoDisp };
  });
};

/** Baja de instrumentos en almacén (donación o daño). */
export const registrarBajaInstrumentoService = async (
  data: {
    tipo_instrumento_id: string;
    almacen: AlmacenEnum;
    cantidad: number;
    baja: 'donacion' | 'dano';
    observacion?: string;
  },
  usuarioId?: string,
) => {
  const cantidad = redondear2(data.cantidad);
  if (!(cantidad > 0)) throw new ApiError('La cantidad debe ser mayor a 0', 400);

  return AppDataSource.transaction(async (manager) => {
    const movRepo = manager.getRepository(MovimientoInstrumento);
    const stockRepo = manager.getRepository(InstrumentoStock);
    const stock = await getOrCreateStock(
      manager,
      data.tipo_instrumento_id,
      data.almacen,
    );
    const disp = Number(stock.cantidad_disponible);
    if (cantidad > disp + 0.0001) {
      throw new ApiError(
        `Solo hay ${disp.toFixed(2)} disponibles en el almacén`,
        400,
      );
    }
    const nuevoTotal = redondear2(Number(stock.cantidad_total) - cantidad);
    const nuevoDisp = redondear2(disp - cantidad);
    await stockRepo.update(stock.id, {
      cantidad_total: nuevoTotal,
      cantidad_disponible: nuevoDisp,
    });
    await movRepo.save(
      movRepo.create({
        tipo:
          data.baja === 'donacion'
            ? MovimientoInstrumentoTipoEnum.DONACION
            : MovimientoInstrumentoTipoEnum.DANO,
        tipo_instrumento_id: data.tipo_instrumento_id,
        almacen: data.almacen,
        cantidad,
        saldo_resultante: nuevoDisp,
        usuario_id: usuarioId,
        observacion: data.observacion,
      }),
    );
    return { cantidad_total: nuevoTotal, cantidad_disponible: nuevoDisp };
  });
};

/** Ajuste manual de conteo de instrumentos (admin). */
export const registrarAjusteInstrumentoService = async (
  data: {
    tipo_instrumento_id: string;
    almacen: AlmacenEnum;
    direccion: 'entrada' | 'salida';
    cantidad: number;
    observacion?: string;
  },
  usuarioId?: string,
) => {
  const cantidad = redondear2(data.cantidad);
  if (!(cantidad > 0)) throw new ApiError('La cantidad debe ser mayor a 0', 400);

  return AppDataSource.transaction(async (manager) => {
    const movRepo = manager.getRepository(MovimientoInstrumento);
    const stockRepo = manager.getRepository(InstrumentoStock);
    const stock = await getOrCreateStock(
      manager,
      data.tipo_instrumento_id,
      data.almacen,
    );
    const esEntrada = data.direccion === 'entrada';
    const base = Number(stock.cantidad_disponible);
    if (!esEntrada && cantidad > base + 0.0001) {
      throw new ApiError(
        `Solo hay ${base.toFixed(2)} disponibles en el almacén`,
        400,
      );
    }
    const delta = esEntrada ? cantidad : -cantidad;
    const nuevoTotal = redondear2(Number(stock.cantidad_total) + delta);
    const nuevoDisp = redondear2(base + delta);
    await stockRepo.update(stock.id, {
      cantidad_total: nuevoTotal,
      cantidad_disponible: nuevoDisp,
    });
    await movRepo.save(
      movRepo.create({
        tipo: MovimientoInstrumentoTipoEnum.AJUSTE,
        tipo_instrumento_id: data.tipo_instrumento_id,
        almacen: data.almacen,
        cantidad,
        saldo_resultante: nuevoDisp,
        usuario_id: usuarioId,
        observacion: data.observacion,
      }),
    );
    return { cantidad_total: nuevoTotal, cantidad_disponible: nuevoDisp };
  });
};

/** Kardex de instrumentos. */
export const getMovimientosInstrumentoService = (filtros?: {
  tipoInstrumentoId?: string;
  almacen?: string;
  desde?: string;
  hasta?: string;
}) => getMovimientosInstrumento(filtros);

/** Kardex de instrumentos completo (sin el tope de 1000 filas) para exportar. */
export const getMovimientosInstrumentoParaExportService = () =>
  getMovimientosInstrumento(undefined, true);

/** Líneas de instrumentos de un pedido. */
export const getPedidoInstrumentosService = (pedidoId: string) =>
  getPedidoInstrumentos(pedidoId);

/** Lista de clientes con la cantidad de instrumentos que tienen. */
export interface ClienteInstrumentos {
  cliente_id: string;
  cliente_nombre: string;
  en_cliente: number;
  en_transito: number;
  detalle: {
    tipo_instrumento_id: string;
    nombre: string;
    en_cliente: number;
    en_transito: number;
  }[];
}

export const getInstrumentosPorClienteService = async (): Promise<
  ClienteInstrumentos[]
> => {
  const lineas = await getTodosPedidoInstrumentos();
  const mapa = new Map<string, ClienteInstrumentos>();

  for (const linea of lineas) {
    const enCliente = Number(linea.cantidad_cliente) || 0;
    const enTransito = Number(linea.cantidad_transito) || 0;
    if (enCliente <= 0 && enTransito <= 0) continue;

    const clienteId = linea.pedido?.cliente_id;
    if (!clienteId) continue;
    const cliente = linea.pedido?.cliente;
    const nombre = cliente
      ? `${cliente.nombre ?? ''} ${cliente.apellido ?? ''}`.trim() ||
        cliente.empresa
      : 'Cliente';

    let registro = mapa.get(clienteId);
    if (!registro) {
      registro = {
        cliente_id: clienteId,
        cliente_nombre: nombre,
        en_cliente: 0,
        en_transito: 0,
        detalle: [],
      };
      mapa.set(clienteId, registro);
    }
    registro.en_cliente = redondear2(registro.en_cliente + enCliente);
    registro.en_transito = redondear2(registro.en_transito + enTransito);

    const nombreTipo = linea.tipo_instrumento?.nombre ?? 'Instrumento';
    const detalle = registro.detalle.find(
      (d) => d.tipo_instrumento_id === linea.tipo_instrumento_id,
    );
    if (detalle) {
      detalle.en_cliente = redondear2(detalle.en_cliente + enCliente);
      detalle.en_transito = redondear2(detalle.en_transito + enTransito);
    } else {
      registro.detalle.push({
        tipo_instrumento_id: linea.tipo_instrumento_id,
        nombre: nombreTipo,
        en_cliente: enCliente,
        en_transito: enTransito,
      });
    }
  }

  return Array.from(mapa.values()).sort((a, b) =>
    a.cliente_nombre.localeCompare(b.cliente_nombre),
  );
};

// ------------------- Operaciones ligadas al pedido --------------------

/** Al crear el pedido: pasa los instrumentos de almacén a tránsito. */
export const reservarInstrumentosPedido = async (
  manager: EntityManager,
  pedidoId: string,
  lineas: LineaInstrumentoInput[],
  usuarioId?: string,
): Promise<void> => {
  const lineRepo = manager.getRepository(PedidoInstrumento);
  const movRepo = manager.getRepository(MovimientoInstrumento);
  const stockRepo = manager.getRepository(InstrumentoStock);

  for (const linea of lineas) {
    const cantidad = redondear2(linea.cantidad);
    if (cantidad <= 0) continue;

    const stock = await getOrCreateStock(
      manager,
      linea.tipo_instrumento_id,
      linea.almacen,
    );
    const disponible = Number(stock.cantidad_disponible);
    if (cantidad > disponible + 0.0001) {
      throw new ApiError(
        `No hay instrumentos suficientes en ${linea.almacen}. Disponibles: ${disponible.toFixed(2)}`,
        400,
      );
    }
    const nuevoDisp = redondear2(disponible - cantidad);
    await stockRepo.update(stock.id, { cantidad_disponible: nuevoDisp });

    await lineRepo.save(
      lineRepo.create({
        pedido_id: pedidoId,
        tipo_instrumento_id: linea.tipo_instrumento_id,
        almacen: linea.almacen,
        cantidad,
        cantidad_transito: cantidad,
        cantidad_cliente: 0,
        cantidad_almacen: 0,
        cantidad_donada: 0,
        cantidad_danada: 0,
        estado: EstadoInstrumentoEnum.EN_TRANSITO,
      }),
    );

    await movRepo.save(
      movRepo.create({
        tipo: MovimientoInstrumentoTipoEnum.PRESTAMO,
        tipo_instrumento_id: linea.tipo_instrumento_id,
        almacen: linea.almacen,
        pedido_id: pedidoId,
        cantidad,
        saldo_resultante: nuevoDisp,
        usuario_id: usuarioId,
      }),
    );
  }
};

/** Al cancelar/editar: devuelve al almacén lo que sigue en poder de la empresa. */
export const liberarInstrumentosPedido = async (
  manager: EntityManager,
  pedidoId: string,
  observacion = 'Liberación de instrumentos del pedido',
): Promise<void> => {
  const lineRepo = manager.getRepository(PedidoInstrumento);
  const movRepo = manager.getRepository(MovimientoInstrumento);
  const stockRepo = manager.getRepository(InstrumentoStock);

  const lineas = await lineRepo.find({ where: { pedido_id: pedidoId } });
  for (const linea of lineas) {
    const aDevolver = redondear2(
      Number(linea.cantidad_transito) + Number(linea.cantidad_cliente),
    );
    if (aDevolver <= 0) continue;

    const stock = await getOrCreateStock(
      manager,
      linea.tipo_instrumento_id,
      linea.almacen,
    );
    const nuevoDisp = redondear2(
      Number(stock.cantidad_disponible) + aDevolver,
    );
    await stockRepo.update(stock.id, { cantidad_disponible: nuevoDisp });

    const nuevoAlmacen = redondear2(
      Number(linea.cantidad_almacen) + aDevolver,
    );
    const estado = calcularEstado({
      cantidad: Number(linea.cantidad),
      transito: 0,
      cliente: 0,
      almacen: nuevoAlmacen,
      donada: Number(linea.cantidad_donada),
      danada: Number(linea.cantidad_danada),
    });
    await lineRepo.update(linea.id, {
      cantidad_transito: 0,
      cantidad_cliente: 0,
      cantidad_almacen: nuevoAlmacen,
      estado,
    });

    await movRepo.save(
      movRepo.create({
        tipo: MovimientoInstrumentoTipoEnum.LIBERACION,
        tipo_instrumento_id: linea.tipo_instrumento_id,
        almacen: linea.almacen,
        pedido_id: pedidoId,
        cantidad: aDevolver,
        saldo_resultante: nuevoDisp,
        observacion,
      }),
    );
  }
};

/** Manual: marca todas las líneas del pedido como entregadas (tránsito → cliente). */
export const entregarInstrumentosPedidoService = async (
  pedidoId: string,
  usuarioId?: string,
) => {
  return AppDataSource.transaction(async (manager) => {
    const pedido = await manager.getRepository(Pedido).findOneBy({ id: pedidoId });
    if (!pedido) throw new ApiError('Pedido no encontrado', 404);

    const lineRepo = manager.getRepository(PedidoInstrumento);
    const movRepo = manager.getRepository(MovimientoInstrumento);
    const lineas = await lineRepo.find({ where: { pedido_id: pedidoId } });

    for (const linea of lineas) {
      const transito = Number(linea.cantidad_transito);
      if (transito <= 0) continue;
      const nuevoCliente = redondear2(
        Number(linea.cantidad_cliente) + transito,
      );
      const estado = calcularEstado({
        cantidad: Number(linea.cantidad),
        transito: 0,
        cliente: nuevoCliente,
        almacen: Number(linea.cantidad_almacen),
        donada: Number(linea.cantidad_donada),
        danada: Number(linea.cantidad_danada),
      });
      await lineRepo.update(linea.id, {
        cantidad_transito: 0,
        cantidad_cliente: nuevoCliente,
        estado,
      });
      await movRepo.save(
        movRepo.create({
          tipo: MovimientoInstrumentoTipoEnum.ENTREGA,
          tipo_instrumento_id: linea.tipo_instrumento_id,
          almacen: linea.almacen,
          pedido_id: pedidoId,
          cliente_id: pedido.cliente_id,
          cantidad: transito,
          saldo_resultante: nuevoCliente,
          usuario_id: usuarioId,
        }),
      );
    }

    return lineRepo.find({
      where: { pedido_id: pedidoId },
      relations: ['tipo_instrumento'],
    });
  });
};

/** Devuelve cantidad de una línea (cliente/tránsito → almacén). */
export const devolverInstrumentoLineaService = async (
  lineaId: string,
  cantidad: number,
  usuarioId?: string,
) => {
  const cant = redondear2(cantidad);
  if (!(cant > 0)) throw new ApiError('La cantidad debe ser mayor a 0', 400);

  return AppDataSource.transaction(async (manager) => {
    const lineRepo = manager.getRepository(PedidoInstrumento);
    const movRepo = manager.getRepository(MovimientoInstrumento);
    const stockRepo = manager.getRepository(InstrumentoStock);
    const linea = await lineRepo.findOne({
      where: { id: lineaId },
      relations: ['tipo_instrumento'],
    });
    if (!linea) throw new ApiError('Línea de instrumentos no encontrada', 404);

    const desdeCliente = Math.min(Number(linea.cantidad_cliente), cant);
    const desdeTransito = Math.min(
      Number(linea.cantidad_transito),
      redondear2(cant - desdeCliente),
    );
    const disponibleParaDevolver = redondear2(desdeCliente + desdeTransito);
    if (cant > disponibleParaDevolver + 0.0001) {
      throw new ApiError(
        'La cantidad a devolver supera lo que está en cliente/tránsito',
        400,
      );
    }

    const nuevoCliente = redondear2(Number(linea.cantidad_cliente) - desdeCliente);
    const nuevoTransito = redondear2(
      Number(linea.cantidad_transito) - desdeTransito,
    );
    const nuevoAlmacen = redondear2(Number(linea.cantidad_almacen) + cant);
    const estado = calcularEstado({
      cantidad: Number(linea.cantidad),
      transito: nuevoTransito,
      cliente: nuevoCliente,
      almacen: nuevoAlmacen,
      donada: Number(linea.cantidad_donada),
      danada: Number(linea.cantidad_danada),
    });
    await lineRepo.update(linea.id, {
      cantidad_cliente: nuevoCliente,
      cantidad_transito: nuevoTransito,
      cantidad_almacen: nuevoAlmacen,
      estado,
    });

    const stock = await getOrCreateStock(
      manager,
      linea.tipo_instrumento_id,
      linea.almacen,
    );
    const nuevoDisp = redondear2(Number(stock.cantidad_disponible) + cant);
    await stockRepo.update(stock.id, { cantidad_disponible: nuevoDisp });

    await movRepo.save(
      movRepo.create({
        tipo: MovimientoInstrumentoTipoEnum.DEVOLUCION,
        tipo_instrumento_id: linea.tipo_instrumento_id,
        almacen: linea.almacen,
        pedido_id: linea.pedido_id,
        cantidad: cant,
        saldo_resultante: nuevoDisp,
        usuario_id: usuarioId,
      }),
    );

    return lineRepo.findOne({
      where: { id: lineaId },
      relations: ['tipo_instrumento'],
    });
  });
};

/** Donación/daño de una línea (desde cliente o desde almacén del pedido). */
export const bajaInstrumentoLineaService = async (
  lineaId: string,
  cantidad: number,
  origen: 'cliente' | 'almacen',
  baja: 'donacion' | 'dano',
  usuarioId?: string,
) => {
  const cant = redondear2(cantidad);
  if (!(cant > 0)) throw new ApiError('La cantidad debe ser mayor a 0', 400);

  return AppDataSource.transaction(async (manager) => {
    const lineRepo = manager.getRepository(PedidoInstrumento);
    const movRepo = manager.getRepository(MovimientoInstrumento);
    const stockRepo = manager.getRepository(InstrumentoStock);
    const linea = await lineRepo.findOne({ where: { id: lineaId } });
    if (!linea) throw new ApiError('Línea de instrumentos no encontrada', 404);

    let nuevoCliente = Number(linea.cantidad_cliente);
    let nuevoAlmacen = Number(linea.cantidad_almacen);
    let nuevaDonada = Number(linea.cantidad_donada);
    let nuevaDanada = Number(linea.cantidad_danada);

    if (origen === 'cliente') {
      if (cant > nuevoCliente + 0.0001) {
        throw new ApiError('La cantidad supera lo que está en cliente', 400);
      }
      nuevoCliente = redondear2(nuevoCliente - cant);
    } else {
      if (cant > nuevoAlmacen + 0.0001) {
        throw new ApiError('La cantidad supera lo que está en almacén', 400);
      }
      nuevoAlmacen = redondear2(nuevoAlmacen - cant);
    }

    if (baja === 'donacion') nuevaDonada = redondear2(nuevaDonada + cant);
    else nuevaDanada = redondear2(nuevaDanada + cant);

    const estado = calcularEstado({
      cantidad: Number(linea.cantidad),
      transito: Number(linea.cantidad_transito),
      cliente: nuevoCliente,
      almacen: nuevoAlmacen,
      donada: nuevaDonada,
      danada: nuevaDanada,
    });
    await lineRepo.update(linea.id, {
      cantidad_cliente: nuevoCliente,
      cantidad_almacen: nuevoAlmacen,
      cantidad_donada: nuevaDonada,
      cantidad_danada: nuevaDanada,
      estado,
    });

    // Baja definitiva: sale del conteo total. Si venía del almacén, también
    // baja el disponible.
    const stock = await getOrCreateStock(
      manager,
      linea.tipo_instrumento_id,
      linea.almacen,
    );
    const nuevoTotal = redondear2(Number(stock.cantidad_total) - cant);
    const nuevoDisp =
      origen === 'almacen'
        ? redondear2(Number(stock.cantidad_disponible) - cant)
        : Number(stock.cantidad_disponible);
    await stockRepo.update(stock.id, {
      cantidad_total: nuevoTotal,
      cantidad_disponible: nuevoDisp,
    });

    await movRepo.save(
      movRepo.create({
        tipo:
          baja === 'donacion'
            ? MovimientoInstrumentoTipoEnum.DONACION
            : MovimientoInstrumentoTipoEnum.DANO,
        tipo_instrumento_id: linea.tipo_instrumento_id,
        almacen: linea.almacen,
        pedido_id: linea.pedido_id,
        cantidad: cant,
        saldo_resultante: nuevoDisp,
        usuario_id: usuarioId,
        observacion: `Baja desde ${origen}`,
      }),
    );

    return lineRepo.findOne({
      where: { id: lineaId },
      relations: ['tipo_instrumento'],
    });
  });
};

/** Recalcula el estado de una línea (helper expuesto). */
export const estadoDeLinea = (linea: PedidoInstrumento) =>
  estadoDesdeLinea(linea);
