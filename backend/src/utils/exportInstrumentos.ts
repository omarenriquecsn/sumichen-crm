import ExcelJS from 'exceljs';
import fs from 'fs';
import path from 'path';
import {
  getStockInstrumentosService,
  getInstrumentosPorClienteService,
} from '../services/instrumentosServices';

async function exportInstrumentosToExcel() {
  const stock = (await getStockInstrumentosService()) || [];
  const clientes = (await getInstrumentosPorClienteService()) || [];

  if (stock.length === 0 && clientes.length === 0) {
    throw new Error('No hay instrumentos para exportar');
  }

  const workbook = new ExcelJS.Workbook();

  const sheetStock = workbook.addWorksheet('Stock por almacén');
  sheetStock.columns = [
    { header: 'Instrumento', key: 'nombre', width: 25 },
    { header: 'Almacén', key: 'almacen', width: 14 },
    { header: 'Cantidad Total', key: 'total', width: 16 },
    { header: 'Cantidad Disponible', key: 'disponible', width: 20 },
  ];
  stock.forEach((item) => {
    sheetStock.addRow({
      nombre: item.nombre,
      almacen: (item.almacen || '').toUpperCase(),
      total: Number(item.cantidad_total ?? 0),
      disponible: Number(item.cantidad_disponible ?? 0),
    });
  });
  sheetStock.getRow(1).font = { bold: true };

  const sheetClientes = workbook.addWorksheet('En clientes');
  sheetClientes.columns = [
    { header: 'Cliente', key: 'cliente', width: 45 },
    { header: 'En Cliente', key: 'en_cliente', width: 14 },
    { header: 'En Tránsito', key: 'en_transito', width: 14 },
  ];
  clientes.forEach((cliente) => {
    sheetClientes.addRow({
      cliente: cliente.cliente_nombre,
      en_cliente: Number(cliente.en_cliente ?? 0),
      en_transito: Number(cliente.en_transito ?? 0),
    });
  });
  sheetClientes.getRow(1).font = { bold: true };

  const sheetDetalle = workbook.addWorksheet('Detalle por cliente');
  sheetDetalle.columns = [
    { header: 'Cliente', key: 'cliente', width: 45 },
    { header: 'Instrumento', key: 'instrumento', width: 25 },
    { header: 'En Cliente', key: 'en_cliente', width: 14 },
    { header: 'En Tránsito', key: 'en_transito', width: 14 },
  ];
  clientes.forEach((cliente) => {
    (cliente.detalle || []).forEach((detalle) => {
      sheetDetalle.addRow({
        cliente: cliente.cliente_nombre,
        instrumento: detalle.nombre,
        en_cliente: Number(detalle.en_cliente ?? 0),
        en_transito: Number(detalle.en_transito ?? 0),
      });
    });
  });
  sheetDetalle.getRow(1).font = { bold: true };

  const exportDir = path.join(__dirname, '../../exports');
  if (!fs.existsSync(exportDir)) {
    fs.mkdirSync(exportDir);
  }

  const filePath = path.join(exportDir, 'instrumentos.xlsx');
  await workbook.xlsx.writeFile(filePath);

  return filePath;
}

export default exportInstrumentosToExcel;
