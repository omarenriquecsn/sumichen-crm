import ExcelJS from 'exceljs';

export interface FilaProyeccion {
  rif: string;
  rifOriginal: string;
  proyeccion: number;
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

// RIF: mayúsculas y solo letras/dígitos (se quitan guiones, espacios y puntos).
// "J-123456789-0" -> "J1234567890". Se usa como clave de coincidencia.
export const normalizarRif = (s: string) =>
  normalizar(s)
    .replace(/[^A-Z0-9]/g, '')
    .toUpperCase();

const esEncabezado = (s: string) => {
  const n = normalizar(s);
  return n.includes('RIF') || n.includes('CÉDULA') || n.includes('CEDULA') ||
    n.includes('PROYEC') || n === 'EMPRESA' || n === 'CLIENTE';
};

const parsearNumero = (s: string): number => {
  const limpio = s.replace(/[^0-9.,-]/g, '');
  if (!limpio) return NaN;
  // Formato es-VE/es-ES: 1.234.567,89 (puntos de miles, coma decimal).
  if (limpio.includes(',') && limpio.includes('.')) {
    const [enteros, ...dec] = limpio.split(',');
    return Number(`${enteros.replace(/\./g, '')}.${dec.join('')}`) || NaN;
  }
  if (limpio.includes(',')) {
    // Con coma única puede ser decimal (12,5) o miles (1,234).
    const [ent, dec] = limpio.split(',');
    if (dec && dec.length <= 2 && !/^[0-9]{3}$/.test(dec)) {
      return Number(`${ent}.${dec}`) || NaN;
    }
    return Number(limpio.replace(/,/g, '')) || NaN;
  }
  return Number(limpio) || NaN;
};

/**
 * Parsea un Excel con (al menos) dos columnas:
 *   col 1 = RIF del cliente
 *   col 2 = proyección de venta (monto)
 * Tolera una fila de encabezado (se detecta por palabras RIF/PROYEC/EMPRESA...),
 * columnas extra y formatos de número es-VE. Devuelve las filas válidas.
 */
export const parsearProyeccionesExcel = async (
  buffer: Buffer,
): Promise<FilaProyeccion[]> => {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer as any);

  const worksheet = workbook.worksheets[0];
  if (!worksheet) throw new Error('El archivo no contiene hojas');

  const filas: FilaProyeccion[] = [];

  worksheet.eachRow((row, rowNumber) => {
    const rifTexto = textoCelda(row.getCell(1));
    const proyTexto = textoCelda(row.getCell(2));

    // Saltar la fila de encabezado (solo afecta si viene la primera fila).
    if (rowNumber === 1 && esEncabezado(rifTexto)) return;

    const rifOriginal = rifTexto.trim();
    const rif = normalizarRif(rifTexto);
    if (!rif) return;

    const proyeccion = parsearNumero(proyTexto);
    if (Number.isNaN(proyeccion)) return;

    filas.push({ rif, rifOriginal, proyeccion });
  });

  return filas;
};
