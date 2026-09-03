import { Producto } from '../entities/Productos';
import {
  getProductos,
  getProductoById,
  createProducto,
  updateProducto,
  actualizarPrecioBase,
} from '../repositories/productosRepository';
import { FilaListaPrecios } from '../utils/listaPreciosPdf';

export const getProductosService = async () => {
  const productos = await getProductos();
  return productos;
};

export const getProductoByIdService = async (id: string) => {
  const producto = await getProductoById(id);
  return producto;
};

export const createProductoService = async (
  productoData: Partial<Producto>,
) => {
  const nuevoProducto = await createProducto(productoData);
  return nuevoProducto;
};

export const updateProductoService = async (
  id: string,
  productoData: Partial<Producto>,
) => {
  const productoActualizado = await updateProducto(id, productoData);
  return productoActualizado;
};

export interface ResumenActualizacionPrecios {
  totalProductos: number;
  filasEnLista: number;
  conPrecio: number;
  actualizados: number;
  sinCambio: number;
  codigosSinCoincidencia: string[];
}

const normalizarCodigo = (s: string) =>
  s.trim().toUpperCase().replace(/\s+/g, '');

/**
 * Código base: recorta la variante tras el guion (MP10052-1 ≡ MP10052), igual
 * que la sincronización de disponibilidad del inventario.
 */
const baseCodigo = (s: string) => {
  const n = normalizarCodigo(s);
  const h = n.indexOf('-');
  return h > 0 ? n.slice(0, h) : n;
};

/**
 * Actualiza `productos.precio_base` con el "Precio OFERTA ESPECIAL $/kg" de la
 * lista de precios (PDF). Se matchea por código (`productos.descripcion`).
 * Solo se tocan los productos cuyo código aparece con precio; el resto
 * conserva su precio actual.
 */
export const aplicarPreciosListaService = async (
  filas: FilaListaPrecios[],
): Promise<ResumenActualizacionPrecios> => {
  const productos = await getProductos();

  const mapa: Map<string, Producto[]> = new Map();
  for (const producto of productos) {
    const base = baseCodigo(producto.descripcion || '');
    if (!base) continue;
    const lista = mapa.get(base) || [];
    lista.push(producto);
    mapa.set(base, lista);
  }

  let actualizados = 0;
  let sinCambio = 0;
  let conPrecio = 0;
  const codigosSinCoincidencia: string[] = [];
  const vistosSinCoincidencia = new Set<string>();

  // Precio "aplicado" por id dentro de esta ejecución (evita actualizar dos
  // veces un producto cuyo código aparece repetido en la lista del PDF).
  const precioAplicado = new Map<string, number>();
  for (const producto of productos) {
    precioAplicado.set(producto.id, Number(producto.precio_base) || 0);
  }

  for (const fila of filas) {
    if (!fila.codigo || fila.precioOfertaKg == null) continue;
    conPrecio++;

    const coincidencias = mapa.get(baseCodigo(fila.codigo));
    if (!coincidencias || coincidencias.length === 0) {
      if (!vistosSinCoincidencia.has(fila.codigo)) {
        vistosSinCoincidencia.add(fila.codigo);
        codigosSinCoincidencia.push(fila.codigo);
      }
      continue;
    }

    for (const producto of coincidencias) {
      const actual = precioAplicado.get(producto.id) ?? 0;
      if (actual === fila.precioOfertaKg) {
        sinCambio++;
        continue;
      }
      await actualizarPrecioBase(producto.id, fila.precioOfertaKg);
      precioAplicado.set(producto.id, fila.precioOfertaKg);
      actualizados++;
    }
  }

  return {
    totalProductos: productos.length,
    filasEnLista: filas.length,
    conPrecio,
    actualizados,
    sinCambio,
    codigosSinCoincidencia,
  };
};
