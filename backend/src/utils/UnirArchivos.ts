import { PDFDocument } from "pdf-lib";

async function unirPDFS(buffers: Buffer[]):Promise<Buffer>{ 
    const mergedPdf = await PDFDocument.create();
    
    for(const buffer of buffers) {
        const pdf = await PDFDocument.load(buffer);
        const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
        copiedPages.forEach((page) => mergedPdf.addPage(page))
    }
    const pdfBytes = await mergedPdf.save();
    return Buffer.from(pdfBytes);
}

export default unirPDFS;
