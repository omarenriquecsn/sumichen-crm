import ExcelJS from 'exceljs';
import {
  getProductos,
  actualizarDisponible,
} from '../repositories/productosRepository';

export interface ResumenSincronizacion {
  total: number;
  disponibles: number;
  noDisponibles: number;
}

/**
 * Devuelve el texto visible de una celda de ExcelJS, manejando celdas que
 * contienen fórmulas, rich text u objetos (mismo helper que catalogoProductos).
 */
const textoCelda = (cell: any): string => {
  const v = cell?.value;
  if (v == null) return '';
  if (typeof v === 'object') {
    if (typeof v.text === 'string') return v.text;
    if (typeof v.result === 'string' || typeof v.result === 'number')
      return String(v.result);
    if (Array.isArray(v.richText))
      return v.richText.map((r: any) => r?.text ?? '').join('');
    return '';
  }
  return String(v);
};

const normalizar = (s: string) => s.trim().toUpperCase().replace(/\s+/g, '');

/**
 * Código base: recorta la variante tras el guion. El inventario distingue
 * presentaciones con sufijo (MP10052-1) que en la tabla `productos` son el
 * mismo producto sin guion (MP10052), así que se comparan como iguales.
 */
const baseCodigo = (s: string) => {
  const n = normalizar(s);
  const h = n.indexOf('-');
  return h > 0 ? n.slice(0, h) : n;
};

const parsearNumero = (s: string): number => {
  // El inventario real trae números; fallback si viene texto (formato es-VE).
  const limpio = s.replace(/[^\d.,-]/g, '');
  if (!limpio) return 0;
  if (limpio.includes(',') && limpio.includes('.')) {
    const [enteros, ...dec] = limpio.split(',');
    return Number(`${enteros.replace(/\./g, '')}.${dec.join('')}`) || 0;
  }
  return Number(limpio.replace(',', '.')) || 0;
};

/**
 * Recalcula la disponibilidad de TODOS los productos de la tabla `productos`
 * a partir del inventario diario (inventario.xlsx):
 *   - Col 1 = código del producto (coincide con `productos.descripcion`).
 *   - Col 5 = stock TOTAL (varias filas por producto = lotes).
 *
 * Un producto queda `disponible = true` si AL MENOS una de sus filas tiene
 * TOTAL > 0. Cualquier otro caso (TOTAL 0/vacío o código ausente del
 * inventario) pasa a `disponible = false` (refresco completo diario).
 */
export const sincronizarDisponibilidadDesdeInventario = async (
  buffer: Buffer,
): Promise<ResumenSincronizacion> => {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer as any);

  const worksheet = workbook.worksheets[0];
  if (!worksheet) throw new Error('El inventario no contiene hojas');

  const primeraFila = worksheet.getRow(1);
  const primerCelda = normalizar(textoCelda(primeraFila.getCell(1)));
  const segundaCelda = normalizar(textoCelda(primeraFila.getCell(2)));
  const esEncabezado = primerCelda === 'CODIGO' || segundaCelda === 'DESCRIPCION';

  let colCodigo = 1;
  let colTotal = 5;
  if (esEncabezado) {
    primeraFila.eachCell((cell, colNumber) => {
      const h = normalizar(textoCelda(cell));
      if (h === 'CODIGO') colCodigo = colNumber;
      if (h === 'TOTAL') colTotal = colNumber;
    });
  }

  const codigosConStock = new Set<string>();
  worksheet.eachRow((row, rowNumber) => {
    if (esEncabezado && rowNumber === 1) return;
    const codigo = normalizar(textoCelda(row.getCell(colCodigo)));
    if (!codigo) return;
    const total = parsearNumero(textoCelda(row.getCell(colTotal)));
    if (total > 0) codigosConStock.add(baseCodigo(codigo));
  });

  const productos = await getProductos();
  let disponibles = 0;
  for (const producto of productos) {
    const base = baseCodigo(producto.descripcion ?? '');
    const tieneStock = base ? codigosConStock.has(base) : false;
    if (tieneStock !== producto.disponible) {
      await actualizarDisponible(producto.id, tieneStock);
    }
    if (tieneStock) disponibles++;
  }

  return {
    total: productos.length,
    disponibles,
    noDisponibles: productos.length - disponibles,
  };
};
