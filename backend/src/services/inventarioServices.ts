import {
  getProductos,
  createProducto,
  actualizarDisponible,
} from '../repositories/productosRepository';
import {
  createLote,
  getLote,
  getStockAgrupado,
  getLotes,
  updateFechaVencimiento,
  getLoteById,
} from '../repositories/lotesRepository';
import { createMovimiento } from '../repositories/movimientosRepository';
import { MovimientoInventarioTipoEnum } from '../enums/MovimientoInventarioTipoEnum';
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

export interface ResumenIngresos {
  filasLeidas: number;
  productosCreados: number;
  lotesCreados: number;
  lotesDuplicados: string[];
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

/**
 * Registra el ingreso de mercancía desde el Excel del inventario:
 * - Un lote por (producto, almacén, código). El código de lote es único: si ya
 *   existe se reporta como duplicado y NO se crea (no se reutiliza).
 * - Si el código no existe como producto, se crea automáticamente.
 */
export const registrarIngresosDesdeInventario = async (
  buffer: Buffer,
): Promise<ResumenIngresos> => {
  const filas = await parsearInventarioIngresos(buffer);

  const productos = await getProductos();
  const mapaProductos = new Map<string, Producto>();
  for (const producto of productos) {
    const base = baseCodigo(producto.descripcion || '');
    if (base) mapaProductos.set(base, producto);
  }

  let productosCreados = 0;
  let lotesCreados = 0;
  const lotesDuplicados: string[] = [];

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
      productosCreados++;
      if (base) mapaProductos.set(base, producto);
    }

    for (const { almacen, cantidad } of fila.cantidades) {
      const existente = await getLote(producto.id, almacen, fila.lote);
      if (existente) {
        const etiqueta = `${fila.codigo} · ${almacen} · lote ${fila.lote}`;
        if (!lotesDuplicados.includes(etiqueta)) lotesDuplicados.push(etiqueta);
        continue;
      }

      await createLote({
        producto_id: producto.id,
        almacen,
        codigo_lote: fila.lote,
        fecha_ingreso: fila.fecha,
        fecha_vencimiento: fila.fechaVencimiento ?? null,
        cantidad_inicial: cantidad,
        cantidad_actual: cantidad,
        activo: true,
      });

      await createMovimiento({
        tipo: MovimientoInventarioTipoEnum.ENTRADA,
        producto_id: producto.id,
        almacen,
        cantidad,
        saldo_resultante: cantidad,
        observacion: `Ingreso lote ${fila.lote} (${fila.fecha})`,
      });

      lotesCreados++;
    }
  }

  await recalcularDisponibilidadProductos();

  return {
    filasLeidas: filas.length,
    productosCreados,
    lotesCreados,
    lotesDuplicados,
  };
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
