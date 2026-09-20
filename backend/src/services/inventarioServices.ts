import {
  getProductos,
  createProducto,
  actualizarDisponible,
} from '../repositories/productosRepository';
import { createLote, getLote, getStockAgrupado } from '../repositories/lotesRepository';
import { createMovimiento } from '../repositories/movimientosRepository';
import { MovimientoInventarioTipoEnum } from '../enums/MovimientoInventarioTipoEnum';
import { AlmacenEnum } from '../enums/AlmacenEnum';
import { Producto } from '../entities/Productos';
import { parsearInventarioIngresos } from '../utils/ingresosInventario';

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
