import ExcelJS from 'exceljs';
import fs from 'fs';
import path from 'path';
import { getKardexParaExportService } from '../services/inventarioServices';
import { getMovimientosInstrumentoParaExportService } from '../services/instrumentosServices';

const formatearFecha = (valor?: Date | string | null) =>
  valor ? new Date(valor).toLocaleString('es-VE') : 'N/A';

async function exportKardexToExcel() {
  const movimientos = (await getKardexParaExportService()) || [];
  const movimientosInstrumentos =
    (await getMovimientosInstrumentoParaExportService()) || [];

  if (movimientos.length === 0 && movimientosInstrumentos.length === 0) {
    throw new Error('No hay movimientos para exportar');
  }

  const workbook = new ExcelJS.Workbook();

  const sheetInventario = workbook.addWorksheet('Inventario');
  sheetInventario.columns = [
    { header: 'Fecha', key: 'fecha', width: 20 },
    { header: 'Código', key: 'codigo', width: 16 },
    { header: 'Producto', key: 'producto', width: 40 },
    { header: 'Lote', key: 'lote', width: 18 },
    { header: 'Almacén', key: 'almacen', width: 14 },
    { header: 'Tipo', key: 'tipo', width: 18 },
    { header: 'Cantidad', key: 'cantidad', width: 14 },
    { header: 'Saldo Resultante', key: 'saldo', width: 18 },
    { header: 'Motivo', key: 'motivo', width: 18 },
    { header: 'Observación', key: 'observacion', width: 45 },
  ];
  movimientos.forEach((mov) => {
    sheetInventario.addRow({
      fecha: formatearFecha(mov.fecha_creacion),
      codigo: mov.producto?.descripcion || 'N/A',
      producto: mov.producto?.nombre || 'N/A',
      lote: mov.lote?.codigo_lote || 'N/A',
      almacen: (mov.almacen || '').toUpperCase() || 'N/A',
      tipo: mov.tipo,
      cantidad: Number(mov.cantidad ?? 0),
      saldo: Number(mov.saldo_resultante ?? 0),
      motivo: mov.motivo_categoria || 'N/A',
      observacion: mov.observacion || 'N/A',
    });
  });
  sheetInventario.getRow(1).font = { bold: true };

  const sheetInstrumentos = workbook.addWorksheet('Instrumentos');
  sheetInstrumentos.columns = [
    { header: 'Fecha', key: 'fecha', width: 20 },
    { header: 'Instrumento', key: 'instrumento', width: 25 },
    { header: 'Almacén', key: 'almacen', width: 14 },
    { header: 'Cliente', key: 'cliente', width: 40 },
    { header: 'Tipo', key: 'tipo', width: 16 },
    { header: 'Cantidad', key: 'cantidad', width: 14 },
    { header: 'Saldo Resultante', key: 'saldo', width: 18 },
    { header: 'Observación', key: 'observacion', width: 45 },
  ];
  movimientosInstrumentos.forEach((mov) => {
    const cliente = mov.cliente
      ? `${mov.cliente.nombre ?? ''} ${mov.cliente.apellido ?? ''}`.trim() ||
        mov.cliente.empresa
      : 'N/A';
    sheetInstrumentos.addRow({
      fecha: formatearFecha(mov.fecha_creacion),
      instrumento: mov.tipo_instrumento?.nombre || 'N/A',
      almacen: (mov.almacen || '').toUpperCase() || 'N/A',
      cliente: cliente || 'N/A',
      tipo: mov.tipo,
      cantidad: Number(mov.cantidad ?? 0),
      saldo: Number(mov.saldo_resultante ?? 0),
      observacion: mov.observacion || 'N/A',
    });
  });
  sheetInstrumentos.getRow(1).font = { bold: true };

  const exportDir = path.join(__dirname, '../../exports');
  if (!fs.existsSync(exportDir)) {
    fs.mkdirSync(exportDir);
  }

  const filePath = path.join(exportDir, 'kardex.xlsx');
  await workbook.xlsx.writeFile(filePath);

  return filePath;
}

export default exportKardexToExcel;
