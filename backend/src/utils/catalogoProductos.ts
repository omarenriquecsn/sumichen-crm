import { createClient } from '@supabase/supabase-js';
import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY!,
);

const normalizar = (s: string) =>
  s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

/**
 * Devuelve el texto visible de una celda de ExcelJS, manejando celdas que
 * contienen fórmulas, rich text u objetos. `String(cell.value)` falla con
 * `[object Object]` cuando el valor es un objeto (ej. celdas con fórmula).
 */
const textoCelda = (cell: any): string => {
  const v = cell?.value;
  if (v == null) return '';
  if (typeof v === 'object') {
    if (typeof v.text === 'string') return v.text;
    if (typeof v.result === 'string' || typeof v.result === 'number') return String(v.result);
    if (Array.isArray(v.richText)) return v.richText.map((r: any) => r?.text ?? '').join('');
    return '';
  }
  return String(v);
};

interface ProductoCatalogo {
  nombre: string;
  descripcion: string;
}

const generarPdf = (productos: ProductoCatalogo[]): Promise<Buffer> => {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    const chunks: Buffer[] = [];

    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', (err: Error) => reject(err));

    // Encabezado de la empresa
    doc.font('Helvetica-Bold').fontSize(20).fillColor('#1e3a8a').text('SUMICHEM', { align: 'center' });
    doc.font('Helvetica').fontSize(11).fillColor('#374151').text('Distribuidora de Químicos', { align: 'center' });
    doc.moveDown(0.2);
    doc.fillColor('#111827').text('RIF: J-406007986', { align: 'center' });
    doc.text('Contacto: 0424-4368661', { align: 'center' });
    doc.moveDown(0.5);

    // Línea separadora
    doc.strokeColor('#94a3b8').lineWidth(1).moveTo(50, doc.y).lineTo(545, doc.y).stroke();
    doc.moveDown(0.8);

    doc.font('Helvetica-Bold').fontSize(16).fillColor('#111827').text('CATÁLOGO DE PRODUCTOS', { align: 'center' });
    doc.font('Helvetica').fontSize(10).fillColor('#6b7280').text(new Date().toLocaleDateString('es-VE'), { align: 'center' });
    doc.moveDown(1);

    // Lista de productos
    doc.fontSize(11);
    productos.forEach((p, i) => {
      doc.font('Helvetica-Bold').fillColor('#1e3a8a').text(`${i + 1}. ${p.nombre}`);
      doc.font('Helvetica').fillColor('#374151').text(p.descripcion, { indent: 16 });
      doc.moveDown(0.5);
    });

    doc.end();
  });
};

/**
 * Genera el catálogo de productos (PDF) leyendo el inventario diario
 * `inventario.xlsx` del bucket `inventario` de Supabase Storage.
 *
 * Detecta la fila de encabezado (primera) y la columna "Descripción" por
 * nombre (la lista de productos disponibles). Si el archivo no tiene fila de
 * encabezado (el inventario real empieza directo con productos), usa la
 * columna 2 como fallback (formato CODIGO | DESCRIPCION | GLOBALCA | WMS |
 * TOTAL | LOTE). Cada fila con descripción no vacía se convierte en un
 * producto del catálogo (se deduplican los nombres repetidos por lotes).
 * Devuelve el Buffer del PDF.
 */
export const generarCatalogoPDF = async (): Promise<Buffer> => {
  const { data, error } = await supabase.storage
    .from('inventario')
    .download('inventario.xlsx');

  if (error || !data) {
    throw new Error('No se pudo descargar el inventario (inventario.xlsx)');
  }

  const buffer = Buffer.from(await data.arrayBuffer());
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer as any);

  const worksheet = workbook.worksheets[0];
  if (!worksheet) {
    throw new Error('El inventario no contiene hojas');
  }

  let descripcionIndex = -1;

  worksheet.getRow(1).eachCell((cell, colNumber) => {
    const header = normalizar(textoCelda(cell));
    if (descripcionIndex === -1 && header.includes('descripc')) descripcionIndex = colNumber;
  });

  if (descripcionIndex === -1) {
    // El inventario real no tiene fila de encabezado: la primera fila ya es un
    // producto. La descripción siempre vive en la columna 2.
    descripcionIndex = 2;
  }

  const productos: ProductoCatalogo[] = [];
  const vistos = new Set<string>();

  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const descripcion = textoCelda(row.getCell(descripcionIndex)).trim();
    if (!descripcion) return;
    const clave = normalizar(descripcion);
    if (vistos.has(clave)) return;
    vistos.add(clave);
    productos.push({ nombre: descripcion, descripcion: '' });
  });

  if (productos.length === 0) {
    throw new Error('El inventario no tiene productos con descripción');
  }

  return generarPdf(productos);
};
