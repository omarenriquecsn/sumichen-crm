import {
  getProductos,
  createProducto,
  actualizarDisponible,
  updateProducto,
} from '../repositories/productosRepository';
import {
  createLote,
  getLote,
  getStockAgrupado,
  getLotes,
  updateFechaVencimiento,
  getLoteById,
  updateCantidadActual,
  updateLoteDatos,
} from '../repositories/lotesRepository';
import {
  createMovimiento,
  getMovimientos,
} from '../repositories/movimientosRepository';
import { MovimientoInventarioTipoEnum } from '../enums/MovimientoInventarioTipoEnum';
import { MotivoAjusteEnum } from '../enums/MotivoAjusteEnum';
import { AlmacenEnum } from '../enums/AlmacenEnum';
import { Producto } from '../entities/Productos';
import { Lote } from '../entities/Lote';
import { MovimientoInventario } from '../entities/MovimientoInventario';
import { parsearInventarioIngresos } from '../utils/ingresosInventario';
import { EntityManager } from 'typeorm';
import { ApiError } from '../utils/ApiError';
import { AppDataSource } from '../config/dataBaseConfig';

const normalizar = (s: string) => s.trim().toUpperCase().replace(/\s+/g, '');

/** Código base: recorta la variante tras el guion (MP10052-1 ≡ MP10052). */
const baseCodigo = (s: string) => {
  const n = normalizar(s);
  const h = n.indexOf('-');
  return h > 0 ? n.slice(0, h) : n;
};

export interface ResumenSincronizacion {
  filasLeidas: number;
  productosCreados: number;
  nombresActualizados: number;
  lotesCreados: number;
  lotesActualizados: number;
  lotesEnCero: number;
  sinCambio: number;
  movimientosGenerados: number;
}

export interface ProductoConStock extends Producto {
  stock: {
    globalca: number;
    wms: number;
    total: number;
  };
}

/**
 * Recalcula `productos.disponible` a partir del stock real (suma de
 * `lotes.cantidad_actual`). Un producto está disponible si tiene stock en
 * cualquier almacén.
 */
export const recalcularDisponibilidadProductos = async (): Promise<{
  total: number;
  disponibles: number;
}> => {
  const productos = await getProductos();
  const agrupado = await getStockAgrupado();

  const stockPorProducto = new Map<string, number>();
  for (const fila of agrupado) {
    const acumulado = (stockPorProducto.get(fila.producto_id) ?? 0) + Number(fila.total ?? 0);
    stockPorProducto.set(fila.producto_id, acumulado);
  }

  let disponibles = 0;
  for (const producto of productos) {
    const total = stockPorProducto.get(producto.id) ?? 0;
    const disponible = total > 0;
    if (disponible !== producto.disponible) {
      await actualizarDisponible(producto.id, disponible);
    }
    if (disponible) disponibles++;
  }

  return { total: productos.length, disponibles };
};

interface LoteEsperado {
  almacen: AlmacenEnum;
  lote: string;
  cantidad: number;
  fecha: string | null;
  vencimiento: string | null;
}

/**
 * Sincroniza el inventario desde el Excel: el Excel es la verdad de los lotes
 * que lista.
 * - Cada producto del Excel se crea si falta y se le actualiza el nombre.
 * - Por cada (producto + almacén + código de lote):
 *   - si el lote existe → actualiza cantidad/fechas (movimiento de ajuste);
 *   - si no existe y trae cantidad > 0 → lo crea (+ ENTRADA);
 *   - si el lote del producto NO aparece en el Excel → `cantidad_actual = 0`.
 * - Los productos que NO vienen en el Excel se dejan intactos.
 * - Al final recalcula `productos.disponible`.
 */
export const sincronizarInventarioDesdeExcel = async (
  buffer: Buffer,
): Promise<ResumenSincronizacion> => {
  const filas = await parsearInventarioIngresos(buffer);

  const productos = await getProductos();
  // First-wins por código base (defensivo; tras la reconciliación ya es 1:1).
  const mapaProductos = new Map<string, Producto>();
  for (const producto of [...productos].sort((a, b) =>
    a.id < b.id ? -1 : a.id > b.id ? 1 : 0,
  )) {
    const base = baseCodigo(producto.descripcion || '');
    if (base && !mapaProductos.has(base)) mapaProductos.set(base, producto);
  }
  const conteoBase = new Map<string, number>();
  for (const producto of productos) {
    const base = baseCodigo(producto.descripcion || '');
    if (base) conteoBase.set(base, (conteoBase.get(base) || 0) + 1);
  }

  const hoy = new Date().toISOString().slice(0, 10);
  const resumen: ResumenSincronizacion = {
    filasLeidas: filas.length,
    productosCreados: 0,
    nombresActualizados: 0,
    lotesCreados: 0,
    lotesActualizados: 0,
    lotesEnCero: 0,
    sinCambio: 0,
    movimientosGenerados: 0,
  };

  // Lotes esperados por producto: Map<productoId, Map<"almacen|lote", LoteEsperado>>
  const esperado = new Map<string, Map<string, LoteEsperado>>();
  const productosEnExcel = new Set<string>();
  const nombresYaProcesados = new Set<string>();

  for (const fila of filas) {
    const base = baseCodigo(fila.codigo);
    let producto = mapaProductos.get(base);

    if (!producto) {
      producto = await createProducto({
        nombre: fila.descripcion || fila.codigo,
        descripcion: fila.codigo,
        unidad_medida: 'kg',
        precio_base: 0,
        disponible: true,
      } as Partial<Producto>);
      resumen.productosCreados++;
      if (base) mapaProductos.set(base, producto);
    } else if (base && fila.descripcion && !nombresYaProcesados.has(base)) {
      nombresYaProcesados.add(base);
      if (
        (conteoBase.get(base) || 0) <= 1 &&
        (producto.nombre || '').trim() !== fila.descripcion.trim()
      ) {
        await updateProducto(producto.id, { nombre: fila.descripcion.trim() });
        producto.nombre = fila.descripcion.trim();
        resumen.nombresActualizados++;
      }
    }

    productosEnExcel.add(producto.id);
    if (!fila.lote) continue;

    if (!esperado.has(producto.id)) esperado.set(producto.id, new Map());
    const mapa = esperado.get(producto.id)!;
    for (const { almacen, cantidad } of fila.cantidades) {
      mapa.set(`${almacen}|${fila.lote}`, {
        almacen,
        lote: fila.lote,
        cantidad: redondear2(cantidad),
        fecha: fila.fecha,
        vencimiento: fila.fechaVencimiento ?? null,
      });
    }
  }

  for (const productoId of productosEnExcel) {
    const esperadoProducto =
      esperado.get(productoId) ?? new Map<string, LoteEsperado>();
    const existentes = await getLotes({ productoId });
    const porKey = new Map(
      existentes.map((l) => [`${l.almacen}|${l.codigo_lote}`, l]),
    );
    const keys = new Set<string>();

    for (const [key, exp] of esperadoProducto) {
      keys.add(key);
      const existente = porKey.get(key);

      if (!existente) {
        if (exp.cantidad <= 0) {
          resumen.sinCambio++;
          continue;
        }
        const fechaIngreso = exp.fecha ?? hoy;
        await createLote({
          producto_id: productoId,
          almacen: exp.almacen,
          codigo_lote: exp.lote,
          fecha_ingreso: fechaIngreso,
          fecha_vencimiento: exp.vencimiento,
          cantidad_inicial: exp.cantidad,
          cantidad_actual: exp.cantidad,
          activo: true,
        });
        await createMovimiento({
          tipo: MovimientoInventarioTipoEnum.ENTRADA,
          producto_id: productoId,
          almacen: exp.almacen,
          cantidad: exp.cantidad,
          saldo_resultante: exp.cantidad,
          observacion: `Carga inventario lote ${exp.lote} (${fechaIngreso})`,
        });
        resumen.lotesCreados++;
        resumen.movimientosGenerados++;
        continue;
      }

      const actual = Number(existente.cantidad_actual) || 0;
      const fechaIngreso = exp.fecha ?? existente.fecha_ingreso;
      const vencimiento = exp.vencimiento ?? null;
      const sinCambio =
        actual === exp.cantidad &&
        (existente.fecha_ingreso ?? '') === (fechaIngreso ?? '') &&
        (existente.fecha_vencimiento ?? '') === (vencimiento ?? '');
      if (sinCambio) {
        resumen.sinCambio++;
        continue;
      }

      await updateLoteDatos(existente.id, {
        cantidad_inicial: exp.cantidad,
        cantidad_actual: exp.cantidad,
        fecha_ingreso: fechaIngreso,
        fecha_vencimiento: vencimiento,
      });
      const delta = redondear2(exp.cantidad - actual);
      if (delta !== 0) {
        await createMovimiento({
          tipo:
            delta > 0
              ? MovimientoInventarioTipoEnum.AJUSTE_POSITIVO
              : MovimientoInventarioTipoEnum.AJUSTE_NEGATIVO,
          producto_id: productoId,
          lote_id: existente.id,
          almacen: exp.almacen,
          cantidad: Math.abs(delta),
          saldo_resultante: exp.cantidad,
          motivo_categoria: MotivoAjusteEnum.CONTEO_FISICO,
          observacion: `Sincronización con Excel (lote ${exp.lote})`,
        });
        resumen.movimientosGenerados++;
      }
      resumen.lotesActualizados++;
    }

    // Lotes del producto que NO vienen en el Excel → cantidad_actual = 0.
    for (const lote of existentes) {
      const key = `${lote.almacen}|${lote.codigo_lote}`;
      if (keys.has(key)) continue;
      const actual = Number(lote.cantidad_actual) || 0;
      if (actual === 0) continue;
      await updateCantidadActual(lote.id, 0);
      await createMovimiento({
        tipo: MovimientoInventarioTipoEnum.AJUSTE_NEGATIVO,
        producto_id: productoId,
        lote_id: lote.id,
        almacen: lote.almacen,
        cantidad: actual,
        saldo_resultante: 0,
        motivo_categoria: MotivoAjusteEnum.CONTEO_FISICO,
        observacion: `Sin stock en el Excel (lote ${lote.codigo_lote})`,
      });
      resumen.lotesEnCero++;
      resumen.movimientosGenerados++;
    }
  }

  await recalcularDisponibilidadProductos();
  return resumen;
};

export interface StockInicialInput {
  almacen: AlmacenEnum;
  cantidad: number;
  lote: string;
  /** Fecha de ingreso (YYYY-MM-DD). */
  fechaIngreso: string;
  fechaVencimiento?: string | null;
}

/**
 * Registra el stock inicial de un producto recién creado: un lote en el
 * almacén indicado + su movimiento de ENTRADA. Se usa al crear un producto
 * manualmente desde la app (el stock masivo sigue entrando por el Excel).
 */
export const registrarLoteInicial = async (
  productoId: string,
  input: StockInicialInput,
): Promise<void> => {
  const cantidad = Math.round((Number(input.cantidad) || 0) * 100) / 100;
  if (!(cantidad > 0)) {
    throw new ApiError('La cantidad inicial debe ser mayor a 0', 400);
  }
  const lote = String(input.lote || '').trim();
  if (!lote) throw new ApiError('El código del lote es obligatorio', 400);
  if (!input.fechaIngreso) {
    throw new ApiError('La fecha de ingreso es obligatoria', 400);
  }

  const existente = await getLote(productoId, input.almacen, lote);
  if (existente) {
    throw new ApiError('Ya existe un lote con ese código para el producto', 400);
  }

  await createLote({
    producto_id: productoId,
    almacen: input.almacen,
    codigo_lote: lote,
    fecha_ingreso: input.fechaIngreso,
    fecha_vencimiento: input.fechaVencimiento ?? null,
    cantidad_inicial: cantidad,
    cantidad_actual: cantidad,
    activo: true,
  });

  await createMovimiento({
    tipo: MovimientoInventarioTipoEnum.ENTRADA,
    producto_id: productoId,
    almacen: input.almacen,
    cantidad,
    saldo_resultante: cantidad,
    observacion: `Stock inicial lote ${lote} (${input.fechaIngreso})`,
  });
};

/** Devuelve el catálogo de productos con el stock real por almacén. */
export const getStockProductos = async (): Promise<ProductoConStock[]> => {
  const productos = await getProductos();
  const agrupado = await getStockAgrupado();

  const stockPorProducto = new Map<
    string,
    { globalca: number; wms: number; total: number }
  >();
  for (const fila of agrupado) {
    const actual =
      stockPorProducto.get(fila.producto_id) ?? { globalca: 0, wms: 0, total: 0 };
    const cantidad = Number(fila.total ?? 0);
    if (fila.almacen === AlmacenEnum.GLOBALCA) actual.globalca += cantidad;
    else if (fila.almacen === AlmacenEnum.WMS) actual.wms += cantidad;
    actual.total += cantidad;
    stockPorProducto.set(fila.producto_id, actual);
  }

  return productos.map((producto) => ({
    ...producto,
    stock: stockPorProducto.get(producto.id) ?? { globalca: 0, wms: 0, total: 0 },
  }));
};

/** Expone las filas parseadas (útil para pruebas). */
export const parsearIngresoInventario = (buffer: Buffer) =>
  parsearInventarioIngresos(buffer);

/** Lista de lotes (con producto) para la vista de inventario/logística. */
export const getLotesService = (filtros?: {
  productoId?: string;
  almacen?: AlmacenEnum;
  soloConStock?: boolean;
}) => getLotes(filtros);

/** Edita la fecha de vencimiento de un lote (admin). */
export const actualizarVencimientoLoteService = async (
  loteId: string,
  fechaVencimiento: string | null,
) => {
  const lote = await getLoteById(loteId);
  if (!lote) throw new ApiError('Lote no encontrado', 404);
  await updateFechaVencimiento(loteId, fechaVencimiento);
  return { ...lote, fecha_vencimiento: fechaVencimiento };
};

const redondear2 = (n: number) => Math.round((Number(n) || 0) * 100) / 100;

export interface LineaConsumo {
  producto_id: string;
  almacen?: AlmacenEnum | null;
  cantidad: number;
}

/**
 * Consume stock de una línea del pedido aplicando FIFO dentro del almacén
 * elegido (lote con fecha_ingreso más antigua primero). Debe ejecutarse dentro
 * de una transacción. Lanza 400 si el almacén no tiene stock suficiente.
 */
export const consumirLineasPedido = async (
  manager: EntityManager,
  pedidoId: string,
  lineas: LineaConsumo[],
  usuarioId?: string,
): Promise<void> => {
  const loteRepo = manager.getRepository(Lote);
  const movRepo = manager.getRepository(MovimientoInventario);

  for (const linea of lineas) {
    let pendiente = redondear2(linea.cantidad);
    if (pendiente <= 0) continue;

    if (!linea.almacen) {
      throw new ApiError(
        'Cada producto del pedido debe indicar el almacén de despacho',
        400,
      );
    }

    const lotes = await loteRepo
      .createQueryBuilder('l')
      .where('l.producto_id = :productoId', { productoId: linea.producto_id })
      .andWhere('l.almacen = :almacen', { almacen: linea.almacen })
      .andWhere('l.cantidad_actual > 0')
      .orderBy('l.fecha_ingreso', 'ASC')
      .addOrderBy('l.fecha_creacion', 'ASC')
      .setLock('pessimistic_write')
      .getMany();

    for (const lote of lotes) {
      if (pendiente <= 0) break;
      const disponible = Number(lote.cantidad_actual) || 0;
      const tomar = Math.min(disponible, pendiente);
      if (tomar <= 0) continue;
      const nuevoSaldo = redondear2(disponible - tomar);

      await loteRepo.update(lote.id, { cantidad_actual: nuevoSaldo });
      await movRepo.save(
        movRepo.create({
          tipo: MovimientoInventarioTipoEnum.RESERVA,
          producto_id: linea.producto_id,
          lote_id: lote.id,
          almacen: linea.almacen,
          pedido_id: pedidoId,
          cantidad: redondear2(tomar),
          saldo_resultante: nuevoSaldo,
          usuario_id: usuarioId,
          observacion: `Reserva pedido (lote ${lote.codigo_lote})`,
        }),
      );

      pendiente = redondear2(pendiente - tomar);
    }

    if (pendiente > 0.0001) {
      throw new ApiError(
        `Stock insuficiente en ${linea.almacen} para el producto seleccionado. Faltan ${pendiente.toFixed(
          2,
        )} kg.`,
        400,
      );
    }
  }
};

/**
 * Restaura al inventario el stock NETO que un pedido todavía tiene afuera
 * (salidas/reservas menos liberaciones/devoluciones) y registra movimientos de
 * LIBERACION. Se usa al cancelar/eliminar un pedido y al editar uno pendiente.
 */
export const restaurarStockPedido = async (
  manager: EntityManager,
  pedidoId: string,
  observacion = 'Restauración de stock del pedido',
): Promise<void> => {
  const loteRepo = manager.getRepository(Lote);
  const movRepo = manager.getRepository(MovimientoInventario);

  const movimientos = await movRepo.find({ where: { pedido_id: pedidoId } });
  const netoPorLote = new Map<string, number>();

  for (const mov of movimientos) {
    if (!mov.lote_id) continue;
    const cantidad = Number(mov.cantidad) || 0;
    const esSalida =
      mov.tipo === MovimientoInventarioTipoEnum.RESERVA ||
      mov.tipo === MovimientoInventarioTipoEnum.SALIDA;
    const signo = esSalida ? 1 : -1;
    netoPorLote.set(
      mov.lote_id,
      (netoPorLote.get(mov.lote_id) ?? 0) + signo * cantidad,
    );
  }

  for (const [loteId, cantidad] of netoPorLote) {
    if (cantidad <= 0.0001) continue;
    const lote = await loteRepo.findOneBy({ id: loteId });
    if (!lote) continue;

    const nuevoSaldo = redondear2(Number(lote.cantidad_actual) + cantidad);
    await loteRepo.update(loteId, { cantidad_actual: nuevoSaldo });
    await movRepo.save(
      movRepo.create({
        tipo: MovimientoInventarioTipoEnum.LIBERACION,
        producto_id: lote.producto_id,
        lote_id: loteId,
        almacen: lote.almacen,
        pedido_id: pedidoId,
        cantidad: redondear2(cantidad),
        saldo_resultante: nuevoSaldo,
        observacion,
      }),
    );
  }
};

/**
 * Al confirmar un pedido (pendiente → procesado) sus movimientos RESERVA
 * pasan a SALIDA (salida definitiva).
 */
export const confirmarSalidasPedido = async (
  manager: EntityManager,
  pedidoId: string,
): Promise<void> => {
  await manager
    .getRepository(MovimientoInventario)
    .createQueryBuilder()
    .update(MovimientoInventario)
    .set({ tipo: MovimientoInventarioTipoEnum.SALIDA })
    .where('pedido_id = :pedidoId', { pedidoId })
    .andWhere('tipo = :tipo', { tipo: MovimientoInventarioTipoEnum.RESERVA })
    .execute();
};

/** Stock disponible de un producto en un almacén (suma de lotes). */
export const getStockDisponible = async (
  productoId: string,
  almacen: AlmacenEnum,
): Promise<number> => {
  const row = await AppDataSource.getRepository(Lote)
    .createQueryBuilder('l')
    .select('COALESCE(SUM(l.cantidad_actual), 0)', 'total')
    .where('l.producto_id = :productoId', { productoId })
    .andWhere('l.almacen = :almacen', { almacen })
    .getRawOne();
  return Number(row?.total ?? 0);
};

export interface AjusteInventarioInput {
  producto_id: string;
  almacen: AlmacenEnum;
  lote_id: string;
  direccion: 'entrada' | 'salida';
  cantidad: number;
  motivo_categoria: MotivoAjusteEnum;
  motivo?: string;
}

/**
 * Ajuste manual de inventario (admin). Siempre sobre un lote existente:
 * - `entrada` suma kg al lote; `salida` resta (no puede quedar negativo).
 * - Registra el movimiento con categoría de motivo y nota.
 */
export const registrarAjusteService = async (
  input: AjusteInventarioInput,
  usuarioId?: string,
) => {
  const cantidad = redondear2(input.cantidad);
  if (!(cantidad > 0)) {
    throw new ApiError('La cantidad debe ser mayor a 0', 400);
  }

  const lote = await getLoteById(input.lote_id);
  if (!lote) throw new ApiError('Lote no encontrado', 404);
  if (lote.producto_id !== input.producto_id) {
    throw new ApiError('El lote no pertenece al producto indicado', 400);
  }
  if (lote.almacen !== input.almacen) {
    throw new ApiError('El lote no pertenece al almacén indicado', 400);
  }

  const esEntrada = input.direccion === 'entrada';
  const actual = Number(lote.cantidad_actual) || 0;
  if (!esEntrada && cantidad > actual + 0.0001) {
    throw new ApiError(
      `El lote solo tiene ${actual.toFixed(2)} kg disponibles`,
      400,
    );
  }

  const nuevoSaldo = redondear2(esEntrada ? actual + cantidad : actual - cantidad);
  await updateCantidadActual(lote.id, nuevoSaldo);

  const movimiento = await createMovimiento({
    tipo: esEntrada
      ? MovimientoInventarioTipoEnum.AJUSTE_POSITIVO
      : MovimientoInventarioTipoEnum.AJUSTE_NEGATIVO,
    producto_id: lote.producto_id,
    lote_id: lote.id,
    almacen: lote.almacen,
    cantidad,
    saldo_resultante: nuevoSaldo,
    usuario_id: usuarioId,
    motivo_categoria: input.motivo_categoria,
    observacion: input.motivo,
  });

  await recalcularDisponibilidadProductos();

  return movimiento;
};

/** Kardex: historial de movimientos de inventario con filtros. */
export const getKardexService = (filtros?: {
  productoId?: string;
  almacen?: string;
  tipo?: string;
  desde?: string;
  hasta?: string;
}) => getMovimientos(filtros);
