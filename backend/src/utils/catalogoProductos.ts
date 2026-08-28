import { createClient } from '@supabase/supabase-js';
import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY!,
);

const normalizar = (s: string) =>
  s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

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
 * Detecta la fila de encabezado (primera) y las columnas "Nombre" y
 * "Descripción" por nombre, y arma un PDF con el encabezado de Sumichem y la
 * lista de productos disponibles. Devuelve el Buffer del PDF.
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

  let nombreIndex = -1;
  let descripcionIndex = -1;

  worksheet.getRow(1).eachCell((cell, colNumber) => {
    const header = normalizar(String(cell.value ?? ''));
    if (nombreIndex === -1 && header.includes('nombre')) nombreIndex = colNumber;
    if (descripcionIndex === -1 && header.includes('descripc')) descripcionIndex = colNumber;
  });

  if (nombreIndex === -1 || descripcionIndex === -1) {
    throw new Error('No se encontraron las columnas "Nombre" y/o "Descripción" en el inventario');
  }

  const productos: ProductoCatalogo[] = [];

  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const descripcion = String(row.getCell(descripcionIndex).value ?? '').trim();
    if (!descripcion) return;
    const nombre = String(row.getCell(nombreIndex).value ?? '').trim();
    productos.push({ nombre: nombre || `Producto ${productos.length + 1}`, descripcion });
  });

  if (productos.length === 0) {
    throw new Error('El inventario no tiene productos con descripción');
  }

  return generarPdf(productos);
};
