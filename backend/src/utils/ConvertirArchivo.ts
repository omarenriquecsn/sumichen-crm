import { lookup } from 'mime-types';
import PDFDocument from 'pdfkit';
import { fileTypeFromBuffer as fromBuffer } from 'file-type';
import convertToPdf from 'office-to-pdf';
import sharp from 'sharp';

async function convertirArchivo(file: Express.Multer.File): Promise<Buffer> {
  const mime = lookup(file.originalname);

  if (typeof mime === 'string' && mime.includes('image')) {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument();
        const buffers: Buffer[] = [];

        doc.on('data', (chunk) => buffers.push(chunk));
        doc.on('end', () => {
          const pdfBuffer = Buffer.concat(buffers);
          resolve(pdfBuffer);
        });

        doc.image(file.buffer, 50, 50, { fit: [500, 700] });
        doc.end();
      } catch (err) {
        reject(err);
      }
    });
  }

  if (mime === 'application/pdf') {
    return file.buffer;
  }

  if (
    typeof mime === 'string' &&
    (mime.includes('word') || mime.includes('excel'))
  ) {
    return await convertToPdf(file.buffer);
  }

  if (typeof mime === 'string' && mime.includes('text')) {
    const doc = new PDFDocument();
    const buffers: Buffer[] = [];
    doc.on('data', buffers.push.bind(buffers));
    doc.text(file.buffer.toString(), 50, 50);
    doc.end();
    return Buffer.concat(buffers);
  }
  // Placeholder: return the file buffer directly, or imp}lement your conversion logic here
  throw new Error('Tipo de archivo no soportado');
}

export default convertirArchivo;
