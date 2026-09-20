import ExcelJS from 'exceljs';
import { AlmacenEnum } from '../enums/AlmacenEnum';

/**
 * Parser del inventario diario usado para INGRESAR mercancía nueva a los
 * almacenes. Formato esperado (con o sin fila de encabezado):
 *
 *   CODIGO | DESCRIPCION | GLOBALCA | WMS | TOTAL | LOTE | FECHA | VENCIMIENTO
 *
 * - GLOBALCA / WMS: cantidad del lote en cada almacén (kg).
 * - LOTE: código de lote (único; nunca se reutiliza).
 * - FECHA: fecha de ingreso del lote (para FIFO).
 * - VENCIMIENTO: fecha de vencimiento del lote (opcional).
 */

export interface FilaIngresoInventario {
  codigo: string;
  descripcion: string;
  lote: string;
  fecha: string; // YYYY-MM-DD
  fechaVencimiento?: string | null;
  cantidades: { almacen: AlmacenEnum; cantidad: number }[];
}

const textoCelda = (cell: ExcelJS.Cell): string => {
  const v = (cell as any)?.value;
  if (v == null) return '';
  if (typeof v === 'object') {
    if (v instanceof Date) return v.toISOString();
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

const parsearNumero = (s: string): number => {
  const limpio = s.replace(/[^\d.,-]/g, '');
  if (!limpio) return 0;
  if (limpio.includes(',') && limpio.includes('.')) {
    const [enteros, ...dec] = limpio.split(',');
    return Number(`${enteros.replace(/\./g, '')}.${dec.join('')}`) || 0;
  }
  if (limpio.includes(',')) return Number(limpio.replace(',', '.')) || 0;
  return Number(limpio) || 0;
};

const dosDigitos = (n: number) => String(n).padStart(2, '0');

/** Normaliza fechas de Excel (Date, serial numérico o texto) a YYYY-MM-DD. */
export const parsearFechaExcel = (valor: any): string | null => {
  if (valor == null || valor === '') return null;

  if (valor instanceof Date && !isNaN(valor.getTime())) {
    return `${valor.getUTCFullYear()}-${dosDigitos(
      valor.getUTCMonth() + 1,
    )}-${dosDigitos(valor.getUTCDate())}`;
  }

  if (typeof valor === 'number') {
    // Serial de Excel (base 1899-12-30).
    const ms = Date.UTC(1899, 11, 30) + Math.round(valor) * 86400000;
    const d = new Date(ms);
    return `${d.getUTCFullYear()}-${dosDigitos(d.getUTCMonth() + 1)}-${dosDigitos(
      d.getUTCDate(),
    )}`;
  }

  let texto = '';
  if (typeof valor === 'string') {
    texto = valor;
  } else if (typeof valor === 'object') {
    if (typeof valor.text === 'string') texto = valor.text;
    else if (valor.result != null) texto = String(valor.result);
    else if (Array.isArray(valor.richText))
      texto = valor.richText.map((r: any) => r?.text ?? '').join('');
  }
  texto = texto.trim();
  if (!texto) return null;

  // d/m/yyyy o d-m-yyyy (formato local) o yyyy-mm-dd (ISO).
  const iso = texto.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (iso) {
    return `${iso[1]}-${dosDigitos(Number(iso[2]))}-${dosDigitos(Number(iso[3]))}`;
  }
  const local = texto.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})/);
  if (local) {
    const anio = local[3].length === 2 ? `20${local[3]}` : local[3];
    return `${anio}-${dosDigitos(Number(local[2]))}-${dosDigitos(Number(local[1]))}`;
  }
  return null;
};

export const parsearInventarioIngresos = async (
  buffer: Buffer,
): Promise<FilaIngresoInventario[]> => {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer as any);

  const worksheet = workbook.worksheets[0];
  if (!worksheet) throw new Error('El inventario no contiene hojas');

  const primeraFila = worksheet.getRow(1);
  const celdasHeader: string[] = [];
  primeraFila.eachCell((cell) => {
    celdasHeader.push(normalizar(textoCelda(cell)));
  });
  const esEncabezado =
    celdasHeader.includes('CODIGO') || celdasHeader.includes('DESCRIPCION');

  // Columnas (1-indexadas). Si hay encabezado, se buscan por nombre; si no,
  // se usa el orden estándar.
  let colCodigo = 1;
  let colDescripcion = 2;
  let colGlobalca = 3;
  let colWms = 4;
  let colLote = 6;
  let colFecha = 7;
  let colVencimiento = 8;

  if (esEncabezado) {
    primeraFila.eachCell((cell, colNumber) => {
      const h = normalizar(textoCelda(cell));
      if (h === 'CODIGO') colCodigo = colNumber;
      else if (h === 'DESCRIPCION') colDescripcion = colNumber;
      else if (h === 'GLOBALCA') colGlobalca = colNumber;
      else if (h === 'WMS') colWms = colNumber;
      else if (h === 'LOTE') colLote = colNumber;
      else if (h === 'FECHA' || h === 'FECHAINGRESO' || h === 'FECHA_INGRESO')
        colFecha = colNumber;
      else if (
        h === 'VENCIMIENTO' ||
        h === 'FECHAVENCIMIENTO' ||
        h === 'FECHA_VENCIMIENTO'
      )
        colVencimiento = colNumber;
    });
  }

  const filas: FilaIngresoInventario[] = [];

  worksheet.eachRow((row, rowNumber) => {
    if (esEncabezado && rowNumber === 1) return;

    const codigo = textoCelda(row.getCell(colCodigo)).trim();
    if (!codigo) return;

    const descripcion = textoCelda(row.getCell(colDescripcion)).trim();
    const lote = textoCelda(row.getCell(colLote)).trim();
    if (!lote) return;

    const fecha = parsearFechaExcel(row.getCell(colFecha).value);
    if (!fecha) return;

    const fechaVencimiento = parsearFechaExcel(
      row.getCell(colVencimiento).value,
    );

    const cantidades: { almacen: AlmacenEnum; cantidad: number }[] = [];
    const cantidadGlobalca = parsearNumero(textoCelda(row.getCell(colGlobalca)));
    const cantidadWms = parsearNumero(textoCelda(row.getCell(colWms)));
    if (cantidadGlobalca > 0)
      cantidades.push({ almacen: AlmacenEnum.GLOBALCA, cantidad: cantidadGlobalca });
    if (cantidadWms > 0)
      cantidades.push({ almacen: AlmacenEnum.WMS, cantidad: cantidadWms });

    if (cantidades.length === 0) return;

    filas.push({ codigo, descripcion, lote, fecha, fechaVencimiento, cantidades });
  });

  return filas;
};
