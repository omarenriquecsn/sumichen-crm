import PDFDocument from 'pdfkit';
import {
  parsearListaPrecios,
  leerListaPreciosDesdeDisco,
  FilaListaPrecios,
} from './listaPreciosPdf';

/**
 * Catálogo de productos para clientes (PDF).
 *
 * Se genera a partir de la lista de precios subida (área de Mayerlin): el
 * archivo fijo `lista_precios.pdf` de `uploads/productos`. Del PDF original se
 * ocultan las columnas internas (Procedencia, Precio OFERTA ESPECIAL $/kg y
 * Disponibilidad) y el cliente recibe solo:
 *
 *   Código · Producto · Presentación
 *
 * El asistente de WhatsApp envía este documento cuando el lead elige
 * "Catálogo".
 */

const colapsar = (s: string) => s.replace(/\s+/g, ' ').trim();

interface FilaCatalogo {
  codigo: string;
  producto: string;
  presentacion: string;
}

/**
 * Convierte las filas parseadas de la lista de precios en filas del catálogo
 * (solo Código · Producto · Presentación), descartando productos sin nombre y
 * duplicados exactos.
 */
const prepararFilas = (filas: FilaListaPrecios[]): FilaCatalogo[] => {
  const vistos = new Set<string>();
  const resultado: FilaCatalogo[] = [];
  for (const f of filas) {
    const producto = colapsar(f.producto);
    if (!producto) continue;
    const presentacion = colapsar(f.presentacion);
    const clave = `${f.codigo}|${producto}|${presentacion}`;
    if (vistos.has(clave)) continue;
    vistos.add(clave);
    resultado.push({
      codigo: colapsar(f.codigo) || '–',
      producto,
      presentacion,
    });
  }
  return resultado;
};

interface Coord {
  y: number;
  pageHeight: number;
  pageWidth: number;
}

const generarPdf = (filas: FilaCatalogo[]): Promise<Buffer> => {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    const chunks: Buffer[] = [];

    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', (err: Error) => reject(err));

    const pageHeight = doc.page.height - 50; // margen inferior 50
    const pageWidth = doc.page.width;

    // Anchos de columnas del catálogo (A4 con márgenes de 50).
    const xCodigo = 50;
    const wCodigo = 74;
    const xProducto = xCodigo + wCodigo + 6;
    const wProducto = 318;
    const xPresentacion = xProducto + wProducto + 6;
    const wPresentacion = pageWidth - 50 - xPresentacion;

    const estado: Coord = { y: 0, pageHeight, pageWidth };

    const cabeceraEmpresa = () => {
      doc.font('Helvetica-Bold').fontSize(20).fillColor('#1e3a8a').text('SUMICHEM', { align: 'center' });
      doc.font('Helvetica').fontSize(11).fillColor('#374151').text('Distribuidora de Químicos', { align: 'center' });
      doc.moveDown(0.2);
      doc.fillColor('#111827').text('RIF: J-406007986', { align: 'center' });
      doc.text('Contacto: 0424-4368661', { align: 'center' });
      doc.moveDown(0.4);
      doc.strokeColor('#94a3b8').lineWidth(1).moveTo(50, doc.y).lineTo(pageWidth - 50, doc.y).stroke();
      doc.moveDown(0.6);
      doc.font('Helvetica-Bold').fontSize(15).fillColor('#111827').text('CATÁLOGO DE PRODUCTOS', { align: 'center' });
      doc.font('Helvetica').fontSize(9.5).fillColor('#6b7280').text(
        new Date().toLocaleDateString('es-VE'),
        { align: 'center' }
      );
      doc.moveDown(0.9);
      estado.y = doc.y;
    };

    const encabezadoColumnas = () => {
      const filaAlto = 14;
      const y = estado.y;
      doc.font('Helvetica-Bold').fontSize(9).fillColor('#ffffff');
      doc.rect(xCodigo - 4, y, pageWidth - 100 + 8, filaAlto).fill('#1e3a8a');
      doc.fillColor('#ffffff');
      doc.text('CÓDIGO', xCodigo, y + 3, { width: wCodigo, lineBreak: false });
      doc.text('PRODUCTO', xProducto, y + 3, { width: wProducto, lineBreak: false });
      doc.text('PRESENTACIÓN', xPresentacion, y + 3, { width: wPresentacion, lineBreak: false });
      doc.fillColor('#111827');
      estado.y = y + filaAlto + 2;
    };

    const asegurarEspacio = (altoNecesario: number) => {
      if (estado.y + altoNecesario > pageHeight) {
        doc.addPage();
        doc.moveDown(0.5);
        doc.font('Helvetica-Bold').fontSize(13).fillColor('#1e3a8a').text('CATÁLOGO DE PRODUCTOS', { align: 'center' });
        doc.font('Helvetica').fontSize(9).fillColor('#6b7280').text('Sumichem · RIF J-406007986 · 0424-4368661', { align: 'center' });
        doc.moveDown(0.6);
        estado.y = doc.y;
        encabezadoColumnas();
      }
    };

    const dibujarFila = (fila: FilaCatalogo, indice: number) => {
      doc.font('Helvetica').fontSize(8.6).fillColor('#374151');
      const altoCodigo = doc.heightOfString(fila.codigo, { width: wCodigo, align: 'left' });
      const altoProducto = doc.heightOfString(fila.producto, { width: wProducto, align: 'left' });
      const altoPresentacion = doc.heightOfString(fila.presentacion, { width: wPresentacion, align: 'left' });
      const filaAlto = Math.max(altoCodigo, altoProducto, altoPresentacion, 10) + 2;

      asegurarEspacio(filaAlto);

      const y = estado.y;
      // Código más destacado
      doc.font('Helvetica-Bold').fillColor('#1e3a8a').text(fila.codigo, xCodigo, y, { width: wCodigo, align: 'left' });
      doc.font('Helvetica').fillColor('#111827').text(fila.producto, xProducto, y, { width: wProducto, align: 'left' });
      doc.fillColor('#4b5563').text(fila.presentacion, xPresentacion, y, { width: wPresentacion, align: 'left' });

      // Separador sutil entre filas
      if (indice < filas.length - 1) {
        doc.strokeColor('#e5e7eb').lineWidth(0.5).moveTo(xCodigo - 4, y + filaAlto - 1).lineTo(pageWidth - 50 + 4, y + filaAlto - 1).stroke();
      }

      estado.y = y + filaAlto;
    };

    cabeceraEmpresa();
    encabezadoColumnas();

    filas.forEach((fila, indice) => dibujarFila(fila, indice));

    doc.end();
  });
};

/**
 * Genera el catálogo de productos para clientes leyendo la lista de precios
 * `lista_precios.pdf` del disco (`uploads/productos`). Devuelve el Buffer del
 * PDF con Código · Producto · Presentación (sin columnas internas).
 */
export const generarCatalogoPDF = async (): Promise<Buffer> => {
  const buffer = leerListaPreciosDesdeDisco();
  const filas = await parsearListaPrecios(buffer);
  const catalogo = prepararFilas(filas);
  if (catalogo.length === 0) {
    throw new Error('La lista de precios no contiene productos con nombre');
  }
  return generarPdf(catalogo);
};
